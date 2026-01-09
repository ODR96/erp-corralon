import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, LessThan, MoreThanOrEqual, Brackets, EntityManager, In } from 'typeorm';
import { Check, CheckStatus, CheckType } from '../entities/check.entity';
import { CreateCheckDto } from '../dto/create-check.dto';
import { UpdateCheckDto } from '../dto/update-check.dto';
import { MovementConcept, MovementType } from '../entities/current-account.entity';
import { CurrentAccountService } from './current-account.service';
import * as XLSX from 'xlsx';


@Injectable()
export class ChecksService {
    constructor(
        @InjectRepository(Check) private checkRepo: Repository<Check>,
        private readonly accountService: CurrentAccountService
    ) { }

    async create(createDto: CreateCheckDto, tenantId: string, manager?: EntityManager) {

        // Si nos pasan un manager (transacción), usamos ese repo. Si no, el normal.
        const repo = manager ? manager.getRepository(Check) : this.checkRepo;

        // Validar duplicado (usando el repo correcto)
        const exists = await repo.findOne({
            where: {
                number: createDto.number,
                bank_name: createDto.bank_name,
                tenant: { id: tenantId }
            }
        });

        if (exists) {
            throw new BadRequestException(`Ya existe el cheque #${createDto.number} del banco ${createDto.bank_name}`);
        }

        const check = repo.create();
        Object.assign(check, createDto);
        check.tenant = { id: tenantId } as any;

        if (createDto.client_id) check.client = { id: createDto.client_id } as any;
        if (createDto.provider_id) check.provider = { id: createDto.provider_id } as any;

        const savedCheck = await repo.save(check);

        // A. SI ES CHEQUE PROPIO (Pago a Proveedor)
        if (createDto.type === CheckType.OWN && createDto.provider_id) {
            await this.accountService.addMovement({
                date: new Date(createDto.issue_date),
                type: MovementType.CREDIT,
                concept: MovementConcept.CHECK,
                amount: createDto.amount,
                description: `Pago con Cheque #${createDto.number} (${createDto.bank_name})`,
                provider: { id: createDto.provider_id } as any,
                check: savedCheck
            }, tenantId, manager); // 👈 Pasamos el manager al accountService también
        }

        // B. SI ES CHEQUE DE TERCEROS (Cobro a Cliente)
        if (createDto.type === CheckType.THIRD_PARTY && createDto.client_id) {
            await this.accountService.addMovement({
                date: new Date(),
                type: MovementType.CREDIT,
                concept: MovementConcept.CHECK,
                amount: createDto.amount,
                description: `Recibido Cheque #${createDto.number} (${createDto.bank_name})`,
                client: { id: createDto.client_id } as any,
                check: savedCheck
            }, tenantId, manager); // 👈 Pasamos el manager
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


    async getUpcomingPayments(tenantId: string) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        return this.checkRepo.find({
            where: {
                tenant: { id: tenantId },
                status: In([CheckStatus.PENDING, CheckStatus.DEPOSITED]), // Solo los que no se debitaron aún
                type: CheckType.OWN,         // Cheques propios
                payment_date: LessThan(nextWeek) // <--- CAMBIO CLAVE: Todo lo que sea menor a la semana que viene (incluye el pasado)
            },
            order: { payment_date: 'ASC' },
            relations: ['provider'] // Nos aseguramos de traer el proveedor
        });
    }

    async getIncomingMoney(tenantId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limitDate = new Date(today);
        limitDate.setDate(today.getDate() + 3); // Miramos hasta 3 días adelante (Hoy, Mañana, Pasado)

        // Buscamos cheques de Terceros que estén DEPOSITADOS o PENDIENTES (por si te olvidaste de depositarlo)
        // y que venzan en estos días.
        return this.checkRepo.find({
            where: [
                {
                    tenant: { id: tenantId },
                    type: CheckType.THIRD_PARTY,
                    status: CheckStatus.DEPOSITED, // Ya en el banco
                    payment_date: LessThan(limitDate), // Vencen pronto
                    amount: MoreThanOrEqual(0) // Truco para que TypeORM no se queje
                },
                {
                    tenant: { id: tenantId },
                    type: CheckType.THIRD_PARTY,
                    status: CheckStatus.PENDING, // En mano (¡Alerta para ir al banco!)
                    payment_date: LessThan(limitDate),
                }
            ],
            relations: ['client'],
            order: { payment_date: 'ASC' } // Los más urgentes primero
        });
    }

    async exportToExcel(tenantId: string) {
        const checks = await this.checkRepo.find({
            where: { tenant: { id: tenantId } },
            relations: ['client', 'provider'],
            order: { payment_date: 'ASC' }
        });

        const data = checks.map(c => ({
            'NRO CHEQUE': c.number,
            'BANCO': c.bank_name,
            'TIPO': c.type === 'OWN' ? 'PROPIO' : 'TERCERO',
            'ESTADO': c.status,
            'IMPORTE': Number(c.amount),
            'F. EMISIÓN': c.issue_date,
            'F. PAGO': c.payment_date,
            'DESTINATARIO/EMISOR': c.type === 'OWN' ? (c.provider?.name || c.recipient_name) : (c.client?.name || c.drawer_name),
            'CONCEPTO': c.description || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cheques');

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    // 2. IMPORTAR DESDE EXCEL
    async importFromExcel(file: Express.Multer.File, tenantId: string) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        // Usamos defval: '' y raw: false para leer fechas y números como texto si hace falta
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

        let created = 0;
        let errors = 0;

        // Función para parsear fechas de Excel o strings DD/MM/YYYY o YYYY-MM-DD
        const parseDate = (val: any) => {
            if (!val) return new Date();
            // Caso Excel Serial (45231)
            if (typeof val === 'number') {
                const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                return date;
            }
            // Caso String
            const str = String(val).trim();
            // YYYY-MM-DD
            if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return new Date(str);
            // DD/MM/YYYY
            if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const [d, m, y] = str.split('/');
                return new Date(`${y}-${m}-${d}`);
            }
            return new Date(str); // Intento final
        };

        for (const row of rows) {
            try {
                // 1. Detección de Columnas (Tu Formato vs Estándar)
                const number = String(row['Nro Cheque'] || row['NRO'] || row['NUMERO'] || '').trim();
                const amountRaw = row['Monto'] || row['IMPORTE'] || row['PRECIO'] || 0;

                // Limpieza de monto (por si viene "$ 1.500")
                let amount = 0;
                if (typeof amountRaw === 'number') amount = amountRaw;
                else {
                    const s = String(amountRaw).replace(/[^\d.,]/g, ''); // Quitamos $
                    amount = parseFloat(s) || 0;
                }

                // Si no hay número o monto, saltamos
                if (!number || amount <= 0) continue;

                // 2. Proveedor
                const providerNameRaw = String(row['Proveedor'] || row['DESTINATARIO'] || '').trim();
                // Limpieza: "GUEX (20297066421)" -> "GUEX"
                // Regex: Toma todo hasta el primer paréntesis
                const providerName = providerNameRaw.split('(')[0].trim();

                // 3. Fechas
                const issueDate = parseDate(row['Fecha Emisión'] || row['F. EMISION'] || row['EMISION']);
                // Si no hay fecha de emisión en el excel, asumimos 30 días antes del vencimiento o hoy
                const paymentDateRaw = row['Fecha Vencimiento'] || row['F. VENCIMIENTO'] || row['VENCIMIENTO'] || row['PAGO'];
                const paymentDate = parseDate(paymentDateRaw);

                // 4. Estado (Mapeo de tu Excel "Pagado/Pendiente" a nuestros ENUMs)
                const statusRaw = String(row['Estado'] || row['ESTADO'] || '').toUpperCase();
                let status = CheckStatus.PENDING;
                if (statusRaw.includes('PAGADO') || statusRaw.includes('COBRADO')) status = CheckStatus.PAID;
                if (statusRaw.includes('RECHAZAD')) status = CheckStatus.REJECTED;
                if (statusRaw.includes('ANULADO')) status = CheckStatus.VOID;

                // 5. Observaciones
                const obs = String(row['Obs'] || row['OBS'] || row['CONCEPTO'] || '');

                // 6. Evitar Duplicados (Mismo número y banco)
                // Como tu Excel no tiene Banco, asumimos 'Desconocido' o lo sacamos del proveedor
                const bank = 'Desconocido';

                const exists = await this.checkRepo.findOne({
                    where: { number, tenant: { id: tenantId } }
                });

                if (!exists) {
                    await this.checkRepo.save(this.checkRepo.create({
                        number,
                        bank_name: bank,
                        amount,
                        type: CheckType.OWN, // Asumimos que son PROPIOS si es lista de pagos
                        status,
                        issue_date: issueDate,
                        payment_date: paymentDate,
                        recipient_name: providerName, // Guardamos el nombre limpio
                        description: obs || 'Importado de Excel histórico',
                        tenant: { id: tenantId }
                    }));
                    created++;
                }
            } catch (e) {
                console.error("Error importando fila", e);
                errors++;
            }
        }

        return { created, errors };
    }
}