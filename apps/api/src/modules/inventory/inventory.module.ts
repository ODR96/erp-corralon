import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeasurementUnit } from './entities/measurement-unit.entity';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { CategoriesService } from './services/categories.service';
import { MeasurementUnitsService } from './services/measurement-units.service';
import { CategoriesController } from './controllers/categories.controller';
import { MeasurementUnitsController } from './controllers/measurement-units.controller';
import { Provider } from './entities/provider.entity';
import { ProvidersService } from './services/providers.service';
import { ProvidersController } from './controllers/providers.controller';
import { ProductsService } from './services/products.service'; // <--- AGREGAR
import { ProductsController } from './controllers/products.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([MeasurementUnit, Category, Product, Provider])
    ],
    controllers: [CategoriesController, MeasurementUnitsController, ProvidersController, ProductsController],
    providers: [CategoriesService, MeasurementUnitsService, ProvidersService, ProductsService],
    exports: [TypeOrmModule] // Exportamos para que otros módulos (como Seed) puedan usar las entidades
})
export class InventoryModule { }