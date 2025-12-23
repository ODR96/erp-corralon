import { IsString, IsEmail, IsNotEmpty, MinLength,IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateTenantFullDto {
    // Datos de la Empresa
    @IsString() @IsNotEmpty()
    company_name: string;

    @IsString() @IsNotEmpty()
    company_slug: string; // identificador único (ej: 'ferreteria-sur')

    @IsString() @IsNotEmpty()
    tax_id: string; // CUIT/RUT

    @IsString() @IsNotEmpty()
    address: string;

    @IsNumber()
    @IsNotEmpty() // O @IsNotEmpty si siempre lo mandas
    max_branches: number;

    @IsBoolean()
    @IsOptional()
    is_active: boolean;

    // Datos del Dueño (Primer Usuario Admin)
    @IsString() @IsNotEmpty()
    admin_full_name: string;

    @IsEmail()
    admin_email: string;

    @IsString() @MinLength(6)
    admin_password: string;
}