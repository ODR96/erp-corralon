// apps/client/src/utils/dateUtils.ts

// Lista simplificada de Feriados Nacionales (Formato YYYY-MM-DD)
// Puedes agregar más o conectarlo a una API a futuro.
const FERIADOS_AR = [
    // 2025 (Algunos ejemplos)
    '2025-01-01', // Año Nuevo
    '2025-03-03', // Carnaval
    '2025-03-04', // Carnaval
    '2025-03-24', // Memoria
    '2025-04-02', // Malvinas
    '2025-04-18', // Viernes Santo
    '2025-05-01', // Trabajador
    '2025-05-25', // Revolución de Mayo
    '2025-06-20', // Belgrano
    '2025-07-09', // Independencia
    '2025-08-17', // San Martín
    '2025-10-12', // Diversidad Cultural
    '2025-12-08', // Inmaculada Concepción
    '2025-12-25', // Navidad

    // 2026
    '2026-01-01',
    // ... agregar más según calendario oficial
];

/**
 * Verifica si una fecha es Fin de Semana o Feriado
 */
export const isBusinessDay = (dateString: string): { valid: boolean; reason?: string } => {
    const date = new Date(dateString);
    // Importante: Ajustar zona horaria o trabajar con UTC para evitar errores de "día anterior"
    // Asumimos que dateString viene YYYY-MM-DD
    const dayOfWeek = date.getUTCDay(); // 0 = Domingo, 6 = Sábado

    if (dayOfWeek === 0) return { valid: false, reason: 'Es Domingo' };
    if (dayOfWeek === 6) return { valid: false, reason: 'Es Sábado' };

    if (FERIADOS_AR.includes(dateString)) {
        return { valid: false, reason: 'Es Feriado Nacional' };
    }

    return { valid: true };
};

/**
 * Busca el siguiente día hábil a partir de una fecha
 */
export const getNextBusinessDay = (startDateStr: string): string => {
    let current = new Date(startDateStr);

    // Loop de seguridad (máximo 15 días para no colgar el navegador)
    for (let i = 0; i < 15; i++) {
        // Avanzar un día
        current.setDate(current.getDate() + 1);
        const isoDate = current.toISOString().split('T')[0];

        if (isBusinessDay(isoDate).valid) {
            return isoDate;
        }
    }
    return startDateStr; // Fallback
};

/**
 * Formatea fecha para mostrar amigable (ej: "Lun, 25 de Mayo")
 */
export const getFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-AR', {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'
    }).format(date);
};