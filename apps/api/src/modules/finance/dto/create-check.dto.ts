import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';
import { CheckType, CheckStatus } from '../entities/check.entity';

export class CreateCheckDto {
    @IsString()
    @IsNotEmpty({ message: 'El número de cheque es obligatorio' })
    number: string;

    @IsString()
    @IsNotEmpty({ message: 'El banco es obligatorio' })
    bank_name: string;

    @IsString()
    @IsOptional()
    branch_office?: string;

    @IsNumber()
    @Min(0.01, { message: 'El monto debe ser mayor a 0' })
    amount: number;

    @IsDateString({}, { message: 'Formato de fecha de emisión inválido' })
    issue_date: Date;

    @IsDateString({}, { message: 'Formato de fecha de pago inválido' })
    payment_date: Date;

    @IsEnum(CheckType)
    type: CheckType; // OWN, THIRD_PARTY, ECHECK

    @IsEnum(CheckStatus)
    @IsOptional()
    status?: CheckStatus; // Por defecto será PENDING

    // --- Opcionales según el caso ---

    @IsString()
    @IsOptional()
    drawer_name?: string; // Quien me lo dio (si es de tercero)

    @IsString()
    @IsOptional()
    drawer_cuit?: string;

    @IsString()
    @IsOptional()
    client_id?: string; // ID del Cliente (si aplica)

    @IsString()
    @IsOptional()
    provider_id?: string; // ID del Proveedor (si ya nace entregado)

    @IsString()
    @IsOptional()
    recipient_name?: string; // Para los PRÉSTAMOS (Tío Jorge)

    @IsString()
    @IsOptional()
    observation?: string;
}