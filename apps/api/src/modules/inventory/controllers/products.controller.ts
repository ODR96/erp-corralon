import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Controller('inventory/products')
@UseGuards(AuthGuard('jwt'))
export class ProductsController {
    constructor(private readonly service: ProductsService) { }

    @Get()
    findAll(
        @Request() req: any,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search: string = '',
        @Query('categoryId') categoryId: string, // <--- Recibir
        @Query('providerId') providerId: string, // <--- Recibir
        @Query('withDeleted') withDeleted: string, // <--- Recibir
    ) {
        return this.service.findAll(
            req.user.tenantId,
            page,
            limit,
            search,
            categoryId,
            providerId,
            withDeleted === 'true'
        );
    }

    @Post()
    create(@Body() dto: CreateProductDto, @Request() req: any) {
        return this.service.create(dto, req.user.tenantId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateProductDto) { // <--- Usar UpdateProductDto
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Query('hard') hard: string) {
        // Convertimos el string 'true' a boolean true
        return this.service.remove(id, hard === 'true');
    }

    @Patch(':id/restore')
    restore(@Param('id') id: string) {
        return this.service.restore(id);
    }
}