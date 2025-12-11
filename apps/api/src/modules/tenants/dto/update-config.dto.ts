import { IsString, IsNumber, IsBoolean, IsOptional, Length } from 'class-validator';

export class UpdateConfigDto {
    @IsOptional() @IsString() currency?: string;

    @IsOptional() @IsNumber() default_vat_rate?: number;

    @IsOptional() @IsNumber() default_profit_margin?: number;

    @IsOptional() @IsBoolean() allow_negative_stock?: boolean;

    @IsOptional() @IsString() legal_name?: string;

    @IsOptional() @IsString() tax_id?: string;

    @IsOptional() @IsString() fantasy_name?: string;
}