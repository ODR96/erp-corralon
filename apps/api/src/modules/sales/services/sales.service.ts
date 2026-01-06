import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { Sale, SaleType, PaymentMethod } from '../entities/sale.entity'; // Agregamos PaymentMethod
import { SaleDetail } from '../entities/sale-detail.entity';
import { Product } from '../../inventory/entities/product.entity';
import { Stock } from '../../inventory/entities/stock.entity';
import { StockMovement, MovementType } from '../../inventory/entities/stock-movement.entity'; // Importar
import { CurrentAccountMovement, MovementType as FinMovementType, MovementConcept } from '../../finance/entities/current-account.entity'; // Importar
import { Client } from '../entities/client.entity'; // Necesitamos buscar al cliente
import { User } from '../../users/entities/user.entity';
import { CashService } from 'src/modules/finance/services/cash.service';
import { TransactionType, TransactionConcept } from '../../finance/entities/cash-transaction.entity';
import { CheckStatus, CheckType } from 'src/modules/finance/entities/check.entity';
import { ChecksService } from 'src/modules/finance/services/checks.service';

@Injectable()
export class SalesService {
    constructor(private dataSource: DataSource,
        private cashService: CashService,
        private checkService: ChecksService
    ) { }

    async create(dto: CreateSaleDto, tenantId: string, user: User) {

        // 1. VALIDACIÓN: Si no hay sucursal, no se puede vender (no sabemos de dónde descontar)
        if (!user.branch) {
            throw new BadRequestException('El usuario no tiene una sucursal asignada para descontar stock.');
        }

        return this.dataSource.transaction(async (manager) => {

            // --- A. VALIDACIÓN CLIENTE (Si es Cuenta Corriente) ---
            let client: Client | null = null;
            if (dto.payment_method === PaymentMethod.CURRENT_ACCOUNT) {
                if (!dto.customer_tax_id) {
                    throw new BadRequestException('Para vender en Cuenta Corriente, se requiere el CUIT/DNI del cliente.');
                }
                // Buscamos el cliente para asignarle la deuda
                client = await manager.findOne(Client, {
                    where: { tax_id: dto.customer_tax_id, tenant: { id: tenantId } }
                });

                if (!client) {
                    // Opcional: Podríamos crearlo automáticamente aquí, pero por seguridad mejor error.
                    throw new NotFoundException(`Cliente con CUIT ${dto.customer_tax_id} no encontrado. Regístrelo antes de fiar.`);
                }
            }

            let totalAmount = 0;
            const detailsToSave: SaleDetail[] = [];

            // --- B. PROCESAR ÍTEMS ---
            for (const item of dto.items) {
                const product = await manager.findOne(Product, {
                    where: { id: item.product_id, tenant: { id: tenantId } }
                });

                if (!product) throw new NotFoundException(`Producto ${item.product_id} no encontrado`);

                const price = Number(product.sale_price);
                const name = product.name;

                // Solo descontamos stock si NO es un presupuesto
                if (dto.type !== SaleType.PRESUPUESTO) {
                    const stockRecord = await manager.findOne(Stock, {
                        where: {
                            product: { id: product.id },
                            branch: { id: user.branch?.id }
                        }
                    });

                    if (!stockRecord) throw new BadRequestException(`No hay registro de stock para ${name} en esta sucursal`);

                    if (Number(stockRecord.quantity) < item.quantity) {
                        throw new BadRequestException(`Stock insuficiente para ${name}. Disponibles: ${stockRecord.quantity}`);
                    }

                    // 1. Descontar Stock Físico
                    stockRecord.quantity = Number(stockRecord.quantity) - item.quantity;
                    await manager.save(stockRecord);

                    // 2. Generar Movimiento de Stock (KARDEX) - ¡CRÍTICO PARA TRAZABILIDAD!
                    const movement = manager.create(StockMovement, {
                        type: MovementType.OUT, // Salida
                        quantity: item.quantity,
                        reason: `Venta`, // Se completará con el ID de venta al final si quieres, o "Venta Mostrador"
                        product: product,
                        branch: user.branch!, // Usamos la entidad completa si es posible
                        tenant: { id: tenantId } as any,
                        user: user,
                        historical_cost: product.cost_price || 0 // Guardamos costo histórico
                    });
                    await manager.save(movement);
                }

                const subtotal = price * item.quantity;
                totalAmount += subtotal;

                const detail = manager.create(SaleDetail, {
                    product: product,
                    product_name: name,
                    unit_price: price,
                    quantity: item.quantity,
                    subtotal: subtotal
                });
                detailsToSave.push(detail);
            }

            // --- C. CREAR LA VENTA ---
            const sale = manager.create(Sale, {
                tenant: { id: tenantId } as any,
                branch: { id: user.branch?.id } as any,
                user: user,
                type: dto.type || SaleType.VENTA,
                payment_method: dto.payment_method,
                payment_reference: dto.payment_reference,
                customer_name: client ? client.name : (dto.customer_name || 'Consumidor Final'),
                customer_tax_id: dto.customer_tax_id,
                total: totalAmount,
                status: 'COMPLETED'
            });

            const savedSale = await manager.save(sale);

            if (dto.payment_method === PaymentMethod.CASH) { // Usar Enum mejor que string 'EFECTIVO'
                try {
                    await this.cashService.addTransaction({
                        type: TransactionType.IN,
                        concept: TransactionConcept.SALE,
                        amount: totalAmount,
                        description: `Venta #${savedSale.invoice_number}`
                    }, user, manager); // <--- ¡AQUÍ ESTÁ LA CLAVE! Pasamos el manager

                } catch (error) {
                    throw new BadRequestException('No se puede cobrar en EFECTIVO: ' + error.message);
                }
            }

            // Guardamos los detalles vinculados a la venta
            for (const detail of detailsToSave) {
                detail.sale = savedSale;
                await manager.save(detail);
            }

            if (dto.payment_method === PaymentMethod.CHECK) {
                if (!dto.check_details) {
                    throw new BadRequestException('Faltan los datos del cheque (banco, número, fecha cobro).');
                }

                // Si hay cliente identificado, generamos primero la DEUDA (Venta) para que el cheque la cancele.
                // Así queda en la cuenta corriente:
                // 1. Debe: $100 (Venta)
                // 2. Haber: $100 (Cheque)
                // Saldo: 0.
                if (client) {
                    const saleDebt = manager.create(CurrentAccountMovement, {
                        tenant: { id: tenantId } as any,
                        client: client,
                        type: FinMovementType.DEBIT,
                        concept: MovementConcept.SALE,
                        amount: totalAmount,
                        description: `Venta #${savedSale.invoice_number} (Pago con Cheque)`,
                        date: new Date(),
                        reference_id: savedSale.id
                    });
                    await manager.save(saleDebt);
                }

                // Creamos el Cheque en Cartera (Estado PENDING)
                await this.checkService.create({
                    number: dto.check_details.number,
                    bank_name: dto.check_details.bank_name,
                    amount: dto.check_details.amount || totalAmount, // Usamos monto del cheque o total venta
                    issue_date: new Date(), // Asumimos emitido hoy
                    payment_date: new Date(dto.check_details.payment_date),
                    type: CheckType.THIRD_PARTY,
                    status: CheckStatus.PENDING,
                    client_id: client ? client.id : undefined, // Vinculamos al cliente si existe
                    drawer_name: client ? client.name : (dto.customer_name || 'Cliente Mostrador')
                }, tenantId, manager); // 👈 Pasamos manager para que sea atómico
            }

            // --- D. IMPACTO EN CUENTA CORRIENTE (Si aplica) ---
            if (dto.type === SaleType.VENTA && dto.payment_method === PaymentMethod.CURRENT_ACCOUNT && client) {
                const debtMovement = manager.create(CurrentAccountMovement, {
                    tenant: { id: tenantId } as any,
                    client: client,
                    type: FinMovementType.DEBIT, // Aumenta la deuda del cliente
                    concept: MovementConcept.SALE,
                    amount: totalAmount,
                    description: `Venta #${savedSale.invoice_number} (Fiado)`,
                    date: new Date(),
                    reference_id: savedSale.id
                });
                await manager.save(debtMovement);
            }

            return {
                message: 'Venta registrada con éxito',
                sale_id: savedSale.id,
                total: totalAmount,
                invoice_number: savedSale.invoice_number
            };
        });
    }

    // ... (El resto de métodos findAll y findOne quedan igual)
    async findAll(tenantId: string, branchId?: string, type?: string) {
        const query = this.dataSource.getRepository(Sale)
            .createQueryBuilder('sale')
            .leftJoinAndSelect('sale.user', 'user')
            .leftJoinAndSelect('sale.details', 'details')
            .where('sale.tenant_id = :tenantId', { tenantId })
            .orderBy('sale.created_at', 'DESC');

        if (branchId) query.andWhere('sale.branch_id = :branchId', { branchId });

        if (type) {
            query.andWhere('sale.type = :type', { type });
        }

        return query.getMany();
    }

    async findOne(id: string) {
        return this.dataSource.getRepository(Sale).findOne({
            where: { id },
            relations: ['details', 'details.product', 'user', 'branch']
        });
    }
}