import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase, PurchaseStatus } from '../entities/purchase.entity';
import { PurchaseDetail } from '../entities/purchase-detail.entity';
import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { UpdatePurchaseDto } from '../dto/update-purchase.dto';
import { ProductsService } from './products.service';
import { TenantConfig } from '../../tenants/entities/tenant-config.entity';
import { CurrentAccountService } from '../../finance/services/current-account.service';
import { MovementConcept, MovementType } from '../../finance/entities/current-account.entity';

@Injectable()
export class PurchasesService {
    constructor(
        @InjectRepository(Purchase) private purchaseRepo: Repository<Purchase>,
        @InjectRepository(PurchaseDetail) private detailRepo: Repository<PurchaseDetail>,
        @InjectRepository(TenantConfig) private settingsRepo: Repository<TenantConfig>,
        private readonly productsService: ProductsService,
        private readonly currentAccountService: CurrentAccountService
    ) { }

    // --- CREAR ---
    async create(dto: CreatePurchaseDto, tenantId: string) {
        // 1. RECOMENDACIÓN: Si la compra entra como RECIBIDA, la sucursal es OBLIGATORIA
        if (dto.status === PurchaseStatus.RECEIVED && !dto.branch_id) {
            throw new BadRequestException('Para ingresar una compra como RECIBIDA, debes seleccionar una Sucursal de destino.');
        }

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
            // Recargamos la entidad completa para tener los detalles y relaciones
            const fullPurchase = await this.findOne(savedPurchase.id, tenantId);

            // A. Impacto en Stock y Costos
            await this.impactStockAndCosts(fullPurchase, tenantId);

            // B. Generar Deuda al Proveedor
            await this.generateProviderDebt(fullPurchase, tenantId);
        }

        return this.findOne(savedPurchase.id, tenantId);
    }

    // --- ACTUALIZAR ---
    async update(id: string, dto: UpdatePurchaseDto, tenantId: string) {
        const purchase = await this.findOne(id, tenantId);

        // ⚠️ ADVERTENCIA: Este sistema simple no soporta "Deshacer stock" si editas una compra ya recibida.
        // Si editas una compra RECIBIDA, solo actualizamos datos de cabecera, no re-impactamos stock para evitar duplicados.
        
        const { items, ...headerData } = dto;
        this.purchaseRepo.merge(purchase, headerData);
        const savedPurchase = await this.purchaseRepo.save(purchase);

        // Actualizamos items solo si vienen en el DTO
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

        // Detectamos transición de BORRADOR -> RECIBIDO
        if (dto.status === PurchaseStatus.RECEIVED && purchase.status !== PurchaseStatus.RECEIVED) {
            // Validar sucursal antes de procesar
            if (!purchase.branch) {
                throw new BadRequestException('No se puede recibir la compra: Falta asignar una Sucursal.');
            }

            const fresh = await this.findOne(id, tenantId);
            await this.impactStockAndCosts(fresh, tenantId);
            await this.generateProviderDebt(fresh, tenantId);
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

    // --- FIND ALL ---
    async findAll(page: number, limit: number, filters: any, tenantId: string) {
        const query = this.purchaseRepo.createQueryBuilder('purchase')
            .leftJoinAndSelect('purchase.provider', 'provider')
            .leftJoinAndSelect('purchase.branch', 'branch')
            .where('purchase.tenant_id = :tenantId', { tenantId });

        if (filters.provider_id) query.andWhere('purchase.provider_id = :pid', { pid: filters.provider_id });
        if (filters.status) query.andWhere('purchase.status = :status', { status: filters.status });

        query.orderBy('purchase.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [data, total] = await query.getManyAndCount();
        return { data, total };
    }

    // --- HELPER: GENERAR DEUDA ---
    private async generateProviderDebt(purchase: Purchase, tenantId: string) {
        await this.currentAccountService.addMovement({
            provider: { id: purchase.provider.id } as any,
            type: MovementType.DEBIT,
            concept: MovementConcept.PURCHASE, // Asegúrate que tu enum tenga 'PURCHASE' o 'COMPRA'
            amount: purchase.total,
            description: `Compra Fac. ${purchase.invoice_number || 'S/N'}`,
            date: new Date(purchase.date), // Usamos la fecha de la factura, no hoy
            reference_id: purchase.id
        }, tenantId);
    }

    // --- LÓGICA DE IMPACTO ---
    private async impactStockAndCosts(purchase: Purchase, tenantId: string) {
        // Validacion de seguridad
        if (!purchase.branch) {
            console.error("❌ Error Crítico: Intentando impactar stock sin sucursal asignada.");
            return;
        }

        // 1. Configuración de Moneda
        let setting = await this.settingsRepo.findOne({ where: { tenant: { id: tenantId } } });
        let globalDollar = setting ? Number(setting.exchange_rate) : 1;
        if (globalDollar <= 0) globalDollar = 1;

        const purchaseRate = Number(purchase.exchange_rate) || 1;
        const purchaseCurrency = purchase.currency || 'ARS';

        if (!purchase.details) return;

        for (const detail of purchase.details) {
            // A. SUMAR STOCK
            // Ahora addStock es seguro y maneja duplicados
            await this.productsService.addStock(
                detail.product.id,
                Number(detail.quantity),
                tenantId,
                purchase.branch.id // Aquí sabemos que branch existe
            );

            // B. ACTUALIZAR PRECIOS
            const product = await this.productsService.findOne(detail.product.id, tenantId);

            if (product) {
                const productCurrency = product.currency || 'ARS';
                let newCost = Number(detail.cost);

                // Conversión de Moneda
                if (purchaseCurrency === 'ARS' && productCurrency === 'USD') {
                    if (globalDollar > 1) newCost = newCost / globalDollar;
                } 
                else if (purchaseCurrency === 'USD' && productCurrency === 'ARS') {
                    newCost = newCost * purchaseRate;
                }

                // Cálculo de Venta
                const margin = Number(product.profit_margin) || 30;
                const vat = Number(product.vat_rate) || 21;

                const netPrice = newCost * (1 + margin / 100);
                const newSalePrice = netPrice * (1 + vat / 100);

                // Guardamos usando la lógica inteligente del ProductsService
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