import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientsController } from './controllers/clients.controller';
import { ClientsService } from './services/clients.service';
import { SalesController } from './controllers/sales.controller';
import { SalesService } from './services/sales.service';
import { Sale } from './entities/sale.entity';
import { SaleDetail } from './entities/sale-detail.entity';
import { Product } from '../inventory/entities/product.entity';
import { Stock } from '../inventory/entities/stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Sale, SaleDetail, Product, Stock]) // 👈 ¡Muy importante! Registra la entidad
  ],
  controllers: [ClientsController, SalesController],
  providers: [ClientsService, SalesService],
  exports: [ClientsService, SalesService] // Por si otro módulo necesita buscar clientes
})
export class SalesModule {}