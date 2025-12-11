import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { SeedService } from './modules/database/seed.service'; // <--- IMPORTAR
import { Tenant } from './modules/tenants/entities/tenant.entity'; // <--- IMPORTAR
import { Branch } from './modules/tenants/entities/branch.entity'; // <--- IMPORTAR
import { User } from './modules/users/entities/user.entity';
import { AuthModule } from './modules/auth/auth.module';
import { Role } from './modules/auth/entities/role.entity';       // <--- NUEVO
import { Permission } from './modules/auth/entities/permission.entity';
import { InventoryModule } from './modules/inventory/inventory.module';

@Module({
  imports: [
    // 1. Módulo de Configuración (Para leer el archivo .env)
    ConfigModule.forRoot({
      isGlobal: true, // Disponible en toda la app
    }),

    // 2. Módulo de Base de Datos (Conexión asíncrona)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        // AutoLoadEntities: Carga automáticamente las tablas que creemos luego
        autoLoadEntities: true, 
        // Synchronize: ¡OJO! Solo en desarrollo (true). Crea las tablas automáticamente.
        // En producción esto debe ser FALSE para no borrar datos por error.
        synchronize: true, 
      }),
    }),
    TypeOrmModule.forFeature([Tenant, Branch, User, Role, Permission]),
    TenantsModule,
    UsersModule,
    AuthModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}