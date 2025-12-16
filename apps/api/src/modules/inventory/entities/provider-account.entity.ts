import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Provider } from './provider.entity';

@Entity('provider_accounts')
export class ProviderAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    bank_name: string; // Ej: Banco Galicia

    @Column({ length: 22, nullable: true })
    cbu: string; // Clave Bancaria Uniforme (22 dígitos)

    @Column({ nullable: true })
    alias: string; // Ej: CORRALON.PAGOS.GALICIA

    @Column({ default: 'ARS' })
    currency: string; // ARS, USD

    @Column({ default: false })
    is_primary: boolean; // Para saber a cuál pagar por defecto

    @ManyToOne(() => Provider, (provider) => provider.accounts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
    provider: Provider;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date;
}