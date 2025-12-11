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
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  InputAdornment,
  FormControlLabel,
  Switch,
  TablePagination, 
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Security,
  Search,
  Store,
  RestoreFromTrash,
  DeleteForever, // <--- Iconos nuevos
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { usersService } from "../services/api";

interface UserData {
  id?: string;
  full_name: string;
  email: string;
  password?: string;
  roleId: string;
  is_active?: boolean;
  branchId?: string;
}

const initialFormState: UserData = {
  full_name: "",
  email: "",
  password: "",
  roleId: "",
};

export const UsersPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [branches, setBranches] = useState<any[]>([]);

  // ESTADO NUEVO: FILTRO ELIMINADOS
  const [showDeleted, setShowDeleted] = useState(false);

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserData>(initialFormState);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [globalError, setGlobalError] = useState("");

  // ESTADOS DE PAGINACIÓN
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // MUI usa base 0, el Backend base 1
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState(''); // El valor real para la API

  // Cargar datos cuando cambia el switch 'showDeleted'
// Cargar datos cuando cambie: página, límite, búsqueda o filtro de borrados
  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, search, showDeleted]);

const loadData = async () => {
    try {
      // Backend espera page base 1 (1, 2, 3...)
      const usersResponse = await usersService.getAll(showDeleted, page + 1, rowsPerPage, search);
      const rolesData = await usersService.getRoles();
      const branchesData = await usersService.getBranches(); // Si ya tienes esto

      setUsers(usersResponse.data); // Los usuarios de esta página
      setTotal(usersResponse.total); // El número total en la base de datos
      
      setRoles(rolesData);
      setBranches(branchesData);
    } catch (error) {
      console.error("Error cargando datos", error);
      enqueueSnackbar("Error de conexión", { variant: "error" });
    }
  };

  // Manejadores de Paginación
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Volver a la primera página
  };

  // Manejador del Buscador (Con un pequeño delay o directo)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setSearch(e.target.value);
     setPage(0); // Resetear a pág 1 al buscar
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ... (handleOpenCreate, handleOpenEdit, handleClose, validateForm, handleSubmit siguen IGUAL) ...
  // Por brevedad, asumo que mantienes esas funciones del código anterior.
  // Si las necesitas completas avísame, pero solo cambia el handleDelete y agregamos handleRestore.

  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setFormErrors({});
    setGlobalError("");
    setOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setFormData({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      roleId: user.role?.id || "",
      branchId: user.branch?.id || "",
      password: "",
    });
    setIsEditing(true);
    setFormErrors({});
    setGlobalError("");
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const validateForm = () => {
    /* ... Código anterior ... */
    const errors: { [key: string]: string } = {};
    if (!formData.full_name) errors.full_name = "El nombre es requerido";
    if (!formData.email) errors.email = "El email es requerido";
    if (!formData.roleId) errors.roleId = "Debe seleccionar un rol";
    if (!isEditing && !formData.password)
      errors.password = "La contraseña es requerida";
    if (!isEditing && formData.password && (formData.password?.length || 0) < 6)
      errors.password = "Mínimo 6 caracteres";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      if (isEditing && formData.id) {
        // --- CORRECCIÓN AQUÍ ---
        const updatePayload: any = { ...formData }; // Copiamos los datos
        delete updatePayload.id; // <--- BORRAMOS EL ID para que el backend no se queje

        if (!updatePayload.password) delete updatePayload.password;

        await usersService.update(formData.id, updatePayload);
        enqueueSnackbar("Usuario actualizado", { variant: "success" });
      } else {
        await usersService.create(formData);
        enqueueSnackbar("Usuario creado", { variant: "success" });
      }
      handleClose();
      loadData();
    } catch (err: any) {
      const message = err.response?.data?.message;
      setGlobalError(
        Array.isArray(message) ? message[0] : message || "Error al guardar."
      );
    }
  };

  // --- NUEVAS FUNCIONES DE ACCIÓN ---

  const handleDelete = async (id: string, isAlreadyDeleted: boolean) => {
    const confirmMessage = isAlreadyDeleted
      ? "¿ESTÁ SEGURO? Se eliminará DEFINITIVAMENTE y no podrá recuperarse."
      : "¿Enviar a la papelera?";

    if (window.confirm(confirmMessage)) {
      try {
        // Si ya estaba borrado, hacemos hard delete (true). Si no, soft delete (false).
        await usersService.delete(id, isAlreadyDeleted);
        enqueueSnackbar(
          isAlreadyDeleted ? "Usuario destruido" : "Usuario enviado a papelera",
          { variant: "success" }
        );
        loadData();
      } catch (err) {
        enqueueSnackbar("Error al eliminar", { variant: "error" });
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await usersService.restore(id);
      enqueueSnackbar("Usuario restaurado", { variant: "success" });
      loadData();
    } catch (err) {
      enqueueSnackbar("Error al restaurar", { variant: "error" });
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
        <Typography variant="h4">Gestión de Usuarios</Typography>
        <Box>
          {/* SWITCH PARA VER ELIMINADOS */}
          <FormControlLabel
            control={
              <Switch
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                color="warning"
              />
            }
            label="Mostrar Inactivos"
            sx={{ mr: 2 }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenCreate}
          >
            Nuevo Usuario
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por nombre..."
          value={search} // Ahora está conectado al estado que dispara el useEffect
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
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
<TableBody>
            {users.length > 0 ? (
              users.map((user) => { // <--- ABRIMOS LLAVE
                const isDeleted = !!user.deleted_at; 
                return ( // <--- ABRIMOS PARÉNTESIS DEL RETURN
                  <TableRow
                    key={user.id}
                    sx={{ bgcolor: isDeleted ? "#fff4f4" : "inherit" }}
                  >
                    <TableCell
                      sx={{ color: isDeleted ? "text.disabled" : "inherit" }}
                    >
                      {user.full_name}
                    </TableCell>
                    <TableCell
                      sx={{ color: isDeleted ? "text.disabled" : "inherit" }}
                    >
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<Security />}
                        label={user.role?.name || "Sin Rol"}
                        size="small"
                        variant="outlined"
                        disabled={isDeleted}
                      />
                    </TableCell>
                    <TableCell>
                      {isDeleted ? (
                        <Chip
                          label="Inactivo"
                          color="error"
                          size="small"
                          variant="filled"
                        />
                      ) : (
                        <Chip
                          label={user.is_active ? "Activo" : "Inactivo"}
                          color={user.is_active ? "success" : "default"}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isDeleted ? (
                        <>
                          <IconButton
                            color="success"
                            title="Restaurar"
                            onClick={() => handleRestore(user.id)}
                          >
                            <RestoreFromTrash />
                          </IconButton>
                          <IconButton
                            color="error"
                            title="Eliminar Físicamente"
                            onClick={() => handleDelete(user.id, true)}
                          >
                            <DeleteForever />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenEdit(user)}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(user.id, false)}
                          >
                            <Delete />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ); // <--- CERRAMOS PARÉNTESIS DEL RETURN
              }) // <--- CERRAMOS LLAVE DE LA FUNCIÓN
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* COMPONENTE DE PAGINACIÓN */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total} // El total real de la base de datos
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por pág."
        />
      </TableContainer>

      {/* MODAL (Reutilizar el mismo código del <Dialog> anterior, no cambió nada) */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
          </DialogTitle>
          <DialogContent dividers>
            {globalError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {globalError}
              </Alert>
            )}
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Nombre Completo"
                fullWidth
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                error={!!formErrors.full_name}
                helperText={formErrors.full_name}
                autoFocus
              />
              <TextField
                label="Email"
                fullWidth
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                error={!!formErrors.email}
                helperText={formErrors.email}
              />
              <FormControl fullWidth error={!!formErrors.roleId}>
                <InputLabel>Rol Asignado</InputLabel>
                <Select
                  value={formData.roleId}
                  label="Rol Asignado"
                  onChange={(e) =>
                    setFormData({ ...formData, roleId: e.target.value })
                  }
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Sucursal</InputLabel>
                <Select
                  value={formData.branchId || ""}
                  label="Sucursal"
                  onChange={(e) =>
                    setFormData({ ...formData, branchId: e.target.value })
                  }
                >
                  <MenuItem value="">
                    <em>Ninguna (Global)</em>
                  </MenuItem>
                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label={isEditing ? "Nueva Contraseña (Opcional)" : "Contraseña"}
                type="password"
                fullWidth
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                error={!!formErrors.password}
                helperText={
                  formErrors.password ||
                  (isEditing
                    ? "Dejar en blanco para mantener la actual"
                    : "Requerido")
                }
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button variant="contained" type="submit">
              Guardar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
