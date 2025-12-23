import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { StockMovement, MovementType } from '../entities/stock-movement.entity';
import { StockAdjustmentDto } from '../dto/stock-adjustment.dto';
import { Product } from '../entities/product.entity';

@Injectable()
export class StocksService {
    constructor(
        @InjectRepository(Stock) private stockRepo: Repository<Stock>,
        @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>,
        @InjectRepository(Product) private productRepo: Repository<Product>,
        private dataSource: DataSource,
    ) { }

    async getStock(productId: string, branchId: string) {
        const stock = await this.stockRepo.findOne({
            where: { product: { id: productId }, branch: { id: branchId } },
            relations: ['product', 'branch']
        });
        return stock ? { ...stock, quantity: Number(stock.quantity) } : { quantity: 0 };
    }

async adjustStock(dto: StockAdjustmentDto, tenantId: string, userId: string) {
        if (!dto.quantity || Number(dto.quantity) <= 0) {
            throw new BadRequestException('La cantidad debe ser mayor a 0');
        }

        return this.dataSource.transaction(async (manager) => {
            // 1. Buscar Stock existente
            let stock = await manager.findOne(Stock, {
                where: { product: { id: dto.product_id }, branch: { id: dto.branch_id } }
            });

            const currentQty = stock ? Number(stock.quantity) : 0;
            const adjustment = Number(dto.quantity);
            const type = dto.type; // 'IN' o 'OUT'

            let newQty = currentQty;

            if (type === 'IN') {
                newQty += adjustment;
            } else {
                if (currentQty < adjustment) {
                    throw new BadRequestException(`Stock insuficiente. Tienes ${currentQty} y quieres sacar ${adjustment}.`);
                }
                newQty -= adjustment;
            }

            // 2. IMPACTAR EN DB
            if (!stock) {
                // A) INSERT (Si no existe, CREAMOS CON TENANT)
                const insertResult = await manager.insert(Stock, {
                    product: { id: dto.product_id },
                    branch: { id: dto.branch_id },
                    quantity: newQty,
                    tenant: { id: tenantId } // 👈 ¡CLAVE! Sin esto, el stock queda huérfano
                });

                // Reconstruir objeto para devolverlo
                stock = new Stock();
                stock.id = insertResult.identifiers[0].id;
                stock.quantity = newQty;
            } else {
                // B) UPDATE
                await manager.createQueryBuilder()
                    .update(Stock)
                    .set({ quantity: newQty })
                    .where("id = :id", { id: stock.id })
                    .execute();
                
                stock.quantity = newQty;
            }

            // 3. GUARDAR MOVIMIENTO (Historial)
            await manager.insert(StockMovement, {
                type: type, // 'IN' o 'OUT'
                quantity: adjustment,
                reason: dto.reason,
                product: { id: dto.product_id },
                branch: { id: dto.branch_id },
                user: { id: userId },     // Quién lo hizo
                tenant: { id: tenantId }  // A qué empresa pertenece (si tienes la columna en movements)
            });

            // 4. ACTUALIZAR TOTAL EN PRODUCTO (Para que el listado se vea bien)
            // Calculamos el nuevo total sumando lo que acabamos de hacer
            // Nota: Es más seguro recalcular todo, pero dentro de la transacción
            const allStocks = await manager.find(Stock, { 
                where: { product: { id: dto.product_id } } 
            });
            // (Nota: allStocks ya incluye el cambio porque estamos en la misma transacción)
            const total = allStocks.reduce((acc, curr) => acc + Number(curr.quantity), 0);
            
            await manager.update(Product, dto.product_id, { total_stock: total });

            return stock;
        });
    }
}