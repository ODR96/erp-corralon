import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ClientsService } from '../services/clients.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('sales/clients')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Post()
    @RequirePermissions('sales.create') // Puedes ajustar este permiso luego
    create(@Body() createDto: CreateClientDto, @Request() req: any) {
        return this.clientsService.create(createDto, req.user.tenant.id);
    }

    @Get()
    @RequirePermissions('sales.view')
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search: string = '',
        @Query('withDeleted') withDeleted: string = 'false',
        @Request() req: any
    ) {
        return this.clientsService.findAll(Number(page), Number(limit), req.user.tenant.id, search, withDeleted === 'true');
    }

    @Get(':id')
    @RequirePermissions('sales.view')
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.clientsService.findOne(id, req.user.tenant.id);
    }

    @Patch(':id')
    @RequirePermissions('sales.edit')
    update(@Param('id') id: string, @Body() updateDto: UpdateClientDto, @Request() req: any) {
        return this.clientsService.update(id, updateDto, req.user.tenant.id);
    }

    @Delete(':id')
    @RequirePermissions('sales.delete')
    remove(
        @Param('id') id: string,
        @Query('hard') hard: string = 'false'
    ) {
        return this.clientsService.remove(id, hard === 'true');
    }

    @Patch(':id/restore')
    @RequirePermissions('sales.delete')
    restore(@Param('id') id: string) {
        return this.clientsService.restore(id);
    }
}