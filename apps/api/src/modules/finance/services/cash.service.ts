import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CashRegister } from '../entities/cash-register.entity';
import { CashTransaction, TransactionType, TransactionConcept } from '../entities/cash-transaction.entity';
import { OpenBoxDto, CloseBoxDto, CreateMovementDto } from '../dto/cash-register.dto';
import { User } from '../../users/entities/user.entity';
import { EntityManager } from 'typeorm';

@Injectable()
export class CashService {
    constructor(
        @InjectRepository(CashRegister) private boxRepo: Repository<CashRegister>,
        @InjectRepository(CashTransaction) private txRepo: Repository<CashTransaction>,
        private dataSource: DataSource
    ) {}

    // 1. CONSULTAR ESTADO (¿Tengo la caja abierta?)
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

    // 2. ABRIR CAJA
    async openBox(dto: OpenBoxDto, user: User, tenantId: string) {
        // Validar que no tenga ya una abierta
        const existing = await this.boxRepo.findOne({ where: { user: { id: user.id }, status: 'OPEN' } });
        if (existing) throw new BadRequestException('Ya tienes una caja abierta. Ciérrala primero.');

        const box = this.boxRepo.create({
            tenant: { id: tenantId } as any,
            user: user,
            branch: user.branch!, // Asumimos que el usuario tiene branch asignada
            status: 'OPEN',
            opening_balance: dto.opening_balance,
            current_balance: dto.opening_balance, // Arrancamos con lo inicial
            notes: dto.notes
        });

        // Guardamos y registramos el movimiento inicial "Saldo Inicial"
        return this.dataSource.transaction(async (manager) => {
            const savedBox = await manager.save(box);
            
            // Creamos el movimiento "dummy" de apertura para que quede en el historial
            const tx = manager.create(CashTransaction, {
                cashRegister: savedBox as CashRegister,
                user: user,
                type: TransactionType.IN,
                concept: TransactionConcept.OPENING,
                amount: dto.opening_balance,
                description: 'Saldo Inicial de Caja'
            });
            await manager.save(tx);

            return savedBox;
        });
    }

    // 3. CERRAR CAJA (Arqueo)
    async closeBox(dto: CloseBoxDto, userId: string) {
        const box = await this.boxRepo.findOne({ where: { user: { id: userId }, status: 'OPEN' } });
        if (!box) throw new BadRequestException('No tienes ninguna caja abierta para cerrar.');

        // Cálculos
        const systemBalance = Number(box.current_balance);
        const realBalance = dto.closing_balance;
        const difference = realBalance - systemBalance; // Si es negativo, falta plata.

        box.status = 'CLOSED';
        box.closed_at = new Date();
        box.closing_balance = realBalance;
        box.difference = difference;
        box.notes = dto.notes ? `${box.notes || ''} | Cierre: ${dto.notes}` : box.notes;

        return this.boxRepo.save(box);
    }

    // 4. REGISTRAR MOVIMIENTO (Ventas, Gastos, Retiros)
async addTransaction(dto: CreateMovementDto, user: User, externalManager?: EntityManager) {
        // 1. Buscamos la caja (esto es lectura, podemos usar el repo normal o el manager si quisieras ser estricto)
        const box = await this.boxRepo.findOne({ where: { user: { id: user.id }, status: 'OPEN' } });
        
        if (!box) throw new BadRequestException('Debes ABRIR CAJA antes de realizar movimientos.');

        // 2. Definimos la función lógica de guardar
        const saveLogic = async (manager: EntityManager) => {
            // A. Crear la transacción
            const tx = manager.create(CashTransaction, {
                cashRegister: box,
                user: user,
                type: dto.type,
                concept: dto.concept,
                amount: dto.amount,
                description: dto.description
            });
            await manager.save(tx);

            // B. Actualizar saldo
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

        // 3. DECISIÓN: ¿Usamos la transacción externa o creamos una nueva?
        if (externalManager) {
            // Si viene de Ventas/Pagos, usamos su transacción
            return saveLogic(externalManager);
        } else {
            // Si es un movimiento manual suelto, creamos una transacción propia
            return this.dataSource.transaction(async (newManager) => saveLogic(newManager));
        }
    }

    // EXTRA: Ver historial de movimientos de la caja actual
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