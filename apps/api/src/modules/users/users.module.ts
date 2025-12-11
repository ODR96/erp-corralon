import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller'; // <--- Importar
import { User } from './entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { Branch } from '../tenants/entities/branch.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, Role, Branch])],
    controllers: [UsersController], // <--- ¡AQUÍ DEBE ESTAR!
    providers: [UsersService],
    exports: [UsersService, TypeOrmModule],
})
export class UsersModule { }