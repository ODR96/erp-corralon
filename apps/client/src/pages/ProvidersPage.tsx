import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
  Chip,
  MenuItem,
  FormControlLabel,
  Switch,
  InputAdornment
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Business,
  Phone,
  Email,
  RestoreFromTrash,
  DeleteForever,
  Visibility,
  CloudSync
} from "@mui/icons-material";
import { inventoryService, integrationService } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";


// Opciones para el selector de Condición fiscal
const TAX_CONDITIONS = [
  { value: "RI", label: "Responsable Inscripto" },
  { value: "MT", label: "Monotributo" },
  { value: "EX", label: "Exento" },
  { value: "CF", label: "Consumidor Final" },
];

export const ProvidersPage = () => {
  const [searchingAfip, setSearchingAfip] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  // --- ESTADOS ---
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Paginación y Filtros
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleted, setShowDeleted] = useState(false); // <--- Filtro papelera

  // Modal y Formulario
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    tax_id: "",
    tax_condition: "RI",
    email: "",
    phone: "",
    address: "",
    observation: "",
  });

  // --- EFECTOS ---
  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, searchTerm, showDeleted]); // Recarga si cambia algo de esto

  // --- FUNCIONES ---
  const loadData = async () => {
    setLoading(true);
    try {
      // Llamamos al servicio pasando el parámetro showDeleted (withDeleted)
      const response = await inventoryService.getProviders(
        page + 1,
        rowsPerPage,
        searchTerm,
        showDeleted
      );

      // Manejo robusto de la respuesta (por si el backend manda {data, total} o array directo)
      if (response.data) {
        setProviders(response.data);
        setTotalRows(response.total);
      } else if (Array.isArray(response)) {
        setProviders(response);
        setTotalRows(response.length);
      } else {
        setProviders([]);
        setTotalRows(0);
      }
    } catch (error) {
      console.error("Error cargando proveedores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAfipSearch = async () => {
    if (!formData.tax_id || formData.tax_id.length < 11) {
        showNotification('Ingresa un CUIT válido de 11 dígitos', 'warning');
        return;
    }

    setSearchingAfip(true);
    try {
        const data = await integrationService.getAfipData(formData.tax_id);
        
        // Autocompletamos el formulario
        setFormData(prev => ({
            ...prev,
            name: data.name,
            address: data.address,
            tax_condition: data.tax_condition, // Asegúrate que coincida con tus values del Select (RI, MT, etc)
        }));
        showNotification('Datos obtenidos de AFIP', 'success');
    } catch (error) {
        showNotification('No se encontraron datos o falló la conexión', 'error');
    } finally {
        setSearchingAfip(false);
    }
};

  const handleSave = async () => {
    try {
      // 1. Validaciones básicas antes de molestar al servidor
      if (!formData.name.trim()) {
        alert("El nombre/razón social es obligatorio");
        return;
      }

      // 2. LIMPIEZA DE DATOS (Sanitización) 🧼
      // Creamos un objeto SOLO con los campos que permitimos tocar.
      // Ignoramos id, tenant, created_at, etc.
      const payload = {
        name: formData.name,
        tax_id: formData.tax_id || null, // Si está vacío, mandamos null para mantener la DB limpia
        tax_condition: formData.tax_condition,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        observation: formData.observation || null,
      };

      if (isEditing) {
        // EDITAR: Usamos el ID de la URL y el payload limpio en el cuerpo
        await inventoryService.updateProvider(formData.id, payload);
      } else {
        // CREAR: Solo mandamos el payload limpio
        await inventoryService.createProvider(payload);
      }

      // 3. Éxito: Cerramos y recargamos
      setOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Error al guardar. Verifica los datos.");
    }
  };

  const handleDelete = async (id: string, isHard: boolean) => {
    const msg = isHard
      ? "⚠️ ¿ELIMINAR DEFINITIVAMENTE? \nEsta acción borrará el proveedor y NO se puede deshacer."
      : "¿Mover a papelera de reciclaje?";

    if (window.confirm(msg)) {
      try {
        await inventoryService.deleteProvider(id, isHard);
        loadData();
      } catch (e) {
        alert("No se pudo eliminar el proveedor.");
      }
    }
  };

  const handleRestore = async (id: string) => {
    if (window.confirm("¿Restaurar este proveedor?")) {
      try {
        await inventoryService.restoreProvider(id);
        loadData();
      } catch (e) {
        alert("Error al restaurar.");
      }
    }
  };

  const openModal = (provider?: any) => {
    if (provider) {
      setIsEditing(true);
      setFormData(provider);
    } else {
      setIsEditing(false);
      setFormData({
        id: "",
        name: "",
        tax_id: "",
        tax_condition: "RI",
        email: "",
        phone: "",
        address: "",
        observation: "",
      });
    }
    setOpen(true);
  };

  // --- RENDERIZADO ---
  return (
    <Box p={3}>
      {/* HEADER */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold" color="primary">
          👥 Proveedores
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => openModal()}
          sx={{ fontWeight: "bold" }}
        >
          Nuevo Proveedor
        </Button>
      </Box>

      {/* FILTROS */}
      <Paper
        sx={{ p: 2, mb: 3, display: "flex", alignItems: "center", gap: 2 }}
      >
        <TextField
          label="Buscar por nombre o CUIT..."
          variant="outlined"
          size="small"
          fullWidth
          InputProps={{ endAdornment: <Search color="action" /> }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <FormControlLabel
          control={
            <Switch
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              color="error"
            />
          }
          label="Papelera"
          sx={{ minWidth: "120px" }}
        />
      </Paper>

      {/* TABLA */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead sx={{ bgcolor: showDeleted ? "#ffebee" : "#f5f5f5" }}>
            <TableRow>
              <TableCell>RAZÓN SOCIAL</TableCell>
              <TableCell>CUIT / CONDICIÓN</TableCell>
              <TableCell>CONTACTO</TableCell>
              <TableCell>OBSERVACIONES</TableCell>
              <TableCell align="right">ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              providers.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{
                    opacity: p.deleted_at ? 0.6 : 1,
                    bgcolor: p.deleted_at ? "#fff5f5" : "inherit",
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Business color={p.deleted_at ? "disabled" : "action"} />
                      <Typography
                        fontWeight="bold"
                        sx={{
                          textDecoration: p.deleted_at
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {p.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{p.tax_id || "-"}</Typography>
                    <Chip
                      label={p.tax_condition || "N/A"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {p.email && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Email fontSize="small" color="disabled" />
                        <Typography variant="caption">{p.email}</Typography>
                      </Box>
                    )}
                    {p.phone && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Phone fontSize="small" color="disabled" />
                        <Typography variant="caption">{p.phone}</Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{ fontStyle: "italic", color: "text.secondary" }}
                    >
                      {p.observation
                        ? p.observation.length > 30
                          ? p.observation.substring(0, 30) + "..."
                          : p.observation
                        : ""}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    {p.deleted_at ? (
                      // MODO PAPELERA: Restaurar o Matar
                      <>
                        <IconButton
                          color="success"
                          onClick={() => handleRestore(p.id)}
                          title="Restaurar"
                        >
                          <RestoreFromTrash />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(p.id, true)}
                          title="Borrar para siempre"
                        >
                          <DeleteForever />
                        </IconButton>
                      </>
                    ) : (
                      // MODO ACTIVO: Editar o Papelera
                      <>
                        <IconButton
                          color="primary"
                          onClick={() => openModal(p)}
                          title="Editar"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(p.id, false)}
                          title="Mover a papelera"
                        >
                          <Delete />
                        </IconButton>
                      </>
                    )}
                    <IconButton
                      color="info"
                      onClick={() => navigate(`/inventory/providers/${p.id}`)}
                      title="Ver Perfil"
                    >
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
            {providers.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {showDeleted
                    ? "La papelera está vacía."
                    : "No hay proveedores registrados."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={totalRows}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) =>
            setRowsPerPage(parseInt(e.target.value, 10))
          }
        />
      </TableContainer>

      {/* DIALOGO (MODAL) DE EDICIÓN/CREACIÓN */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {isEditing ? "✏️ Editar Proveedor" : "✨ Nuevo Proveedor"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} mt={0}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Razón Social / Nombre *"
                fullWidth
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="CUIT"
                fullWidth
                value={formData.tax_id}
                onChange={(e) =>
                  setFormData({ ...formData, tax_id: e.target.value })
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleAfipSearch}
                        disabled={searchingAfip || !formData.tax_id}
                        title="Consultar padrón AFIP"
                        color="primary"
                      >
                        {searchingAfip ? (
                          <CircularProgress size={24} />
                        ) : (
                          <CloudSync />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Condición IVA"
                fullWidth
                value={formData.tax_condition || "RI"}
                onChange={(e) =>
                  setFormData({ ...formData, tax_condition: e.target.value })
                }
              >
                {TAX_CONDITIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                fullWidth
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Teléfono"
                fullWidth
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Dirección"
                fullWidth
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Observaciones"
                fullWidth
                multiline
                rows={2}
                value={formData.observation || ""}
                onChange={(e) =>
                  setFormData({ ...formData, observation: e.target.value })
                }
                placeholder="Información interna (ej: Cuenta bancaria, horarios...)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ px: 4 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
