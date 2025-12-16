import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ProvidersService } from '../services/providers.service';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { UpdateProviderDto } from '../dto/update-provider.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('inventory/providers')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ProvidersController {
    constructor(private readonly providersService: ProvidersService) { }

    @Post()
    @RequirePermissions('products.manage')
    create(@Body() createDto: CreateProviderDto, @Request() req: any) {
        return this.providersService.create(createDto, req.user.tenant.id);
    }

    @Get()
    @RequirePermissions('products.manage', 'stock.view')
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search: string = '',
        @Query('withDeleted') withDeleted: string = 'false', // <--- Recibe el param
        @Request() req: any
    ) {
        // Convertimos el string 'true' a boolean real
        return this.providersService.findAll(Number(page), Number(limit), req.user.tenant.id, search, withDeleted === 'true');
    }

    @Get(':id')
    @RequirePermissions('products.manage')
    findOne(@Param('id') id: string) {
        return this.providersService.findOne(id);
    }

    @Patch(':id')
    @RequirePermissions('products.manage')
    update(@Param('id') id: string, @Body() updateDto: UpdateProviderDto) {
        return this.providersService.update(id, updateDto);
    }

    @Delete(':id')
    @RequirePermissions('products.manage')
    remove(
        @Param('id') id: string,
        @Query('hard') hard: string = 'false' // <--- Recibe el param hard
    ) {
        return this.providersService.remove(id, hard === 'true');
    }

    // 👇 NUEVO ENDPOINT: Restaurar
    @Patch(':id/restore')
    @RequirePermissions('products.manage')
    restore(@Param('id') id: string) {
        return this.providersService.restore(id);
    }
}