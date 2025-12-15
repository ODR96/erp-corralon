import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Tenant } from '../tenants/entities/tenant.entity';
import { Branch } from '../tenants/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { MeasurementUnit } from '../inventory/entities/measurement-unit.entity';
import { Category } from '../inventory/entities/category.entity';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
        @InjectRepository(Branch) private branchRepo: Repository<Branch>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Role) private roleRepo: Repository<Role>,
        @InjectRepository(Permission) private permRepo: Repository<Permission>,
        @InjectRepository(MeasurementUnit) private unitsRepo: Repository<MeasurementUnit>,
        @InjectRepository(Category) private categoryRepo: Repository<Category>,
    ) { }

    async onModuleInit() {
        await this.seed();
    }

    async seed() {
        this.logger.log('🌱 Iniciando Seeding inteligente...');

        // 1. UNIDADES DE MEDIDA (Siempre verificamos que existan)
        const unitsCount = await this.unitsRepo.count();
        if (unitsCount === 0) {
            this.logger.log('📏 Creando Unidades de Medida...');
            await this.unitsRepo.save([
                { name: 'Unidad', short_name: 'u', allow_decimals: false },
                { name: 'Kilogramo', short_name: 'kg', allow_decimals: true },
                { name: 'Metro Lineal', short_name: 'm', allow_decimals: true },
                { name: 'Metro Cuadrado', short_name: 'm2', allow_decimals: true },
                { name: 'Metro Cúbico', short_name: 'm3', allow_decimals: true },
                { name: 'Litro', short_name: 'l', allow_decimals: true },
            ]);
        }

        // 2. PERMISOS (Vital: Verificamos uno por uno para agregar los nuevos)
        this.logger.log('🔐 Verificando Permisos...');
        const permissionsDef = [
            { slug: 'users.create', description: 'Crear usuarios' },
            { slug: 'users.view', description: 'Ver usuarios' },
            { slug: 'sales.create', description: 'Crear ventas' },
            // 👇 LOS NUEVOS PERMISOS PARA STOCK 👇
            { slug: 'stock.view', description: 'Ver stock en sucursales' },
            { slug: 'stock.adjust', description: 'Ajustar stock manualmente' }, // Solo para Admin/Manager
            { slug: 'products.manage', description: 'Gestionar productos' },
            { slug: 'branches.manage', description: 'Gestionar Sucursales' },
            { slug: 'settings.manage', description: 'Gestionar Configuración' },
        ];

        // Guardamos los permisos en un mapa para usarlos rápido después
        const permsMap = new Map<string, Permission>();

        for (const p of permissionsDef) {
            let perm = await this.permRepo.findOneBy({ slug: p.slug });
            if (!perm) {
                perm = await this.permRepo.save(this.permRepo.create(p));
                this.logger.log(`➕ Permiso creado: ${p.slug}`);
            }
            permsMap.set(p.slug, perm);
        }

        // 3. TENANT (EMPRESA)
        let tenant = await this.tenantRepo.findOne({ where: { slug: 'corralon-demo' } });

        if (!tenant) {
            this.logger.log('🏢 Creando Tenant Demo...');
            tenant = await this.tenantRepo.save(this.tenantRepo.create({
                name: 'Corralón Demo',
                slug: 'corralon-demo',
                tax_id: '20-12345678-9',
                is_active: true,
            }));
        }

        // 4. SUCURSAL
        let branch = await this.branchRepo.findOne({ where: { tenant: { id: tenant.id } } });
        if (!branch) {
            this.logger.log('🏪 Creando Sucursal Central...');
            branch = await this.branchRepo.save(this.branchRepo.create({
                name: 'Casa Central',
                address: 'Av. Principal 123',
                phone: '555-0000',
                tenant: tenant,
            }));
        }

        // 5. ROLES (Aquí actualizamos los roles existentes con los nuevos permisos)
        this.logger.log('👮 Actualizando Roles...');

        // Definimos qué permisos lleva cada rol
        const rolesConfig = [
            {
                name: 'Super Admin',
                // Lleva TODOS los permisos
                perms: ['users.create', 'users.view', 'sales.create', 'stock.view', 'stock.adjust', 'products.manage', 'brances.manage', 'settings.manage']
            },
            {
                name: 'Admin',
                // Lleva TODOS los permisos
                perms: ['users.create', 'users.view', 'sales.create', 'stock.view', 'stock.adjust', 'products.manage', 'branches.manage', 'settings.manage']
            },
            {
                name: 'Vendedor',
                // Vendedor: Solo vende y ve stock. NO AJUSTA.
                perms: ['sales.create', 'stock.view']
            },
        ];

        for (const config of rolesConfig) {
            let role = await this.roleRepo.findOne({
                where: { name: config.name, tenant: { id: tenant.id } },
                relations: ['permissions']
            });

            if (!role) {
                role = this.roleRepo.create({ name: config.name, tenant: tenant, permissions: [] });
            }

            // Mapeamos los slugs a entidades de permiso reales
            const rolePermissions = config.perms
                .map(slug => permsMap.get(slug))
                .filter(p => p !== undefined); // Filtramos por si alguno falló

            role.permissions = rolePermissions as Permission[];
            await this.roleRepo.save(role);
        }

        // 6. USUARIO ADMIN
        const adminEmail = 'admin@erp.com';
        let user = await this.userRepo.findOne({ where: { email: adminEmail } });

        if (!user) {
            this.logger.log('👤 Creando Usuario Admin...');
            const hashedPassword = await bcrypt.hash('admin123', 10);

            // Buscamos el rol para asignarlo
            const superAdminRole = await this.roleRepo.findOne({ where: { name: 'Super Admin', tenant: { id: tenant.id } } });

            user = await this.userRepo.save(this.userRepo.create({
                full_name: 'Orlando Admin',
                email: adminEmail,
                password_hash: hashedPassword,
                is_super_admin: true,
                tenant: tenant,
                role: superAdminRole || undefined,
            }));
        }

        // 7. CATEGORÍAS
        const catCount = await this.categoryRepo.count({ where: { tenant: { id: tenant.id } } });
        if (catCount === 0) {
            this.logger.log('📦 Creando Categorías Básicas...');
            await this.categoryRepo.save([
                { name: 'General', tenant },
                { name: 'Materiales de Construcción', tenant },
                { name: 'Herramientas', tenant },
                { name: 'Electricidad', tenant },
                { name: 'Plomería', tenant },
                { name: 'Pinturería', tenant },
            ]);
        }

        this.logger.log('🚀 SEED COMPLETADO: Sistema listo y seguro.');
    }
}