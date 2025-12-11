import { IsEmail, IsOptional, MinLength, IsUUID, IsBoolean } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    full_name?: string;

    @IsOptional()
    @IsEmail({}, { message: 'Email inválido' })
    email?: string;

    @IsOptional()
    @MinLength(6, { message: 'La contraseña es muy corta' })
    password?: string;

    @IsOptional()
    @IsUUID()
    roleId?: string;

    @IsOptional()
    @IsUUID()
    branchId?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}