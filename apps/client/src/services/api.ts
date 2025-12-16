import axios from 'axios';

// ------------------------------------------------------------------
// 1. CONFIGURACIÓN DINÁMICA DE RED (Para que ande en Celular y PC)
// ------------------------------------------------------------------
const protocol = window.location.protocol;
const hostname = window.location.hostname;
const port = '3000';

const API_URL = `${protocol}//${hostname}:${port}/api`;
console.log('🔗 Conectando a API en:', API_URL);

export const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Interceptor para agregar el Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Interceptor para manejar errores (Logout si es 401)
api.interceptors.response.use(
    (response) => response, // Devolvemos response completo para que el service decida si usa .data
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ------------------------------------------------------------------
// 2. SERVICIOS
// ------------------------------------------------------------------

export const authService = {
    login: async (email: string, password: string) => {
        // Hace POST a /auth/login enviando email y password
        const response = await api.post('/auth/login', { email, password });
        return response.data; // Devuelve { access_token, user }
    },
};

export const usersService = {
    // Ahora acepta el parámetro opcional
    getAll: async (withDeleted: boolean = false, page: number = 1, limit: number = 10, search: string = '') => {
        const token = localStorage.getItem('token');
        const response = await api.get(`/users`, {
            params: { withDeleted, page, limit, search }, // Axios arma la URL solo
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data; // Devolverá { data: [], total: 100 }
    },

    // NUEVOS MÉTODOS
    getRoles: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/users/roles', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },

    getBranches: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/users/branches', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },

    create: async (user: any) => {
        const token = localStorage.getItem('token');
        const response = await api.post('/users', user, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },

    update: async (id: string, user: any) => {
        const token = localStorage.getItem('token');
        const response = await api.patch(`/users/${id}`, user, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },

    delete: async (id: string, hard: boolean = false) => {
        const token = localStorage.getItem('token');
        await api.delete(`/users/${id}?hard=${hard}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    // Nuevo método restaurar
    restore: async (id: string) => {
        const token = localStorage.getItem('token');
        await api.patch(`/users/${id}/restore`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};

export const branchesService = {
    getAll: async (withDeleted: boolean = false, page: number = 1, limit: number = 10, search: string = '') => {
        const token = localStorage.getItem('token');
        const response = await api.get(`/branches`, {
            params: { withDeleted, page, limit, search },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data; // { data: [], total: N }
    },
    create: async (data: any) => {
        const token = localStorage.getItem('token');
        const response = await api.post('/branches', data, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    update: async (id: string, data: any) => {
        const token = localStorage.getItem('token');
        const response = await api.patch(`/branches/${id}`, data, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    delete: async (id: string, hard: boolean = false) => {
        const token = localStorage.getItem('token');
        await api.delete(`/branches/${id}?hard=${hard}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },
    restore: async (id: string) => {
        const token = localStorage.getItem('token');
        await api.patch(`/branches/${id}/restore`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};

export const inventoryService = {
    // Auxiliares
    getCategories: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/inventory/categories', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    getUnits: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/inventory/units', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    getProviders: async (page = 1, limit = 10, search = '', withDeleted = false) => {
        const response = await api.get('/inventory/providers', {
            params: { page, limit, search, withDeleted }
        });
        // Validacion para que no rompa si el backend devuelve estructura distinta
        return response.data;
    },
    createProvider: async (data: any) => {
        const response = await api.post('/inventory/providers', data);
        return response.data;
    },
    updateProvider: async (id: string, data: any) => {
        const response = await api.patch(`/inventory/providers/${id}`, data);
        return response.data;
    },
    deleteProvider: async (id: string, hard = false) => {
        await api.delete(`/inventory/providers/${id}`, { params: { hard } });
    },

    // 👇 NUEVO: Restore
    restoreProvider: async (id: string) => {
        await api.patch(`/inventory/providers/${id}/restore`);
    },

    getBranches: async () => {
        const response = await api.get('/branches'); // Reutilizamos el endpoint general
        return Array.isArray(response.data) ? response.data : (response.data.data || []);
    },

    getProviderById: async (id: string) => {
        const response = await api.get(`/inventory/providers/${id}`);
        return response.data;
    },

    // --- CUENTAS BANCARIAS (NUEVO) ---
    getProviderAccounts: async (providerId: string, withDeleted = false) => {
        const response = await api.get(`/inventory/provider-accounts/provider/${providerId}`, {
            params: { withDeleted }
        });
        return response.data;
    },

    createProviderAccount: async (data: any) => {
        const response = await api.post('/inventory/provider-accounts', data);
        return response.data;
    },

    updateProviderAccount: async (id: string, data: any) => {
        const response = await api.patch(`/inventory/provider-accounts/${id}`, data);
        return response.data;
    },

    deleteProviderAccount: async (id: string, hard = false) => {
        await api.delete(`/inventory/provider-accounts/${id}`, { params: { hard } });
    },

    restoreProviderAccount: async (id: string) => {
        await api.patch(`/inventory/provider-accounts/${id}/restore`);
    },

    // Productos (CRUD Completo)
    getProducts: async (page = 1, limit = 10, search = '', categoryId = '', providerId = '', withDeleted = false) => {
        const token = localStorage.getItem('token');
        const response = await api.get('/inventory/products', {
            // Axios arma la query string automáticamente con estos params
            params: { page, limit, search, categoryId, providerId, withDeleted },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },
    createProduct: async (data: any) => {
        const token = localStorage.getItem('token');
        const response = await api.post('/inventory/products', data, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    updateProduct: async (id: string, data: any) => {
        const token = localStorage.getItem('token');
        const response = await api.patch(`/inventory/products/${id}`, data, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    deleteProduct: async (id: string, hardDelete = false) => {
        await api.delete(`/inventory/products/${id}`, { params: { hardDelete } });
    },

    restoreProduct: async (id: string) => {
        const token = localStorage.getItem('token');
        await api.patch(`/inventory/products/${id}/restore`, {}, { headers: { Authorization: `Bearer ${token}` } });
    },

    createPurchase: async (data: any) => {
        const response = await api.post('/inventory/purchases', data);
        return response.data;
    },
};

export const salesService = {
    getClients: async (page = 1, limit = 10, search = '', withDeleted = false) => {
        const response = await api.get('/sales/clients', {
            params: { page, limit, search, withDeleted }
        });
        return response.data;
    },

    createClient: async (data: any) => {
        const response = await api.post('/sales/clients', data);
        return response.data;
    },

    updateClient: async (id: string, data: any) => {
        const response = await api.patch(`/sales/clients/${id}`, data);
        return response.data;
    },

    deleteClient: async (id: string, hard = false) => {
        await api.delete(`/sales/clients/${id}`, { params: { hard } });
    },

    restoreClient: async (id: string) => {
        await api.patch(`/sales/clients/${id}/restore`);
    },
};

export const settingsService = {
    get: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/settings', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    update: async (data: any) => {
        const token = localStorage.getItem('token');
        const response = await api.patch('/settings', data, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    }
};

export const integrationService = {
    getAfipData: async (cuit: string) => {
        const response = await api.get(`/integrations/afip/person/${cuit}`);
        return response.data;
    }
};

export const financeService = {
    getChecks: async (page = 1, limit = 10, search = '', type = '', status = '', providerId = '', dateFrom = '', dateTo = '', hideFinalized = true) => {
        const params: any = { page, limit, search, type, status, providerId, dateFrom, dateTo, hideFinalized };
        if (type) params.type = type;
        if (status) params.status = status;
        if (providerId) params.providerId = providerId; // 👈 Enviamos

        const response = await api.get('/finance/checks', { params });
        return response.data;
    },
    createCheck: async (data: any) => {
        const response = await api.post('/finance/checks', data);
        return response.data;
    },

    updateCheck: async (id: string, data: any) => {
        const response = await api.patch(`/finance/checks/${id}`, data);
        return response.data;
    },

    deleteCheck: async (id: string) => {
        await api.delete(`/finance/checks/${id}`);
    },

    getUpcomingPayments: async () => {
        const response = await api.get('/finance/checks/dashboard/upcoming');
        return response.data;
    },

    getCurrentAccount: async (entityId: string, type: 'client' | 'provider', page = 1) => {
        const response = await api.get(`/finance/current-account/${type}/${entityId}`, { params: { page } });
        return response.data;
    },
    addMovement: async (data: any) => {
        const response = await api.post('/finance/current-account/movement', data);
        return response.data;
    }
};

export default api;