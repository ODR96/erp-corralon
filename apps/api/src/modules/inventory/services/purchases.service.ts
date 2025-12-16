import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Purchase, PurchaseItem } from '../entities/purchase.entity';
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
            // Validar que venga la sucursal (branch_id)
            // Si el usuario está logueado en una sucursal, úsala. Si no, debe venir en el body.
            const branchId = data.branch_id;
            if (!branchId) throw new BadRequestException('Se requiere el ID de la sucursal (branch_id) para ingresar stock.');

            // 1. Guardar la Compra
            const purchase = new Purchase();
            purchase.date = data.date;
            purchase.invoice_number = data.invoice_number;
            purchase.total = data.total;
            purchase.provider = { id: data.provider_id } as any;
            purchase.observation = data.observation;
            purchase.tenant = { id: tenantId } as any;
            // Opcional: Vincular la compra a una sucursal si tu entidad Purchase tiene branch
            purchase.branch = { id: branchId } as any; 

            const savedPurchase = await queryRunner.manager.save(purchase);

            // 2. Procesar Ítems
            for (const itemDto of data.items) {
                // Guardar Item de Compra
                const item = new PurchaseItem();
                item.purchase = savedPurchase;
                item.product = { id: itemDto.product_id } as any;
                item.quantity = itemDto.quantity;
                item.cost = itemDto.cost;
                item.subtotal = itemDto.quantity * itemDto.cost;
                await queryRunner.manager.save(item);

                // 👇👇 AQUÍ ESTÁ EL ARREGLO 👇👇

                // Buscamos el registro de STOCK específico para ESTA sucursal y ESTE producto
                const stockRecord = await queryRunner.manager.findOne(Stock, {
                    where: {
                        product: { id: itemDto.product_id },
                        branch: { id: branchId } // 👈 Filtramos por la sucursal donde entra la mercadería
                    }
                });

                if (stockRecord) {
                    // Si ya existe stock en esa sucursal, sumamos
                    stockRecord.quantity = Number(stockRecord.quantity) + Number(itemDto.quantity);
                    await queryRunner.manager.save(stockRecord);
                } else {
                    // Si es la primera vez que entra ese producto en esa sucursal, creamos el registro
                    const newStock = new Stock();
                    newStock.product = { id: itemDto.product_id } as any;
                    newStock.branch = { id: branchId } as any; // 👈 Asignamos sucursal
                    newStock.quantity = Number(itemDto.quantity);
                    newStock.tenant = { id: tenantId } as any; // Importante el tenant
                    await queryRunner.manager.save(newStock);
                }

                // Actualizar Costo en el Producto Padre (La ficha técnica)
                // Esto está bien, el costo suele ser global o el último de compra
                const product = await queryRunner.manager.findOne(Product, { where: { id: itemDto.product_id } });
                if (product) {
                    product.cost_price = itemDto.cost;
                    await queryRunner.manager.save(product);
                }
            }

            // 3. Generar Deuda (Igual que antes)
            await this.accountService.addMovement({
                date: new Date(data.date),
                type: MovementType.DEBIT,
                concept: MovementConcept.PURCHASE,
                amount: data.total,
                description: `Compra Fac. ${data.invoice_number || 'S/N'}`,
                provider: { id: data.provider_id } as any,
            }, tenantId);

            await queryRunner.commitTransaction();
            return savedPurchase;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException('Error al registrar compra: ' + err.message);
        } finally {
            await queryRunner.release();
        }
    }

    async findAll(page: number, limit: number, tenantId: string) {
        // ... lógica simple de listado ...
        return this.purchaseRepo.findAndCount({
            where: { tenant: { id: tenantId } },
            relations: ['provider'],
            take: limit,
            skip: (page - 1) * limit,
            order: { date: 'DESC' }
        });
    }
}