import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { SalesService } from '../services/sales.service';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('sales')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    @Post()
    @RequirePermissions('sales.create')
    create(@Body() createSaleDto: CreateSaleDto, @Request() req: any) {
        // Pasamos el tenantId y el usuario completo (para saber su sucursal)
        return this.salesService.create(createSaleDto, req.user.tenantId, req.user);
    }

    @Get()
    @RequirePermissions('sales.view')
    findAll(@Request() req: any) {
        // Si es Vendedor, solo ve ventas de SU sucursal (puedes ajustar esta lógica)
        // Si es Admin, puede ver todas (o pasar ?branch_id=...)
        const branchId = req.user.branchId;
        return this.salesService.findAll(req.user.tenantId, branchId);
    }

    @Get(':id')
    @RequirePermissions('sales.view')
    findOne(@Param('id') id: string) {
        return this.salesService.findOne(id);
    }
}