import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBranchDto {
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @IsString()
    name: string;

    @IsOptional() @IsString() address?: string;
    @IsOptional() @IsString() city?: string;     // <--- Nuevo
    @IsOptional() @IsString() state?: string;    // <--- Nuevo
    @IsOptional() @IsString() zip_code?: string; // <--- Nuevo
    @IsOptional() @IsString() phone?: string;
}