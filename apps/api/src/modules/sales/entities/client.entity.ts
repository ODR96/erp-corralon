import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('clients')
export class Client {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string; // Nombre o Razón Social

    @Column({ nullable: true })
    tax_id: string; // DNI o CUIT

    @Column({ default: 'CF' })
    tax_condition: string; // CF, RI, MT, EX

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    address: string;

    // 💰 CRÍTICO PARA CORRALÓN: Límite de crédito en Cuenta Corriente
    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    credit_limit: number;

    @Column({ type: 'text', nullable: true })
    observation: string;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date; // Soft Delete

    // 🔒 Seguridad: El cliente pertenece a un Tenant (Organización)
    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}