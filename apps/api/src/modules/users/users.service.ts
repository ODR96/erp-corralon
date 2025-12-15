import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Role } from '../auth/entities/role.entity'; // Asegúrate de importar Role
import * as bcrypt from 'bcrypt';
import { Branch } from '../tenants/entities/branch.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Role) private roleRepo: Repository<Role>,
        @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    ) { }

    // 1. CREATE
    async create(createDto: CreateUserDto, tenant: Tenant, requesterRole?: Role) {
        const existing = await this.userRepo.findOne({ where: { email: createDto.email } });
        if (existing) throw new BadRequestException('El email ya está registrado');

        const hashedPassword = await bcrypt.hash(createDto.password, 10);

        // FIX: Usamos roleId (camelCase) como viene en el DTO
        const roleToAssign = await this.roleRepo.findOne({ where: { id: createDto.roleId } });
        if (!roleToAssign) throw new BadRequestException('El rol seleccionado no existe');

        let branchToAssign: Branch | null = null;        // FIX: Usamos branchId (camelCase)
        if (createDto.branchId) {
            branchToAssign = await this.branchRepo.findOne({ where: { id: createDto.branchId } });
        }

        const newUser = this.userRepo.create({
            full_name: createDto.full_name,
            email: createDto.email,
            password_hash: hashedPassword,
            tenant: tenant,
            role: roleToAssign,
            branch: branchToAssign,
            is_active: true
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
            relations: ['role', 'branch']
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

    async getRoles(tenantId: string) {
        return this.roleRepo.find({
            where: { tenant: { id: tenantId } },
            select: ['id', 'name'], // Solo necesitamos ID y Nombre
            order: { name: 'ASC' }
        });
    }

    // 5. UPDATE
    async update(id: string, dto: UpdateUserDto) {
        const user = await this.findOne(id);

        if (dto.password) {
            user.password_hash = await bcrypt.hash(dto.password, 10);
        }

        if (dto.full_name) user.full_name = dto.full_name;

        // FIX: Usamos roleId (camelCase)
        if (dto.roleId) {
            const role = await this.roleRepo.findOneBy({ id: dto.roleId });
            if (role) user.role = role;
        }

        // FIX: Usamos branchId (camelCase)
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