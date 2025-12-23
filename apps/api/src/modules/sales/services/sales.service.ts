import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { Sale, SaleType } from '../entities/sale.entity';
import { SaleDetail } from '../entities/sale-detail.entity';
import { Product } from '../../inventory/entities/product.entity';
import { Stock } from '../../inventory/entities/stock.entity'; // Asegúrate de tener esta entidad
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SalesService {
    constructor(private dataSource: DataSource) {}

async create(dto: CreateSaleDto, tenantId: string, user: User) {
        
        // 🛡️ VALIDACIÓN PREVIA: Si el usuario no tiene sucursal, no puede vender.
        if (!user.branch) {
            throw new BadRequestException('El usuario no tiene una sucursal asignada para descontar stock.');
        }

        return this.dataSource.transaction(async (manager) => {
            
            let totalAmount = 0;
            const detailsToSave: SaleDetail[] = [];

            for (const item of dto.items) {
                const product = await manager.findOne(Product, { 
                    where: { id: item.product_id, tenant: { id: tenantId } } 
                });

                if (!product) throw new NotFoundException(`Producto ${item.product_id} no encontrado`);

                // 👇 SOLUCIÓN ERROR 1: Aseguramos que price existe (o usa sell_price si así lo llamaste)
                const price = Number(product.sale_price); 
                const name = product.name;

                if (dto.type !== 'PRESUPUESTO') {
                    // 👇 SOLUCIÓN ERROR 2: TypeScript ya sabe que user.branch existe por el if de arriba,
                    // pero dentro de la transacción a veces pierde el contexto. Usamos "user.branch!.id" o "user.branch?.id"
                    const stockRecord: Stock | null = await manager.findOne(Stock, {
                        where: { 
                            product: { id: product.id }, 
                            branch: { id: user.branch?.id } // 👈 El signo de interrogación arregla el error
                        }
                    });

                    if (!stockRecord) throw new BadRequestException(`No hay registro de stock para ${name} en esta sucursal`);

                    if (Number(stockRecord.quantity) < item.quantity) {
                        throw new BadRequestException(`Stock insuficiente para ${name}. Disponibles: ${stockRecord.quantity}`);
                    }

                    stockRecord.quantity = Number(stockRecord.quantity) - item.quantity;
                    await manager.save(stockRecord);
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

            const sale = manager.create(Sale, {
                tenant: { id: tenantId } as any,
                branch: { id: user.branch?.id } as any, // 👈 Aquí también usamos ?.id
                user: user,
                type: dto.type || SaleType.VENTA, 
                payment_method: dto.payment_method,
                payment_reference: dto.payment_reference,
                customer_name: dto.customer_name || 'Consumidor Final',
                customer_tax_id: dto.customer_tax_id,
                total: totalAmount,
                status: 'COMPLETED'
            });

            const savedSale = await manager.save(sale) as Sale;

            for (const detail of detailsToSave) {
                detail.sale = savedSale;
                await manager.save(detail);
            }

            return { 
                message: 'Venta registrada con éxito', 
                sale_id: savedSale.id, 
                total: totalAmount,
                invoice_number: savedSale.invoice_number 
            };
        });
    }

    // Historial de ventas (Simple)
    async findAll(tenantId: string, branchId?: string) {
        const query = this.dataSource.getRepository(Sale)
            .createQueryBuilder('sale')
            .leftJoinAndSelect('sale.user', 'user') // Para saber quién vendió
            .where('sale.tenant_id = :tenantId', { tenantId })
            .orderBy('sale.created_at', 'DESC');

        if (branchId) {
            query.andWhere('sale.branch_id = :branchId', { branchId });
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