import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from './role.entity'; // (Dará error un segundo)

@Entity('permissions')
export class Permission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', { unique: true })
    slug: string; // Ej: 'users.create', 'stock.view'

    @Column('text')
    description: string;

    @ManyToMany(() => Role, (role) => role.permissions)
    roles: Role[];
}