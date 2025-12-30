import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Client } from '../entities/client.entity';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';

@Injectable()
export class ClientsService {
    constructor(
        @InjectRepository(Client) private clientRepo: Repository<Client>,
    ) { }

    async create(createDto: CreateClientDto, tenantId: string) {
        const client = this.clientRepo.create({
            ...createDto,
            tenant: { id: tenantId },
        });
        return this.clientRepo.save(client);
    }

    async findAll(page: number, limit: number, tenantId: string, search: string, withDeleted: boolean = false) {
        const skip = (page - 1) * limit;

        // LÓGICA DE BÚSQUEDA AVANZADA (Fix)
        // Por defecto filtramos por Tenant
        let where: any = { tenant: { id: tenantId } };

        if (search) {
            // Si hay búsqueda, transformamos 'where' en un Array para hacer un OR
            // SQL equivalente: WHERE (tenant_id = X AND business_name LIKE %Y%) OR (tenant_id = X AND tax_id LIKE %Y%)
            where = [
                { 
                    tenant: { id: tenantId }, 
                    name: ILike(`%${search}%`) 
                },
                { 
                    tenant: { id: tenantId }, 
                    tax_id: ILike(`%${search}%`) // Ahora busca por DNI/CUIT también
                }
            ];
        }

        const [data, total] = await this.clientRepo.findAndCount({
            where,
            take: limit,
            skip,
            withDeleted,
            order: { created_at: 'DESC' },
        });

        return { data, total };
    }

    async findOne(id: string, tenantId: string) {
        const client = await this.clientRepo.findOne({
            where: { id, tenant: { id: tenantId } }
        });
        if (!client) throw new NotFoundException('Cliente no encontrado');
        return client;
    }

    async update(id: string, updateDto: UpdateClientDto, tenantId: string) {
        const client = await this.findOne(id, tenantId);
        this.clientRepo.merge(client, updateDto);
        return this.clientRepo.save(client);
    }

    async remove(id: string, hard: boolean = false) {
        if (hard) {
            return this.clientRepo.delete(id);
        }
        return this.clientRepo.softDelete(id);
    }

    async restore(id: string) {
        return this.clientRepo.restore(id);
    }
}