import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  InputAdornment,
} from "@mui/material";
import {
  Add,
  Edit,
  Business,
  VerifiedUser,
  Store,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { api } from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

// Interface que coincide con CreateTenantFullDto del Backend
interface TenantFormData {
  id?: string;
  // Datos Empresa
  company_name: string;
  company_slug: string;
  tax_id: string;
  address: string; // Nuevo campo necesario para la Sucursal
  max_branches: number;
  is_active: boolean;

  // Datos Admin (Solo para crear)
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
}

const initialForm: TenantFormData = {
  company_name: "",
  company_slug: "",
  tax_id: "",
  address: "",
  max_branches: 1,
  is_active: true,
  admin_full_name: "",
  admin_email: "",
  admin_password: "",
};

export const TenantsPage = () => {
  const { showNotification } = useNotification();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>(initialForm);
  const [showPassword, setShowPassword] = useState(false); // Para el ojito de la pass

  const isEdit = Boolean(formData.id);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    try {
      // Endpoint para listar (ajusta según tu controller, ej: /tenants o /super-admin/tenants)
      const res = await api.get("/tenants");
      setTenants(res.data);
    } catch (error) {
      console.error(error);
      showNotification("Error cargando empresas", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (tenant?: any) => {
    if (tenant) {
      // Modo Edición: Mapeamos los datos existentes
      setFormData({
        id: tenant.id,
        company_name: tenant.name,
        company_slug: tenant.slug,
        tax_id: tenant.tax_id || "",
        address: "", // Al editar, este dato quizás no lo tengas en la lista simple, o lo dejas vacio
        max_branches: tenant.max_branches,
        is_active: tenant.is_active,
        // Campos de admin vacíos porque no se editan aquí
        admin_full_name: "",
        admin_email: "",
        admin_password: "",
      });
    } else {
      setFormData(initialForm);
    }
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        // PATCH: Solo actualizamos datos de la empresa
        // Necesitas un DTO en backend que acepte partial update
        await api.patch(`/tenants/${formData.id}`, {
          name: formData.company_name, // Mapeo inverso si tu backend espera 'name' en update
          tax_id: formData.tax_id,
          max_branches: formData.max_branches,
          is_active: formData.is_active,
        });
        showNotification("Empresa actualizada", "success");
      } else {
        // POST: Creamos el Tenant Full (Empresa + Admin + Sucursal)
        // Enviamos formData tal cual, porque coincide con CreateTenantFullDto
        await api.post(`/tenants/create-full`, formData);
        showNotification("Empresa y Admin creados exitosamente", "success");
      }
      setOpen(false);
      loadTenants();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Error al guardar";
      showNotification(msg, "error");
    }
  };

  return (
    <Box p={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <VerifiedUser color="primary" fontSize="large" /> Panel Super Admin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión de Empresas (Tenants) y Planes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
        >
          Nueva Empresa
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell>Empresa</TableCell>
              <TableCell>Slug (URL)</TableCell>
              <TableCell align="center">Límite Sucursales</TableCell>
              <TableCell align="center">Uso Actual</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Business color="action" />
                    <Box>
                      <Typography fontWeight="bold">{t.name}</Typography>
                      <Typography variant="caption">{t.tax_id}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={t.slug}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: "monospace" }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography fontWeight="bold">{t.max_branches}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    gap={0.5}
                  >
                    <Store fontSize="small" color="disabled" />
                    {t.branches?.length || 0}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={t.is_active ? "Activo" : "Suspendido"}
                    color={t.is_active ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleOpen(t)}>
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL DE EDICIÓN / CREACIÓN */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleSave}>
          <DialogTitle>
            {isEdit ? "Editar Empresa / Plan" : "Nueva Empresa (Alta Completa)"}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} pt={1}>
              {/* SECCIÓN 1: DATOS DE LA EMPRESA */}
              <Grid item xs={12}>
                <Typography
                  variant="overline"
                  color="primary"
                  fontWeight="bold"
                >
                  Datos de la Organización
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Nombre Empresa"
                  fullWidth
                  required
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Slug (Identificador)"
                  fullWidth
                  required
                  helperText={
                    !isEdit && "Ej: mi-negocio (será parte de la URL)"
                  }
                  disabled={isEdit}
                  value={formData.company_slug}
                  onChange={(e) =>
                    setFormData({ ...formData, company_slug: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="CUIT / ID Fiscal"
                  fullWidth
                  required
                  value={formData.tax_id}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_id: e.target.value })
                  }
                />
              </Grid>

              {/* CAMPO DIRECCIÓN (Nuevo: Necesario para crear la Sucursal "Casa Central") */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Dirección Casa Central"
                  fullWidth
                  required={!isEdit} // Solo obligatorio al crear
                  disabled={isEdit} // No editable desde aquí (se edita en sucursales)
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Ej: Av. Corrientes 1234"
                />
              </Grid>

              {/* SECCIÓN 2: PLAN Y ESTADO */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant="overline"
                  color="primary"
                  fontWeight="bold"
                >
                  Configuración del Plan
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Máx. Sucursales"
                  type="number"
                  fullWidth
                  value={formData.max_branches}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_branches: Number(e.target.value),
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6} display="flex" alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      color="success"
                    />
                  }
                  label={
                    formData.is_active
                      ? "Servicio Activo"
                      : "Servicio Suspendido"
                  }
                />
              </Grid>

              {/* SECCIÓN 3: DATOS DEL DUEÑO (SOLO AL CREAR) */}
              {!isEdit && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography
                      variant="overline"
                      color="error"
                      fontWeight="bold"
                    >
                      Datos del Administrador Inicial
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Nombre Completo (Dueño)"
                      fullWidth
                      required
                      value={formData.admin_full_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          admin_full_name: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Email de Acceso"
                      type="email"
                      fullWidth
                      required
                      value={formData.admin_email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          admin_email: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Contraseña Inicial"
                      type={showPassword ? "text" : "password"}
                      fullWidth
                      required
                      value={formData.admin_password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          admin_password: e.target.value,
                        })
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="contained" type="submit">
              {isEdit ? "Guardar Cambios" : "Crear Empresa"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
