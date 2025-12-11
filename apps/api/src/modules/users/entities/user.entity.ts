import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity'; // Importamos desde el otro módulo
import { Role } from '../../auth/entities/role.entity';
import { Branch } from 'src/modules/tenants/entities/branch.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    full_name: string;

    @Column('text')
    email: string;

    @Column('text')
    password_hash: string; // Aquí guardaremos la clave encriptada

    @Column('boolean', { default: false })
    is_super_admin: boolean; // Para ti, el dueño del sistema

    @Column('boolean', { default: true })
    is_active: boolean;

    // Un usuario pertenece a una Empresa
    @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => Branch, { nullable: true })
    @JoinColumn({ name: 'branch_id' })
    branch: Branch | null;

    @ManyToOne(() => Role, { nullable: true })
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamptz' })
    deleted_at: Date;
}