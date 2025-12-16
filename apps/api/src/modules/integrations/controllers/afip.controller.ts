import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AfipService } from '../services/afip.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('integrations/afip')
@UseGuards(AuthGuard('jwt')) // Solo usuarios logueados pueden consultar
export class AfipController {
    constructor(private readonly afipService: AfipService) { }

    @Get('person/:cuit')
    getPersonData(@Param('cuit') cuit: string) {
        return this.afipService.getPersonData(cuit);
    }
}