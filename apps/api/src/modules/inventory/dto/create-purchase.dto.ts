import { IsString, IsArray, IsDateString, IsOptional, IsNumber, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseStatus } from '../entities/purchase.entity';

class CreatePurchaseDetailDto {
    @IsString()
    product_id: string;

    @IsNumber()
    quantity: number;

    @IsNumber()
    cost: number;
    
    @IsOptional()
    @IsNumber()
    profit_margin?: number;

    @IsOptional()
    @IsNumber()
    vat_rate?: number;

    @IsOptional()
    @IsNumber()
    sale_price?: number;
}

export class CreatePurchaseDto {
    @IsString()
    provider_id: string;

    @IsDateString()
    date: string;

    @IsString()
    @IsOptional()
    invoice_number?: string;

    @IsString()
    @IsOptional()
    branch_id?: string;

    @IsOptional()
    @IsEnum(PurchaseStatus)
    status?: PurchaseStatus;

    @IsOptional()
    @IsNumber()
    total?: number;

    @IsString()
    @IsOptional()
    observation?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePurchaseDetailDto)
    items: CreatePurchaseDetailDto[];

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsNumber()
    exchange_rate?: number;
}