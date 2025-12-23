import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
            this.handleDbErrors(error); // <--- Usamos una función auxiliar
        }
    }

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
            // 👇 TRUCO: Traemos también los stocks para sumarlos en JS (es más seguro que hacerlo en SQL directo por ahora)
            .leftJoinAndSelect('product.stocks', 'stocks')
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

        // 👇 AQUÍ CALCULAMOS EL TOTAL
        const enrichedProducts = products.map(p => {
            // Sumamos la cantidad de todos los registros de stock de este producto
            const totalStock = p.stocks?.reduce((sum, stock) => sum + Number(stock.quantity), 0) || 0;

            // Limpiamos la lista de stocks para no enviar datos basura al front, solo mandamos el total
            const { stocks, ...productData } = p;

            return {
                ...productData,
                total_stock: totalStock // <--- Campo nuevo
            };
        });

        return { data: enrichedProducts, total };
    }

    async findOne(id: string, tenantId?: string) {
        // Usamos QueryBuilder para hacer uniones (Joins) más complejas y traer el stock
        const query = this.productRepo.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.unit', 'unit')
            .leftJoinAndSelect('product.provider', 'provider')
            // 👇 ESTO ES LO IMPORTANTE: Traer stocks y la sucursal de cada stock
            .leftJoinAndSelect('product.stocks', 'stocks')
            .leftJoinAndSelect('stocks.branch', 'branch')
            .where('product.id = :id', { id });

        // Seguridad: Si pasamos tenantId, filtramos para que no vean productos de otro
        if (tenantId) {
            query.andWhere('product.tenant_id = :tenantId', { tenantId });
        }

        const product = await query.getOne();

        if (!product) throw new NotFoundException('Producto no encontrado');
        return product;
    }
    
    async update(id: string, updateProductDto: UpdateProductDto) {
        const product = await this.findOne(id);

        // Usamos 'any' temporalmente para manipular las relaciones sin pelear con TypeScript
        const updatedData: any = { ...updateProductDto };

        if (updateProductDto.category_id) updatedData.category = { id: updateProductDto.category_id };
        if (updateProductDto.unit_id) updatedData.unit = { id: updateProductDto.unit_id };

        // Aquí sí podemos usar null explícito porque estamos manipulando el objeto directamente para .save()
        if (updateProductDto.provider_id) {
            updatedData.provider = { id: updateProductDto.provider_id };
        } else if (updateProductDto.provider_id === null) {
            updatedData.provider = null;
        }

        // Limpiamos los IDs planos para no duplicar datos
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
        if (hard) {
            return this.productRepo.delete(id);
        }
        return this.productRepo.softDelete(id);
    }

    async restore(id: string) {
        return this.productRepo.restore(id);
    }

    private handleDbErrors(error: any) {
        // El código '23505' es el error de "Unique Violation" en Postgres
        if (error.code === '23505') {
            // Verificamos qué campo duplicó para ser específicos
            if (error.detail.includes('sku')) {
                throw new ConflictException('Ya existe un producto con este SKU.');
            }
            if (error.detail.includes('barcode')) {
                throw new ConflictException('Ya existe un producto con este Código de Barras.');
            }
            throw new ConflictException('El registro ya existe (Dato duplicado).');
        }
        // Si es otro error, que explote normalmente
        throw error;
    }

    async addStock(productId: string, quantity: number, tenantId: string, branchId?: string) {
        if (!branchId) {
            console.warn(`Intento de agregar stock al producto ${productId} sin especificar sucursal.`);
            return null; // O lanzar error según prefieras
        }

        // 1. Buscamos si ya existe stock para este producto en esa sucursal
        let stockRecord = await this.stockRepo.findOne({
            where: {
                product: { id: productId },
                branch: { id: branchId },
                tenant: { id: tenantId }
            }
        });

        // 2. Si no existe, lo inicializamos en 0
        if (!stockRecord) {
            stockRecord = this.stockRepo.create({
                product: { id: productId },
                branch: { id: branchId },
                quantity: 0,
                tenant: { id: tenantId }
            });
        }

        // 3. Sumamos
        stockRecord.quantity = Number(stockRecord.quantity) + Number(quantity);

        // 4. Guardamos
        return this.stockRepo.save(stockRecord);
    }

    async updateProductCosts(id: string, newCost: number, newSalePrice: number, tenantId: string) {
        // 1. Buscamos el producto completo
        const product = await this.productRepo.findOne({ where: { id, tenant: { id: tenantId } } });

        if (!product) {
            console.error(`Producto ${id} no encontrado al intentar actualizar costos.`);
            return;
        }

        // 2. Actualizamos Costo y Venta (Lo básico)
        product.cost_price = Number(newCost);
        product.sale_price = Number(newSalePrice);

        // 3. 👇 ACTUALIZACIÓN INTELIGENTE DE PRECIO LISTA
        // Si el producto tiene un descuento configurado, recalculamos el precio de lista 
        // para que coincida con el nuevo costo.
        // Fórmula: Costo = Lista * (1 - Desc/100)  --->  Lista = Costo / (1 - Desc/100)

        const discount = Number(product.provider_discount) || 0;

        if (discount > 0 && discount < 100) {
            // Evitamos división por cero si el descuento fuera 100%
            const newListPrice = newCost / (1 - (discount / 100));
            product.list_price = Number(newListPrice.toFixed(2)); // Redondeamos a 2 decimales
        } else {
            // Si no tiene descuento, el Precio Lista es igual al Costo
            product.list_price = Number(newCost);
        }

        // 4. Guardamos todo junto
        await this.productRepo.save(product);

        console.log(`✅ ${product.name} actualizado: Lista $${product.list_price} | Costo $${product.cost_price} | Venta $${product.sale_price}`);
    }
}