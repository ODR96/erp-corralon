import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantConfig } from './entities/tenant-config.entity';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class TenantSettingsService {
    constructor(
        @InjectRepository(TenantConfig) private configRepo: Repository<TenantConfig>,
    ) { }

    // Obtener configuración (o crear una por defecto si es la primera vez)
    async getConfig(tenantId: string) {
        let config = await this.configRepo.findOne({ where: { tenant: { id: tenantId } } });

        if (!config) {
            // Si no existe, creamos una por defecto
            config = this.configRepo.create({ tenant: { id: tenantId } });
            await this.configRepo.save(config);
        }

        return config;
    }

    // Actualizar
    async updateConfig(tenantId: string, updateDto: UpdateConfigDto) {
        const config = await this.getConfig(tenantId); // Reutilizamos lógica de arriba
        this.configRepo.merge(config, updateDto);
        return this.configRepo.save(config);
    }
}