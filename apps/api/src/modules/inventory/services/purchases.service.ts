import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase, PurchaseStatus } from '../entities/purchase.entity';
import { PurchaseDetail } from '../entities/purchase-detail.entity';
import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { UpdatePurchaseDto } from '../dto/update-purchase.dto';
import { ProductsService } from './products.service';
// 👇 CORRECCIÓN 1: Usamos TenantConfig porque es lo que tienes en tu Module
import { TenantConfig } from '../../tenants/entities/tenant-config.entity';

@Injectable()
export class PurchasesService {
    constructor(
        @InjectRepository(Purchase) private purchaseRepo: Repository<Purchase>,
        @InjectRepository(PurchaseDetail) private detailRepo: Repository<PurchaseDetail>,
        // 👇 CORRECCIÓN 2: Inyectamos TenantConfig (coincide con InventoryModule)
        @InjectRepository(TenantConfig) private settingsRepo: Repository<TenantConfig>,
        private readonly productsService: ProductsService,
    ) { }

    // --- CREAR ---
    async create(dto: CreatePurchaseDto, tenantId: string) {
        const purchase = this.purchaseRepo.create({
            date: new Date(dto.date),
            invoice_number: dto.invoice_number,
            observation: dto.observation,
            status: dto.status || PurchaseStatus.DRAFT,
            total: dto.total || 0,
            provider: { id: dto.provider_id },
            branch: dto.branch_id ? { id: dto.branch_id } : undefined,
            tenant: { id: tenantId },
            currency: dto.currency || 'ARS',
            exchange_rate: dto.exchange_rate || 1
        });

        const savedPurchase = await this.purchaseRepo.save(purchase);

        if (dto.items && dto.items.length > 0) {
            const details = dto.items.map(item => {
                return this.detailRepo.create({
                    purchase: savedPurchase,
                    product: { id: item.product_id },
                    quantity: item.quantity,
                    cost: item.cost,
                    profit_margin: item.profit_margin || 0,
                    vat_rate: item.vat_rate || 0,
                    sale_price: item.sale_price || 0
                });
            });
            await this.detailRepo.save(details);
        }

        // 3. Impacto (si nace ya recibida)
        if (savedPurchase.status === PurchaseStatus.RECEIVED) {
            // 👇 CORRECCIÓN CRÍTICA DEL ERROR "not iterable":
            // Recargamos la compra completa para tener los 'details' antes de llamar a impactar
            const fullPurchase = await this.findOne(savedPurchase.id, tenantId);
            await this.impactStockAndCosts(fullPurchase, tenantId);
        }

        return this.findOne(savedPurchase.id, tenantId);
    }

    // --- ACTUALIZAR ---
    async update(id: string, dto: UpdatePurchaseDto, tenantId: string) {
        const purchase = await this.findOne(id, tenantId);

        const { items, ...headerData } = dto;
        this.purchaseRepo.merge(purchase, headerData);
        const savedPurchase = await this.purchaseRepo.save(purchase);

        if (items) {
            await this.detailRepo.delete({ purchase: { id: id } });
            if (items.length > 0) {
                const newDetails = items.map(item => {
                    return this.detailRepo.create({
                        purchase: savedPurchase,
                        product: { id: item.product_id },
                        quantity: item.quantity,
                        cost: item.cost,
                        profit_margin: item.profit_margin || 0,
                        vat_rate: item.vat_rate || 0,
                        sale_price: item.sale_price || 0
                    });
                });
                await this.detailRepo.save(newDetails);
            }
        }

        if (dto.status === PurchaseStatus.RECEIVED && purchase.status !== PurchaseStatus.RECEIVED) {
            const fresh = await this.findOne(id, tenantId);
            await this.impactStockAndCosts(fresh, tenantId);
        }

        return this.findOne(id, tenantId);
    }

    // --- FIND ONE ---
    async findOne(id: string, tenantId: string) {
        const purchase = await this.purchaseRepo.findOne({
            where: { id, tenant: { id: tenantId } },
            relations: ['details', 'details.product', 'provider', 'branch']
        });
        if (!purchase) throw new NotFoundException('Compra no encontrada');
        return purchase;
    }

