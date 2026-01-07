import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({
            usernameField: 'email', // 👈 IMPORTANTE: Le decimos que usamos email, no username
            passwordField: 'password',
        });
    }

    async validate(email: string, pass: string): Promise<any> {
        const user = await this.authService.validateUser(email, pass);
        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }
        return user;
    }
}