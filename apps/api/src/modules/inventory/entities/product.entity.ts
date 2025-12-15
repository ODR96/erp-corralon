import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Category } from './category.entity';
import { MeasurementUnit } from './measurement-unit.entity';
import { Provider } from './provider.entity';
import { Stock } from './stock.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // --- DATOS BÁSICOS ---
    @Column('text')
    name: string;

    @Column('text', { nullable: true })
    description: string;

    @Column('text', { nullable: true })
    sku: string;

    @Column('text', { nullable: true })
    barcode: string; // Código de barras

    // --- RELACIONES ---
    @ManyToOne(() => Category)
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @ManyToOne(() => MeasurementUnit)
    @JoinColumn({ name: 'unit_id' })
    unit: MeasurementUnit;

    @ManyToOne(() => Provider, (provider) => provider.products)
    @JoinColumn({ name: 'provider_id' })
    provider: Provider;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column('text', { nullable: true })
    image_url: string;

    // --- PRECIOS Y COSTOS ---
    @Column('text', { default: 'ARS' })
    currency: string; // <--- AQUÍ ESTABA EL CULPABLE

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    list_price: number; // Precio de lista proveedor

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    provider_discount: number; // Descuento %

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    cost_price: number; // Costo real

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    profit_margin: number; // Margen %

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    vat_rate: number; // IVA %

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    sale_price: number; // Precio Final


    @OneToMany(() => Stock, (stock) => stock.product)
    stocks: Stock[]

    // --- CONTROL ---
    @Column('int', { default: 0 })
    min_stock_alert: number;

    @Column('jsonb', { nullable: true })
    attributes: Record<string, any>;

    @Column('boolean', { default: true })
    is_active: boolean;

    @CreateDateColumn() created_at: Date;
    @UpdateDateColumn() updated_at: Date;
    @DeleteDateColumn() deleted_at: Date;
}