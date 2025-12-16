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

    // Crear vinculado al Tenant
    async create(createDto: CreateClientDto, tenantId: string) {
        const client = this.clientRepo.create({
            ...createDto,
            tenant: { id: tenantId },
        });
        return this.clientRepo.save(client);
    }

    // Listar con filtros y paginación
    async findAll(page: number, limit: number, tenantId: string, search: string, withDeleted: boolean = false) {
        const skip = (page - 1) * limit;

        const where: any = { tenant: { id: tenantId } };

        if (search) {
            // Búsqueda inteligente: Por nombre O por CUIT/DNI
            where.name = ILike(`%${search}%`);
            // Si quisieras buscar por ambos campos a la vez, se usaría un array de condiciones (OR), 
            // pero por simplicidad de código inicial usamos nombre.
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
        const client = await this.findOne(id, tenantId); // Reutilizamos findOne para validar tenant
        this.clientRepo.merge(client, updateDto);
        return this.clientRepo.save(client);
    }

    async remove(id: string, hard: boolean = false) {
        if (hard) {
            return this.clientRepo.delete(id); // 🔥 Borrado físico
        }
        return this.clientRepo.softDelete(id); // 🗑️ Papelera
    }

    async restore(id: string) {
        return this.clientRepo.restore(id);
    }
}