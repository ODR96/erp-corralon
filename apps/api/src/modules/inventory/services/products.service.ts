import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Brackets } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Stock } from '../entities/stock.entity';
import * as XLSX from 'xlsx';
import { Response } from 'express';
import { MeasurementUnit } from '../entities/measurement-unit.entity';
import { Category } from '../entities/category.entity';


@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product) private productRepo: Repository<Product>,
        @InjectRepository(Stock) private stockRepo: Repository<Stock>,
        @InjectRepository(MeasurementUnit) private measurementUnitRepo: Repository<MeasurementUnit>,
        @InjectRepository(Category) private categoryRepo: Repository<Category>,
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
            .leftJoinAndSelect('product.stocks', 'stocks')
            .leftJoinAndSelect('stocks.branch', 'branch') // Lo dejamos para el cálculo, aunque luego lo quites
            .where('product.tenant_id = :tenantId', { tenantId });

        // 👇 MEJORA: Búsqueda segura por Nombre, SKU o Código de Barras
        if (search) {
            query.andWhere(
                new Brackets((qb) => {
                    qb.where('product.name ILIKE :search', { search: `%${search}%` })
                        .orWhere('product.sku ILIKE :search', { search: `%${search}%` })
                        .orWhere('product.barcode ILIKE :search', { search: `%${search}%` }); // <--- AGREGADO
                })
            );
        }

        if (categoryId) {
            query.andWhere('product.category.id = :categoryId', { categoryId });
        }

        if (providerId) {
            query.andWhere('product.provider.id = :providerId', { providerId });
        }

        if (withDeleted) {
            query.withDeleted();
        }

        query.orderBy('product.name', 'ASC');

        const [products, total] = await query
            .take(limit)
            .skip(skip)
            .getManyAndCount();

        // Enriquecemos con el total de stock
        const enrichedProducts = products.map(p => {
            const totalStock = p.stocks?.reduce((sum, stock) => sum + Number(stock.quantity), 0) || 0;

            // Quitamos la lista detallada para no ensuciar el JSON de la lista principal
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

    async exportToExcel(tenantId: string, res: Response) {
        // 1. Buscamos todos los productos (sin paginación)
        const products = await this.productRepo.find({
            where: { tenant: { id: tenantId } },
            relations: ['category', 'unit', 'stocks', 'stocks.branch']
        });

        // 2. Aplanamos los datos para el Excel
        const data = products.map(p => {
            // Calculamos stock total
            const totalStock = p.stocks?.reduce((acc, s) => acc + Number(s.quantity), 0) || 0;

            return {
                ID: p.id, // Útil para actualizar luego
                NOMBRE: p.name,
                SKU: p.sku,
                CODIGO_BARRAS: p.barcode,
                CATEGORIA: p.category?.name || 'General',
                UNIDAD: p.unit?.name || 'Unidad',
                PRECIO_COSTO: p.cost_price,
                MARGEN: p.profit_margin,
                IVA: p.vat_rate,
                PRECIO_VENTA: p.sale_price,
                STOCK_TOTAL: totalStock
            };
        });

        // 3. Generamos la hoja de cálculo
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Productos');

        // 4. Escribimos el buffer y enviamos
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=productos_${new Date().getTime()}.xlsx`,
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }

    // --- IMPORTAR DESDE EXCEL ---
    async importFromExcel(
        file: Express.Multer.File,
        tenantId: string,
        providerId?: string,
        columnMap?: any,
        defaults?: { categoryId?: string; unitId?: string; margin?: number; vat?: number; discount?: number; skuPrefix?: string }
    ) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        // Usamos raw: false para leer lo que ve el usuario, defval para no perder columnas
        const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as any[][];

        const headerRowIndex = columnMap?.headerRowIndex || 0;
        const map = columnMap?.mapping || {};

        let created = 0;
        let updated = 0;
        let errors = 0;

        const allCategories = await this.categoryRepo.find({ where: { tenant: { id: tenantId } } });
        // Asegúrate de que este repo sea de MeasurementUnit
        const allUnits = await this.measurementUnitRepo.find({ where: { tenant: { id: tenantId } } });

        const findCatId = (name: string) => allCategories.find(c => c.name.toLowerCase() === String(name).toLowerCase())?.id;
        const findUnitId = (name: string) => allUnits.find(u => u.name.toLowerCase() === String(name).toLowerCase() || u.short_name.toLowerCase() === String(name).toLowerCase())?.id;

        // --- CEREBRO BILINGÜE DE PRECIOS 🧠 ---
        const cleanPrice = (val: any): number => {
            if (!val) return 0;
            if (typeof val === 'number') return val;

            let s = String(val).trim();
            // Quitamos todo lo que no sea número, punto o coma
            s = s.replace(/[^\d.,-]/g, '');
            if (!s) return 0;

            const hasDot = s.includes('.');
            const hasComma = s.includes(',');

            if (hasDot && hasComma) {
                // Caso mixto: 1.500,00 (ARG) vs 1,500.00 (USA)
                const lastDot = s.lastIndexOf('.');
                const lastComma = s.lastIndexOf(',');

                if (lastDot > lastComma) {
                    // USA: 1,500.50 -> Quitamos comas
                    s = s.replace(/,/g, '');
                } else {
                    // ARG: 1.500,50 -> Quitamos puntos, coma a punto
                    s = s.replace(/\./g, '').replace(',', '.');
                }
            } else if (hasDot) {
                // Solo puntos: 1.500 (Mil) vs 1.5 (Uno y medio)
                const parts = s.split('.');
                // Si tiene más de un punto (1.000.000) o la parte final tiene 3 dígitos exactos (1.650)
                // Asumimos miles.
                if (parts.length > 2 || (parts.length > 1 && parts[parts.length - 1].length === 3)) {
                    s = s.replace(/\./g, '');
                }
                // Si no (10.5, 50.99), es decimal normal.
            } else if (hasComma) {
                // Solo comas: 1,500 (Mil USA) vs 1,5 (Uno y medio ARG)
                const parts = s.split(',');
                if (parts.length > 2 || (parts.length > 1 && parts[parts.length - 1].length === 3)) {
                    s = s.replace(/,/g, ''); // Era miles USA
                } else {
                    s = s.replace(',', '.'); // Era decimal ARG
                }
            }

            return parseFloat(s) || 0;
        };
        // ----------------------------------------

        for (let i = headerRowIndex + 1; i < allRows.length; i++) {
            const row = allRows[i];
            if (!row || row.length === 0) continue;

            try {
                // 1. Mapeo
                const rawName = map.name !== undefined ? row[map.name] : null;
                // Si no tiene nombre, intentamos ver si es una fila válida mirando otras columnas
                if (!rawName || String(rawName).trim().length < 2) continue;

                const rawSku = map.sku !== undefined ? row[map.sku] : null;

                // 2. Lectura de Precio con "Visión Periférica" (Fix Lista Completa)
                let rawCost = map.cost_price !== undefined ? row[map.cost_price] : 0;
                let finalCost = cleanPrice(rawCost);

                // Si dio 0, miramos a la izquierda por si es celda combinada
                if (finalCost <= 0 && map.cost_price !== undefined) {
                    const idx = Number(map.cost_price);
                    if (idx > 0) {
                        const leftVal = row[idx - 1];
                        const leftPrice = cleanPrice(leftVal);
                        if (leftPrice > 0) finalCost = leftPrice;
                    }
                }

                const name = String(rawName).trim();

                // 3. Prefijo SKU
                let finalSku: string | undefined = undefined;
                if (rawSku && String(rawSku).trim() !== '') {
                    let cleanSku = String(rawSku).trim();
                    if (defaults?.skuPrefix) {
                        cleanSku = `${defaults.skuPrefix}${cleanSku}`;
                    }
                    finalSku = cleanSku;
                }

                // 4. Extras
                const rawCat = map.category !== undefined ? String(row[map.category]).trim() : null;
                const rawUnit = map.unit !== undefined ? String(row[map.unit]).trim() : null;
                const rawVat = map.vat !== undefined ? row[map.vat] : null;
                const rawCurr = map.currency !== undefined ? row[map.currency] : null;

                // IVA y Moneda
                let vatRate = defaults?.vat ?? 21;
                if (rawVat) {
                    const v = cleanPrice(rawVat);
                    // Filtro anti-locura: IVA entre 0 y 100
                    if (v >= 0 && v <= 100) vatRate = v;
                }

                let currency = 'ARS';
                if (rawCurr) {
                    const c = String(rawCurr).toUpperCase();
                    if (c.includes('USD') || c.includes('DOLAR') || c.includes('US') || c === 'U$S') currency = 'USD';
                }

                // Cálculos
                const discount = defaults?.discount ?? 0;
                const margin = defaults?.margin ?? 30;

                const netCost = finalCost * (1 - discount / 100);
                const netPrice = netCost * (1 + margin / 100);
                const salePrice = netPrice * (1 + vatRate / 100);

                let finalCategoryId = defaults?.categoryId;
                if (rawCat && findCatId(rawCat)) finalCategoryId = findCatId(rawCat);

                let finalUnitId = defaults?.unitId;
                if (rawUnit && findUnitId(rawUnit)) finalUnitId = findUnitId(rawUnit);

                // Guardado
                let product: Product | null = null;
                if (finalSku) {
                    product = await this.productRepo.findOne({ where: { sku: finalSku, tenant: { id: tenantId } } });
                }
                // if (!product && name) {
                //     product = await this.productRepo.findOne({ where: { name, tenant: { id: tenantId } } });
                // }

                if (!product && name && providerId) {
                    product = await this.productRepo.findOne({
                        where: { name: name, provider: { id: providerId }, tenant: { id: tenantId } }
                    });
                }

                const data: any = {
                    name,
                    sku: finalSku,
                    list_price: finalCost,
                    provider_discount: discount,
                    cost_price: netCost,
                    profit_margin: margin,
                    vat_rate: vatRate,
                    sale_price: salePrice,
                    currency: currency
                };

                if (finalCategoryId) data.category = { id: finalCategoryId };
                if (finalUnitId) data.unit = { id: finalUnitId };
                if (providerId) data.provider = { id: providerId };

                if (product) {
                    await this.productRepo.update(product.id, data);
                    updated++;
                } else {
                    await this.productRepo.save(this.productRepo.create({ ...data, tenant: { id: tenantId } }));
                    created++;
                }

            } catch (e) { errors++; }
        }

        return { stats: { created, updated, errors } };
    }

    async getExcelColumns(file: Express.Multer.File) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convertimos a array para buscar la fila de headers
        const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Buscamos la fila más probable de headers (la que tenga más texto)
        let headerIndex = 0;
        let maxCols = 0;

        for (let i = 0; i < Math.min(allRows.length, 50); i++) {
            const row = allRows[i];
            const validCols = row.filter(c => typeof c === 'string').length;
            if (validCols > maxCols) {
                maxCols = validCols;
                headerIndex = i;
            }
        }

        const headers = allRows[headerIndex].map((h, index) => ({
            label: String(h).trim(),
            index: index,
            sample: allRows[headerIndex + 1]?.[index] // Muestra un dato de ejemplo
        })).filter(h => h.label); // Filtramos columnas vacías

        return { headers, headerRowIndex: headerIndex };
    }
}