import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Provider } from './provider.entity';
import { Product } from './product.entity';
import { Branch } from 'src/modules/tenants/entities/branch.entity';

export enum PurchaseStatus {
    DRAFT = 'DRAFT',       // Borrador (Estoy armando el pedido)
    ORDERED = 'ORDERED',   // Pedido (Ya se lo mandé al proveedor, esperando mercadería)
    RECEIVED = 'RECEIVED', // Recibido (Llegó, impacta stock y cuenta corriente)
    CANCELLED = 'CANCELLED' // Cancelado
}


@Entity('purchases')
export class Purchase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'timestamp' })
    date: Date; // Fecha de la factura

    @Column({ nullable: true })
    invoice_number: string; // Ej: "0001-00004421"

    @Column('decimal', { precision: 12, scale: 2 })
    total: number; // Monto total de la compra

    @Column({ type: 'text', nullable: true })
    observation: string;

    // RELACIONES
    @ManyToOne(() => Provider)
    @JoinColumn({ name: 'provider_id' })
    provider: Provider;

    @OneToMany(() => PurchaseItem, (item) => item.purchase, { cascade: true })
    items: PurchaseItem[];

    @Column({
        type: 'enum',
        enum: PurchaseStatus,
        default: PurchaseStatus.RECEIVED // Por defecto recibido para mantener compatibilidad con lo viejo
    })
    status: PurchaseStatus;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => Branch, { nullable: true })
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @CreateDateColumn()
    created_at: Date;
}

@Entity('purchase_items')
export class PurchaseItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Purchase, (purchase) => purchase.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'purchase_id' })
    purchase: Purchase;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column('decimal', { precision: 12, scale: 2 })
    quantity: number; // Cuánto compraste

    @Column('decimal', { precision: 12, scale: 2 })
    cost: number; // A cuánto lo pagaste (Costo Unitario)

    @Column('decimal', { precision: 12, scale: 2 })
    subtotal: number; // quantity * cost
}