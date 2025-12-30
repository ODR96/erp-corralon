import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CashService } from '../services/cash.service';
import { OpenBoxDto, CloseBoxDto, CreateMovementDto } from '../dto/cash-register.dto';
import { TransactionType, TransactionConcept } from '../entities/cash-transaction.entity';

@Controller('finance/cash')
@UseGuards(AuthGuard('jwt'))
export class CashController {
    constructor(private readonly cashService: CashService) {}

    // GET /finance/cash/status -> ¿Está abierta? ¿Cuánto tengo?
    @Get('status')
    getStatus(@Request() req: any) {
        return this.cashService.getMyStatus(req.user.id);
    }

    // POST /finance/cash/open -> Abrir turno
    @Post('open')
    openBox(@Request() req: any, @Body() dto: OpenBoxDto) {
        return this.cashService.openBox(dto, req.user, req.user.tenant.id);
    }

    // POST /finance/cash/close -> Cerrar turno (Arqueo)
    @Post('close')
    closeBox(@Request() req: any, @Body() dto: CloseBoxDto) {
        return this.cashService.closeBox(dto, req.user.id);
    }

    // GET /finance/cash/movements -> Ver movimientos de la sesión actual
    @Get('movements')
    getMovements(@Request() req: any) {
        return this.cashService.getCurrentTransactions(req.user.id);
    }

    // POST /finance/cash/movement -> Movimiento Manual (Gasto/Retiro)
    // NOTA: Las ventas automáticas entrarán directo por servicio, no por este endpoint.
    @Post('movement')
    manualMovement(@Request() req: any, @Body() dto: CreateMovementDto) {
        // Forzamos validaciones extra si es necesario
        return this.cashService.addTransaction(dto, req.user);
    }
}