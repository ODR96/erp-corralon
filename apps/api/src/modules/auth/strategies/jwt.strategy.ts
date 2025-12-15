import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity'; // Asegúrate de la ruta

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        @InjectRepository(User) private userRepository: Repository<User>, // Inyectamos el repo
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
        });
    }

    async validate(payload: any) {
        if (!payload.sub) {
            throw new UnauthorizedException();
        }

        // 1. Buscamos el usuario REAL en la base de datos
        const user = await this.userRepository.findOne({
            where: { id: payload.sub },
            // 👇 CARGAMOS LA ARTILLERÍA PESADA: Rol, Permisos y Tenant
            relations: ['role', 'role.permissions', 'tenant', 'branch'] 
        });

        // 2. Si no existe o está inactivo (soft delete o flag), afuera.
        // Esto es seguridad extra: Si borras al usuario mientras tiene el token, aquí lo frenas.
        if (!user || !user.is_active) {
            throw new UnauthorizedException('Usuario inactivo o no encontrado');
        }

        // 3. Devolvemos el usuario completo (con permisos) al Request
        return user;
    }
}