    // --- FIND ALL (Agregado para que no de error el controller) ---
    async findAll(page: number, limit: number, filters: any, tenantId: string) {
        const query = this.purchaseRepo.createQueryBuilder('purchase')
            .leftJoinAndSelect('purchase.provider', 'provider')
            .leftJoinAndSelect('purchase.branch', 'branch')
            .where('purchase.tenant_id = :tenantId', { tenantId });

        if (filters.provider_id) query.andWhere('purchase.provider_id = :pid', { pid: filters.provider_id });
        if (filters.status) query.andWhere('purchase.status = :status', { status: filters.status });

        query.orderBy('purchase.date', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [data, total] = await query.getManyAndCount();
        return { data, total };
    }

    // --- LÓGICA DE IMPACTO ---
private async impactStockAndCosts(purchase: Purchase, tenantId: string) {
        console.log(`🔎 Buscando Configuración para Tenant ID: "${tenantId}"`);

        // 1. Buscamos la configuración de ESTA empresa
        let setting = await this.settingsRepo.findOne({ 
            where: { tenant: { id: tenantId } } 
        });

        // 🚑 FALLBACK DE EMERGENCIA (Solo para debug/desarrollo)
        // Si no encuentra la config del tenant, agarra la primera que encuentre en la tabla
        // para que no te explote el sistema con dólar a 1.
        if (!setting) {
            console.warn("⚠️ NO SE ENCONTRÓ CONFIGURACIÓN PARA ESTE TENANT. Buscando una genérica...");
            const allSettings = await this.settingsRepo.find({ take: 1 });
            if (allSettings.length > 0) {
                setting = allSettings[0];
                console.log("✅ Usando configuración genérica encontrada (ID):", setting.id);
            }
        }

        // 2. Determinamos el valor del Dólar
        // Tu entidad usa 'exchange_rate', así que priorizamos ese campo.
        let globalDollar = 1;
        
        if (setting) {
            // Convertimos a Number porque decimal viene como string desde la BD a veces
            const rate = Number(setting.exchange_rate);
            if (rate > 0) globalDollar = rate;
        }

        console.log(`💵 Dólar Global Efectivo: $${globalDollar}`);

        if (globalDollar <= 1) {
            console.error("⛔ ALERTA ROJA: El dólar es 1 o 0. Si guardas productos en USD, se romperán los precios.");
        }

        // 3. Datos de la Compra
        const purchaseRate = Number(purchase.exchange_rate) || 1;
        const purchaseCurrency = purchase.currency || 'ARS';

        // Validación de seguridad por si TypeORM no trajo relaciones
        if (!purchase.details || !Array.isArray(purchase.details)) {
             console.warn("⚠️ La compra no tiene detalles cargados. Saltando impacto.");
             return;
        }

        for (const detail of purchase.details) {
            // A. SUMAR STOCK
            await this.productsService.addStock(
                detail.product.id,
                Number(detail.quantity),
                tenantId,
                purchase.branch?.id
            );

            // B. ACTUALIZAR PRECIOS
            const product = await this.productsService.findOne(detail.product.id);

            if (product) {
                const productCurrency = product.currency || 'ARS';
                let newCost = Number(detail.cost); // Costo tal cual vino en la factura

                console.log(`📦 ${product.name} | Base: ${productCurrency} | Fac: ${purchaseCurrency} $${newCost}`);

                // --- LÓGICA DE CONVERSIÓN ---

                // CASO 1: Factura ARS -> Producto USD (Ej: Taladro)
                // Acción: DIVIDIR por la cotización GLOBAL.
                if (purchaseCurrency === 'ARS' && productCurrency === 'USD') {
                    if (globalDollar > 1) {
                        newCost = newCost / globalDollar;
                        console.log(`🔄 ARS->USD: ${detail.cost} / ${globalDollar} = ${newCost.toFixed(2)}`);
                    } else {
                        console.warn(`❌ No se convirtió ARS->USD porque el dólar es ${globalDollar}`);
                    }
                }
                
                // CASO 2: Factura USD -> Producto ARS (Ej: Cemento)
                // Acción: MULTIPLICAR por la cotización DE LA FACTURA.
                else if (purchaseCurrency === 'USD' && productCurrency === 'ARS') {
                    newCost = newCost * purchaseRate;
                    console.log(`🔄 USD->ARS: ${detail.cost} * ${purchaseRate} = ${newCost.toFixed(2)}`);
                }

                // --- CÁLCULO DE VENTA ---
                const margin = Number(product.profit_margin) || 30;
                const vat = Number(product.vat_rate) || 21;

                const netPrice = newCost * (1 + margin / 100);
                const newSalePrice = netPrice * (1 + vat / 100);

                // Guardamos
                await this.productsService.updateProductCosts(
                    product.id,
                    newCost,
                    newSalePrice,
                    tenantId
                );
            }
        }
    }
}