import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() body: any) {
        // Validamos usuario
        const user = await this.authService.validateUser(body.email, body.password);

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Si pasa, entregamos el token
        return this.authService.login(user);
    }
}