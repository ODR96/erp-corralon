import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator'; // <--- IMPORTAR
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }


    @Get()
    findAll(
        @Request() req: any,
        @Query('withDeleted') withDeleted: string,
        // Nuevos parámetros con valores por defecto
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('search') search: string,
    ) {
        const { tenantId, role } = req.user;
        // Calculamos el offset
        // Página 1: skip 0. Página 2: skip 10.
        const offset = (page - 1) * limit;

        return this.usersService.findAll(tenantId, limit, offset, search, withDeleted === 'true', role);
    }

    @Get('roles') // Endpoint auxiliar para llenar el Select del frontend
    getRoles(@Request() req: any) {
        return this.usersService.getRoles(req.user.role);
    }

    @Get('branches') // Endpoint para llenar el Select de sucursales
    @Roles('Super Admin', 'Admin')
    getBranches(@Request() req: any) {
        return this.usersService.getBranches(req.user.tenantId);
    }

    @Post()
    @Roles('Super Admin', 'Admin') // Permitimos a ambos entrar, pero el servicio filtra
    create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
        const { tenantId, role } = req.user;
        return this.usersService.create(createUserDto, tenantId, role);
    }

    @Patch(':id')
    @Roles('Super Admin', 'Admin')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @Roles('Super Admin', 'Admin')
    remove(@Param('id') id: string, @Query('hard') hard: string, @Request() req: any) {
        const currentUserId = req.user.id; // <--- Identificamos quién es
        return this.usersService.remove(id, hard === 'true', currentUserId);
    }

    @Patch(':id/restore')
    @Roles('Super Admin', 'Admin')
    restore(@Param('id') id: string) {
        return this.usersService.restore(id);
    }
}