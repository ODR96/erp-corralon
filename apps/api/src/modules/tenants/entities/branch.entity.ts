import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('branches')
export class Branch {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    name: string; // Ej: "Casa Central"

    @Column('text', { nullable: true })
    address: string;

    @Column('text', { nullable: true })
    city: string; // Localidad

    @Column('text', { nullable: true })
    state: string; // Provincia

    @Column('text', { nullable: true })
    zip_code: string; // CP

    @Column('text', { nullable: true })
    phone: string;

    @Column('boolean', { default: true })
    is_active: boolean;

    // RELACIÓN: Muchas Sucursales pertenecen a Una Empresa
    @ManyToOne(() => Tenant, (tenant) => tenant.branches, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' }) // Esto crea la columna tenant_id en la BD
    tenant: Tenant;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamptz' })
    deleted_at: Date;
}