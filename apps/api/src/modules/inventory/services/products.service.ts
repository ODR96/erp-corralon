import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product) private productRepo: Repository<Product>,
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

    async findOne(id: string) {
        const product = await this.productRepo.findOne({
            where: { id },
            relations: ['category', 'unit', 'provider']
        });
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
}