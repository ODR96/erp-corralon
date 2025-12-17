import { Injectable, BadRequestException } from '@nestjs/common';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CurrentAccountService } from './current-account.service';
import { ChecksService } from './checks.service';
import { MovementType, MovementConcept } from '../entities/current-account.entity';
import { CheckStatus, CheckType } from '../entities/check.entity';

@Injectable()
export class PaymentsService {
    constructor(
        private readonly accountService: CurrentAccountService,
        private readonly checksService: ChecksService
    ) {}

    async registerPayment(dto: CreatePaymentDto, tenantId: string) {
        const { provider_id, date, observation } = dto;
        const totalMovements = [];

        // 1. PAGO EN EFECTIVO 💵
        if (dto.cash_amount && dto.cash_amount > 0) {
            await this.accountService.addMovement({
                amount: dto.cash_amount,
                type: MovementType.CREDIT, // Baja deuda
                concept: MovementConcept.PAYMENT,
                description: `Pago Efectivo. ${observation || ''}`,
                date: new Date(date),
                provider: { id: provider_id } as any,
            }, tenantId);
        }

        // 2. TRANSFERENCIA 🏦
        if (dto.transfer_amount && dto.transfer_amount > 0) {
            await this.accountService.addMovement({
                amount: dto.transfer_amount,
                type: MovementType.CREDIT,
                concept: MovementConcept.PAYMENT,
                description: `Transferencia Bancaria. ${observation || ''}`,
                date: new Date(date),
                provider: { id: provider_id } as any,
            }, tenantId);
        }

        // 3. CHEQUES DE TERCEROS (Cartera) 🤝
        if (dto.third_party_check_ids && dto.third_party_check_ids.length > 0) {
            for (const checkId of dto.third_party_check_ids) {
                // Buscamos el cheque
                const check = await this.checksService.findOne(checkId, tenantId);
                
                if (check.status !== CheckStatus.PENDING) {
                    throw new BadRequestException(`El cheque ${check.number} no está en cartera (Estado: ${check.status})`);
                }

                // Actualizamos cheque: Lo marcamos como USADO y asignamos al proveedor
                await this.checksService.update(check.id, {
                    status: CheckStatus.USED,
                    provider_id: provider_id, 
                    // payment_date: new Date(date) // Opcional: ¿Cambiamos la fecha de cobro o mantenemos la original? Mejor mantener original.
                } as any, tenantId);

                // Generamos el movimiento en la Cta Cte
                await this.accountService.addMovement({
                    amount: Number(check.amount),
                    type: MovementType.CREDIT,
                    concept: MovementConcept.CHECK,
                    description: `Entrega Cheque Tercero #${check.number} (${check.bank_name})`,
                    date: new Date(date),
                    provider: { id: provider_id } as any,
                    check: { id: check.id } as any
                }, tenantId);
            }
        }

        // 4. CHEQUES PROPIOS (Emisión) ✍️
        if (dto.own_checks && dto.own_checks.length > 0) {
            for (const checkDto of dto.own_checks) {
                // Forzamos el tipo y el proveedor
                checkDto.type = CheckType.OWN;
                checkDto.provider_id = provider_id; 
                checkDto.status = CheckStatus.PENDING; // Nace pendiente de cobro

                // Usamos el servicio de cheques que ya tiene la lógica de crear el movimiento
                // (Revisamos tu checks.service.ts y SÍ tiene la lógica automática en 'create')
                await this.checksService.create(checkDto, tenantId);
            }
        }

        return { success: true, message: 'Pago registrado correctamente' };
    }
}