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

@Module({
    imports: [TypeOrmModule.forFeature([Check, CurrentAccountMovement, PaymentOrder])],
    controllers: [ChecksController, CurrentAccountController, PaymentsController],
    providers: [ChecksService, CurrentAccountService, PaymentsService],
    exports: [ChecksService, CurrentAccountService]
})
export class FinanceModule { }