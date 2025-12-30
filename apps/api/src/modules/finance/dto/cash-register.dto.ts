import { IsNumber, IsString, IsOptional, Min, IsEnum } from 'class-validator';
import { TransactionType, TransactionConcept } from '../entities/cash-transaction.entity';

export class OpenBoxDto {
    @IsNumber()
    @Min(0)
    opening_balance: number;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class CloseBoxDto {
    @IsNumber()
    @Min(0)
    closing_balance: number; // Lo que contaste

    @IsOptional()
    @IsString()
    notes?: string;
}

export class CreateMovementDto {
    @IsEnum(TransactionType)
    type: TransactionType;

    @IsEnum(TransactionConcept)
    concept: TransactionConcept;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsString()
    description: string;
}