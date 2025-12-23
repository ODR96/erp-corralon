import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'; // 👈 Agregado ForbiddenException
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Role } from '../auth/entities/role.entity';
import * as bcrypt from 'bcrypt';
import { Branch } from '../tenants/entities/branch.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Role) private roleRepo: Repository<Role>,
        @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    ) { }

    // 1. CREATE (BLINDADO 🛡️)
    // Cambiamos la firma para recibir IDs y el usuario que hace la petición
    async create(createDto: CreateUserDto, tenantId: string, currentUser: any) {

        // 🕵️‍♂️ LOGS DE DETECTIVE
        console.log('--- INTENTO DE CREACIÓN DE USUARIO ---');
        console.log('1. Usuario Solicitante:', currentUser.email);
        console.log('2. ¿Es Super Admin?', currentUser.is_super_admin); // ¿Qué dice aquí?
        console.log('3. Datos recibidos (DTO):', createDto);
        console.log('4. ¿Intenta crear Super Admin?', createDto.is_super_admin);

        // 🔒 BLINDAJE NIVEL 1: Boolean Flag
        // Si currentUser.is_super_admin es falso/undefined, ENTRA al if.
        if (!currentUser.is_super_admin) {

            // Si intenta marcarse como Super Admin...
            if (createDto.is_super_admin === true || createDto.is_super_admin === 'true' as any) {
                console.warn('🚨 ALERTA: Intento de escalada de privilegios BLOQUEADO.');
                // Opción A: Lanzar error (Recomendado para testing)
                throw new ForbiddenException('No tienes poder aquí. No puedes crear Super Admins.');

                // Opción B: Silenciarlo (Forzar a false)
                // createDto.is_super_admin = false;
            }
        }

        // 🔒 BLINDAJE NIVEL 2: Roles Prohibidos
        // A veces el usuario no manda el flag booleano, pero se asigna el ROL "Super Admin"
        // que tiene todos los permisos. Vamos a bloquear eso también.

        // Buscamos qué rol quiere asignar
        const roleToAssign = await this.roleRepo.findOne({ where: { id: createDto.roleId } });

        if (!roleToAssign) throw new BadRequestException('El rol no existe');

        // Si el rol se llama "Super Admin" y yo no lo soy... BLOQUEAR
        if (roleToAssign.name === 'Super Admin' && !currentUser.is_super_admin) {
            throw new ForbiddenException('No puedes asignar el rol de Super Admin.');
        }

        // --- Resto de la lógica (Tenant, Branch, etc) ---
        let targetTenantId = tenantId;
        if (currentUser.is_super_admin && createDto.tenant_id) {
            targetTenantId = createDto.tenant_id;
        }

        // ... Hash password ...
        const hashedPassword = await bcrypt.hash(createDto.password, 10);

        // ... Branch logic ...
        let branchToAssign: Branch | null = null;
        if (createDto.branchId) {
            branchToAssign = await this.branchRepo.findOne({ where: { id: createDto.branchId } });
        }

        const newUser = this.userRepo.create({
            full_name: createDto.full_name,
            email: createDto.email,
            password_hash: hashedPassword,
            tenant: { id: targetTenantId } as Tenant,
            role: roleToAssign,
            branch: branchToAssign,
            is_active: true,
            // 👇 FORZAMOS EL FALSE SI NO PASÓ EL FILTRO (DOBLE SEGURIDAD)
            is_super_admin: currentUser.is_super_admin ? (createDto.is_super_admin || false) : false
        });

        return this.userRepo.save(newUser);
    }

    // 2. FIND ALL
    async findAll(page: number, limit: number, tenantId: string, search: string, withDeleted: boolean) {
        const skip = (page - 1) * limit;

        const where: any = { tenant: { id: tenantId } };
        if (search) {
            where.full_name = ILike(`%${search}%`);
        }

        const [data, total] = await this.userRepo.findAndCount({
            where,
            relations: ['role', 'branch'],
            take: limit,
            skip: skip,
            order: { created_at: 'DESC' },
            withDeleted: withDeleted
        });

        return { data, total };
    }

    // 3. FIND ONE
    async findOne(id: string) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: ['role', 'branch', 'tenant'] // Agregué tenant por si necesitas ver el ID
        });
        if (!user) throw new NotFoundException('Usuario no encontrado');
        return user;
    }

    // 4. GET BRANCHES
    async getBranches(tenantId: string) {
        return this.branchRepo.find({
            where: { tenant: { id: tenantId } },
            select: ['id', 'name']
        });
    }

    async getRoles(tenantId: string, currentUser: any) {
        const roles = await this.roleRepo.find({
            where: { tenant: { id: tenantId } },
            select: ['id', 'name'],
            order: { name: 'ASC' }
        });
        if (!currentUser.is_super_admin) {
            return roles.filter(role => role.name !== 'Super Admin');
        }
    }

    // 5. UPDATE
    async update(id: string, dto: UpdateUserDto) {
        const user = await this.findOne(id);

        if (dto.password) {
            user.password_hash = await bcrypt.hash(dto.password, 10);
        }

        if (dto.full_name) user.full_name = dto.full_name;

        if (dto.roleId) {
            const role = await this.roleRepo.findOneBy({ id: dto.roleId });
            if (role) user.role = role;
        }

        if (dto.branchId) {
            const branch = await this.branchRepo.findOneBy({ id: dto.branchId });
            if (branch) user.branch = branch;
        }

        if (dto.is_active !== undefined) user.is_active = dto.is_active;

        return this.userRepo.save(user);
    }

    // 6. REMOVE
    async remove(id: string, hard: boolean = false, currentUserId: string) {
        if (id === currentUserId) {
            throw new BadRequestException('No puedes eliminarte a ti mismo');
        }

        if (hard) {
            return this.userRepo.delete(id);
        } else {
            return this.userRepo.softDelete(id);
        }
    }

    async restore(id: string) {
        return this.userRepo.restore(id);
    }
}