import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product) private repo: Repository<Product>,
    ) { }

    // 1. LISTAR CON BÚSQUEDA Y PAGINACIÓN
    async findAll(
        tenantId: string,
        page: number = 1,
        limit: number = 10,
        search: string = '',
        categoryId?: string,
        providerId?: string,
        withDeleted: boolean = false
    ) {
        const skip = (page - 1) * limit;

        const query = this.repo.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.unit', 'unit')
            .leftJoinAndSelect('product.provider', 'provider')
            .where('product.tenant_id = :tenantId', { tenantId });

        // 1. FILTROS
        if (categoryId) query.andWhere('product.category_id = :categoryId', { categoryId });
        if (providerId) query.andWhere('product.provider_id = :providerId', { providerId });

        // 2. CORRECCIÓN PAPELERA: Si withDeleted es true, mostramos TODO (no filtramos nada)
        // Si es false, mostramos solo los NO eliminados.
        if (withDeleted) {
            query.withDeleted(); // Esto trae activos + eliminados
        } else {
            query.andWhere('product.deleted_at IS NULL');
        }

        // 3. BUSCADOR (Asegúrate que estas columnas existan en la DB)
        if (search) {
            query.andWhere(
                new Brackets((qb) => { // Usamos Brackets para aislar el OR
                    qb.where('product.name ILIKE :search', { search: `%${search}%` })
                        .orWhere('product.sku ILIKE :search', { search: `%${search}%` })
                        // Si barcode no existe en DB, esta línea rompe todo. 
                        // Asegúrate de reiniciar el backend para que TypeORM cree la columna.
                        .orWhere('product.barcode ILIKE :search', { search: `%${search}%` });
                })
            );
        }

        query.orderBy('product.created_at', 'DESC').skip(skip).take(limit);

        const [data, total] = await query.getManyAndCount();
        return { data, total };
    }

    // 2. CREAR
    async create(dto: CreateProductDto, tenantId: string) {
        // Validar SKU duplicado dentro de la misma empresa
        if (dto.sku) {
            const exists = await this.repo.findOne({ where: { sku: dto.sku, tenant: { id: tenantId } } });
            if (exists) throw new BadRequestException(`El SKU ${dto.sku} ya existe.`);
        }

        const product = this.repo.create({
            ...dto,
            category: { id: dto.category_id },
            unit: { id: dto.unit_id },
            provider: dto.provider_id ? { id: dto.provider_id } : undefined,
            tenant: { id: tenantId }
        });

        return this.repo.save(product);
    }

    // 3. ACTUALIZAR
    async update(id: string, dto: any) {
        // 1. SEPARAMOS: Sacamos los IDs "sueltos" del DTO para no ensuciar el update
        const { category_id, unit_id, provider_id, ...rest } = dto;

        // 2. PREPARAMOS: Creamos el objeto limpio con el resto de datos (nombre, precios, etc.)
        const updateData: any = { ...rest };

        // 3. CONVERTIMOS: Transformamos los IDs en Objetos Relación
        if (category_id) updateData.category = { id: category_id };
        if (unit_id) updateData.unit = { id: unit_id };

        // Caso especial Proveedor: Si es undefined no lo tocamos. Si es null lo borramos. Si tiene ID lo actualizamos.
        if (provider_id !== undefined) {
            updateData.provider = provider_id ? { id: provider_id } : null;
        }

        // 4. GUARDAMOS
        await this.repo.update(id, updateData);

        return this.repo.findOne({ where: { id } });
    }

    // 4. BORRAR
    async remove(id: string, hard: boolean = false) {
        if (hard) {
            return this.repo.delete(id); // Borrado Físico
        }
        return this.repo.softDelete(id); // Borrado Lógico
    }

    async restore(id: string) {
        return this.repo.restore(id);
    }
}