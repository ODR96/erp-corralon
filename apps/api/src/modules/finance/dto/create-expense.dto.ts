import { IsString, IsNumber, IsEnum, IsOptional, IsUUID, Min, IsDateString } from 'class-validator';
import { PaymentMethod } from '../entities/expense.entity';

export class CreateExpenseCategoryDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateExpenseDto {
    @IsUUID()
    category_id: string;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsDateString() // YYYY-MM-DD
    date: string;

    @IsString()
    description: string;

    @IsEnum(PaymentMethod)
    payment_method: PaymentMethod;

    @IsOptional()
    @IsString()
    supplier_name?: string;

    @IsOptional()
    @IsString()
    receipt_number?: string;
}