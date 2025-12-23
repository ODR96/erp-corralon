import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Purchase } from './purchase.entity';
import { Product } from './product.entity';

@Entity('purchase_details')
export class PurchaseDetail {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('decimal', { precision: 10, scale: 2 })
    quantity: number;

    @Column('decimal', { precision: 12, scale: 2 })
    cost: number; // Costo unitario al momento de la compra

    @Column('decimal', { precision: 5, scale: 2, default: 0 })
    profit_margin: number;

    @Column('decimal', { precision: 5, scale: 2, default: 0 })
    vat_rate: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    sale_price: number;

    // --- RELACIONES ---

    @ManyToOne(() => Purchase, (purchase) => purchase.details, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'purchase_id' })
    purchase: Purchase;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;
}