import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Provider } from '../entities/provider.entity';

@Injectable()
export class ProvidersService {
    constructor(@InjectRepository(Provider) private repo: Repository<Provider>) { }

    async findAll(tenantId: string) {
        return this.repo.find({
            where: { tenant: { id: tenantId } },
            order: { name: 'ASC' }
        });
    }

    async create(data: any, tenantId: string) {
        return this.repo.save(this.repo.create({ ...data, tenant: { id: tenantId } }));
    }
}