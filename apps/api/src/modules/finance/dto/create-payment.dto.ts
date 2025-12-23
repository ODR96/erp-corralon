import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCheckDto } from './create-check.dto';

export class CreatePaymentDto {
    @IsString()
    provider_id: string; // A quién le pagamos

    @IsDateString()
    date: string; // Fecha del pago

    @IsOptional()
    @IsString()
    observation?: string;

    // --- FORMAS DE PAGO ---

    @IsOptional()
    @IsNumber()
    @Min(0)
    cash_amount?: number; // Efectivo

    @IsOptional()
    @IsString()
    transfer_reference?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    transfer_amount?: number; // Transferencia Bancaria

    // Cheques de Terceros (Cartera) que vamos a entregar
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    third_party_check_ids?: string[];

    // Cheques Propios que vamos a emitir en el momento
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateCheckDto)
    own_checks?: CreateCheckDto[];
}