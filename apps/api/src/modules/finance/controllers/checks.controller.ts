import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ChecksService } from '../services/checks.service';
import { CreateCheckDto } from '../dto/create-check.dto';
import { UpdateCheckDto } from '../dto/update-check.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CheckStatus, CheckType } from '../entities/check.entity';

@Controller('finance/checks')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ChecksController {
    constructor(private readonly checksService: ChecksService) { }

    @Post()
    @RequirePermissions('finance.manage') // Asume que creaste este permiso o usa 'sales.create' temp
    create(@Body() createDto: CreateCheckDto, @Request() req: any) {
        return this.checksService.create(createDto, req.user.tenant.id);
    }

    @Get()
    @RequirePermissions('finance.view')
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search: string = '',
        @Query('status') status: CheckStatus,
        @Query('type') type: CheckType,
        @Query('providerId') providerId: string, // 👈 Recibir
        @Query('dateFrom') dateFrom: string,     // 👈 Recibir
        @Query('dateTo') dateTo: string,         // 👈 Recibir
        @Query('hideFinalized') hideFinalized: string,
        @Request() req: any
    ) {
        return this.checksService.findAll(
            Number(page), Number(limit), req.user.tenant.id,
            search, status, type, providerId, dateFrom, dateTo, hideFinalized === 'true'
        );
    }

    @Get(':id')
    @RequirePermissions('finance.view')
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.checksService.findOne(id, req.user.tenant.id);
    }

    @Patch(':id')
    @RequirePermissions('finance.manage')
    update(@Param('id') id: string, @Body() updateDto: UpdateCheckDto, @Request() req: any) {
        return this.checksService.update(id, updateDto, req.user.tenant.id);
    }

    // Endpoint especial para Dashboard (Alertas)
    @Get('dashboard/upcoming')
    @RequirePermissions('finance.view')
    getUpcoming(@Request() req: any) {
        return this.checksService.getUpcomingPayments(req.user.tenant.id);
    }
}