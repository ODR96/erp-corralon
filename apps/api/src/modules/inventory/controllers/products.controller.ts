import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, BadRequestException, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUser } from '../../auth/decorators/get-user.decorator';

// 👇 IMPORTAMOS LA NUEVA SEGURIDAD
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('inventory/products')
@UseGuards(AuthGuard('jwt'), PermissionsGuard) // <--- Activamos el Guard Nuevo
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @RequirePermissions('inventory.manage') // Solo quien tenga permiso puede crear
    create(@Body() createProductDto: CreateProductDto, @Request() req: any) {
        // 👇 FIX CRÍTICO: Usamos req.user.tenant.id en lugar de req.user.tenantId
        const tenantId = req.user.tenant?.id;
        return this.productsService.create(createProductDto, tenantId);
    }

    @Get()
    findAll(
        @GetUser('tenantId') tenantId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('search') search = '',
        @Query('categoryId') categoryId = '',
        @Query('providerId') providerId = '',
        @Query('withDeleted') withDeleted = 'false',
        @Query('showHidden') showHidden = 'false', // 👈 NUEVO: Filtro
    ) {
        return this.productsService.findAll(
            Number(page),
            Number(limit),
            tenantId,
            search,
            categoryId,
            providerId,
            withDeleted === 'true',
            showHidden === 'true' // 👈 Pasamos el valor
        );
    }

    // 👇 NUEVO ENDPOINT: Tocar la estrella
    @Patch(':id/toggle-visibility')
    toggleVisibility(@Param('id') id: string) {
        return this.productsService.toggleVisibility(id);
    }

    @Get('export/excel')
    @RequirePermissions('inventory.manage')
    async export(@Request() req: any, @Res() res: Response) {
        const tenantId = req.user.tenant?.id;
        return this.productsService.exportToExcel(tenantId, res);
    }

    // 👇 ENDPOINT IMPORTAR
    @Post('import/analyze')
    @UseInterceptors(FileInterceptor('file'))
    async analyze(@UploadedFile() file: Express.Multer.File) {
        return this.productsService.getExcelColumns(file);
    }

    // Endpoint de importación actualizado
    @Post('import/excel')
    @UseInterceptors(FileInterceptor('file'))
    async import(
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any,
        @Body() body: any
    ) {

        const tenantId = req.user.tenant?.id;
        const columnMap = body.column_map ? JSON.parse(body.column_map) : null;

        // Empaquetamos los defaults
        const parse = (val: any) => {
            if (val === undefined || val === null || String(val).trim() === '') return undefined;
            return Number(val);
        };

        const defaults = {
            categoryId: body.default_category_id || undefined,
            unitId: body.default_unit_id || undefined,

            // Usamos el helper limpio
            margin: parse(body.default_margin),
            vat: parse(body.default_vat),
            discount: parse(body.default_discount), // ¡Arreglado para descuento 0 también!

            skuPrefix: body.sku_prefix || undefined,
        };

        return this.productsService.importFromExcel(
            file,
            tenantId,
            body.provider_id,
            columnMap,
            defaults
        );
    }

    @Get(':id')
    //@RequirePermissions('products.list') // Comenta esto temporalmente para descartar permisos
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.productsService.findOne(id, req.user.tenantId);
    }

    @Patch(':id')
    @RequirePermissions('inventory.manage')
    update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
        return this.productsService.update(id, updateProductDto);
    }

    @Delete(':id')
    @RequirePermissions('inentory.manage')
    remove(@Param('id') id: string, @Query('hardDelete') hardDelete: string) {
        return this.productsService.remove(id, hardDelete === 'true');
    }

    @Patch(':id/restore')
    @RequirePermissions('inventory.manage')
    restore(@Param('id') id: string) {
        return this.productsService.restore(id);
    }
}