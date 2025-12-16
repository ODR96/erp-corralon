import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Product } from './product.entity';
import { ProviderAccount } from './provider-account.entity';
// import { Product } from './product.entity'; // Descomentar cuando quieras relacionar productos
// import { Check } from '../../finance/entities/check.entity'; // FASE FUTURA: Cheques

@Entity('providers')
export class Provider {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    tax_id: string; // CUIT

    @Column({ nullable: true })
    tax_condition: string; // RI, MT, etc.

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    address: string;

    @Column({ type: 'text', nullable: true })
    observation: string;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date;

    @OneToMany(() => ProviderAccount, (account) => account.provider)
    accounts: ProviderAccount[];

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @OneToMany(() => Product, (product) => product.provider)
    products: Product[];
}