import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm'; // Importamos DataSource para transacciones
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CurrentAccountService } from './current-account.service';
import { ChecksService } from './checks.service';
import { PaymentOrder } from '../entities/payment-order.entity';
import { Check, CheckStatus, CheckType } from '../entities/check.entity';
import { MovementType, MovementConcept } from '../entities/current-account.entity';

@Injectable()
export class PaymentsService {
    constructor(
        private readonly accountService: CurrentAccountService,
        private readonly checksService: ChecksService,
        @InjectRepository(PaymentOrder) private paymentOrderRepo: Repository<PaymentOrder>,
        private readonly dataSource: DataSource // Inyectamos para manejar la transacción
    ) { }

    async registerPayment(dto: CreatePaymentDto, tenantId: string) {
        // Iniciamos la transacción
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { provider_id, date, observation, cash_amount, transfer_amount } = dto;

            // 1. Cálculos de Totales
            const totalCash = Number(cash_amount) || 0;
            const totalTransfer = Number(transfer_amount) || 0;
            
            // Validar y sumar cheques terceros
            let totalChecks = 0;
            const checksToUse: Check[] = [];

            if (dto.third_party_check_ids?.length) {
                for (const id of dto.third_party_check_ids) {
                    const c = await this.checksService.findOne(id, tenantId);
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

            if (grandTotal <= 0) {
                throw new BadRequestException("El monto total del pago debe ser mayor a 0.");
            }

            // 2. CREAR LA ORDEN DE PAGO (Dentro de la transacción)
            const order = queryRunner.manager.create(PaymentOrder, {
                date: new Date(date),
                total_amount: grandTotal,
                observation: observation,
                provider: { id: provider_id },
                tenant: { id: tenantId }
            });
            const savedOrder = await queryRunner.manager.save(order);

            // Helper para vincular movimientos a esta OP
            const linkToOrder = (data: any) => ({ ...data, paymentOrder: savedOrder });

            // 3. GENERAR MOVIMIENTOS

            // A. Efectivo
            if (totalCash > 0) {
                await this.accountService.addMovement(linkToOrder({
                    amount: totalCash,
                    type: MovementType.CREDIT, // Resta deuda
                    concept: MovementConcept.PAYMENT,
                    description: `Pago Efectivo (OP #${savedOrder.number})`,
                    date: new Date(date),
                    provider: { id: provider_id },
                }), tenantId, queryRunner.manager); // Pasamos el manager transaccional
            }

            // B. Transferencia
            if (totalTransfer > 0) {
                const ref = dto.transfer_reference ? `(Ref: ${dto.transfer_reference})` : '';
                await this.accountService.addMovement(linkToOrder({
                    amount: totalTransfer,
                    type: MovementType.CREDIT,
                    concept: MovementConcept.PAYMENT,
                    description: `Transferencia ${ref} (OP #${savedOrder.number})`,
                    date: new Date(date),
                    provider: { id: provider_id },
                }), tenantId, queryRunner.manager);
            }

            // C. Cheques Terceros (Salida de cartera)
            for (const check of checksToUse) {
                // Actualizamos estado del cheque
                check.status = CheckStatus.USED;
                check.provider ={ id:  provider_id } as any; // Guardamos a quién se lo dimos
                await queryRunner.manager.save(check);

                // Movimiento en Cta Cte
                await this.accountService.addMovement(linkToOrder({
                    amount: Number(check.amount),
                    type: MovementType.CREDIT,
                    concept: MovementConcept.CHECK,
                    description: `Cheque Tercero #${check.number} (Entregado)`,
                    date: new Date(date),
                    provider: { id: provider_id },
                    check: check
                }), tenantId, queryRunner.manager);
            }

            // D. Cheques Propios (Emisión)
            for (const checkDto of ownChecksToCreate) {
                // 1. Creamos el Cheque Físico en BD
                const newCheck = queryRunner.manager.create(Check, {
                    ...checkDto,
                    type: CheckType.OWN,
                    provider_id: provider_id,
                    status: CheckStatus.PENDING, // Pendiente de cobro por el proveedor
                    tenant: { id: tenantId }
                });
                const savedCheck = await queryRunner.manager.save(newCheck);

                // 2. Generamos el movimiento de pago (Aquí vinculamos la OP)
                await this.accountService.addMovement(linkToOrder({
                    amount: Number(savedCheck.amount),
                    type: MovementType.CREDIT, // Baja la deuda con el proveedor inmediatamente
                    concept: MovementConcept.CHECK,
                    description: `Cheque Propio #${savedCheck.number} (Emitido)`,
                    date: new Date(date),
                    provider: { id: provider_id },
                    check: savedCheck
                }), tenantId, queryRunner.manager);
            }

            // Confirmamos todo
            await queryRunner.commitTransaction();

            return {
                success: true,
                order: savedOrder
            };

        } catch (error) {
            // Si algo falla, deshacemos todo
            await queryRunner.rollbackTransaction();
            console.error("Error en pago:", error);
            throw error; // Relanzamos el error al controller
        } finally {
            await queryRunner.release();
        }
    }
}