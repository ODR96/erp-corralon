import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    name: string; // Ej: "Vendedor", "Admin"

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    // RELACIÓN MUCHOS A MUCHOS: Un rol tiene muchos permisos
    @ManyToMany(() => Permission, (permission) => permission.roles)
    @JoinTable({
        name: 'role_permissions', // Nombre de la tabla intermedia
        joinColumn: { name: 'role_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
    })
    permissions: Permission[];
}