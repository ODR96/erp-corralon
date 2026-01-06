import { Tenant } from 'src/modules/tenants/entities/tenant.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity('measurement_units')
export class MeasurementUnit {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Tenant, { nullable: true }) 
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column('text')
    name: string;      // Ej: "Kilogramo", "Metro", "Unidad"

    @Column('text')
    short_name: string; // Ej: "kg", "m", "u"

    @Column('boolean', { default: false })
    allow_decimals: boolean; // ¿Permite 0.5? (SI para Arena, NO para Coca Cola)

    @Column('boolean', { default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date;
}