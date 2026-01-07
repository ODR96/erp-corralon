import { Controller, Post, Body, Request, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard'; // Ajusta la ruta si tus guards están en otro lado
// Si usas el decorador @Public, descomenta la siguiente línea:
// import { Public } from './decorators/public.decorator';


@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // Login existente
    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req: any) {
        return this.authService.login(req.user);
    }

    // 👇 Este es el endpoint nuevo para los roles
    @Get('roles')
    async getRoles() {
        return this.authService.getAllRoles();
    }
}