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

        let tenant = await this.tenantRepo.findOne({ where: { slug: 'corralon-20-de-junio' } });

        if (!tenant) {
            this.logger.log('🏢 Creando Tenant Demo...');
            tenant = await this.tenantRepo.save(this.tenantRepo.create({
                name: 'Corralón 20 de Junio',
                slug: 'corralon-20-de-junio',
                tax_id: '20-39319848-7',
                is_active: true,
            }));
        }

        // 4. SUCURSAL
        let branch = await this.branchRepo.findOne({ where: { tenant: { id: tenant.id } } });
        if (!branch) {
            this.logger.log('🏪 Creando Sucursal Central...');
            branch = await this.branchRepo.save(this.branchRepo.create({
                name: 'Casa Central',
                address: '20 de Junio 260',
                phone: '3704-201810',
                tenant: tenant,
            }));
        }

        // 6. USUARIO ADMIN
        const adminEmail = 'admin@erp.com';
        let user = await this.userRepo.findOne({ where: { email: adminEmail } });

        if (!user) {
            this.logger.log('👤 Creando Usuario Admin...');
            const hashedPassword = await bcrypt.hash('admin123', 10);

            // Buscamos el rol para asignarlo
            const superAdminRole = await this.roleRepo.findOne({
                where: [
                    { name: 'Super Admin', tenant: { id: tenant.id } }, // Opción A: Es de la empresa
                    { name: 'Super Admin' }                             // Opción B: Es global (del AuthService)
                ],
                order: { id: 'ASC' } // Priorizamos el más antiguo si hay dos
            });

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