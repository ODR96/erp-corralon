import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product) private productRepo: Repository<Product>,
        @InjectRepository(Stock) private stockRepo: Repository<Stock>,
    ) { }

    // --- CREAR ---
    async create(createProductDto: CreateProductDto, tenantId: string) {
        const product = this.productRepo.create({
            ...createProductDto,
            category: { id: createProductDto.category_id },
            unit: { id: createProductDto.unit_id },
            provider: createProductDto.provider_id ? { id: createProductDto.provider_id } : undefined,
            tenant: { id: tenantId }
        });

        try {
            return await this.productRepo.save(product);
        } catch (error) {
            this.handleDbErrors(error);
        }
    }

    // --- LISTAR CON STOCK TOTAL ---
    async findAll(
        page: number,
        limit: number,
        tenantId: string,
        search: string,
        categoryId: string,
        providerId: string,
        withDeleted: boolean = false
    ) {
        const skip = (page - 1) * limit;

        const query = this.productRepo.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.unit', 'unit')
            .leftJoinAndSelect('product.provider', 'provider')
            .leftJoinAndSelect('product.stocks', 'stocks') // Traemos stocks para sumar
            .where('product.tenant_id = :tenantId', { tenantId });

        if (search) {
            query.andWhere('(product.name ILike :search OR product.sku ILike :search)', { search: `%${search}%` });
        }

        if (categoryId) {
            query.andWhere('category.id = :categoryId', { categoryId });
        }

        if (providerId) {
            query.andWhere('provider.id = :providerId', { providerId });
        }

        if (withDeleted) {
            query.withDeleted();
        }

        query.orderBy('product.created_at', 'DESC');

        const [products, total] = await query
            .take(limit)
            .skip(skip)
            .getManyAndCount();

        // Enriquecemos con el total de stock (suma de todas las sucursales)
        const enrichedProducts = products.map(p => {
            const totalStock = p.stocks?.reduce((sum, stock) => sum + Number(stock.quantity), 0) || 0;
            
            // Quitamos la lista detallada de stocks para no ensuciar la respuesta JSON
            const { stocks, ...productData } = p;

            return {
                ...productData,
                total_stock: totalStock
            };
        });

        return { data: enrichedProducts, total };
    }

    // --- BUSCAR UNO ---
    async findOne(id: string, tenantId?: string) {
        const query = this.productRepo.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.unit', 'unit')
            .leftJoinAndSelect('product.provider', 'provider')
            .leftJoinAndSelect('product.stocks', 'stocks')
            .leftJoinAndSelect('stocks.branch', 'branch') // Importante para ver en qué sucursal está
            .where('product.id = :id', { id });

        if (tenantId) {
            query.andWhere('product.tenant_id = :tenantId', { tenantId });
        }

        const product = await query.getOne();

        if (!product) throw new NotFoundException('Producto no encontrado');
        return product;
    }
    
    // --- ACTUALIZAR ---
    async update(id: string, updateProductDto: UpdateProductDto) {
        const product = await this.findOne(id);

        const updatedData: any = { ...updateProductDto };

        if (updateProductDto.category_id) updatedData.category = { id: updateProductDto.category_id };
        if (updateProductDto.unit_id) updatedData.unit = { id: updateProductDto.unit_id };

        if (updateProductDto.provider_id) {
            updatedData.provider = { id: updateProductDto.provider_id };
        } else if (updateProductDto.provider_id === null) {
            updatedData.provider = null;
        }

        delete updatedData.category_id;
        delete updatedData.unit_id;
        delete updatedData.provider_id;

        try {
            await this.productRepo.save({ ...product, ...updatedData });
            return this.findOne(id);
        } catch (error) {
            this.handleDbErrors(error);
        }
    }

    async remove(id: string, hard: boolean = false) {
        if (hard) return this.productRepo.delete(id);
        return this.productRepo.softDelete(id);
    }

    async restore(id: string) {
        return this.productRepo.restore(id);
    }

    // --- MOVIMIENTO DE STOCK (CORREGIDO) ---
