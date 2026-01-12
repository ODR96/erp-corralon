import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { CashRegister } from './cash-register.entity';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
    IN = 'IN',   // Ingreso
    OUT = 'OUT'  // Egreso
}

export enum TransactionConcept {
    OPENING = 'OPENING',           // Apertura
    SALE = 'SALE',                 // Venta Efectivo
    EXPENSE = 'EXPENSE',           // Gasto (ej: comprar yerba)
    WITHDRAWAL = 'WITHDRAWAL',     // Retiro de Socio
    PROVIDER_PAYMENT = 'PROVIDER', // Pago a Proveedor
    ADJUSTMENT = 'ADJUSTMENT',     // Ajuste manual
    CLOSING = 'CLOSING',            // Cierre
    REFUND = 'DEVOLUCION',
    OTHER = 'OTRO'
}

@Entity('cash_transactions')
export class CashTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => CashRegister, (box) => box.transactions)
    @JoinColumn({ name: 'cash_register_id' })
    cashRegister: CashRegister;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User; // Quién hizo el movimiento

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;

    @Column({ type: 'enum', enum: TransactionConcept })
    concept: TransactionConcept;

    @Column('decimal', { precision: 12, scale: 2 })
    amount: number;

    @Column('text', { nullable: true })
    description: string; // Ej: "Venta #123" o "Retiro para taxi"

    @Column({ nullable: true })
    reference_id: string; // ID de la Venta, Compra, etc. (Opcional)

    @CreateDateColumn()
    created_at: Date;
}