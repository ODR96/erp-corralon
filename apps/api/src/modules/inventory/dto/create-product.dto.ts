import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, IsBoolean, Min, IsEnum } from 'class-validator';

export class CreateProductDto {
    @IsNotEmpty() @IsString()
    name: string;

    @IsOptional() @IsString()
    description?: string;

    @IsOptional() @IsString()
    sku?: string;

    @IsOptional() @IsString()
    barcode?: string; // <--- Nuevo campo que definimos

    // RELACIONES (Solo recibimos el ID)
    @IsNotEmpty() @IsUUID()
    category_id: string;

    @IsOptional()
    attributes?: Record<string, any>;

    @IsNotEmpty() @IsUUID()
    unit_id: string;

    @IsOptional() @IsUUID()
    provider_id?: string;

    // PRECIOS
    @IsOptional() @IsEnum(['ARS', 'USD'])
    currency?: string;

    @IsOptional() @IsNumber() @Min(0)
    cost_price?: number; // Costo Neto

    @IsOptional() @IsNumber() @Min(0)
    sale_price?: number; // Precio Venta Final

    @IsOptional() @IsNumber()
    profit_margin?: number; // Guardamos el margen para recalcular a futuro

    @IsOptional() @IsNumber()
    list_price?: number;

    @IsOptional() @IsNumber()
    provider_discount?: number; // Guardamos el descuento para referencia

    @IsOptional() @IsNumber()
    vat_rate?: number;

    @IsOptional() @IsNumber()
    min_stock_alert?: number;
}