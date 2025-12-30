import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Expense, PaymentMethod } from '../entities/expense.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { CreateExpenseDto, CreateExpenseCategoryDto } from '../dto/create-expense.dto';
import { User } from '../../users/entities/user.entity';
import { CashService } from './cash.service'; // Inyectamos la caja
import { TransactionType, TransactionConcept } from '../entities/cash-transaction.entity';

@Injectable()
export class ExpensesService {
    constructor(
        @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
        @InjectRepository(ExpenseCategory) private categoryRepo: Repository<ExpenseCategory>,
        private cashService: CashService, // 👈 Para descontar plata
        private dataSource: DataSource
    ) {}

    // --- CATEGORÍAS ---
    async createCategory(dto: CreateExpenseCategoryDto, tenantId: string) {
        const cat = this.categoryRepo.create({ ...dto, tenant: { id: tenantId } as any });
        return this.categoryRepo.save(cat);
    }

    async findAllCategories(tenantId: string) {
        return this.categoryRepo.find({ where: { tenant: { id: tenantId }, is_active: true } });
    }

    // --- GASTOS ---
    async create(dto: CreateExpenseDto, user: User, tenantId: string) {
        return this.dataSource.transaction(async (manager) => {
            // 1. Buscar Categoría
            const category = await manager.findOne(ExpenseCategory, { where: { id: dto.category_id } });
            if (!category) throw new BadRequestException('Categoría inválida');

            // 2. Crear Gasto
            const expense = manager.create(Expense, {
                ...dto,
                category,
                user,
                tenant: { id: tenantId } as any,
                date: new Date(dto.date)
            });

            // 3. IMPACTO EN CAJA (Si es Efectivo)
            if (dto.payment_method === PaymentMethod.CASH) {
                try {
                    // Usamos el servicio de caja existente
                    // Nota: Idealmente pasaríamos el 'manager' a addTransaction para atomicidad total,
                    // pero para simplificar usaremos la lógica actual de CashService.
                    
                    const tx = await this.cashService.addTransaction({
                        type: TransactionType.OUT, // Salida de dinero
                        concept: TransactionConcept.EXPENSE,
                        amount: dto.amount,
                        description: `Gasto: ${category.name} - ${dto.description}`
                    }, user);

                    expense.cashTransaction = tx; // Vinculamos
                } catch (error) {
                    throw new BadRequestException('Para registrar un gasto en Efectivo, necesitas una CAJA ABIERTA.');
                }
            }

            return await manager.save(expense);
        });
    }

    async findAll(tenantId: string) {
        return this.expenseRepo.find({
            where: { tenant: { id: tenantId } },
            relations: ['category', 'user'],
            order: { date: 'DESC', created_at: 'DESC' }
        });
    }
}