import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProvidersService } from '../services/providers.service';

@Controller('inventory/providers')
@UseGuards(AuthGuard('jwt'))
export class ProvidersController {
    constructor(private readonly service: ProvidersService) { }

    @Get()
    findAll(@Request() req: any) { return this.service.findAll(req.user.tenantId); }

    @Post()
    create(@Body() body: any, @Request() req: any) { return this.service.create(body, req.user.tenantId); }
}