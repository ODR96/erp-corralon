import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { ExpenseCategory } from './expense-category.entity';
import { CashTransaction } from './cash-transaction.entity'; // Relación con la caja

export enum PaymentMethod {
    CASH = 'CASH',
    TRANSFER = 'TRANSFER',
    CHECK = 'CHECK'
}

@Entity('expenses')
export class Expense {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User; // Quién cargó el gasto

    @ManyToOne(() => ExpenseCategory)
    @JoinColumn({ name: 'category_id' })
    category: ExpenseCategory;

    @Column('decimal', { precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'date' })
    date: Date;

    @Column({ nullable: true })
    description: string; // Detalle: "Compra lavandina"

    @Column({ nullable: true })
    supplier_name: string; // Opcional: "Kiosco el Pepe"

    @Column({ nullable: true })
    receipt_number: string; // Opcional: Nro Factura

    @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
    payment_method: PaymentMethod;

    // Relación opcional con el movimiento de caja (si se pagó en efectivo)
    @ManyToOne(() => CashTransaction, { nullable: true })
    @JoinColumn({ name: 'cash_transaction_id' })
    cashTransaction: CashTransaction;

    @CreateDateColumn()
    created_at: Date;
}