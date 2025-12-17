import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, Like } from 'typeorm';
import { Purchase, PurchaseItem, PurchaseStatus } from '../entities/purchase.entity';
import { Product } from '../entities/product.entity';
import { CurrentAccountService } from '../../finance/services/current-account.service'; // Importamos Finanzas
import { MovementType, MovementConcept } from '../../finance/entities/current-account.entity';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class PurchasesService {
    constructor(
        @InjectRepository(Purchase) private purchaseRepo: Repository<Purchase>,
        private dataSource: DataSource, // Usamos DataSource para Transacciones (Todo o nada)
        private accountService: CurrentAccountService, // Para generar deuda
    ) { }

    async create(data: any, tenantId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const branchId = data.branch_id;
            // Si no mandan estado, asumimos RECIBIDO (para mantener comportamiento anterior) o DRAFT
            const status = data.status || PurchaseStatus.RECEIVED;

            // 1. Guardar la Cabecera
            const purchase = new Purchase();
            purchase.date = data.date;
            purchase.invoice_number = data.invoice_number;
            purchase.total = data.total;
            purchase.provider = { id: data.provider_id } as any;
            purchase.observation = data.observation;
            purchase.tenant = { id: tenantId } as any;
            purchase.branch = { id: branchId } as any;
            purchase.status = status; // 👈 Guardamos el estado

            const savedPurchase = await queryRunner.manager.save(purchase);

            // 2. Guardar Ítems (Siempre se guardan los ítems, muevan stock o no)
            for (const itemDto of data.items) {
                const item = new PurchaseItem();
                item.purchase = savedPurchase;
                item.product = { id: itemDto.product_id } as any;
                item.quantity = itemDto.quantity;
                item.cost = itemDto.cost;
                item.subtotal = itemDto.quantity * itemDto.cost;
                await queryRunner.manager.save(item);
            }

            // 3. LOGICA CONDICIONAL: Solo si es RECEIVED movemos las cosas reales
            if (status === PurchaseStatus.RECEIVED) {
                await this.executeStockAndDebt(savedPurchase, data.items, branchId, tenantId, queryRunner);
            }

            await queryRunner.commitTransaction();
            return savedPurchase;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException('Error al registrar la compra: ' + err.message);
        } finally {
            await queryRunner.release();
        }
    }

    async confirmPurchase(id: string, tenantId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Buscamos la compra completa
            const purchase = await queryRunner.manager.findOne(Purchase, {
                where: { id, tenant: { id: tenantId } },
                relations: ['provider', 'branch', 'items', 'items.product'],
            });

            if (!purchase) throw new BadRequestException('Compra no encontrada');
            if (purchase.status === PurchaseStatus.RECEIVED) throw new BadRequestException('Esta compra ya fue recibida');

            // 2. Ejecutamos los movimientos
            // Necesitamos el branch_id (asumimos que está en la compra o lo sacamos de la relación)
            // Nota: Si purchase.branch es una relación, asegúrate de cargarla en el findOne o tener el ID.
            // Aquí asumiré que purchase tiene branchId accesible o lo cargamos.
            // Para este ejemplo, carguémoslo en el findOne de arriba: relations: [..., 'branch']

            await this.executeStockAndDebt(
                purchase,
                // Mapeamos los items al formato que espera la función auxiliar
                purchase.items.map(i => ({
                    product_id: i.product.id,
                    quantity: i.quantity,
                    cost: i.cost
                })),
                purchase.branch.id,
                tenantId,
                queryRunner
            );

            // 3. Cambiar estado a RECEIVED
            purchase.status = PurchaseStatus.RECEIVED;
            await queryRunner.manager.save(purchase);

            await queryRunner.commitTransaction();
            return purchase;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    private async executeStockAndDebt(purchase: Purchase, items: any[], branchId: string, tenantId: string, queryRunner: any) {

        // A. MOVER STOCK
        for (const itemDto of items) {
            // ... Lógica de Stock (buscar StockRecord, sumar, guardar) ...
            // (Copia aquí tu lógica de Stock existente)
            const stockRecord = await queryRunner.manager.findOne(Stock, {
                where: { product: { id: itemDto.product_id }, branch: { id: branchId } }
            });

            if (stockRecord) {
                stockRecord.quantity = Number(stockRecord.quantity) + Number(itemDto.quantity);
                await queryRunner.manager.save(stockRecord);
            } else {
                const newStock = new Stock();
                newStock.product = { id: itemDto.product_id } as any;
                newStock.branch = { id: branchId } as any;
                newStock.quantity = Number(itemDto.quantity);
                newStock.tenant = { id: tenantId } as any;
                await queryRunner.manager.save(newStock);
            }

            // Actualizar Costo y Precio Venta
            const product = await queryRunner.manager.findOne(Product, { where: { id: itemDto.product_id } });
            if (product) {
                product.cost_price = itemDto.cost;
                if (product.profit_margin && product.vat_rate) {
                    // ... Recalculo precio ...
                    const margin = Number(product.profit_margin) / 100;
                    const vat = Number(product.vat_rate) / 100;
                    const netPrice = Number(itemDto.cost) * (1 + margin);
                    product.sale_price = netPrice * (1 + vat);
                }
                await queryRunner.manager.save(product);
            }
        }

        // B. GENERAR DEUDA (Cta Cte)
        // Necesitamos inyectar AccountService o usarlo si ya está inyectado
        await this.accountService.addMovement({
            date: purchase.date,
            type: MovementType.DEBIT,
            concept: MovementConcept.PURCHASE,
            amount: purchase.total,
            description: `Compra Fac. ${purchase.invoice_number || 'S/N'}`,
            provider: { id: purchase.provider.id } as any, // Asegúrate de tener provider cargado
        }, tenantId);
    }

    async findAll(
        page: number,
        limit: number,
        tenantId: string,
        filters: {
            providerId?: string;
            startDate?: string;
            endDate?: string;
            sortBy?: string;
            sortOrder?: 'ASC' | 'DESC';
            status?: string;
        }
    ) {
        const query = this.purchaseRepo.createQueryBuilder('purchase')
            .leftJoinAndSelect('purchase.provider', 'provider')
            .leftJoinAndSelect('purchase.branch', 'branch')
            .leftJoinAndSelect('purchase.items', 'items')
            .leftJoinAndSelect('items.product', 'product')
            .where('purchase.tenant_id = :tenantId', { tenantId });

        // 1. Filtro por Proveedor
        if (filters.providerId) {
            query.andWhere('purchase.provider_id = :providerId', { providerId: filters.providerId });
        }

        if (filters.status) {
            query.andWhere('purchase.status = :status', { status: filters.status });
        }

        // 2. Filtro por Fechas (Rango)
        if (filters.startDate) {
            query.andWhere('purchase.date >= :startDate', { startDate: filters.startDate });
        }
        if (filters.endDate) {
            // Ajustamos para que incluya todo el día final (hasta las 23:59:59)
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            query.andWhere('purchase.date <= :endDate', { endDate: end });
        }

        // 3. Ordenamiento Dinámico
        const sortColumn = filters.sortBy || 'date'; // Por defecto fecha
        const sortOrder = filters.sortOrder || 'DESC'; // Por defecto lo más nuevo

        // Mapeamos nombres de frontend a columnas reales
        const sortMap = {
            'date': 'purchase.date',
            'total': 'purchase.total',
            'provider': 'provider.name',
            'invoice': 'purchase.invoice_number'
        };

        query.orderBy(sortMap[sortColumn] || 'purchase.date', sortOrder);
        // Desempate siempre por creación
        query.addOrderBy('purchase.created_at', 'DESC');

        // Paginación
        query.skip((page - 1) * limit).take(limit);

        const [data, total] = await query.getManyAndCount();

        return { data, total };
    }
}