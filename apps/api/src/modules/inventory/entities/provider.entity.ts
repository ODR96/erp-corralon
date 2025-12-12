import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Product } from './product.entity'; // (Aún no existe la relación inversa, no te preocupes)

@Entity('providers')
export class Provider {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    name: string; // Ej: "Corralón Mayorista SA"

    @Column('text', { nullable: true })
    tax_id: string; // CUIT

    @Column('text', { nullable: true })
    contact_name: string; // "Juan el vendedor"

    @Column('text', { nullable: true })
    email: string; // Para enviar órdenes de compra automáticas a futuro

    @Column('text', { nullable: true })
    phone: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @OneToMany(() => Product, (product) => product.provider)
    products: Product[];

    @Column('boolean', { default: true })
    is_active: boolean;

    @CreateDateColumn() created_at: Date;
    @UpdateDateColumn() updated_at: Date;
    @DeleteDateColumn() deleted_at: Date;
}