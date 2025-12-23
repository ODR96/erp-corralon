import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm'; // 👈 Agregamos DataSource
import * as bcrypt from 'bcrypt'; // 👈 Agregamos bcrypt

import { Tenant } from './entities/tenant.entity';
import { TenantConfig } from './entities/tenant-config.entity';
import { Branch } from './entities/branch.entity'; // 👈 Nueva
import { User } from '../users/entities/user.entity'; // 👈 Nueva
import { Role } from '../auth/entities/role.entity'; // 👈 Nueva
import { Permission } from '../auth/entities/permission.entity'; // 👈 Nueva

import { CreateTenantFullDto } from './dto/create-tenant-full.dto'; // Usa el DTO completo
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
    constructor(
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
        private dataSource: DataSource, // 👈 Inyectamos para transacciones
    ) { }

    async findAllSuperAdmin() {
        return this.tenantRepo.find({
            order: { created_at: 'DESC' },
            relations: ['branches']
        });
    }

    // 👇 ESTE ES EL MÉTODO "EVOLUCIONADO"
    // Reemplaza tu create anterior por este
    async create(dto: CreateTenantFullDto) {
        return this.dataSource.transaction(async (manager) => {
            
            // 1. Validaciones Previas
            const existsSlug = await manager.findOne(Tenant, { where: { slug: dto.company_slug } });
            if (existsSlug) throw new BadRequestException('El SLUG ya existe.');

            const existsUser = await manager.findOne(User, { where: { email: dto.admin_email } });
            if (existsUser) throw new BadRequestException('El email del admin ya está registrado.');

            // 2. Crear Tenant
            const tenant = manager.create(Tenant, {
                name: dto.company_name,
                slug: dto.company_slug,
                tax_id: dto.tax_id,
                is_active: true,
                max_branches: 1
            });
            const savedTenant = await manager.save(tenant);

            // 3. Configuración Automática
            const config = manager.create(TenantConfig, {
                tenant: savedTenant,
                currency: 'ARS',
                exchange_rate: 1,
                price_rounding: 0
            });
            await manager.save(config);

            // 4. Sucursal Automática "Casa Central"
            const branch = manager.create(Branch, {
                name: 'Casa Central',
                address: dto.address,
                is_active: true,
                tenant: savedTenant
            });
            const savedBranch = await manager.save(branch);

            // 5. Roles Automáticos
            // Traemos todos los permisos del sistema
            const allPermissions = await manager.find(Permission);
            
            // Rol Admin (Todo)
            const adminRole = manager.create(Role, {
                name: 'Admin',
                description: 'Administrador Total',
                tenant: savedTenant,
                permissions: allPermissions
            });
            const savedAdminRole = await manager.save(adminRole);

            // Rol Vendedor (Solo ventas/stock)
            const sellerPerms = allPermissions.filter(p => p.slug.startsWith('sales') || p.slug.startsWith('stock') || p.slug.startsWith('products.view'));
            const sellerRole = manager.create(Role, {
                name: 'Vendedor',
                tenant: savedTenant,
                permissions: sellerPerms
            });
            await manager.save(sellerRole);

            // 6. Usuario Dueño
            const hashedPassword = await bcrypt.hash(dto.admin_password, 10);
            const user = manager.create(User, {
                full_name: dto.admin_full_name,
                email: dto.admin_email,
                password_hash: hashedPassword,
                is_super_admin: false,
                is_active: true,
                tenant: savedTenant,
                role: savedAdminRole,
                branch: savedBranch
            });
            await manager.save(user);

            return savedTenant;
        });
    }

    async update(id: string, dto: UpdateTenantDto) {
        // ... igual que antes
        const tenant = await this.tenantRepo.findOne({ where: { id } });
        if (!tenant) throw new NotFoundException('Empresa no encontrada');
        this.tenantRepo.merge(tenant, dto);
        return this.tenantRepo.save(tenant);
    }

    async findOne(id: string) {
        return this.tenantRepo.findOne({ where: { id } });
    }
}