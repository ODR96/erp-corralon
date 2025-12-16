import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
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

    @Get()
    @RequirePermissions('inventory.purchases.view') // 👈 AQUÍ
    findAll(@Query('page') page: 1, @Request() req: any) {
        return this.purchasesService.findAll(Number(page), 20, req.user.tenant.id);
    }
}