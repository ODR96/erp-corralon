import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from '../auth/entities/role.entity'; // Importamos Role
import { Branch } from '../tenants/entities/branch.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Role) private roleRepository: Repository<Role>,
        @InjectRepository(Branch) private branchRepository: Repository<Branch>,
    ) { }

    // 1. LISTAR (Ahora acepta ver eliminados)
    async findAll(
        tenantId: string,
        limit: number,
        offset: number,
        search: string,
        withDeleted: boolean = false,
        requesterRole: string
    ) {
        // 1. Definimos las condiciones BASE (que siempre se deben cumplir)
        const baseConditions: any = {
            tenant: { id: tenantId }
        };

        // Filtro de Seguridad de Roles (Nadie ve al Super Admin salvo él mismo)
        if (requesterRole !== 'Super Admin') {
            baseConditions.role = { name: Not('Super Admin') };
        }

        // 2. Construimos el WHERE final
        let where: any = baseConditions;

        if (search) {
            // MAGIA DE TYPEORM: Para hacer un "OR" (Nombre O Email) manteniendo el Tenant,
            // debemos pasar un array de objetos. Cada objeto es una condición "OR".
            where = [
                {
                    ...baseConditions, // Mantiene tenant y rol
                    full_name: ILike(`%${search}%`) // <--- ILike ignora mayúsculas/minúsculas
                },
                {
                    ...baseConditions, // Mantiene tenant y rol
                    email: ILike(`%${search}%`)     // <--- También busca en el email
                }
            ];
        }

        const [data, total] = await this.userRepository.findAndCount({
            where: where,
            withDeleted: withDeleted,
            relations: ['role', 'tenant', 'branch'],
            order: { created_at: 'DESC' },
            take: limit,
            skip: offset,
            select: {
                id: true, full_name: true, email: true, is_active: true, created_at: true, deleted_at: true,
                role: { id: true, name: true },
                tenant: { id: true, name: true },
                branch: { id: true, name: true }
            }
        });

        return { data, total };
    }

    // 2. CREAR USUARIO
    async create(createUserDto: CreateUserDto, tenantId: string, requesterRole: string) {
        // Buscamos incluso entre los borrados (withDeleted: true)
        const exists = await this.userRepository.findOne({
            where: { email: createUserDto.email },
            withDeleted: true
        });

        if (exists) {
            if (exists.deleted_at) {
                // CASO: El usuario existía, fue borrado y queremos usar el email de nuevo.
                // Opción A: Le decimos "Ese usuario está en la papelera, restáurelo".
                // Opción B (La que haremos): Reactivarlo automáticamente.
                throw new ConflictException('Este usuario existía y fue eliminado. Contacte a soporte para restaurarlo.');
            }
            throw new ConflictException('El email ya está en uso por un usuario activo');
        }

        // Buscar el Rol
        const role = await this.roleRepository.findOne({ where: { id: createUserDto.roleId } });
        if (!role) throw new NotFoundException('Rol no encontrado');
        if (role.name === 'Super Admin' && requesterRole !== 'Super Admin') {
            throw new ForbiddenException('No tienes permisos para crear un Super Administrador');
        }

        // BUSCAR SUCURSAL (Validar que pertenezca al mismo Tenant)
        let branch: Branch | null = null;
        if (createUserDto.branchId) {
            branch = await this.branchRepository.findOne({
                where: { id: createUserDto.branchId, tenant: { id: tenantId } }
            });
            if (!branch) throw new NotFoundException('Sucursal no válida');
        }

        // Hashear password
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        const newUser = this.userRepository.create({
            ...createUserDto,
            password_hash: hashedPassword,
            tenant: { id: tenantId }, // Asignamos al mismo Tenant del admin creador
            role: role,
            branch: branch,
        });

        return this.userRepository.save(newUser);
    }

    // 3. ACTUALIZAR USUARIO
    async update(id: string, updateUserDto: UpdateUserDto) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        // Si viene password nueva, la encriptamos
        if (updateUserDto.password) {
            user.password_hash = await bcrypt.hash(updateUserDto.password, 10);
        }

        // Si viene rol nuevo
        if (updateUserDto.roleId) {
            const role = await this.roleRepository.findOne({ where: { id: updateUserDto.roleId } });
            if (role) user.role = role;
        }

        // Actualizamos campos básicos
        if (updateUserDto.full_name) user.full_name = updateUserDto.full_name;
        if (updateUserDto.email) user.email = updateUserDto.email;
        if (updateUserDto.is_active !== undefined) user.is_active = updateUserDto.is_active;

        return this.userRepository.save(user);
    }

    // 4. BORRAR USUARIO
    async remove(id: string, hard: boolean = false, currentUserId: string) { // <--- Recibimos quién pide borrar
        if (id === currentUserId) {
            throw new BadRequestException('No puedes eliminar tu propia cuenta.');
        }

        if (hard) {
            return this.userRepository.delete(id);
        }
        return this.userRepository.softDelete(id);
    }

    // 3. RESTAURAR
    async restore(id: string) {
        return this.userRepository.restore(id);
    }
    // AUXILIAR: Listar roles disponibles para el formulario
    async getRoles(requesterRole: string) {
        const whereCondition: any = {};

        // REGLA: Si NO soy Super Admin, oculto el rol "Super Admin" del desplegable
        if (requesterRole !== 'Super Admin') {
            whereCondition.name = Not('Super Admin');
        }

        return this.roleRepository.find({ where: whereCondition });
    }

    async getBranches(tenantId: string) {
        return this.branchRepository.find({
            where: { tenant: { id: tenantId } }
        });
    }
}