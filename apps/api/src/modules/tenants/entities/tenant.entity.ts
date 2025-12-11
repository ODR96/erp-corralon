import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Branch } from './branch.entity';

@Entity('tenants') // Nombre de la tabla en la BD
export class Tenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    name: string;

    @Column('text', { unique: true })
    slug: string; // Ejemplo: 'corralon-norte' (para la URL)

    @Column('text', { nullable: true }) // Puede estar vacío
    tax_id: string; // CUIT

    @Column('boolean', { default: true })
    is_active: boolean;

    @OneToMany(() => Branch, (branch) => branch.tenant)
    branches: Branch[];

    @Column('int', { default: 1 }) // Por defecto, solo pueden tener 1 (Casa Central)
    max_branches: number;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}