import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

// Entidades
import { User } from '../users/entities/user.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';

// Constantes
import { SYSTEM_PERMISSIONS, DEFAULT_ROLES } from './constants/system-permissions';

@Injectable()
export class AuthService implements OnModuleInit {
    // Logger para ver en consola qué está pasando
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Role) private roleRepository: Repository<Role>, // 👈 Inyectamos Role
        @InjectRepository(Permission) private permissionRepository: Repository<Permission>, // 👈 Inyectamos Permission
        private jwtService: JwtService,
    ) { }

    // --- AUTO-CONFIGURACIÓN AL INICIAR ---
    async onModuleInit() {
        this.logger.log('🚀 Iniciando validación de Seguridad (Roles y Permisos)...');

        // 1. Crear Permisos faltantes
        for (const p of SYSTEM_PERMISSIONS) {
            const exists = await this.permissionRepository.findOne({ where: { slug: p.slug } });
            if (!exists) {
                await this.permissionRepository.save(this.permissionRepository.create(p));
                this.logger.log(`✅ Permiso creado: ${p.slug}`);
            }
        }

        // 2. Crear Roles por defecto si no existen
        for (const [roleName, defaultPermissions] of Object.entries(DEFAULT_ROLES)) {
            let role = await this.roleRepository.findOne({ 
                where: { name: roleName },
                relations: ['permissions'] 
            });

            if (!role) {
                // Si el rol no existe, lo creamos
                role = this.roleRepository.create({ 
                    name: roleName, 
                    description: `Rol generado automáticamente: ${roleName}` 
                });
                await this.roleRepository.save(role);
                this.logger.log(`👑 Rol creado: ${roleName}`);
            }

            // 3. Asignar permisos básicos al rol (Solo si es nuevo o queremos forzar actualización)
            // Aquí buscamos los permisos en la DB que coincidan con la lista del const
            if (defaultPermissions.length > 0) {
                const permsEntities = await this.permissionRepository.find({
                    where: { slug: In(defaultPermissions) }
                });
                
                // Actualizamos los permisos del rol
                role.permissions = permsEntities;
                await this.roleRepository.save(role);
            }
        }
        
        this.logger.log('✨ Sistema de seguridad sincronizado correctamente.');
    }

    // --- MÉTODOS DE LOGIN EXISTENTES ---

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.userRepository.findOne({
            where: { email },
            // IMPORTANTE: Traer roles y permisos para que el frontend sepa qué mostrar
            relations: ['tenant', 'role', 'role.permissions'] 
        });

        if (user && (await bcrypt.compare(pass, user.password_hash))) {
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        // Creamos el payload del token
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: user.tenant?.id,
            role: user.role?.name, 
            // Opcional: Meter permisos en el token (aumenta tamaño) o dejarlos en el user response
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: user, // Retornamos el usuario con sus roles y permisos al front
        };   
    }
    async getAllRoles() {
        return this.roleRepository.find({
            select: ['id', 'name', 'description'], // Solo lo necesario
            order: { name: 'ASC' }
        });
    }
    
}