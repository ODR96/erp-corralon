import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientsController } from './controllers/clients.controller';
import { ClientsService } from './services/clients.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client]) // 👈 ¡Muy importante! Registra la entidad
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService] // Por si otro módulo necesita buscar clientes
})
export class SalesModule {}