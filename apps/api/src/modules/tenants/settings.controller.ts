import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';     // <--- CORREGIDO (../)
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantSettingsService } from './settings.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TenantSettingsController {
    constructor(private readonly service: TenantSettingsService) { }

    @Get()
    getConfig(@Request() req: any) {
        return this.service.getConfig(req.user.tenantId);
    }

    @Patch()
    @Roles('Super Admin', 'Admin') // Solo los jefes tocan esto
    updateConfig(@Request() req: any, @Body() body: UpdateConfigDto) {
        return this.service.updateConfig(req.user.tenantId, body);
    }
}