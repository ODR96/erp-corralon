import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Check } from './entities/check.entity';
import { ChecksController } from './controllers/checks.controller';
import { ChecksService } from './services/checks.service';
import { CurrentAccountMovement } from './entities/current-account.entity';
import { CurrentAccountController } from './controllers/current-account.controller';
import { CurrentAccountService } from './services/current-account.service';
import { PaymentsService } from './services/payments.service';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentOrder } from './entities/payment-order.entity';
import { CashTransaction } from './entities/cash-transaction.entity';
import { CashRegister } from './entities/cash-register.entity';
import { CashController } from './controllers/cash.controller';
import { CashService } from './services/cash.service';
import { ExpenseCategory } from './entities/expense-category.entity';
import { Expense } from './entities/expense.entity';
import { ExpensesController } from './controllers/expenses.controller';
import { ExpensesService } from './services/expenses.service';
import { User } from '../users/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Check, CurrentAccountMovement, PaymentOrder, CashTransaction, CashRegister, ExpenseCategory, User, Expense])],
    controllers: [ChecksController, CurrentAccountController, PaymentsController, CashController, ExpensesController],
    providers: [ChecksService, CurrentAccountService, PaymentsService, CashService, ExpensesService],
    exports: [ChecksService, CurrentAccountService, CashService, ExpensesService]
})
export class FinanceModule { }