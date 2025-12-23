import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Branch } from '../../tenants/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { SaleDetail } from './sale-detail.entity';

export enum PaymentMethod {
    CASH = 'EFECTIVO',
    DEBIT = 'DEBITO',
    CREDIT = 'CREDITO',
    TRANSFER = 'TRANSFERENCIA', // Mercado Pago / Banco
    QR = 'QR_MP',
    CHECK = 'CHEQUE', // Tu favorito
    CURRENT_ACCOUNT = 'CUENTA_CORRIENTE' // Fiado
}

export enum SaleType {
    PRESUPUESTO = 'PRESUPUESTO',
    VENTA = 'VENTA' // Esto luego será Factura A/B/C
}

@Entity('sales')
export class Sale {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int', generated: 'increment' })
    invoice_number: number; // Nro interno (ej: Venta #100)

    @Column({ type: 'enum', enum: SaleType, default: SaleType.VENTA })
    type: SaleType;

    @Column('decimal', { precision: 12, scale: 2 })
    total: number;

    @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
    payment_method: PaymentMethod;

    @Column({ type: 'varchar', nullable: true })
    payment_reference: string; // ID de Transferencia MP o Nro Cheque

    @Column({ type: 'text', nullable: true })
    customer_name: string; 
    
    @Column({ type: 'varchar', nullable: true })
    customer_tax_id: string; // CUIT/DNI del cliente

    @Column({ default: 'COMPLETED' }) 
    status: string; // COMPLETED, CANCELLED

    // --- RELACIONES ---

    @OneToMany(() => SaleDetail, (detail) => detail.sale, { cascade: true })
    details: SaleDetail[];

    @ManyToOne(() => Branch)
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}