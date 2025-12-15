import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // 1. ¿Qué permisos pide la ruta? (Ej: 'stock.adjust')
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Si la ruta no pide nada, pasamos.
        if (!requiredPermissions) {
            return true;
        }

        // 2. Obtenemos el usuario cargado por JwtStrategy
        const { user } = context.switchToHttp().getRequest();

        if (!user) throw new ForbiddenException('Usuario no identificado');

        // 3. GOD MODE: El Super Admin (Tú) pasa siempre.
        if (user.is_super_admin) return true;

        // 4. Verificar si tiene Rol y Permisos
        if (!user.role || !user.role.permissions) {
            throw new ForbiddenException('No tienes un rol con permisos asignado');
        }

        // 5. La lógica de comparación:
        // Extraemos los slugs del usuario: ['stock.view', 'sales.create']
        const userPermissions = user.role.permissions.map(p => p.slug);
        
        // Verificamos si tiene AL MENOS UNO de los requeridos
        const hasPermission = requiredPermissions.some(permission => 
            userPermissions.includes(permission)
        );

        if (!hasPermission) {
            throw new ForbiddenException(`Te faltan permisos: ${requiredPermissions.join(', ')}`);
        }

        return true;
    }
}