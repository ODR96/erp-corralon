import { IsNotEmpty, IsNumber, IsString, IsEnum, IsUUID, Min, IsOptional } from 'class-validator';
import { MovementType } from '../entities/stock-movement.entity';

export class StockAdjustmentDto {
    @IsNotEmpty() @IsUUID()
    product_id: string;

    @IsNotEmpty() @IsUUID()
    branch_id: string;

    @IsNotEmpty() @IsNumber() @Min(0.001)
    quantity: number;

    @IsNotEmpty() @IsString()
    reason: string; // "Compra inicial", "Ajuste", "Venta mostrador"

    @IsOptional() @IsEnum(MovementType)
    type?: MovementType; // IN (Entrada) o OUT (Salida)
}