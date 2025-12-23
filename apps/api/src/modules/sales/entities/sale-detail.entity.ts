import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Sale } from './sale.entity';
import { Product } from '../../inventory/entities/product.entity';

@Entity('sale_details')
export class SaleDetail {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('decimal', { precision: 10, scale: 2 })
    quantity: number;

    @Column('decimal', { precision: 10, scale: 2 })
    unit_price: number; // Precio CONGELADO al momento de la venta

    @Column('decimal', { precision: 10, scale: 2 })
    subtotal: number;

    @Column('text')
    product_name: string; // Nombre CONGELADO (por si cambia después)

    @ManyToOne(() => Sale, (sale) => sale.details, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sale_id' })
    sale: Sale;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;
}