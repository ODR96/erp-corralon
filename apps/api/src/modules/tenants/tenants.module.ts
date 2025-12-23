import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { Branch } from './entities/branch.entity';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { TenantConfig } from './entities/tenant-config.entity';
import { TenantSettingsController } from './settings.controller';
import { TenantSettingsService } from './settings.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';


@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Branch, TenantConfig])], // Registramos la entidad aquí
  controllers: [BranchesController, TenantSettingsController, TenantsController],
  providers: [BranchesService, TenantSettingsService, TenantsService],
  exports: [ TypeOrmModule] // Para poder usarla en otros lados
})
export class TenantsModule {}