import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Category } from './category.entity';
import { MeasurementUnit } from './measurement-unit.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    name: string; // "Cemento Portland"

    @Column('text', { nullable: true })
    description: string;

    @Column('text', { nullable: true }) // SKU / Código de barras
    sku: string;

    // RELACIONES
    @ManyToOne(() => Category)
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @ManyToOne(() => MeasurementUnit)
    @JoinColumn({ name: 'unit_id' })
    unit: MeasurementUnit;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    // PRECIOS BASE (Luego haremos listas de precios avanzadas)
    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    cost_price: number; // Costo

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    sale_price: number; // Precio Venta

    @Column('decimal', { precision: 5, scale: 2, default: 21.00 })
    vat_rate: number; // IVA particular de este producto

    // ALERTAS
    @Column('int', { default: 0 })
    min_stock_alert: number; // Avisar si baja de X cantidad

    @Column('boolean', { default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date;
}