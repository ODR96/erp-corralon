import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class CreateTenantDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    slug: string; // Identificador único en la URL (ej: ferreteria-centro)

    @IsString()
    @IsOptional()
    tax_id?: string; // CUIT

    @IsInt()
    @IsOptional()
    @Min(1)
    max_branches?: number; // Límite del plan

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}