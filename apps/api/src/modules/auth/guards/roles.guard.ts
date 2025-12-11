import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 1. Leemos qué roles están permitidos para esta ruta (metadata)
        const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

        // Si no se especifica rol, dejamos pasar a cualquiera que esté logueado
        if (!requiredRoles) {
            return true;
        }

        // 2. Obtenemos el usuario del request (gracias a JwtStrategy)
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // 3. Verificamos si el usuario tiene el rol necesario
        // Comparamos el nombre del rol (ej: "Super Admin")
        if (!user || !user.role || !requiredRoles.includes(user.role)) {
            throw new ForbiddenException('No tienes permisos para realizar esta acción');
        }

        return true;
    }
}