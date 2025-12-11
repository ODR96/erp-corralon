import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateBranchDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional() @IsString() city?: string;     // <--- Nuevo
    @IsOptional() @IsString() state?: string;    // <--- Nuevo
    @IsOptional() @IsString() zip_code?: string

    @IsOptional()
    @IsString()
    phone?: string;
}