import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Provider } from '../entities/provider.entity';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { UpdateProviderDto } from '../dto/update-provider.dto';

@Injectable()
export class ProvidersService {
    constructor(
        @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    ) { }

    async create(createDto: CreateProviderDto, tenantId: string) {
        const provider = this.providerRepo.create({
            ...createDto,
            tenant: { id: tenantId },
        });
        return this.providerRepo.save(provider);
    }

    async findAll(page: number, limit: number, tenantId: string, search: string, withDeleted: boolean = false) {
        const skip = (page - 1) * limit;

        const where: any = { tenant: { id: tenantId } };
        if (search) {
            where.name = ILike(`%${search}%`);
        }

        const [data, total] = await this.providerRepo.findAndCount({
            where,
            take: limit,
            skip: skip,
            order: { created_at: 'DESC' },
            withDeleted: withDeleted, // <--- Ahora sí busca en la papelera si se lo pides
        });

        return { data, total };
    }

    async findOne(id: string) {
        const provider = await this.providerRepo.findOne({ where: { id } });
        if (!provider) throw new NotFoundException('Proveedor no encontrado');
        return provider;
    }

    async update(id: string, updateDto: UpdateProviderDto) {
        const provider = await this.findOne(id);
        this.providerRepo.merge(provider, updateDto);
        return this.providerRepo.save(provider);
    }

    async remove(id: string, hard: boolean = false) {
        if (hard) {
            return this.providerRepo.delete(id); // Borrado físico (DB)
        }
        return this.providerRepo.softDelete(id); // Borrado lógico (Papelera)
    }

    // 👇 AJUSTE 3: Método Restaurar (Faltaba)
    async restore(id: string) {
        return this.providerRepo.restore(id);
    }
}