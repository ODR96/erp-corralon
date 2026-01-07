export const SYSTEM_PERMISSIONS = [
    // --- VENTAS ---
    { slug: 'sales.create', description: 'Crear nuevas ventas' },
    { slug: 'sales.view', description: 'Ver historial de ventas' },
    { slug: 'sales.delete', description: 'Eliminar de ventas' },

    
    // --- INVENTARIO ---
    { slug: 'inventory.view', description: 'Ver productos y stock' },
    { slug: 'inventory.manage', description: 'Crear, editar y borrar productos' },
    { slug: 'providers.manage', description: 'Gestionar proveedores' },
    { slug: 'providers.view', description: 'Ver proveedores' },
    
    // --- FINANZAS ---
    { slug: 'finance.view', description: 'Ver caja, cheques y movimientos' },
    { slug: 'finance.manage', description: 'Crear movimientos, emitir cheques' },
    
    // --- ADMINISTRACIÓN ---
    { slug: 'users.view', description: 'Ver lista de usuarios' },
    { slug: 'users.manage', description: 'Crear y editar usuarios' },
    { slug: 'settings.view', description: 'Ver configuración del sistema' },
    { slug: 'settings.manage', description: 'Modificar configuración global' },
    { slug: 'branches.manage', description: 'Crear, editar, eliminar sucursales.'},
    { slug: 'branches.view', description: 'Ver sucursales.'},
];

// Definimos qué permisos tiene cada rol por defecto al iniciarse el sistema
export const DEFAULT_ROLES = {
    'Super Admin': [], // Tiene acceso total por lógica de código (is_super_admin)
    'Admin': [
        'sales.create', 'sales.view', 'sales.delete',
        'inventory.view', 'inventory.manage', 'providers.manage', 'providers.view',
        'finance.view', 'finance.manage',
        'users.view', 'users.manage', 
        'settings.view', 'settings.manage',
        'branches.view', 'branches.manage'
    ],
    'Vendedor': [
        'sales.create', 'sales.view', 
        'inventory.view', 'providers.view', 'branches.view' // Solo ver stock, no editar precios
    ],
    'Deposito': [
        'inventory.view', 'inventory.manage' // Mover stock, recibir mercadería
    ]
};