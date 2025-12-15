import { SetMetadata } from '@nestjs/common';

// Esta es la clave mágica que leerá el Guard
export const PERMISSIONS_KEY = 'permissions';

// Uso: @RequirePermissions('stock.adjust', 'users.create')
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);