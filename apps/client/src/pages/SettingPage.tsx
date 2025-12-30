import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  InputAdornment,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { Save, Store, AttachMoney, Gavel } from "@mui/icons-material";
import { useNotification } from "../context/NotificationContext";
import { settingsService } from "../services/api";

// 1. DEFINIMOS LOS TIPOS (Agregamos printer_format)
interface SettingsData {
  fantasy_name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  phone: string;
  email: string;

  currency: string;
  exchange_rate: number;
  default_vat_rate: number;
  default_profit_margin: number;

  allow_negative_stock: boolean;
  price_rounding: number;
  printer_format: string; // 👈 NUEVO CAMPO
}

export const SettingsPage = () => {
  const { showNotification } = useNotification();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // 2. ESTADO INICIAL (Agregamos printer_format default 'A4')
  const [formData, setFormData] = useState<SettingsData>({
    fantasy_name: "",
    legal_name: "",
    tax_id: "",
    address: "",
    phone: "",
    email: "",
    currency: "ARS",
    exchange_rate: 1,
    default_vat_rate: 21,
    default_profit_margin: 30,
    allow_negative_stock: false,
    price_rounding: 0,
    printer_format: "A4", // 👈 Valor por defecto
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.get();
      if (data) {
        setFormData({
          fantasy_name: data.fantasy_name || "",
          legal_name: data.legal_name || "",
          tax_id: data.tax_id || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          currency: data.currency || "ARS",
          exchange_rate: Number(data.exchange_rate || 1),
          default_vat_rate: Number(data.default_vat_rate || 21),
          default_profit_margin: Number(data.default_profit_margin || 30),
          allow_negative_stock: data.allow_negative_stock || false,
          price_rounding: Number(data.price_rounding || 0),
          printer_format: data.printer_format || "A4", // 👈 Cargamos del backend
        });
      }
    } catch (err) {
      console.error(err);
      showNotification("Error cargando configuración", "error");
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        exchange_rate: Number(formData.exchange_rate),
        default_vat_rate: Number(formData.default_vat_rate),
        default_profit_margin: Number(formData.default_profit_margin),
        price_rounding: Number(formData.price_rounding),
        allow_negative_stock: Boolean(formData.allow_negative_stock),
        // printer_format viaja como string, no necesita conversión
      };

      await settingsService.update(payload);
      showNotification("Configuración guardada correctamente", "success");
    } catch (err: any) {
      console.error(err);
      showNotification("Error al guardar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SettingsData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3} fontWeight="bold">
        Configuración del Sistema
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
          variant="fullWidth"
        >
          <Tab icon={<Store />} iconPosition="start" label="Empresa" />
          <Tab icon={<AttachMoney />} iconPosition="start" label="Finanzas" />
          <Tab
            icon={<Gavel />}
            iconPosition="start"
            label="Reglas & Impresión"
          />
        </Tabs>

        <form onSubmit={handleSave}>
          <Box p={4}>
            {/* TAB 0: EMPRESA (Igual que antes) */}
            {tab === 0 && (
              <Grid container spacing={3}>
                {/* ... Tus campos de empresa existentes ... */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Estos datos aparecerán en los reportes y PDF.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre de Fantasía"
                    value={formData.fantasy_name}
                    onChange={(e) =>
                      handleChange("fantasy_name", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Razón Social"
                    value={formData.legal_name}
                    onChange={(e) => handleChange("legal_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="CUIT / ID Fiscal"
                    value={formData.tax_id}
                    onChange={(e) => handleChange("tax_id", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Dirección Comercial"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email de Contacto"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </Grid>
              </Grid>
            )}

            {/* TAB 1: FINANZAS (Igual que antes) */}
            {tab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Moneda Principal"
                    value={formData.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                  >
                    <MenuItem value="ARS">Peso Argentino (ARS)</MenuItem>
                    <MenuItem value="USD">Dólar (USD)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Cotización Dólar"
                    type="number"
                    value={formData.exchange_rate}
                    onChange={(e) =>
                      handleChange("exchange_rate", e.target.value)
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="IVA por Defecto"
                    value={formData.default_vat_rate}
                    onChange={(e) =>
                      handleChange("default_vat_rate", e.target.value)
                    }
                  >
                    <MenuItem value={0}>0% (Exento)</MenuItem>
                    <MenuItem value={10.5}>10.5%</MenuItem>
                    <MenuItem value={21}>21% (General)</MenuItem>
                    <MenuItem value={27}>27%</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Margen Ganancia Sugerido (%)"
                    type="number"
                    value={formData.default_profit_margin}
                    onChange={(e) =>
                      handleChange("default_profit_margin", e.target.value)
                    }
                  />
                </Grid>
              </Grid>
            )}

            {/* TAB 2: REGLAS E IMPRESIÓN */}
            {tab === 2 && (
              <Grid container spacing={3}>
                {/* 👇 NUEVO: SECCIÓN IMPRESIÓN */}
                <Grid item xs={12}>
                  <Typography variant="h6" color="primary">
                    Opciones de Impresión
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Los presupuestos siempre se imprimirán en A4. Las ventas
                    usarán esta configuración.
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Formato Ticket de Venta"
                    value={formData.printer_format}
                    onChange={(e) =>
                      handleChange("printer_format", e.target.value)
                    }
                    helperText="Si elige 80mm, asegúrese de tener una impresora térmica."
                  >
                    <MenuItem value="A4">Hoja A4 (Estándar)</MenuItem>
                    <MenuItem value="80mm">Ticket Térmico (80mm)</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" color="primary" mt={2}>
                    Reglas de Negocio
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Redondeo de Precios (Venta)"
                    value={formData.price_rounding}
                    onChange={(e) =>
                      handleChange("price_rounding", e.target.value)
                    }
                  >
                    <MenuItem value={0}>Exacto (Sin redondeo)</MenuItem>
                    <MenuItem value={1}>Redondear a $1</MenuItem>
                    <MenuItem value={10}>Redondear a $10</MenuItem>
                    <MenuItem value={50}>Redondear a $50</MenuItem>
                    <MenuItem value={100}>Redondear a $100</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" height="100%">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.allow_negative_stock}
                          onChange={(e) =>
                            handleChange(
                              "allow_negative_stock",
                              e.target.checked
                            )
                          }
                        />
                      }
                      label="Permitir Stock Negativo"
                    />
                  </Box>
                </Grid>
              </Grid>
            )}

            <Box mt={4} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                size="large"
                startIcon={<Save />}
                type="submit"
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};
