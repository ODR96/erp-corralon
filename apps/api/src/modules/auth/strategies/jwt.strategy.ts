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

        const user = await this.userRepository.findOne({
            where: { id: payload.sub },
            relations: ['role', 'role.permissions', 'tenant', 'branch']
        });

        if (!user || !user.is_active) {
            throw new UnauthorizedException('Usuario inactivo o no encontrado');
        }

        // 👇 CAMBIO CLAVE: Aplanamos el tenantId para que los Controllers lo lean fácil
        return {
            ...user, // Mantenemos todos los datos del usuario
            tenantId: user.tenant?.id, // 👈 ¡ESTO ES LO QUE FALTABA!
            branchId: user.branch?.id  // De paso agregamos el branchId
        };
    }
}