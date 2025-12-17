import { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Tabs, Tab, TextField, Button, Grid, InputAdornment, MenuItem 
} from '@mui/material'; // <--- Agregado MenuItem
import { Save } from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { settingsService } from '../services/api';

// 1. DEFINIMOS LOS TIPOS (Para que TypeScript no se queje)
interface SettingsData {
  fantasy_name: string;
  legal_name: string;
  tax_id: string;
  currency: string;
  default_vat_rate: number;
  default_profit_margin: number;
  allow_negative_stock: boolean;
  exchange_rate: number;
  price_rounding: number; // <--- NUEVO CAMPO
}

export const SettingsPage = () => {
  const { showNotification } = useNotification();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // 2. ESTADO INICIAL (Para evitar el error "value is undefined")
  const [formData, setFormData] = useState<SettingsData>({
    fantasy_name: '',
    legal_name: '',
    tax_id: '',
    currency: 'ARS',
    default_vat_rate: 21,
    default_profit_margin: 30,
    allow_negative_stock: false,
    exchange_rate: 1,      // Default seguro
    price_rounding: 0      // Default seguro
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.get();
      // 3. CARGA SEGURA (Mapeamos lo que viene del backend)
      setFormData({
        fantasy_name: data.fantasy_name || '',
        legal_name: data.legal_name || '',
        tax_id: data.tax_id || '',
        currency: data.currency || 'ARS',
        default_vat_rate: Number(data.default_vat_rate || 21),
        default_profit_margin: Number(data.default_profit_margin || 30),
        allow_negative_stock: data.allow_negative_stock || false,
        exchange_rate: Number(data.exchange_rate || 1),
        price_rounding: Number(data.price_rounding || 0), // <--- LEER EL DATO
      });
    } catch (err) {
      console.error(err);
      showNotification('Error cargando configuración', 'error' );
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      // 4. GUARDADO COMPLETO
      const payload = {
        fantasy_name: formData.fantasy_name,
        legal_name: formData.legal_name,
        tax_id: formData.tax_id,
        currency: formData.currency,
        default_vat_rate: Number(formData.default_vat_rate),
        default_profit_margin: Number(formData.default_profit_margin),
        allow_negative_stock: formData.allow_negative_stock,
        exchange_rate: Number(formData.exchange_rate),
        price_rounding: Number(formData.price_rounding), // <--- ENVIAR EL DATO
      };

      await settingsService.update(payload);
      showNotification('Configuración guardada correctamente', 'success');
    } catch (err: any) {
      showNotification('Error al guardar', 'error' );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SettingsData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Box>
      <Typography variant="h4" mb={3}>Configuración del Negocio</Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Datos Empresa" />
          <Tab label="Finanzas" />
          <Tab label="Reglas Inventario" />
        </Tabs>

        <form onSubmit={handleSave}>
          <Box p={3}>
            {/* TAB 0: DATOS EMPRESA */}
            {tab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Nombre de Fantasía (Kiosco/Corralón)" 
                    value={formData.fantasy_name} onChange={(e) => handleChange('fantasy_name', e.target.value)} 
                    helperText="Ej: Corralón El Fuerte"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Razón Social" 
                    value={formData.legal_name} onChange={(e) => handleChange('legal_name', e.target.value)} 
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="CUIT / Identificación Fiscal" 
                    value={formData.tax_id} onChange={(e) => handleChange('tax_id', e.target.value)} 
                  />
                </Grid>
              </Grid>
            )}

            {/* TAB 1: FINANZAS */}
            {tab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12}><Typography variant="h6" gutterBottom>Valores por Defecto</Typography></Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Cotización Dólar (Para conversión)" type="number"
                    value={formData.exchange_rate} 
                    onChange={(e) => handleChange('exchange_rate', e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    helperText="Usado para mostrar precios en pesos de productos dolarizados."
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField select fullWidth label="Regla de Redondeo (ARS)" 
                    value={formData.price_rounding} 
                    onChange={(e) => handleChange('price_rounding', e.target.value)}
                    helperText="Se aplica automáticamente al calcular precios en Pesos."
                  >
                    <MenuItem value={0}>Exacto (Sin redondeo)</MenuItem>
                    <MenuItem value={1}>Al entero más cercano ($1)</MenuItem>
                    <MenuItem value={5}>Múltiplo de $5</MenuItem>
                    <MenuItem value={10}>Múltiplo de $10</MenuItem>
                    <MenuItem value={50}>Múltiplo de $50</MenuItem>
                    <MenuItem value={100}>Múltiplo de $100</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField select fullWidth label="Moneda Principal" 
                    value={formData.currency} onChange={(e) => handleChange('currency', e.target.value)}
                  >
                    <MenuItem value="ARS">Pesos Argentinos (ARS)</MenuItem>
                    <MenuItem value="USD">Dólares (USD)</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField select fullWidth label="IVA por Defecto" 
                    value={formData.default_vat_rate} onChange={(e) => handleChange('default_vat_rate', e.target.value)}
                  >
                     <MenuItem value={0}>0%</MenuItem>
                     <MenuItem value={10.5}>10.5%</MenuItem>
                     <MenuItem value={21}>21% (General)</MenuItem>
                     <MenuItem value={27}>27%</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Margen Ganancia Sugerido" type="number"
                    value={formData.default_profit_margin} onChange={(e) => handleChange('default_profit_margin', e.target.value)} 
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  />
                </Grid>
              </Grid>
            )}

            {/* TAB 2: REGLAS INVENTARIO (Placeholder) */}
            {tab === 2 && (
              <Box>
                <Typography>Próximamente: Configuración de stock negativo y alertas.</Typography>
              </Box>
            )}

            <Box mt={3} display="flex" justifyContent="flex-end">
              <Button variant="contained" startIcon={<Save />} type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};