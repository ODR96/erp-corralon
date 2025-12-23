import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CurrentAccountService } from './current-account.service';
import { ChecksService } from './checks.service';
import { PaymentOrder } from '../entities/payment-order.entity';
// 👇 Asegúrate de tener este import
import { Check, CheckStatus, CheckType } from '../entities/check.entity';
import { MovementType, MovementConcept } from '../entities/current-account.entity';

@Injectable()
export class PaymentsService {
    constructor(
        private readonly accountService: CurrentAccountService,
        private readonly checksService: ChecksService,
        @InjectRepository(PaymentOrder) private paymentOrderRepo: Repository<PaymentOrder>,
    ) { }

    async registerPayment(dto: CreatePaymentDto, tenantId: string) {
        const { provider_id, date, observation, cash_amount, transfer_amount } = dto;

        // 1. Calcular Total
        const totalCash = cash_amount || 0;
        const totalTransfer = transfer_amount || 0;

        // Sumar cheques terceros
        let totalChecks = 0;

        // 🚨 CORRECCIÓN AQUÍ: Tipado explícito del array
        const checksToUse: Check[] = [];

        if (dto.third_party_check_ids?.length) {
            for (const id of dto.third_party_check_ids) {
                const c = await this.checksService.findOne(id, tenantId);

                // Validamos que esté disponible (opcional pero recomendado)
                if (c.status !== CheckStatus.PENDING) {
                    throw new BadRequestException(`El cheque ${c.number} no está en cartera.`);
                }

                totalChecks += Number(c.amount);
                checksToUse.push(c);
            }
        }

        // Sumar cheques propios
        const ownChecksToCreate = dto.own_checks || [];
        const totalOwn = ownChecksToCreate.reduce((acc, curr) => acc + Number(curr.amount), 0);

        const grandTotal = totalCash + totalTransfer + totalChecks + totalOwn;

        // 2. CREAR LA ORDEN DE PAGO (CABECERA)
        const order = this.paymentOrderRepo.create({
            date: new Date(date),
            total_amount: grandTotal,
            observation: observation,
            provider: { id: provider_id },
            tenant: { id: tenantId }
        });
        const savedOrder = await this.paymentOrderRepo.save(order);

        // 3. GENERAR MOVIMIENTOS
        const linkToOrder = (data: any) => ({ ...data, paymentOrder: savedOrder });

        // Efectivo
        if (totalCash > 0) {
            await this.accountService.addMovement(linkToOrder({
                amount: totalCash,
                type: MovementType.CREDIT,
                concept: MovementConcept.PAYMENT,
                description: `Pago Efectivo (OP #${savedOrder.number})`,
                date: new Date(date),
                provider: { id: provider_id },
            }), tenantId);
        }
        
        // Transferencia
        if (totalTransfer > 0) {
            const ref = dto.transfer_reference ? `(Ref: ${dto.transfer_reference})` : '';
            await this.accountService.addMovement(linkToOrder({
                amount: totalTransfer,
                type: MovementType.CREDIT,
                concept: MovementConcept.PAYMENT,
                description: `Transferencia ${ref} (OP #${savedOrder.number})`,
                date: new Date(date),
                provider: { id: provider_id },
            }), tenantId);
        }

        // Cheques Terceros (Actualizar estado + Movimiento)
        for (const check of checksToUse) {
            await this.checksService.update(check.id, { status: CheckStatus.USED, provider_id } as any, tenantId);
            await this.accountService.addMovement(linkToOrder({
                amount: Number(check.amount),
                type: MovementType.CREDIT,
                concept: MovementConcept.CHECK,
                description: `Cheque Tercero #${check.number} (OP #${savedOrder.number})`,
                date: new Date(date),
                provider: { id: provider_id },
                check: check
            }), tenantId);
        }

        // Cheques Propios
        for (const checkDto of ownChecksToCreate) {
            checkDto.type = CheckType.OWN;
            checkDto.provider_id = provider_id;
            checkDto.status = CheckStatus.PENDING;
            await this.checksService.create(checkDto, tenantId);
            // Nota: create() ya genera un movimiento, idealmente deberíamos vincularlo también a la OP aquí.
        }

        return {
            success: true,
            order: {
                ...savedOrder,
                // Corregido el acceso a la propiedad sin await innecesario
                providerName: checksToUse.length > 0 ? checksToUse[0].provider?.name : 'Proveedor'
            }
        };
    }
}