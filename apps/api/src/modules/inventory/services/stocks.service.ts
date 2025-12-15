import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { StockMovement, MovementType } from '../entities/stock-movement.entity';
import { StockAdjustmentDto } from '../dto/stock-adjustment.dto';

@Injectable()
export class StocksService {
    constructor(
        @InjectRepository(Stock) private stockRepo: Repository<Stock>,
        @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>,
        private dataSource: DataSource,
    ) { }

    async getStock(productId: string, branchId: string) {
        const stock = await this.stockRepo.findOne({
            where: { product: { id: productId }, branch: { id: branchId } },
            relations: ['product', 'branch']
        });
        return stock ? { ...stock, quantity: Number(stock.quantity) } : { quantity: 0 };
    }

    async adjustStock(dto: StockAdjustmentDto, userId: string) {
        if (!dto.quantity || Number(dto.quantity) <= 0) {
            throw new BadRequestException('La cantidad debe ser mayor a 0');
        }

        return this.dataSource.transaction(async (manager) => {
            // 1. Buscar Stock
            let stock = await manager.findOne(Stock, {
                where: { product: { id: dto.product_id }, branch: { id: dto.branch_id } }
            });

            const currentQty = stock ? Number(stock.quantity) : 0;
            const adjustment = Number(dto.quantity);
            const type = dto.type || MovementType.IN;

            let newQty = currentQty;

            if (type === MovementType.IN) {
                newQty += adjustment;
            } else {
                if (currentQty < adjustment) {
                    throw new BadRequestException(`Stock insuficiente. Tienes ${currentQty} y quieres sacar ${adjustment}.`);
                }
                newQty -= adjustment;
            }

            // 2. IMPACTAR EN DB (Sin usar .save)
            if (!stock) {
                // A) INSERT PURO (Si no existe)
                // Usamos .insert() en lugar de .save() para evitar chequeos extraños
                const insertResult = await manager.insert(Stock, {
                    product: { id: dto.product_id },
                    branch: { id: dto.branch_id },
                    quantity: newQty
                });

                // Reconstruimos el objeto stock para devolverlo (porque insert no devuelve la entidad completa)
                stock = new Stock();
                stock.id = insertResult.identifiers[0].id;
                stock.quantity = newQty;
            } else {
                // B) UPDATE PURO (Si ya existe)
                // Usamos QueryBuilder para evitar el error "UpdateValuesMissingError"
                await manager.createQueryBuilder()
                    .update(Stock)
                    .set({ quantity: newQty })
                    .where("id = :id", { id: stock.id })
                    .execute();

                stock.quantity = newQty;
            }

            // 3. GUARDAR MOVIMIENTO (Aquí estaba el conflicto)
            // CAMBIO CLAVE: Usamos .insert() en vez de .save()
            // Esto evita que TypeORM intente guardar "de rebote" el Stock modificado.
            await manager.insert(StockMovement, {
                type: type,
                quantity: adjustment,
                reason: dto.reason,
                product: { id: dto.product_id },
                branch: { id: dto.branch_id },
                user: { id: userId },
            });

            return stock;
        });
    }
}