async addStock(productId: string, quantity: number, tenantId: string, branchId?: string) {
        if (!branchId) {
            throw new BadRequestException(`No se puede mover stock del producto ${productId} sin especificar Sucursal.`);
        }

        // 1. Buscamos el registro
        // Nota: NO usamos 'withDeleted' porque tu entidad Stock no tiene soft-delete.
        let stockRecord = await this.stockRepo.findOne({
            where: {
                product: { id: productId },
                branch: { id: branchId }
                // Quitamos el filtro de tenant para asegurar que encontramos el registro físico si ya existe
            }
        });

        try {
            if (stockRecord) {
                // A. Si existe -> ACTUALIZAMOS (UPDATE)
                stockRecord.quantity = Number(stockRecord.quantity) + Number(quantity);
                // TypeORM actualiza automáticamente 'last_updated' gracias al decorador @UpdateDateColumn, 
                // pero forzarlo a veces ayuda a que detecte el cambio si la cantidad es igual.
                // stockRecord.last_updated = new Date(); 
                
                // Aseguramos que el tenant sea consistente
                stockRecord.tenant = { id: tenantId } as any; 

                return await this.stockRepo.save(stockRecord);
            } else {
                // B. Si no existe -> CREAMOS (INSERT)
                const newStock = this.stockRepo.create({
                    product: { id: productId },
                    branch: { id: branchId },
                    tenant: { id: tenantId },
                    quantity: Number(quantity)
                });

                return await this.stockRepo.save(newStock);
            }
        } catch (error) {
            // C. RED DE SEGURIDAD (CATCH)
            // Si ocurre el error "duplicate key" (23505), es porque el registro YA EXISTE
            // pero el 'findOne' de arriba no lo vio (quizás se creó milisegundos después).
            if (error.code === '23505') {
                console.warn("⚠️ Conflicto de stock duplicado resuelto automáticamente.");
                
                // Reintentamos buscando de nuevo, ahora seguro que aparece
                const retryStock = await this.stockRepo.findOne({
                    where: { product: { id: productId }, branch: { id: branchId } }
                });

                if (retryStock) {
                    retryStock.quantity = Number(retryStock.quantity) + Number(quantity);
                    return await this.stockRepo.save(retryStock);
                }
            }
            // Si es otro error, que explote para que te enteres
            console.error("Error crítico moviendo stock:", error);
            throw error;
        }
    }

    // --- ACTUALIZACIÓN DE PRECIOS AUTOMÁTICA ---
    async updateProductCosts(id: string, newCost: number, newSalePrice: number, tenantId: string) {
        const product = await this.productRepo.findOne({ where: { id, tenant: { id: tenantId } } });

        if (!product) {
            console.error(`Producto ${id} no encontrado al intentar actualizar costos.`);
            return;
        }

        // Aseguramos números
        const cost = Number(newCost);
        const sale = Number(newSalePrice);
        const discount = Number(product.provider_discount) || 0;

        product.cost_price = cost;
        product.sale_price = sale;

        // Lógica de ingeniería inversa: Si tengo descuento, infiero el precio de lista original
        if (discount > 0 && discount < 100) {
            // Lista = Costo / (1 - 0.Descuento)
            const newListPrice = cost / (1 - (discount / 100));
            product.list_price = Number(newListPrice.toFixed(2));
        } else {
            product.list_price = cost;
        }

        await this.productRepo.save(product);
        console.log(`💰 Precios actualizados para ${product.name}: Costo $${cost} -> Venta $${sale}`);
    }

    // --- MANEJO DE ERRORES ---
    private handleDbErrors(error: any) {
        if (error.code === '23505') {
            if (error.detail.includes('sku')) throw new ConflictException('Ya existe un producto con este SKU.');
            if (error.detail.includes('barcode')) throw new ConflictException('Ya existe un producto con este Código de Barras.');
            throw new ConflictException('El registro ya existe (Dato duplicado).');
        }
        throw error;
    }
}