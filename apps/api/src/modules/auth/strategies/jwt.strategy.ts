import { Injectable, UnauthorizedException } from '@nestjs/common'; // Agregué UnauthorizedException por si acaso
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // FIX: Si no encuentra la variable, usa 'secretKey' por defecto para que no explote
            secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
        });
    }

    async validate(payload: any) {
        // Validación extra: Si el token no tiene id, rechazamos
        if (!payload.sub) {
            throw new UnauthorizedException();
        }

        return {
            id: payload.sub,
            email: payload.email,
            tenantId: payload.tenantId,
            role: payload.roles
        };
    }
}