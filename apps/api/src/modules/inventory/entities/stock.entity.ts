import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, UpdateDateColumn } from 'typeorm';
import { Product } from './product.entity';
import { Branch } from '../../tenants/entities/branch.entity';

@Entity('stocks')
@Unique(['product', 'branch']) // 🔒 Evita duplicados: Un producto solo aparece una vez por sucursal
export class Stock {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Product, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @Column('decimal', { precision: 12, scale: 3, default: 0 })
    quantity: number; // Soporta 1.5 metros de arena

    @UpdateDateColumn()
    last_updated: Date;
}