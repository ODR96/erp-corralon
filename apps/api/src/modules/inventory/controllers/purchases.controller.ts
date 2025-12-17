import { Controller, Get, Post, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
// Asegúrate de importar tu decorador de permisos (ajusta la ruta según tu proyecto)
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { PurchasesService } from '../services/purchases.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('inventory/purchases')
@UseGuards(AuthGuard('jwt'))
export class PurchasesController {
    constructor(private readonly purchasesService: PurchasesService) { }

    @Post()
    @RequirePermissions('inventory.purchases.create') // 👈 AQUÍ
    create(@Body() body: any, @Request() req: any) {
        return this.purchasesService.create(body, req.user.tenant.id);
    }

    @Post(':id/confirm')
    @RequirePermissions('inventory.purchases.create')
    confirm(@Param('id') id: string, @Request() req: any) {
        return this.purchasesService.confirmPurchase(id, req.user.tenant.id);
    }

    @Get()
    @RequirePermissions('inventory.purchases.view')
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('provider_id') providerId: string,
        @Query('status') status: string,
        @Query('start_date') startDate: string,
        @Query('end_date') endDate: string,
        @Query('sort_by') sortBy: string,
        @Query('sort_order') sortOrder: 'ASC' | 'DESC',
        @Request() req: any
    ) {
        return this.purchasesService.findAll(Number(page), Number(limit), req.user.tenant.id, {
            providerId,
            startDate,
            endDate,
            sortBy,
            sortOrder, 
            status
        });
    }
}