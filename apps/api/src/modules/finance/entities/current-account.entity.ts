import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Client } from '../../sales/entities/client.entity';
import { Provider } from '../../inventory/entities/provider.entity';
import { Check } from './check.entity'; // Importamos la entidad que creamos recién
import { PaymentOrder } from './payment-order.entity';


export enum MovementType {
    DEBIT = 'DEBIT',   // Aumenta la deuda (Ej: Le vendí fiado / Le compré a proveedor)
    CREDIT = 'CREDIT', // Disminuye la deuda (Ej: Me pagó / Le pagué al proveedor)
}

export enum MovementConcept {
    SALE = 'SALE',             // Venta de mercadería
    PURCHASE = 'PURCHASE',     // Compra de stock
    PAYMENT = 'PAYMENT',       // Pago en efectivo/transferencia
    CHECK = 'CHECK',           // Pago/Cobro con Cheque
    ADJUSTMENT = 'ADJUSTMENT', // Ajuste manual (por error o descuento)
    INITIAL = 'INITIAL'        // Saldo inicial (migración)
}

@Entity('current_account_movements')
@Index(['tenant', 'client']) // Índices para que las consultas sean rápidas
@Index(['tenant', 'provider'])
export class CurrentAccountMovement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // FECHA REAL del movimiento (puede ser distinta a la de carga)
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    date: Date;

    @Column({
        type: 'enum',
        enum: MovementType
    })
    type: MovementType;

    @Column({
        type: 'enum',
        enum: MovementConcept
    })
    concept: MovementConcept;

    @Column('decimal', { precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'text', nullable: true })
    description: string; // Ej: "Factura A-0001" o "Pago parcial s/recibo X"

    // --- RELACIONES POLIMÓRFICAS (O es Cliente O es Proveedor) ---

    @ManyToOne(() => Client, { nullable: true })
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @ManyToOne(() => Provider, { nullable: true })
    @JoinColumn({ name: 'provider_id' })
    provider: Provider;

    // --- VINCULACIÓN CON OTRAS TABLAS (Trazabilidad) ---

    // Si el movimiento fue por un cheque, lo vinculamos
    @ManyToOne(() => Check, { nullable: true })
    @JoinColumn({ name: 'check_id' })
    check: Check;

    // Aquí a futuro vincularemos la VENTA (Sale) o la COMPRA (Purchase)
    // @ManyToOne(() => Sale, { nullable: true }) ...

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => PaymentOrder, (order) => order.movements, { nullable: true })
    @JoinColumn({ name: 'payment_order_id' })
    paymentOrder: PaymentOrder;

    @CreateDateColumn()
    created_at: Date;
}