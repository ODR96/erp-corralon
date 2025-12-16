import { Injectable, BadRequestException } from '@nestjs/common';

// 🛡️ BLOQUE DE SEGURIDAD
// Intentamos importar la librería. Si no está instalada, no explotamos.
let Afip: any;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Afip = require('afip.js');
} catch (e) {
    Afip = null; // No pasa nada, usaremos el modo Mock
}

@Injectable()
export class AfipService {
    private afip: any;

    // 👇 FORZAMOS EL MOCK: Así puedes trabajar YA MISMO sin certificados ni librerías
    private useMock: boolean = true;

    constructor() {
        // Solo intentamos conectar con AFIP si tenemos la librería Y los certificados Y apagamos el mock
        if (!this.useMock && Afip) {
            try {
                this.afip = new Afip({
                    CUIT: 20111111112,
                    cert: './src/assets/afip/cert.crt',
                    key: './src/assets/afip/private.key',
                    production: false,
                });
            } catch (error) {
                console.warn("⚠️ AFIP no configurado. Pasando a modo MOCK automático.");
                this.useMock = true;
            }
        } else {
            this.useMock = true; // Si no hay librería, usamos Mock sí o sí
        }
    }

    async getPersonData(cuit: string) {
        // 1. Validar formato básico (solo números)
        const cleanCuit = cuit.replace(/[^0-9]/g, '');

        if (cleanCuit.length !== 11) {
            throw new BadRequestException('El CUIT debe tener 11 dígitos numéricos');
        }

        // 🎭 MODO SIMULACIÓN (Esto es lo que vas a usar hoy)
        if (this.useMock) {
            console.log(`🤖 Consultando Mock AFIP para: ${cleanCuit}`);

            // Simulamos 1.5 segundos de espera para que veas el spinner en el frontend
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Simulamos un error si el CUIT termina en 9 (para probar alertas de error)
            if (cleanCuit.endsWith('9')) {
                throw new BadRequestException('CUIT no encontrado en padrón (Simulado)');
            }

            // Devolvemos datos ficticios pero útiles
            return {
                name: "CONSTRUCTORA MODELO S.R.L.",
                tax_id: cleanCuit,
                tax_condition: "RI", // Responsable Inscripto
                address: "AV. SIEMPRE VIVA 742, FORMOSA",
                is_mock: true // Bandera para que sepas que es dato falso
            };
        }

        // 🏢 MODO REAL (Este código quedará dormido hasta que instales la librería)
        try {
            if (!this.afip) throw new Error('Librería no inicializada');

            const data = await this.afip.RegisterScopeFive.getTaxpayerDetails(cleanCuit);
            if (!data) throw new Error('No data');

            const datos = data.datosGenerales;
            let condition = 'CF';
            if (datos.tipoClave === '20') condition = 'RI';
            if (data.datosMonotributo) condition = 'MT';

            return {
                name: datos.razonSocial || `${datos.apellido} ${datos.nombre}`,
                tax_id: datos.idPersona,
                tax_condition: condition,
                address: datos.domicilioFiscal?.direccion || '',
                is_mock: false
            };
        } catch (error) {
            console.error(error);
            throw new BadRequestException('Error consultando servicio de AFIP');
        }
    }
}