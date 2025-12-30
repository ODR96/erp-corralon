import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../tenants/entities/branch.entity'; // Asegúrate de tener esta ruta bien
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CashTransaction } from './cash-transaction.entity';

@Entity('cash_registers')
export class CashRegister {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => Branch)
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User; // Cajero responsable

    // --- ESTADO ---
    @Column({ type: 'varchar', default: 'OPEN' }) // OPEN, CLOSED
    status: string;

    @CreateDateColumn()
    opened_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    closed_at: Date;

    // --- MONTOS ---
    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    opening_balance: number; // Saldo inicial (Cambio)

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    current_balance: number; // Lo que el sistema calcula que hay

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    closing_balance: number; // Lo que el usuario contó al cerrar (Arqueo)

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    difference: number; // Diferencia (Sobrante/Faltante)

    @Column('text', { nullable: true })
    notes: string;

    @OneToMany(() => CashTransaction, (tx) => tx.cashRegister)
    transactions: CashTransaction[];
}