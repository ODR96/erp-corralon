import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm'; // <--- IMPORTAR ILike
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class BranchesService {
    constructor(
        @InjectRepository(Branch) private branchRepo: Repository<Branch>,
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    ) { }

    // 1. LISTAR CON PAGINACIÓN Y BÚSQUEDA
    async findAll(
        tenantId: string,
        limit: number,
        offset: number,
        search: string,
        withDeleted: boolean = false,
    ) {
        // 1. Condición Base: Siempre filtrar por Tenant
        const baseWhere = { tenant: { id: tenantId } };

        let where: any = baseWhere;

        // 2. Si hay búsqueda, armamos el OR
        if (search) {
            where = [
                // Condición A: Es de mi Tenant Y el nombre coincide
                { ...baseWhere, name: ILike(`%${search}%`) },
                // Condición B: Es de mi Tenant Y la dirección coincide
                { ...baseWhere, address: ILike(`%${search}%`) },
            ];
        }

        const [data, total] = await this.branchRepo.findAndCount({
            where: where,
            withDeleted: withDeleted,
            order: { created_at: 'ASC' },
            take: limit,
            skip: offset,
        });

        return { data, total };
    }

    // ... create, update (igual que antes) ...

    async create(createBranchDto: CreateBranchDto, tenantId: string) {
        // 1. Buscamos la empresa para saber su límite
        const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
        if (!tenant) throw new NotFoundException('Empresa no encontrada');

        // 2. Contamos cuántas sucursales activas tiene ya (excluyendo eliminadas)
        const currentCount = await this.branchRepo.count({
            where: { tenant: { id: tenantId } }
        });

        // 3. VALIDACIÓN DE NEGOCIO (SaaS)
        if (currentCount >= tenant.max_branches) {
            throw new BadRequestException(
                `Has alcanzado el límite de sucursales de tu plan (${tenant.max_branches}). Contacta a soporte para ampliar.`
            );
        }

        // 4. Si pasa, creamos
        const branch = this.branchRepo.create({
            ...createBranchDto,
            tenant: { id: tenantId }
        });
        return this.branchRepo.save(branch);
    }

    async update(id: string, updateData: any) {
        const branch = await this.branchRepo.findOne({ where: { id } });
        if (!branch) throw new NotFoundException('Sucursal no encontrada');
        this.branchRepo.merge(branch, updateData);
        return this.branchRepo.save(branch);
    }

    async remove(id: string, hard: boolean = false) {
        if (hard) return this.branchRepo.delete(id);
        return this.branchRepo.softDelete(id);
    }

    async restore(id: string) {
        return this.branchRepo.restore(id);
    }
}