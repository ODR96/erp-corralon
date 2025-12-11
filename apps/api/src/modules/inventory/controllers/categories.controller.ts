import { Controller, Get, Post, Body, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CategoriesService } from '../services/categories.service';

@Controller('inventory/categories')
@UseGuards(AuthGuard('jwt'))
export class CategoriesController {
    constructor(private readonly service: CategoriesService) { }

    @Get()
    findAll(@Request() req: any) {
        return this.service.findAll(req.user.tenantId);
    }

    @Post()
    create(@Body() body: { name: string }, @Request() req: any) {
        return this.service.create(body.name, req.user.tenantId);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}