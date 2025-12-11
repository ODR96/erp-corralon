import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        private jwtService: JwtService,
    ) { }

    // 1. Validar que el usuario existe y la clave es correcta
    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.userRepository.findOne({
            where: { email },
            relations: ['tenant', 'role'] // Traemos también su empresa
        });

        if (user && (await bcrypt.compare(pass, user.password_hash))) {
            // Si es correcto, eliminamos la clave del objeto para no retornarla
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }

    // 2. Generar el Token (El Carnet)
    async login(user: any) {
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: user.tenant?.id,
            roles: user.role?.name // A futuro aquí pondremos los roles
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: user, // Devolvemos datos del usuario para el frontend
        };
    }
}