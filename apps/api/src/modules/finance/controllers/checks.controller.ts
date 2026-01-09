import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { ChecksService } from '../services/checks.service';
import { CreateCheckDto } from '../dto/create-check.dto';
import { UpdateCheckDto } from '../dto/update-check.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CheckStatus, CheckType } from '../entities/check.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';


@Controller('finance/checks')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ChecksController {
    constructor(private readonly checksService: ChecksService) { }

    @Get('export/excel')
    @RequirePermissions('finance.view')
    async export(@Request() req: any, @Res() res: Response) {
        const buffer = await this.checksService.exportToExcel(req.user.tenant.id);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=cheques_${Date.now()}.xlsx`,
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }

    @Post('import/excel')
    @RequirePermissions('finance.manage')
    @UseInterceptors(FileInterceptor('file'))
    async import(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
        return this.checksService.importFromExcel(file, req.user.tenant.id);
    }

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

    @Get('dashboard/outgoing')
    @RequirePermissions('finance.view') 
    getOutgoingChecks(@Request() req: any) {
        return this.checksService.getUpcomingPayments(req.user.tenant.id);
    }

    @Get('dashboard/incoming')
    @RequirePermissions('finance.view') // O el permiso que uses
    getIncomingChecks(@Request() req: any) {
        return this.checksService.getIncomingMoney(req.user.tenant.id);
    }

}