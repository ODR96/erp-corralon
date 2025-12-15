import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';     // <--- CORREGIDO (../)
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantSettingsService } from './settings.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';


@Controller('settings')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class TenantSettingsController {
    constructor(private readonly service: TenantSettingsService) { }

    @Get()
    @RequirePermissions('settings.manage')
    getConfig(@Request() req: any) {
        return this.service.getConfig(req.user.tenantId);
    }

    @Patch()
    @RequirePermissions('settings.manage')
    updateConfig(@Request() req: any, @Body() body: UpdateConfigDto) {
        return this.service.updateConfig(req.user.tenantId, body);
    }
}