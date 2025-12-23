import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseDto } from './create-purchase.dto'; // 👈 Asegúrate que este archivo exista con este nombre
import { IsEnum, IsOptional } from 'class-validator';
import { PurchaseStatus } from '../entities/purchase.entity'; // 👈 Verifica esta ruta

export class UpdatePurchaseDto extends PartialType(CreatePurchaseDto) {
    @IsOptional()
    @IsEnum(PurchaseStatus)
    status?: PurchaseStatus;
}