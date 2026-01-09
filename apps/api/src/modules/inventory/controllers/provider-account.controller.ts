import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ProviderAccountsService } from '../services/provider-accounts.service';
import { CreateProviderAccountDto } from '../dto/create-provider-account.dto';
import { UpdateProviderAccountDto } from '../dto/update-provider-account.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('inventory/provider-accounts')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ProviderAccountsController {
    constructor(private readonly accountsService: ProviderAccountsService) { }

    @Post()
    @RequirePermissions('providers.manage')
    create(@Body() createDto: CreateProviderAccountDto, @Request() req: any) {
        return this.accountsService.create(createDto, req.user.tenant.id);
    }

    @Get('provider/:providerId')
    @RequirePermissions('providers.manage', 'stock.view')
    findAll(
        @Param('providerId') providerId: string,
        @Query('withDeleted') withDeleted: string = 'false',
        @Request() req: any
    ) {
        return this.accountsService.findAllByProvider(providerId, req.user.tenant.id, withDeleted === 'true');
    }

    @Patch(':id')
    @RequirePermissions('providers.manage')
    update(@Param('id') id: string, @Body() updateDto: UpdateProviderAccountDto, @Request() req: any) {
        return this.accountsService.update(id, updateDto, req.user.tenant.id);
    }

    @Delete(':id')
    @RequirePermissions('providers.manage')
    remove(@Param('id') id: string, @Query('hard') hard: string = 'false') {
        return this.accountsService.remove(id, hard === 'true');
    }

    @Patch(':id/restore')
    @RequirePermissions('providers.manage')
    restore(@Param('id') id: string) {
        return this.accountsService.restore(id);
    }
}