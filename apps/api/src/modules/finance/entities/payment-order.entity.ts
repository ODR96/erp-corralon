import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Provider } from '../../inventory/entities/provider.entity';
import { CurrentAccountMovement } from './current-account.entity';

@Entity('payment_orders')
export class PaymentOrder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int', generated: 'increment' })
    number: number; // Nro correlativo automático (1, 2, 3...)

    @Column({ type: 'date' })
    date: Date;

    @Column('decimal', { precision: 12, scale: 2 })
    total_amount: number;

    @Column({ type: 'text', nullable: true })
    observation: string;

    // Relaciones
    @ManyToOne(() => Provider)
    @JoinColumn({ name: 'provider_id' })
    provider: Provider;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    // Una Orden de Pago tiene varios movimientos (Efectivo, Cheque 1, Cheque 2...)
    @OneToMany(() => CurrentAccountMovement, (movement) => movement.paymentOrder)
    movements: CurrentAccountMovement[];

    @CreateDateColumn()
    created_at: Date;
}