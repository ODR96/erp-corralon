import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export enum TaxCondition {
    RESPONSABLE_INSCRIPTO = 'RI',
    MONOTRIBUTO = 'MT',
    EXENTO = 'EX',
    CONSUMIDOR_FINAL = 'CF',
}

export class CreateProviderDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre/razón social es obligatorio' })
    name: string;

    @IsString()
    @IsOptional()
    @Length(11, 11, { message: 'El CUIT debe tener 11 dígitos (sin guiones)' })
    tax_id?: string; // CUIT

    @IsEnum(TaxCondition, { message: 'Condición de IVA inválida' })
    @IsOptional()
    tax_condition?: TaxCondition;

    @IsEmail({}, { message: 'Email inválido' })
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    observation?: string; // Para anotar "Solo recibe cheques al día", etc.
}