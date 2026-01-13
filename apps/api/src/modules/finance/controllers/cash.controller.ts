import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
// 👇 CAMBIO 1: Importamos AuthGuard de passport en lugar del archivo que faltaba
import { AuthGuard } from '@nestjs/passport'; 
import { CashService } from '../services/cash.service';
import { OpenBoxDto, CloseBoxDto, CreateMovementDto } from '../dto/cash-register.dto';

@Controller('finance/cash')
// 👇 CAMBIO 2: Usamos AuthGuard('jwt') directamente
@UseGuards(AuthGuard('jwt')) 
export class CashController {
    constructor(private readonly cashService: CashService) {}

    @Get('status')
    getStatus(@Request() req: any) {
        return this.cashService.getMyStatus(req.user.id);
    }

    @Post('open')
    openBox(@Request() req: any, @Body() dto: OpenBoxDto) {
        return this.cashService.openBox(dto, req.user);
    }

    @Post('close')
    closeBox(@Request() req: any, @Body() dto: CloseBoxDto) {
        return this.cashService.closeBox(dto, req.user.id);
    }

    @Get('movements')
    getMovements(@Request() req: any) {
        return this.cashService.getCurrentTransactions(req.user.id);
    }

    @Post('movement')
    manualMovement(@Request() req: any, @Body() dto: CreateMovementDto) {
        return this.cashService.addTransaction(dto, req.user);
    }
}