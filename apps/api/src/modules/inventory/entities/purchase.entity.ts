import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Provider } from './provider.entity';
import { Branch } from 'src/modules/tenants/entities/branch.entity';
import { PurchaseDetail } from './purchase-detail.entity'; // 👈 La creamos en el siguiente paso

export enum PurchaseStatus {
    DRAFT = 'DRAFT',         // Borrador
    ORDERED = 'ORDERED',     // Pedido enviado
    RECEIVED = 'RECEIVED',   // Mercadería recibida (Stock sumado)
    CANCELLED = 'CANCELLED'  // Cancelada
}

@Entity('purchases')
export class Purchase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    date: Date;

    @Column({ nullable: true })
    invoice_number: string;

    @Column({
        type: 'enum',
        enum: PurchaseStatus,
        default: PurchaseStatus.DRAFT
    })
    status: PurchaseStatus;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    total: number;

    @Column({ default: 'ARS' })
    currency: string; // 'ARS' o 'USD'

    @Column('decimal', { precision: 10, scale: 2, default: 1 })
    exchange_rate: number;

    @Column({ type: 'text', nullable: true })
    observation: string;

    // --- RELACIONES ---

    @ManyToOne(() => Provider, { nullable: true })
    @JoinColumn({ name: 'provider_id' })
    provider: Provider;

    @ManyToOne(() => Branch, { nullable: true })
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    // Relación con los items de la compra
    @OneToMany(() => PurchaseDetail, (detail) => detail.purchase, { cascade: true })
    details: PurchaseDetail[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}