import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderAccount } from '../entities/provider-account.entity';
import { CreateProviderAccountDto } from '../dto/create-provider-account.dto';
import { UpdateProviderAccountDto } from '../dto/update-provider-account.dto';

@Injectable()
export class ProviderAccountsService {
    constructor(
        @InjectRepository(ProviderAccount) private accountRepo: Repository<ProviderAccount>,
    ) { }

    async create(createDto: CreateProviderAccountDto, tenantId: string) {
        // Si esta es primaria, quitamos el flag de primaria a las otras del mismo proveedor
        if (createDto.is_primary) {
            await this.accountRepo.update(
                { provider: { id: createDto.provider_id }, tenant: { id: tenantId } },
                { is_primary: false }
            );
        }

        const account = this.accountRepo.create({
            ...createDto,
            provider: { id: createDto.provider_id },
            tenant: { id: tenantId },
        });
        return this.accountRepo.save(account);
    }

    // Obtener cuentas de UN proveedor
    async findAllByProvider(providerId: string, tenantId: string, withDeleted: boolean = false) {
        return this.accountRepo.find({
            where: {
                provider: { id: providerId },
                tenant: { id: tenantId }
            },
            withDeleted,
            order: { is_primary: 'DESC', created_at: 'ASC' }
        });
    }

    async update(id: string, updateDto: UpdateProviderAccountDto, tenantId: string) {
        // 1. Buscamos la cuenta
        const account = await this.accountRepo.findOne({
            where: { id, tenant: { id: tenantId } },
            relations: ['provider'] // 👈 ¡ESTO FALTABA! Sin esto, no sabemos de quién es la cuenta.
        });

        if (!account) throw new NotFoundException('Cuenta no encontrada');

        // 2. Lógica de primaria: Si esta pasa a ser True, las demás pasan a False
        if (updateDto.is_primary === true) {
            await this.accountRepo.update(
                {
                    provider: { id: account.provider.id }, // Ahora sí tenemos el ID del proveedor
                    tenant: { id: tenantId }
                },
                { is_primary: false }
            );
        }

        // 3. Guardamos los cambios
        this.accountRepo.merge(account, updateDto);
        return this.accountRepo.save(account);
    }

    async remove(id: string, hard: boolean = false) {
        if (hard) return this.accountRepo.delete(id);
        return this.accountRepo.softDelete(id);
    }

    async restore(id: string) {
        return this.accountRepo.restore(id);
    }
}