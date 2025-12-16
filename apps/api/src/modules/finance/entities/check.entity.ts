import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Client } from '../../sales/entities/client.entity';
import { Provider } from '../../inventory/entities/provider.entity';

export enum CheckType {
    THIRD_PARTY = 'THIRD_PARTY', // Recibido de un cliente
    OWN = 'OWN',                 // De mi chequera
    ECHECK = 'ECHECK'            // Digital
}

export enum CheckStatus {
    PENDING = 'PENDING',       // En cartera / Emitido sin entregar
    DEPOSITED = 'DEPOSITED',   // En el banco esperando clearing
    PAID = 'PAID',             // Cobrado / Debitado de cuenta
    USED = 'USED',             // Usado para pagar a proveedor
    LENT = 'LENT',             // 👈 NUEVO: Prestado a un tercero (genera deuda a favor)
    REJECTED = 'REJECTED',     // Rebotado
    VOID = 'VOID'              // Anulado (papel roto/error)
}

@Entity('checks')
export class Check {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true }) // Ojo: unique true puede molestar si manejas varios bancos con misma numeración, evaluar cambiar a unique compuesto (number + bank_name)
    number: string;

    @Column()
    bank_name: string;

    @Column({ nullable: true })
    branch_office: string;

    @Column('decimal', { precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'date' })
    issue_date: Date; // Fecha emisión

    @Column({ type: 'date' })
    payment_date: Date; // Fecha cobro

    @Column({
        type: 'enum',
        enum: CheckType,
        default: CheckType.THIRD_PARTY
    })
    type: CheckType;

    @Column({
        type: 'enum',
        enum: CheckStatus,
        default: CheckStatus.PENDING
    })
    status: CheckStatus;

    // --- DATOS DE ORIGEN (Quien firmó el cheque) ---
    @Column({ nullable: true })
    drawer_name: string; // Firmante (Terceros)

    @Column({ nullable: true })
    drawer_cuit: string;

    // --- DATOS DE DESTINO (A quién se lo dimos) ---

    // Opción A: Se lo dimos a un Proveedor (Pago formal)
    @ManyToOne(() => Provider, { nullable: true })
    @JoinColumn({ name: 'provider_id' })
    provider: Provider;

    // Opción B: Se lo dimos a "Alguien" (Préstamo / Informal)
    @Column({ nullable: true })
    recipient_name: string; // 👈 NUEVO: Aquí pones "Tío Jorge" o "Préstamo Amigo"

    // --- RELACIONES ---
    @ManyToOne(() => Client, { nullable: true })
    @JoinColumn({ name: 'client_id' })
    client: Client; // De qué cliente vino (si es de terceros)

    @Column({ type: 'text', nullable: true })
    observation: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}