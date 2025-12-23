import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { Branch } from '../../tenants/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { Tenant } from 'src/modules/tenants/entities/tenant.entity';

export enum MovementType {
    IN = 'IN',       // Compras, Devoluciones, Ajuste positivo
    OUT = 'OUT',     // Ventas, Robos, Vencimientos, Ajuste negativo
    AUDIT = 'AUDIT'  // Toma de inventario (reseteo)
}

@Entity('stock_movements')
export class StockMovement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: MovementType })
    type: MovementType;

    @Column('text')
    reason: string; // Ej: "Venta #1234", "Compra Prov. X"

    @Column('decimal', { precision: 12, scale: 3 })
    quantity: number; // Cantidad movida

    // Instantánea de costos (Opción PRO: Saber cuánto costaba cuando se movió)
    @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
    historical_cost: number;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @ManyToOne(() => Branch)
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User; // ¿Quién lo hizo?

    @CreateDateColumn()
    created_at: Date;
}