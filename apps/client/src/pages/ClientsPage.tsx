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
  InputAdornment,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Person,
  Phone,
  Email,
  RestoreFromTrash,
  DeleteForever,
  AttachMoney,
  CloudSync,
} from "@mui/icons-material";
import { integrationService, salesService } from "../services/api";
import { useNotification } from "../context/NotificationContext";

const TAX_CONDITIONS = [
  { value: "CF", label: "Consumidor Final" },
  { value: "RI", label: "Responsable Inscripto" },
  { value: "MT", label: "Monotributo" },
  { value: "EX", label: "Exento" },
];

export const ClientsPage = () => {
  const { showNotification } = useNotification();
  const [searchingAfip, setSearchingAfip] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Paginación y Filtros
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // Modal
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    tax_id: "",
    tax_condition: "CF",
    email: "",
    phone: "",
    address: "",
    credit_limit: 0, // <--- CAMPO CLAVE
    observation: "",
  });

  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, searchTerm, showDeleted]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await salesService.getClients(
        page + 1,
        rowsPerPage,
        searchTerm,
        showDeleted
      );
      if (response.data) {
        setClients(response.data);
        setTotalRows(response.total);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error("Error loading clients", error);
      showNotification("Error al cargar clientes", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAfipSearch = async () => {
    if (!formData.tax_id || formData.tax_id.length < 11) {
      showNotification("Ingresa un CUIT válido de 11 dígitos", "warning");
      return;
    }

    setSearchingAfip(true);
    try {
      const data = await integrationService.getAfipData(formData.tax_id);

      // Autocompletamos el formulario
      setFormData((prev) => ({
        ...prev,
        name: data.name,
        address: data.address,
        tax_condition: data.tax_condition, // Asegúrate que coincida con tus values del Select (RI, MT, etc)
      }));
      showNotification("Datos obtenidos de AFIP", "success");
    } catch (error) {
      showNotification("No se encontraron datos o falló la conexión", "error");
    } finally {
      setSearchingAfip(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showNotification("El nombre es obligatorio", "warning");
      return;
    }

    try {
      // Limpieza de datos (Payload)
      const payload = {
        name: formData.name,
        tax_id: formData.tax_id || null,
        tax_condition: formData.tax_condition,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        credit_limit: Number(formData.credit_limit) || 0, // Asegurar que sea número
        observation: formData.observation || null,
      };

      if (isEditing) {
        await salesService.updateClient(formData.id, payload);
        showNotification("Cliente actualizado correctamente", "success");
      } else {
        await salesService.createClient(payload);
        showNotification("Cliente creado correctamente", "success");
      }
      setOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      showNotification("Error al guardar. Verifica los datos.", "error");
    }
  };

  const handleDelete = async (id: string, isHard: boolean) => {
    const msg = isHard
      ? "⚠️ ¿ELIMINAR DEFINITIVAMENTE? \nSe perderá el historial de este cliente."
      : "¿Mover a papelera?";

    if (window.confirm(msg)) {
      try {
        await salesService.deleteClient(id, isHard);
        showNotification(
          isHard ? "Cliente eliminado" : "Cliente movido a papelera",
          "info"
        );
        loadData();
      } catch (e) {
        showNotification("No se pudo eliminar", "error");
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await salesService.restoreClient(id);
      showNotification("Cliente restaurado", "success");
      loadData();
    } catch (e) {
      showNotification("Error al restaurar", "error");
    }
  };

  const openModal = (client?: any) => {
    if (client) {
      setIsEditing(true);
      setFormData(client);
    } else {
      setIsEditing(false);
      setFormData({
        id: "",
        name: "",
        tax_id: "",
        tax_condition: "CF",
        email: "",
        phone: "",
        address: "",
        credit_limit: 0,
        observation: "",
      });
    }
    setOpen(true);
  };

  // Formateador de moneda (Pesos Argentinos)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  return (
    <Box p={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold" color="primary">
          👥 Clientes
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => openModal()}
          sx={{ fontWeight: "bold" }}
        >
          Nuevo Cliente
        </Button>
      </Box>

      <Paper
        sx={{ p: 2, mb: 3, display: "flex", alignItems: "center", gap: 2 }}
      >
        <TextField
          label="Buscar cliente..."
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

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead sx={{ bgcolor: showDeleted ? "#ffebee" : "#f5f5f5" }}>
            <TableRow>
              <TableCell>CLIENTE</TableCell>
              <TableCell>CONDICIÓN</TableCell>
              <TableCell>CONTACTO</TableCell>
              <TableCell>LÍMITE CRÉDITO</TableCell>
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
              clients.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{
                    opacity: c.deleted_at ? 0.6 : 1,
                    bgcolor: c.deleted_at ? "#fff5f5" : "inherit",
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Person color={c.deleted_at ? "disabled" : "primary"} />
                      <Box>
                        <Typography
                          fontWeight="bold"
                          sx={{
                            textDecoration: c.deleted_at
                              ? "line-through"
                              : "none",
                          }}
                        >
                          {c.name}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {c.tax_id || "Sin DNI/CUIT"}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.tax_condition}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {c.phone && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Phone fontSize="small" color="disabled" />
                        <Typography variant="caption">{c.phone}</Typography>
                      </Box>
                    )}
                    {c.address && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="textSecondary"
                      >
                        {c.address}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold" color="success.main">
                      {formatCurrency(Number(c.credit_limit))}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {c.deleted_at ? (
                      <>
                        <IconButton
                          color="success"
                          onClick={() => handleRestore(c.id)}
                          title="Restaurar"
                        >
                          <RestoreFromTrash />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(c.id, true)}
                          title="Borrar para siempre"
                        >
                          <DeleteForever />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton
                          color="primary"
                          onClick={() => openModal(c)}
                          title="Editar"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(c.id, false)}
                          title="Mover a papelera"
                        >
                          <Delete />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
            {clients.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay clientes registrados.
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

      {/* FORMULARIO MODAL */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {isEditing ? "✏️ Editar Cliente" : "✨ Nuevo Cliente"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} mt={0}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre / Razón Social *"
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
                label="Condición Fiscal"
                fullWidth
                value={formData.tax_condition || "CF"}
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
                label="Teléfono"
                fullWidth
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
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

            <Grid item xs={12}>
              <TextField
                label="Dirección de Entrega"
                fullWidth
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </Grid>

            {/* CAMPO IMPORTANTE: LÍMITE DE CRÉDITO */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Límite de Crédito Permitido"
                type="number"
                fullWidth
                value={formData.credit_limit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    credit_limit: Number(e.target.value),
                  })
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
                helperText="Monto máximo de deuda permitida para Cuenta Corriente"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Observaciones"
                fullWidth
                multiline
                rows={1}
                value={formData.observation || ""}
                onChange={(e) =>
                  setFormData({ ...formData, observation: e.target.value })
                }
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
