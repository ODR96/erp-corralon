import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeasurementUnit } from '../entities/measurement-unit.entity';

@Injectable()
export class MeasurementUnitsService {
    constructor(
        @InjectRepository(MeasurementUnit) private repo: Repository<MeasurementUnit>,
    ) { }

    async findAll() {
        return this.repo.find({
            where: { is_active: true },
            order: { name: 'ASC' }
        });
    }

    // Esto lo usaremos internamente o el Super Admin
    async create(data: { name: string; short_name: string; allow_decimals: boolean }) {
        return this.repo.save(this.repo.create(data));
    }
}