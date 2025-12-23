import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // 1. Obtenemos el email maestro desde variables de entorno
        // Asegúrate de poner SUPER_ADMIN_EMAIL=tu_email@gmail.com en tu archivo .env
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;

        if (!user || !user.email) {
            throw new ForbiddenException('Usuario no identificado.');
        }

        if (user.email !== superAdminEmail) {
            throw new ForbiddenException('⛔ ACCESO DENEGADO: Esta área es solo para el Dueño del Sistema.');
        }

        return true;
    }
}