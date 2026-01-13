import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

// 👇 Importamos la clase Afip
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Afip } = require('afip.ts');

@Injectable()
export class AfipService implements OnModuleInit {
    private afip: any;
    private useMock: boolean = false; 

    // 👇 TU CUIT DE DESARROLLADOR
    private readonly CUIT_ORIGEN = 20393198487; 

    async onModuleInit() {
        if (this.useMock) return;

        try {
            const certPath = path.join(process.cwd(), 'apps/api/src/assets/afip/cert.crt');
            const keyPath = path.join(process.cwd(), 'apps/api/src/assets/afip/private.key');

            if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
                console.warn('⚠️ Certificados AFIP no encontrados. Usando MOCK.');
                this.useMock = true;
                return;
            }

            console.log("🔐 Inicializando AFIP (afip.ts)...");

            this.afip = new Afip({
                cuit: this.CUIT_ORIGEN,
                cert: fs.readFileSync(certPath, 'utf8'),
                key: fs.readFileSync(keyPath, 'utf8'),
                production: false, // Testing
                resFolder: path.join(process.cwd(), 'apps/api/src/assets/afip')
            });

            console.log('✅ Conexión AFIP Inicializada Correctamente');

        } catch (error) {
            console.error("❌ Error inicializando AFIP:", error.message);
            this.useMock = true;
        }
    }

    async getPersonData(cuit: string) {
        const cleanCuit = cuit.replace(/[^0-9]/g, '');
        if (cleanCuit.length !== 11) throw new BadRequestException('CUIT inválido');

        if (this.useMock) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                name: "MOCK USER S.A.",
                tax_id: cleanCuit,
                tax_condition: "RI",
                address: "CALLE FALSA 123",
                is_mock: true
            };
        }

        try {
            console.log(`🔍 Buscando CUIT ${cleanCuit} en AFIP...`);
            const data = await this.afip.registerScopeFiveService.getTaxpayerDetails(parseFloat(cleanCuit));
            
            // 👇 ESTO ES CLAVE: Muestra en la consola qué devolvió AFIP realmente
            console.log("📦 RESPUESTA AFIP RAW:", JSON.stringify(data, null, 2));

            if (!data) throw new Error('No se encontraron datos');

            // Normalización: A veces viene en data.datosGenerales, a veces directo en data
            const datos = data.datosGenerales || data; 
            
            // 1. Resolver NOMBRE (Evitar "undefined undefined")
            let name = 'Nombre Desconocido';
            if (datos.razonSocial) {
                name = datos.razonSocial;
            } else if (datos.apellido || datos.nombre) {
                name = `${datos.nombre || ''} ${datos.apellido || ''}`.trim();
            }

            // 2. Resolver DIRECCIÓN
            let address = 'Domicilio Fiscal Desconocido';
            const dom = datos.domicilioFiscal;
            if (dom) {
                // A veces la dirección viene simple o en partes
                const calle = dom.direccion || '';
                const loc = dom.localidad || '';
                const prov = dom.descripcionProvincia || '';
                address = `${calle} ${loc} ${prov}`.trim();
            }

            // 3. Resolver Condición Fiscal
            let condition = 'CF';
            if (datos.tipoClave === '20') condition = 'RI'; // Responsable Inscripto
            if (data.datosMonotributo) condition = 'MT'; // Monotributo
            if (datos.estadoClave === 'NO ACTIVO') condition = 'EX'; 

            return {
                name: name,
                tax_id: datos.idPersona || cleanCuit,
                tax_condition: condition,
                address: address !== '' ? address : 'Domicilio no informado',
                is_mock: false
            };
        } catch (error) {
            console.error('❌ Error AFIP getPersonData:', error);
            throw new BadRequestException('Error consultando AFIP: ' + (error.message || 'Desconocido'));
        }
    }

    async createVoucher(data: any) {
        if (this.useMock) {
            return {
                cae: '99999999999999',
                cae_due_date: new Date(),
                voucher_number: (data.last_voucher || 0) + 1
            };
        }

        try {
            const date = new Date();
            // Fecha formato YYYYMMDD número entero
            const formattedDate = parseInt(date.toISOString().slice(0, 10).replace(/-/g, ''));

            const payload = {
                CantReg: 1,
                PtoVta: data.point_of_sale || 1,
                CbteTipo: data.invoice_type || 6, 
                Concepto: 1,
                DocTipo: data.customer_doc_type || 99,
                DocNro: data.customer_doc_number || 0,
                CbteDesde: data.last_voucher + 1,
                CbteHasta: data.last_voucher + 1,
                CbteFch: formattedDate, 
                ImpTotal: data.total,
                ImpTotConc: 0,
                ImpNeto: data.net_amount,
                ImpOpEx: 0,
                ImpTrib: 0,
                ImpIVA: data.vat_amount,
                MonId: 'PES',
                MonCotiz: 1,
            };

            // 👇 CORRECCIÓN: Usamos 'electronicBillingService'
            const res = await this.afip.electronicBillingService.createVoucher(payload);

            return {
                cae: res.CAE,
                cae_due_date: res.CAEFchVto,
                voucher_number: data.last_voucher + 1
            };
        } catch (error) {
            console.error("Error Facturando AFIP:", error);
            throw new BadRequestException('Falló la facturación AFIP: ' + (error.message || 'Error desconocido'));
        }
    }
}