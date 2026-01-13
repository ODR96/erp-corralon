import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { CashRegister } from '../entities/cash-register.entity';
import { CashTransaction, TransactionType, TransactionConcept } from '../entities/cash-transaction.entity';
import { OpenBoxDto, CloseBoxDto, CreateMovementDto } from '../dto/cash-register.dto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class CashService {
    constructor(
        @InjectRepository(CashRegister) private boxRepo: Repository<CashRegister>,
        @InjectRepository(CashTransaction) private txRepo: Repository<CashTransaction>,
        @InjectRepository(User) private userRepo: Repository<User>, // 👈 INYECTAMOS USER REPO
        private dataSource: DataSource
    ) {}

    // 1. CONSULTAR ESTADO
    async getMyStatus(userId: string) {
        const openBox = await this.boxRepo.findOne({
            where: { user: { id: userId }, status: 'OPEN' },
            relations: ['transactions']
        });

        if (!openBox) return { status: 'CLOSED' };

        return {
            status: 'OPEN',
            box_id: openBox.id,
            opened_at: openBox.opened_at,
            opening_balance: Number(openBox.opening_balance),
            current_balance: Number(openBox.current_balance),
            transaction_count: openBox.transactions.length
        };
    }

    // 2. ABRIR CAJA (Blindado 🛡️)
    async openBox(dto: OpenBoxDto, userPartial: User) {
        // A. Validar que no tenga caja abierta
        const existing = await this.boxRepo.findOne({ where: { user: { id: userPartial.id }, status: 'OPEN' } });
        if (existing) throw new BadRequestException('Ya tienes una caja abierta. Ciérrala primero.');

        // B. OBTENER USUARIO COMPLETO (Para asegurar Branch y Tenant)
        const userFull = await this.userRepo.findOne({
            where: { id: userPartial.id },
            relations: ['branch', 'tenant']
        });

        if (!userFull || !userFull.branch) {
            throw new BadRequestException('El usuario no tiene una sucursal asignada para abrir caja.');
        }

        // C. Crear la caja
        const box = this.boxRepo.create({
            tenant: userFull.tenant, // Usamos la del usuario full
            user: userFull,
            branch: userFull.branch, // ¡Ahora es seguro!
            status: 'OPEN',
            opening_balance: dto.opening_balance,
            current_balance: dto.opening_balance,
            notes: dto.notes
        });

        return this.dataSource.transaction(async (manager) => {
            const savedBox = await manager.save(box);
            
            // Movimiento inicial
            const tx = manager.create(CashTransaction, {
                cashRegister: savedBox,
                user: userFull,
                type: TransactionType.IN,
                concept: TransactionConcept.OPENING,
                amount: dto.opening_balance,
                description: 'Saldo Inicial de Caja'
            });
            await manager.save(tx);

            return savedBox;
        });
    }

    // 3. CERRAR CAJA
    async closeBox(dto: CloseBoxDto, userId: string) {
        const box = await this.boxRepo.findOne({ where: { user: { id: userId }, status: 'OPEN' } });
        if (!box) throw new BadRequestException('No tienes ninguna caja abierta para cerrar.');

        const systemBalance = Number(box.current_balance);
        const realBalance = dto.closing_balance;
        const difference = realBalance - systemBalance;

        box.status = 'CLOSED';
        box.closed_at = new Date();
        box.closing_balance = realBalance;
        box.difference = difference;
        box.notes = dto.notes ? `${box.notes || ''} | Cierre: ${dto.notes}` : box.notes;

        return this.boxRepo.save(box);
    }

    // 4. REGISTRAR MOVIMIENTO
    async addTransaction(dto: CreateMovementDto, user: User, externalManager?: EntityManager) {
        // Aquí usamos user.id para buscar la caja, eso siempre funciona
        const box = await this.boxRepo.findOne({ where: { user: { id: user.id }, status: 'OPEN' } });
        
        if (!box) throw new BadRequestException('Debes ABRIR CAJA antes de realizar movimientos.');

        const saveLogic = async (manager: EntityManager) => {
            const tx = manager.create(CashTransaction, {
                cashRegister: box,
                user: user, // TypeORM maneja bien si 'user' es solo { id: '...' }
                type: dto.type,
                concept: dto.concept,
                amount: dto.amount,
                description: dto.description
            });
            await manager.save(tx);

            let newBalance = Number(box.current_balance);
            if (dto.type === TransactionType.IN) {
                newBalance += dto.amount;
            } else {
                newBalance -= dto.amount;
            }
            box.current_balance = newBalance;
            await manager.save(box);

            return tx;
        };

        if (externalManager) {
            return saveLogic(externalManager);
        } else {
            return this.dataSource.transaction(async (newManager) => saveLogic(newManager));
        }
    }

    // EXTRA
    async getCurrentTransactions(userId: string) {
        const box = await this.boxRepo.findOne({ 
            where: { user: { id: userId }, status: 'OPEN' },
            relations: ['transactions'],
            order: { transactions: { created_at: 'DESC' } as any }
        });
        if (!box) return [];
        return box.transactions;
    }
}