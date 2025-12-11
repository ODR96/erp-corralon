import { IsEmail, IsNotEmpty, MinLength, IsUUID, IsOptional } from 'class-validator';

export class CreateUserDto {
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    full_name: string;

    @IsEmail({}, { message: 'El email no es válido' })
    email: string;

    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password: string;

    @IsUUID('4', { message: 'Rol inválido' })
    roleId: string;

    @IsOptional()
    @IsUUID()
    branchId?: string;
}