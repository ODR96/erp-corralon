import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { CurrentAccountMovement, MovementType } from '../entities/current-account.entity';

@Injectable()
export class CurrentAccountService {
    constructor(
        @InjectRepository(CurrentAccountMovement)
        private movementRepo: Repository<CurrentAccountMovement>,
    ) { }

    /**
     * Obtiene el SALDO ACTUAL de un Cliente o Proveedor.
     * Fórmula: (Debe - Haber)
     * Si es Cliente: Positivo = Te debe plata. Negativo = Tiene saldo a favor.
     * Si es Proveedor: Positivo = Le debes plata. Negativo = Pagaste de más.
     */
    async getBalance(tenantId: string, entityId: string, isClient: boolean): Promise<number> {
        const query = this.movementRepo.createQueryBuilder('m')
            .select('SUM(CASE WHEN m.type = :debit THEN m.amount ELSE -m.amount END)', 'balance')
            .where('m.tenant_id = :tenantId', { tenantId })
            .setParameters({ debit: MovementType.DEBIT });

        if (isClient) {
            query.andWhere('m.client_id = :entityId', { entityId });
        } else {
            query.andWhere('m.provider_id = :entityId', { entityId });
        }

        const result = await query.getRawOne();
        // Si no hay movimientos, retorna 0
        return parseFloat(result.balance || '0');
    }

    /**
     * Obtiene el HISTORIAL DE MOVIMIENTOS paginado.
     */
    async getMovements(
        tenantId: string,
        entityId: string,
        isClient: boolean,
        page: number = 1,
        limit: number = 20
    ) {
        const skip = (page - 1) * limit;

        const where: any = { tenant: { id: tenantId } };
        if (isClient) where.client = { id: entityId };
        else where.provider = { id: entityId };

        const [data, total] = await this.movementRepo.findAndCount({
            where,
            order: { date: 'DESC', created_at: 'DESC' }, // Lo más reciente arriba
            take: limit,
            skip,
            relations: ['check'], // Traemos datos del cheque si existe
        });

        return { data, total };
    }

    /**
     * Registra un nuevo movimiento manual o automático
     */
    async addMovement(
        data: Partial<CurrentAccountMovement>,
        tenantId: string,
        manager?: EntityManager // <--- Parámetro opcional nuevo
    ) {
        // Si viene un manager (transacción), usamos ese. Si no, usamos el repo normal.
        const repo = manager ? manager.getRepository(CurrentAccountMovement) : this.movementRepo;

        const movement = repo.create({
            ...data,
            tenant: { id: tenantId } as any
        });
        return repo.save(movement);
    }
}