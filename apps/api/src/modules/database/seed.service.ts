import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Tenant } from '../tenants/entities/tenant.entity';
import { Branch } from '../tenants/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { MeasurementUnit } from '../inventory/entities/measurement-unit.entity';


@Injectable()
export class SeedService implements OnModuleInit {
    constructor(
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
        @InjectRepository(Branch) private branchRepo: Repository<Branch>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Role) private roleRepo: Repository<Role>,
        @InjectRepository(Permission) private permRepo: Repository<Permission>,
        @InjectRepository(MeasurementUnit) private unitsRepo: Repository<MeasurementUnit>,
    ) { }

    async onModuleInit() {
        await this.seed();
    }

    async seed() {
        // Verificamos si ya existen tenants para no duplicar
        const count = await this.tenantRepo.count();
        if (count > 0) {
            console.log('✅ La base de datos ya tiene datos. Seed omitido.');
            return;
        }

        console.log('🌱 Iniciando Seeding completo (Con Roles)...');

        const unitsCount = await this.unitsRepo.count();
        if (unitsCount === 0) {
            console.log('🌱 Creando Unidades de Medida básicas...');
            await this.unitsRepo.save([
                { name: 'Unidad', short_name: 'u', allow_decimals: false },
                { name: 'Kilogramo', short_name: 'kg', allow_decimals: true },
                { name: 'Metro Lineal', short_name: 'm', allow_decimals: true },
                { name: 'Metro Cuadrado', short_name: 'm2', allow_decimals: true },
                { name: 'Metro Cúbico', short_name: 'm3', allow_decimals: true }, // Clave para arena
                { name: 'Litro', short_name: 'l', allow_decimals: true },
            ]);
        };

        // 1. Crear el Tenant
        const tenant = this.tenantRepo.create({
            name: 'Corralón Demo',
            slug: 'corralon-demo',
            tax_id: '20-12345678-9',
            is_active: true,
        });
        await this.tenantRepo.save(tenant);

        // 2. Crear la Sucursal
        const branch = this.branchRepo.create({
            name: 'Casa Central',
            address: 'Av. Principal 123',
            phone: '555-0000',
            tenant: tenant,
        });
        await this.branchRepo.save(branch);

        // 3. Crear Permisos Básicos
        // Aquí definimos qué se puede hacer en el sistema
        const p1 = this.permRepo.create({ slug: 'users.create', description: 'Crear usuarios' });
        const p2 = this.permRepo.create({ slug: 'users.view', description: 'Ver usuarios' });
        const p3 = this.permRepo.create({ slug: 'sales.create', description: 'Crear ventas' });
        await this.permRepo.save([p1, p2, p3]);

        // 4. Crear Roles
        const suadminRole = this.roleRepo.create({
            name: 'Super Admin',
            tenant: tenant,
            permissions: [p1, p2, p3], // El admin puede hacer todo
        });

        const sellerRole = this.roleRepo.create({
            name: 'Vendedor',
            tenant: tenant,
            permissions: [p3], // El vendedor solo vende
        });

        const adminRole = this.roleRepo.create({
            name: 'Admin',
            tenant: tenant,
            permissions: [p1, p2, p3],
        });

        await this.roleRepo.save([adminRole, sellerRole, suadminRole]);

        // 5. Crear el Usuario Admin ASIGNANDO EL ROL
        const hashedPassword = await bcrypt.hash('admin123', 10);

        const user = this.userRepo.create({
            full_name: 'Orlando Admin',
            email: 'admin@erp.com',
            password_hash: hashedPassword,
            is_super_admin: true,
            tenant: tenant,
            role: suadminRole, // <--- Aquí está la clave: Asignamos el rol
        });
        await this.userRepo.save(user);

        console.log('🚀 SEED COMPLETADO: Admin creado con Rol Super Admin');
    }
}