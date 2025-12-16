import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, LessThan, MoreThanOrEqual, Brackets } from 'typeorm';
import { Check, CheckStatus, CheckType } from '../entities/check.entity';
import { CreateCheckDto } from '../dto/create-check.dto';
import { UpdateCheckDto } from '../dto/update-check.dto';
import { MovementConcept, MovementType } from '../entities/current-account.entity';
import { CurrentAccountService } from './current-account.service';


@Injectable()
export class ChecksService {
    constructor(
        @InjectRepository(Check) private checkRepo: Repository<Check>,
        private readonly accountService: CurrentAccountService
    ) { }

    async create(createDto: CreateCheckDto, tenantId: string) {
        // Validar duplicado: Mismo Banco + Mismo Número + Mismo Tenant = ERROR
        const exists = await this.checkRepo.findOne({
            where: {
                number: createDto.number,
                bank_name: createDto.bank_name,
                tenant: { id: tenantId }
            }
        });

        if (exists) {
            throw new BadRequestException(`Ya existe el cheque #${createDto.number} del banco ${createDto.bank_name}`);
        }

        // Alerta de Fecha (Opcional): Aquí podríamos consultar si hay otros cheques ese día, 
        // pero para no bloquear el flujo, lo ideal es manejar esa alerta en el Front antes de enviar.

        const check = this.checkRepo.create();
        Object.assign(check, createDto);
        check.tenant = { id: tenantId } as any;

        if (createDto.client_id) check.client = { id: createDto.client_id } as any;
        if (createDto.provider_id) check.provider = { id: createDto.provider_id } as any;

        const savedCheck = await this.checkRepo.save(check); // Guardamos primero

        // 🤖 AUTOMATIZACIÓN: Si es cheque PROPIO y tiene PROVEEDOR, baja la deuda
        if (createDto.type === CheckType.OWN && createDto.provider_id) {
            await this.accountService.addMovement({
                date: new Date(createDto.issue_date), // O fecha de entrega
                type: MovementType.CREDIT, // CREDIT = Baja deuda del proveedor (Pagamos)
                concept: MovementConcept.CHECK,
                amount: createDto.amount,
                description: `Pago con Cheque #${createDto.number} (${createDto.bank_name})`,
                provider: { id: createDto.provider_id } as any,
                check: savedCheck // Vinculamos el cheque al movimiento
            }, tenantId);
        }

        return savedCheck;
    }

    // 2. BUSCADOR AVANZADO (QUERY BUILDER) 🔍
    async findAll(
        page: number, limit: number, tenantId: string,
        search: string, status?: string, type?: string,
        providerId?: string, dateFrom?: string, dateTo?: string, hideFinalized?: boolean
    ) {
        const skip = (page - 1) * limit;

        const qb = this.checkRepo.createQueryBuilder('check')
            .leftJoinAndSelect('check.provider', 'provider')
            .leftJoinAndSelect('check.client', 'client')
            .where('check.tenant_id = :tenantId', { tenantId });

        // --- FILTROS EXACTOS ---
        if (status) qb.andWhere('check.status = :status', { status });
        if (type) qb.andWhere('check.type = :type', { type });
        if (providerId) qb.andWhere('check.provider_id = :providerId', { providerId });

        // --- FILTROS DE FECHA ---
        // Si hay dateFrom, traemos desde esa fecha. Si no, desde el principio de los tiempos.
        if (dateFrom) {
            qb.andWhere('check.payment_date >= :dateFrom', { dateFrom });
        }
        // Si hay dateTo, traemos hasta esa fecha.
        if (dateTo) {
            qb.andWhere('check.payment_date <= :dateTo', { dateTo });
        }

        if (hideFinalized) {
            // Excluimos: PAGADOS, RECHAZADOS y ANULADOS
            qb.andWhere('check.status NOT IN (:...finalizedStatus)', {
                finalizedStatus: ['PAID', 'REJECTED', 'VOID']
            });
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - 35); // Damos 5 días de gracia extra
            const limitStr = limitDate.toISOString().split('T')[0];

            qb.andWhere('check.payment_date > :limitStr', { limitStr });
        }

        // --- BUSCADOR (FIX CON BRACKETS) ---
        // Esto genera: AND (numero LIKE %x% OR banco LIKE %x% ...)
        if (search) {
            qb.andWhere(new Brackets((subQb) => {
                subQb.where('check.number ILIKE :searchTerm')
                    .orWhere('check.bank_name ILIKE :searchTerm')
                    .orWhere('check.drawer_name ILIKE :searchTerm')    // Firmante
                    .orWhere('check.recipient_name ILIKE :searchTerm') // Destinatario manual
                    .orWhere('provider.name ILIKE :searchTerm')        // Nombre del Proveedor (Join)
                    .orWhere('client.name ILIKE :searchTerm');         // Nombre del Cliente (Join)
            }), { searchTerm: `%${search}%` }); // 👈 AQUÍ ESTÁ EL TRUCO: Pasamos el valor UNA VEZ afuera
        }

        qb.orderBy('check.payment_date', 'ASC');
        qb.skip(skip).take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }

    async findOne(id: string, tenantId: string) {
        const check = await this.checkRepo.findOne({
            where: { id, tenant: { id: tenantId } },
            relations: ['client', 'provider']
        });
        if (!check) throw new NotFoundException('Cheque no encontrado');
        return check;
    }

    async update(id: string, updateDto: UpdateCheckDto, tenantId: string) {
        const check = await this.findOne(id, tenantId);

        // Aquí podrías agregar lógica: "Si cambio el estado a USED, obligar a poner provider_id"

        this.checkRepo.merge(check, updateDto);
        // Mapeo manual de relaciones si vienen en el DTO
        if (updateDto.client_id) check.client = { id: updateDto.client_id } as any;
        if (updateDto.provider_id) check.provider = { id: updateDto.provider_id } as any;

        return this.checkRepo.save(check);
    }

    // 👇 ESTO ES PARA TUS REPORTES FUTUROS
    // Calcula cuánto tenemos que pagar en los próximos 7 días
    async getUpcomingPayments(tenantId: string) {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        return this.checkRepo.find({
            where: {
                tenant: { id: tenantId },
                status: CheckStatus.PENDING, // O entregados que aún no se debitaron
                type: CheckType.OWN,
                payment_date: Between(today, nextWeek)
            },
            order: { payment_date: 'ASC' }
        });
    }
}