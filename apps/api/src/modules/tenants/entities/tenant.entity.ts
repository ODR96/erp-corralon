import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
// Asegúrate de que las rutas a Branch y TenantConfig sean correctas cuando las tengas
// Si aún no tienes Branch creado, puedes comentar la relación temporalmente

import { TenantConfig } from './tenant-config.entity';
import { Branch } from './branch.entity';

@Entity('tenants')
export class Tenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    name: string;

    @Column('text', { unique: true })
    slug: string;

    @Column('text', { nullable: true })
    tax_id: string;

    @Column('boolean', { default: true })
    is_active: boolean;

    @Column('int', { default: 1 }) 
    max_branches: number;

    // Relación con Sucursales
    @OneToMany(() => Branch, (branch) => branch.tenant)
    branches: Branch[];

    // Relación con Configuración (Dólar, IVA, etc)
    @OneToOne(() => TenantConfig, (config) => config.tenant)
    config: TenantConfig;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}