import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common'; // <--- Agregamos Query
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @RequirePermissions('users.create')
    create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
        // FIX ERROR 1: Pasamos el rol del que pide (req.user.role)
        return this.usersService.create(createUserDto, req.user.tenant, req.user.role);
    }

    @Get()
    @RequirePermissions('users.view')
    findAll(
        @Request() req: any,
        @Query('page') page: number = 1,      // <--- Recibimos paginación
        @Query('limit') limit: number = 10,   // <--- Recibimos límite
        @Query('search') search: string = '',  // <--- Recibimos búsqueda
        @Query('withDeleted') withDeleted: string = 'false'
    ) {
        // FIX ERROR 2: Pasamos los 6 argumentos (o los que definamos en el servicio ahora)
        // Nota: Vamos a simplificar el servicio, pero por ahora le pasamos lo vital
        return this.usersService.findAll(Number(page), Number(limit), req.user.tenant.id, search, withDeleted === 'true');
    }

    @Get('roles')
    @RequirePermissions('users.view', 'users.create')
    getRoles(@Request() req: any) {
        return this.usersService.getRoles(req.user.tenant.id);
    }

    // 👇 Endpoint para el dropdown de sucursales (Sin cambios, pero asegúrate que exista en el servicio)
    @Get('branches')
    @RequirePermissions('users.view', 'users.create')
    getBranches(@Request() req: any) {
        return this.usersService.getBranches(req.user.tenant.id);
    }

    @Get(':id')
    @RequirePermissions('users.view')
    findOne(@Param('id') id: string) {
        // FIX ERROR 3: El método findOne no existía, lo crearemos en el servicio
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @RequirePermissions('users.create')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @RequirePermissions('users.create')
    remove(
        @Param('id') id: string,
        @Query('hard') hard: string,
        @Request() req: any
    ) {
        // FIX ERROR 4: Pasamos el booleano 'hard' y el ID del usuario que borra
        const isHard = hard === 'true';
        return this.usersService.remove(id, isHard, req.user.id);
    }

    @Patch(':id/restore')
    @RequirePermissions('users.create')
    restore(@Param('id') id: string) {
        return this.usersService.restore(id);
    }
}