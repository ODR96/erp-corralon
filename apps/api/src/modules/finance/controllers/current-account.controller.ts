import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { CurrentAccountService } from '../services/current-account.service';
import { AuthGuard } from '@nestjs/passport';
import { MovementType, MovementConcept } from '../entities/current-account.entity';

@Controller('finance/current-account')
@UseGuards(AuthGuard('jwt'))
export class CurrentAccountController {
    constructor(private readonly accountService: CurrentAccountService) { }

    // 1. Obtener Estado de Cuenta de un CLIENTE
    @Get('client/:id')
    async getClientAccount(
        @Param('id') id: string,
        @Query('page') page: number = 1,
        @Request() req: any
    ) {
        const balance = await this.accountService.getBalance(req.user.tenant.id, id, true);
        const history = await this.accountService.getMovements(req.user.tenant.id, id, true, Number(page));

        return { balance, history };
    }

    // 2. Obtener Estado de Cuenta de un PROVEEDOR
    @Get('provider/:id')
    async getProviderAccount(
        @Param('id') id: string,
        @Query('page') page: number = 1,
        @Request() req: any
    ) {
        const balance = await this.accountService.getBalance(req.user.tenant.id, id, false);
        const history = await this.accountService.getMovements(req.user.tenant.id, id, false, Number(page));

        return { balance, history };
    }

    // 3. Registrar un Movimiento Manual (Ajuste, Pago en Efectivo, etc)
    @Post('movement')
    async createManualMovement(@Body() body: any, @Request() req: any) {
        if (!body.client_id && !body.provider_id) {
            throw new BadRequestException('Debe especificar Cliente o Proveedor');
        }

        return this.accountService.addMovement({
            amount: body.amount,
            type: body.type, // DEBIT o CREDIT
            concept: body.concept || MovementConcept.ADJUSTMENT,
            description: body.description,
            date: body.date || new Date(),
            client: body.client_id ? { id: body.client_id } : null,
            provider: body.provider_id ? { id: body.provider_id } : null,
        } as any, req.user.tenant.id);
    }
}