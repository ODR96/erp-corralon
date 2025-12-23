import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StocksService } from '../services/stocks.service';
import { StockAdjustmentDto } from '../dto/stock-adjustment.dto';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';

@Controller('inventory/stocks')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StocksController {
    constructor(private readonly service: StocksService) { }

    // Consultar cuánto tengo de un producto en una sucursal
    // GET /inventory/stocks?productId=...&branchId=...
    @Get()
    @RequirePermissions('stock.view')
    getStock(
        @Query('productId') productId: string,
        @Query('branchId') branchId: string
    ) {
        return this.service.getStock(productId, branchId);
    }

    // Ajustar Stock (Entrada/Salida Manual)
    @Post('adjust')
    @RequirePermissions('products.manage')
    adjust(@Body() dto: StockAdjustmentDto, @Request() req: any) {
        // 👇 Pasamos Tenant (seguridad) y User (auditoría)
        return this.service.adjustStock(
            dto,
            req.user.tenantId,
            req.user.id // O req.user.userId según tu estrategia
        );
    }
}