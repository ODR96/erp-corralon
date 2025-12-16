import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Check } from './entities/check.entity';
import { ChecksController } from './controllers/checks.controller';
import { ChecksService } from './services/checks.service';
import { CurrentAccountMovement } from './entities/current-account.entity';
import { CurrentAccountController } from './controllers/current-account.controller';
import { CurrentAccountService } from './services/current-account.service';

@Module({
    imports: [TypeOrmModule.forFeature([Check, CurrentAccountMovement])],
    controllers: [ChecksController, CurrentAccountController],
    providers: [ChecksService, CurrentAccountService],
    exports: [ChecksService, CurrentAccountService]
})
export class FinanceModule { }