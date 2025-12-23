import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { CreateTenantFullDto } from './dto/create-tenant-full.dto';

@Controller('tenants')
@UseGuards(AuthGuard('jwt'), SuperAdminGuard) 
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) {}

    @Get()
    findAll() {
        return this.tenantsService.findAllSuperAdmin();
    }

    @Post('create-full')
    create(@Body() dto: CreateTenantFullDto) {
        return this.tenantsService.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
        return this.tenantsService.update(id, dto);
    }
}