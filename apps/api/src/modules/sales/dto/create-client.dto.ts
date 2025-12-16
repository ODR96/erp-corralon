import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';

export class CreateClientDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    name: string;

    @IsString()
    @IsOptional()
    tax_id?: string;

    @IsString()
    @IsOptional()
    tax_condition?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsNumber()
    @IsOptional()
    @Min(0, { message: 'El límite de crédito no puede ser negativo' })
    credit_limit?: number;

    @IsString()
    @IsOptional()
    observation?: string;
}