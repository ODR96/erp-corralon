import { useEffect, useState } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  FormControlLabel,
  Switch,
  TablePagination,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Store,
  Search,
  RestoreFromTrash,
  DeleteForever,
} from "@mui/icons-material";
import { useNotification } from '../context/NotificationContext';
import { branchesService } from "../services/api";

const initialForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
};

export const BranchesPage = () => {
  const { showNotification } = useNotification();

  // ESTADOS DE DATOS
  const [branches, setBranches] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // ESTADOS DE FILTROS Y PAGINACIÓN
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // ESTADOS DE MODAL
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  // CARGAR DATOS
  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, search, showDeleted]);

  const loadData = async () => {
    try {
      // API espera page base 1
      const response = await branchesService.getAll(
        showDeleted,
        page + 1,
        rowsPerPage,
        search
      );
      setBranches(response.data);
      setTotal(response.total);
    } catch (err) {
      showNotification("Error cargando sucursales", { variant: "error" });
    }
  };

  // MANEJADORES PAGINACIÓN
  const handleChangePage = (event: unknown, newPage: number) =>
    setPage(newPage);
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  };

  // ABM (Altas, Bajas, Modificaciones)
  const handleOpen = (branch?: any) => {
    if (branch) {
      setFormData({
        name: branch.name,
        address: branch.address || "",
        city: branch.city || "", // <--- Cargar
        state: branch.state || "", // <--- Cargar
        zip_code: branch.zip_code || "", // <--- Cargar
        phone: branch.phone || "",
      });
      setEditingId(branch.id);
      setIsEditing(true);
    } else {
      setFormData(initialForm);
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await branchesService.update(editingId, formData);
        showNotification("Sucursal actualizada", { variant: "success" });
      } else {
        await branchesService.create(formData);
        showNotification("Sucursal creada", { variant: "success" });
      }
      setOpen(false);
      loadData();
    } catch (err: any) {
      // 1. Intentamos leer el mensaje que envió el Backend
      const backendMessage = err.response?.data?.message;

      // 2. Si es un array (validación), tomamos el primero. Si es texto, lo usamos. Si no hay nada, usamos el genérico.
      const errorText = Array.isArray(backendMessage)
        ? backendMessage[0]
        : backendMessage || "Error al guardar la sucursal";

      // 3. Mostramos la alerta roja con el texto real
      showNotification(errorText, { variant: "error" });
    }
  };

  const handleDelete = async (id: string, isAlreadyDeleted: boolean) => {
    const msg = isAlreadyDeleted
      ? "¿ELIMINAR DEFINITIVAMENTE?"
      : "¿Enviar a papelera?";
    if (confirm(msg)) {
      try {
        await branchesService.delete(id, isAlreadyDeleted);
        showNotification(isAlreadyDeleted ? "Eliminado" : "En papelera", {
          variant: "success",
        });
        loadData();
      } catch (err) {
        showNotification("Error al eliminar", { variant: "error" });
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await branchesService.restore(id);
      showNotification("Restaurado", { variant: "success" });
      loadData();
    } catch (err) {
      showNotification("Error", { variant: "error" });
    }
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">Mis Sucursales</Typography>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                color="warning"
              />
            }
            label="Papelera"
            sx={{ mr: 2 }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen()}
          >
            Nueva
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar sucursal..."
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          }}
          size="small"
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {branches.length > 0 ? (
              branches.map((b) => {
                const isDeleted = !!b.deleted_at;
                return (
                  <TableRow
                    key={b.id}
                    sx={{ bgcolor: isDeleted ? "#fff4f4" : "inherit" }}
                  >
                    <TableCell
                      sx={{ color: isDeleted ? "text.disabled" : "inherit" }}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Store color={isDeleted ? "disabled" : "action"} />{" "}
                        {b.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {b.address || "-"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {b.city}, {b.state} ({b.zip_code})
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{ color: isDeleted ? "text.disabled" : "inherit" }}
                    >
                      {b.phone || "-"}
                    </TableCell>
                    <TableCell align="right">
                      {isDeleted ? (
                        <>
                          <IconButton
                            color="success"
                            onClick={() => handleRestore(b.id)}
                          >
                            <RestoreFromTrash />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(b.id, true)}
                          >
                            <DeleteForever />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton
                            color="primary"
                            onClick={() => handleOpen(b)}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(b.id, false)}
                          >
                            <Delete />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No se encontraron sucursales
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por pág."
        />
      </TableContainer>

      {/* DIALOG (Igual que antes) */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {isEditing ? "Editar Sucursal" : "Nueva Sucursal"}
          </DialogTitle>
          <DialogContent dividers>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Nombre"
                fullWidth
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                autoFocus
              />
              <TextField
                label="Dirección"
                fullWidth
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />

              <Box display="flex" gap={2}>
                {" "}
                {/* Fila para Ciudad y CP */}
                <TextField
                  label="Localidad"
                  fullWidth
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
                <TextField
                  label="C.P."
                  sx={{ width: "100px" }}
                  value={formData.zip_code}
                  onChange={(e) =>
                    setFormData({ ...formData, zip_code: e.target.value })
                  }
                />
              </Box>

              <TextField
                label="Provincia"
                fullWidth
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
              />
              <TextField
                label="Teléfono"
                fullWidth
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="contained" type="submit">
              Guardar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
