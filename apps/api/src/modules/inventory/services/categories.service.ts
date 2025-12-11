import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category) private repo: Repository<Category>,
    ) { }

    async findAll(tenantId: string) {
        return this.repo.find({
            where: { tenant: { id: tenantId } },
            order: { name: 'ASC' }
        });
    }

    async create(name: string, tenantId: string) {
        const category = this.repo.create({
            name,
            tenant: { id: tenantId }
        });
        return this.repo.save(category);
    }

    async remove(id: string) {
        return this.repo.softDelete(id);
    }
}