import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  MenuItem,
  Typography,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  RestoreFromTrash,
  DeleteForever,
  AccountBalance,
} from "@mui/icons-material";
import { inventoryService } from "../../services/api";
import { useNotification } from "../../context/NotificationContext"; // 👈 Usamos nuestro nuevo hook

interface Props {
  providerId: string;
}

export const ProviderAccountsTab = ({ providerId }: Props) => {
  const { showNotification } = useNotification();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    provider_id: providerId,
    bank_name: "",
    cbu: "",
    alias: "",
    currency: "ARS",
    is_primary: false,
  });

  useEffect(() => {
    loadAccounts();
  }, [providerId, showDeleted]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getProviderAccounts(
        providerId,
        showDeleted
      );
      setAccounts(data);
    } catch (error) {
      showNotification("Error cargando cuentas", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validaciones
    if (formData.cbu && formData.cbu.length !== 22) {
      showNotification("El CBU debe tener exactamente 22 números", "warning");
      return;
    }
    if (!formData.bank_name) {
      showNotification("El nombre del Banco es obligatorio", "warning");
      return;
    }

    try {
      // 👇 LIMPIEZA DE DATOS:
      // Creamos un objeto SOLO con los campos que el backend acepta.
      // Así evitamos enviar 'id', 'created_at', 'updated_at' por accidente.
      const payload = {
        provider_id: providerId, // Usamos el ID de la prop para asegurar
        bank_name: formData.bank_name,
        cbu: formData.cbu,
        alias: formData.alias,
        currency: formData.currency,
        is_primary: formData.is_primary,
      };

      if (isEditing) {
        // En update enviamos el ID en la URL, y el payload limpio en el cuerpo
        await inventoryService.updateProviderAccount(formData.id, payload);
        showNotification("Cuenta actualizada correctamente", "success");
      } else {
        // En create enviamos el payload limpio
        await inventoryService.createProviderAccount(payload);
        showNotification("Cuenta creada correctamente", "success");
      }

      setOpen(false);
      loadAccounts();
    } catch (error) {
      console.error(error);
      showNotification("Error al guardar la cuenta", "error");
    }
  };

  const handleDelete = async (id: string, hard: boolean) => {
    if (
      window.confirm(hard ? "¿Borrar definitivamente?" : "¿Mover a papelera?")
    ) {
      try {
        await inventoryService.deleteProviderAccount(id, hard);
        showNotification("Cuenta eliminada", "info");
        loadAccounts();
      } catch (e) {
        showNotification("Error al eliminar", "error");
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await inventoryService.restoreProviderAccount(id);
      showNotification("Cuenta restaurada", "success");
      loadAccounts();
    } catch (e) {
      showNotification("Error al restaurar", "error");
    }
  };

  const openModal = (acc?: any) => {
    if (acc) {
      setIsEditing(true);
      setFormData(acc);
    } else {
      setIsEditing(false);
      setFormData({
        id: "",
        provider_id: providerId,
        bank_name: "",
        cbu: "",
        alias: "",
        currency: "ARS",
        is_primary: false,
      });
    }
    setOpen(true);
  };

  return (
    <Box mt={2}>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <FormControlLabel
          control={
            <Switch
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              color="error"
            />
          }
          label="Ver Papelera"
        />
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => openModal()}
        >
          Agregar Cuenta
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead sx={{ bgcolor: "#fafafa" }}>
            <TableRow>
              <TableCell>BANCO</TableCell>
              <TableCell>CBU / ALIAS</TableCell>
              <TableCell>MONEDA</TableCell>
              <TableCell align="center">ESTADO</TableCell>
              <TableCell align="right">ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map((acc) => (
              <TableRow
                key={acc.id}
                sx={{ bgcolor: acc.deleted_at ? "#fff5f5" : "inherit" }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <AccountBalance color="action" fontSize="small" />
                    <Typography variant="body2" fontWeight="bold">
                      {acc.bank_name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" display="block">
                    CBU: {acc.cbu || "-"}
                  </Typography>
                  <Typography
                    variant="caption"
                    display="block"
                    color="textSecondary"
                  >
                    Alias: {acc.alias || "-"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={acc.currency}
                    size="small"
                    color={acc.currency === "USD" ? "success" : "default"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  {acc.is_primary && (
                    <Chip label="PRINCIPAL" size="small" color="primary" />
                  )}
                </TableCell>
                <TableCell align="right">
                  {acc.deleted_at ? (
                    <>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleRestore(acc.id)}
                      >
                        <RestoreFromTrash />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(acc.id, true)}
                      >
                        <DeleteForever />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => openModal(acc)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(acc.id, false)}
                      >
                        <Delete />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay cuentas cargadas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} mt={0}>
            <Grid item xs={8}>
              <TextField
                label="Nombre del Banco *"
                fullWidth
                value={formData.bank_name}
                onChange={(e) =>
                  setFormData({ ...formData, bank_name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                select
                label="Moneda"
                fullWidth
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
              >
                <MenuItem value="ARS">Pesos (ARS)</MenuItem>
                <MenuItem value="USD">Dólares (USD)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="CBU (22 dígitos)"
                fullWidth
                value={formData.cbu}
                onChange={(e) =>
                  setFormData({ ...formData, cbu: e.target.value })
                }
                helperText={`${formData.cbu?.length || 0}/22`}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Alias"
                fullWidth
                value={formData.alias}
                onChange={(e) =>
                  setFormData({ ...formData, alias: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_primary}
                    onChange={(e) =>
                      setFormData({ ...formData, is_primary: e.target.checked })
                    }
                  />
                }
                label="Marcar como cuenta principal para pagos"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
