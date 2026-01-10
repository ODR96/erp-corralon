import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { Sale, SaleType, PaymentMethod } from '../entities/sale.entity';
import { SaleDetail } from '../entities/sale-detail.entity';
import { Product } from '../../inventory/entities/product.entity';
import { Stock } from '../../inventory/entities/stock.entity';
import { StockMovement, MovementType } from '../../inventory/entities/stock-movement.entity';
import { CurrentAccountMovement, MovementType as FinMovementType, MovementConcept } from '../../finance/entities/current-account.entity';
import { Client } from '../entities/client.entity';
import { User } from '../../users/entities/user.entity';
import { CashService } from 'src/modules/finance/services/cash.service';
import { TransactionType, TransactionConcept } from '../../finance/entities/cash-transaction.entity';
import { CheckStatus, CheckType } from 'src/modules/finance/entities/check.entity';
import { ChecksService } from 'src/modules/finance/services/checks.service';
// 👇 1. IMPORTAR LA CONFIGURACIÓN
import { TenantConfig } from '../../tenants/entities/tenant-config.entity';

@Injectable()
export class SalesService {
    constructor(private dataSource: DataSource,
        private cashService: CashService,
        private checkService: ChecksService
    ) { }

    async create(dto: CreateSaleDto, tenantId: string, user: User) {

        if (!user.branch) {
            throw new BadRequestException('El usuario no tiene una sucursal asignada para descontar stock.');
        }

        return this.dataSource.transaction(async (manager) => {

            // 👇 2. OBTENER LA CONFIGURACIÓN (DENTRO DE LA TRANSACCIÓN)
            // Buscamos si "allow_negative_stock" es true o false
            const config = await manager.findOne(TenantConfig, { 
                where: { tenant: { id: tenantId } } 
            });
            // Por defecto es FALSE (no permitir) si no existe config
            const allowNegativeStock = config?.allow_negative_stock ?? false;

            // --- A. VALIDACIÓN CLIENTE ---
            let client: Client | null = null;
            if (dto.payment_method === PaymentMethod.CURRENT_ACCOUNT) {
                if (!dto.customer_tax_id) {
                    throw new BadRequestException('Para vender en Cuenta Corriente, se requiere el CUIT/DNI del cliente.');
                }
                client = await manager.findOne(Client, {
                    where: { tax_id: dto.customer_tax_id, tenant: { id: tenantId } }
                });

                if (!client) {
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

                if (dto.type !== SaleType.PRESUPUESTO) {
                    let stockRecord = await manager.findOne(Stock, {
                        where: {
                            product: { id: product.id },
                            branch: { id: user.branch?.id }
                        }
                    });

                    // 👇 LÓGICA REESTRUCTURADA PARA TYPESCRIPT 🤓
                    if (!stockRecord) {
                        // Si no existe y NO permitimos negativos -> ERROR
                        if (!allowNegativeStock) {
                            throw new BadRequestException(`No hay registro de stock inicializado para ${name} en esta sucursal.`);
                        }

                        // Si permitimos negativos -> CREAMOS LA INSTANCIA (Sin guardar aún)
                        // Usamos getRepository(Stock).create() para evitar conflictos de tipos
                        stockRecord = manager.getRepository(Stock).create({
                            product: { id: product.id },
                            branch: { id: user.branch!.id }, // El ! asegura que branch existe (ya lo validamos al inicio)
                            quantity: 0
                        });
                    }

                    // A este punto, stockRecord YA NO ES NULL (O lo encontramos o lo creamos)
                    // TypeScript ahora sabrá que existe.

                    // 2. Validación de Stock Negativo
                    // Usamos Number() por si viene como string de la DB (decimal)
                    if (!allowNegativeStock && Number(stockRecord.quantity) < item.quantity) {
                        throw new BadRequestException(`Stock insuficiente para ${name}. Disponibles: ${stockRecord.quantity}.`);
                    }

                    // 3. Restar stock
                    stockRecord.quantity = Number(stockRecord.quantity) - item.quantity;
                    
                    // 4. Guardar (Aquí se hace el INSERT o UPDATE real)
                    await manager.save(stockRecord);

                    // Generar Movimiento de Stock (KARDEX)
                    const movement = manager.create(StockMovement, {
                        type: MovementType.OUT,
                        quantity: item.quantity,
                        reason: `Venta`,
                        product: product,
                        branch: user.branch!,
                        tenant: { id: tenantId } as any,
                        user: user,
                        historical_cost: product.cost_price || 0
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

            if (dto.payment_method === PaymentMethod.CASH) {
                try {
                    await this.cashService.addTransaction({
                        type: TransactionType.IN,
                        concept: TransactionConcept.SALE,
                        amount: totalAmount,
                        description: `Venta #${savedSale.invoice_number}`
                    }, user, manager); 

                } catch (error: any) {
                    throw new BadRequestException('No se puede cobrar en EFECTIVO: ' + error.message);
                }
            }

            for (const detail of detailsToSave) {
                detail.sale = savedSale;
                await manager.save(detail);
            }

            if (dto.payment_method === PaymentMethod.CHECK) {
                if (!dto.check_details) {
                    throw new BadRequestException('Faltan los datos del cheque (banco, número, fecha cobro).');
                }

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

                await this.checkService.create({
                    number: dto.check_details.number,
                    bank_name: dto.check_details.bank_name,
                    amount: dto.check_details.amount || totalAmount,
                    issue_date: new Date(),
                    payment_date: new Date(dto.check_details.payment_date),
                    type: CheckType.THIRD_PARTY,
                    status: CheckStatus.PENDING,
                    client_id: client ? client.id : undefined,
                    drawer_name: client ? client.name : (dto.customer_name || 'Cliente Mostrador')
                }, tenantId, manager);
            }

            // --- D. IMPACTO EN CUENTA CORRIENTE ---
            if (dto.type === SaleType.VENTA && dto.payment_method === PaymentMethod.CURRENT_ACCOUNT && client) {
                const debtMovement = manager.create(CurrentAccountMovement, {
                    tenant: { id: tenantId } as any,
                    client: client,
                    type: FinMovementType.DEBIT,
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

    // ... Resto de métodos (findAll, findOne) quedan igual ...
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