import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('tenant_configs')
export class TenantConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // RELACIÓN 1 a 1: Una empresa tiene UNA configuración
    @OneToOne(() => Tenant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    // --- FINANZAS ---
    @Column('text', { default: 'ARS' })
    currency: string;

    @Column('decimal', { precision: 5, scale: 2, default: 21.00 })
    default_vat_rate: number; // IVA por defecto

    @Column('decimal', { precision: 5, scale: 2, default: 30.00 })
    default_profit_margin: number; // Margen ganancia sugerido

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    exchange_rate: number;

    @Column('int', { default: 0 }) // 0 = Exacto, 10 = Redondeo a 10, etc.
    price_rounding: number;

    // --- REGLAS DE NEGOCIO ---
    @Column('boolean', { default: false })
    allow_negative_stock: boolean; // ¿Vender sin stock?

    // --- DATOS IMPOSITIVOS / IMPRESIÓN ---
    @Column('text', { nullable: true })
    legal_name: string; // Razón Social

    @Column('text', { nullable: true })
    tax_id: string; // CUIT

    @Column('text', { nullable: true })
    fantasy_name: string; // Nombre del Kiosco/Corralón

    @Column('text', { nullable: true })
    address: string;

    @Column('text', { nullable: true })
    phone: string;

    @Column('text', { nullable: true })
    email: string;

    @UpdateDateColumn()
    updated_at: Date;
}