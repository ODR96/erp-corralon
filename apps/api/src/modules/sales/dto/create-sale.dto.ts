import { IsEnum, IsNotEmpty, IsInt, IsNumber, IsOptional, IsString, ValidateNested, Min, IsArray, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, SaleType } from '../entities/sale.entity';
import { CheckType } from '../../finance/entities/check.entity'; // Importa esto

// --- DTO PARA DATOS DEL CHEQUE ---
class SaleCheckDetailsDto {
    @IsString()
    @IsNotEmpty()
    number: string;

    @IsString()
    @IsNotEmpty()
    bank_name: string;

    @IsDateString()
    payment_date: Date; // Fecha de cobro

    @IsNumber()
    amount: number;
}

class SaleItemDto {
    @IsUUID()
    product_id: string;

    @IsNumber()
    @Min(0.1) // No vender 0 o negativo
    quantity: number;
}

export class CreateSaleDto {
    @IsEnum(SaleType)
    @IsOptional()
    type?: SaleType;

    @IsEnum(PaymentMethod)
    payment_method: PaymentMethod;

    @IsString()
    @IsOptional()
    payment_reference?: string;

    @IsString()
    @IsOptional()
    customer_name?: string;

    @IsString()
    @IsOptional()
    customer_tax_id?: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    installments?: number;

    @IsNumber()
    @IsOptional()
    interest_amount?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SaleItemDto)
    items: SaleItemDto[];

    @IsOptional()
    @ValidateNested()
    @Type(() => SaleCheckDetailsDto)
    check_details?: SaleCheckDetailsDto;
}