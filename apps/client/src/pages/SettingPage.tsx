import { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, Grid, Tabs, Tab, 
  FormControlLabel, Switch, InputAdornment, Divider, Alert
} from '@mui/material';
import { Save, Store, AttachMoney, Inventory } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { settingsService } from '../services/api';

interface SettingsData {
  fantasy_name: string;
  legal_name: string;
  tax_id: string;
  currency: string;
  default_vat_rate: number;
  default_profit_margin: number;
  allow_negative_stock: boolean;
}

export const SettingsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<SettingsData>({
    fantasy_name: '', legal_name: '', tax_id: '',
    currency: 'ARS', default_vat_rate: 21, default_profit_margin: 30,
    allow_negative_stock: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.get();
      setFormData({
        ...data,
        default_vat_rate: Number(data.default_vat_rate),
        default_profit_margin: Number(data.default_profit_margin)
      });
    } catch (err) {
      enqueueSnackbar('Error cargando configuración', { variant: 'error' });
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Evita recarga si viene del formulario
    setLoading(true);
    try {
      const payload = {
        fantasy_name: formData.fantasy_name,
        legal_name: formData.legal_name,
        tax_id: formData.tax_id,
        currency: formData.currency,
        default_vat_rate: Number(formData.default_vat_rate),
        default_profit_margin: Number(formData.default_profit_margin),
        allow_negative_stock: formData.allow_negative_stock,
      };

      await settingsService.update(payload);
      enqueueSnackbar('Configuración guardada correctamente', { variant: 'success' });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al guardar';
      const errorText = Array.isArray(msg) ? msg[0] : msg;
      enqueueSnackbar(errorText, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SettingsData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Configuración del Negocio</Typography>
      
      {/* EL FORM HABILITA EL ENTER PARA GUARDAR */}
      <Box component="form" onSubmit={handleSave}>
        <Paper sx={{ width: '100%', mb: 3 }}>
          <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} indicatorColor="primary" textColor="primary">
            <Tab icon={<Store />} label="Datos Empresa" iconPosition="start" />
            <Tab icon={<AttachMoney />} label="Finanzas" iconPosition="start" />
            <Tab icon={<Inventory />} label="Reglas Inventario" iconPosition="start" />
          </Tabs>

          <Box p={4}>
            {/* TAB 0: EMPRESA */}
            {tabIndex === 0 && (
              <Grid container spacing={3}>
                <Grid xs={12}>
                  <Alert severity="info">Estos datos aparecerán en los comprobantes y presupuestos.</Alert>
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField fullWidth label="Nombre de Fantasía (Kiosco/Corralón)" 
                    value={formData.fantasy_name || ''} // <--- SOLUCIÓN ERROR ROJO (|| '')
                    onChange={(e) => handleChange('fantasy_name', e.target.value)} 
                    helperText="Ej: Corralón El Fuerte"
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField fullWidth label="Razón Social" 
                    value={formData.legal_name || ''} 
                    onChange={(e) => handleChange('legal_name', e.target.value)} 
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField fullWidth label="CUIT / Identificación Fiscal" 
                    value={formData.tax_id || ''} 
                    onChange={(e) => handleChange('tax_id', e.target.value)} 
                  />
                </Grid>
              </Grid>
            )}

            {/* TAB 1: FINANZAS */}
            {tabIndex === 1 && (
              <Grid container spacing={3}>
                <Grid xs={12}>
                  <Typography variant="h6">Valores por Defecto</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estos valores se usarán para pre-llenar los productos nuevos.
                  </Typography>
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField fullWidth label="Moneda Principal" 
                    select SelectProps={{ native: true }}
                    value={formData.currency || 'ARS'} 
                    onChange={(e) => handleChange('currency', e.target.value)}
                  >
                    <option value="ARS">Pesos Argentinos (ARS)</option>
                    <option value="USD">Dólares (USD)</option>
                  </TextField>
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField fullWidth label="IVA por Defecto" 
                    select SelectProps={{ native: true }}
                    value={formData.default_vat_rate} 
                    onChange={(e) => handleChange('default_vat_rate', Number(e.target.value))}
                  >
                    <option value={0}>0% (Exento)</option>
                    <option value={10.5}>10.5% (Reducido)</option>
                    <option value={21}>21% (General)</option>
                    <option value={27}>27% (Servicios)</option>
                  </TextField>
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField fullWidth label="Margen Ganancia Sugerido" type="number"
                    value={formData.default_profit_margin} 
                    onChange={(e) => handleChange('default_profit_margin', e.target.value)}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  />
                </Grid>
              </Grid>
            )}

            {/* TAB 2: INVENTARIO */}
            {tabIndex === 2 && (
              <Grid container spacing={3}>
                <Grid xs={12}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={formData.allow_negative_stock} 
                        onChange={(e) => handleChange('allow_negative_stock', e.target.checked)} 
                      />
                    }
                    label="Permitir Facturar sin Stock (Stock Negativo)"
                  />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                    Si activas esto, podrás vender aunque el sistema diga que hay 0 productos.
                  </Typography>
                </Grid>
              </Grid>
            )}

            <Divider sx={{ my: 3 }} />
            
            <Box display="flex" justifyContent="flex-end">
              <Button 
                type="submit" // <--- ESTO HABILITA EL ENTER
                variant="contained" size="large" 
                startIcon={<Save />} 
                disabled={loading}
              >
                Guardar Cambios
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};