import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreateProviderAccountDto {
    @IsUUID()
    @IsNotEmpty()
    provider_id: string;

    @IsString()
    @IsNotEmpty({ message: 'El nombre del banco es obligatorio' })
    bank_name: string;

    @IsString()
    @IsOptional()
    @Length(22, 22, { message: 'El CBU debe tener exactamente 22 dígitos' })
    @Matches(/^[0-9]+$/, { message: 'El CBU solo debe contener números' })
    cbu?: string;

    @IsString()
    @IsOptional()
    alias?: string;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsBoolean()
    @IsOptional()
    is_primary?: boolean;
}