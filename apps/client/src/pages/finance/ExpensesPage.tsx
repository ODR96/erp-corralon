import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Tabs,
  Tab,
  Tooltip,
} from "@mui/material";
import {
  Add,
  Delete,
  AccountBalance,
  LocalAtm,
  ReceiptLong,
  Label,
} from "@mui/icons-material";
import { useNotification } from "../../context/NotificationContext";
import { financeService } from "../../services/api";

export const ExpensesPage = () => {
  const { showNotification } = useNotification();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Datos
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Modals
  const [openModal, setOpenModal] = useState(false);
  const [openCatModal, setOpenCatModal] = useState(false);

  // Formulario Gasto
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category_id: "",
    payment_method: "CASH", // CASH, TRANSFER, CHECK
    date: new Date().toISOString().split("T")[0], // Hoy YYYY-MM-DD
    supplier_name: "",
    receipt_number: "",
  });

  // Formulario Categoría
  const [catName, setCatName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        financeService.expenses.getAll(),
        financeService.expenses.getCategories(),
      ]);
      setExpenses(expRes);
      setCategories(catRes);
    } catch (error) {
      console.error(error);
      showNotification("Error cargando datos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!formData.amount || !formData.category_id || !formData.description) {
      showNotification("Complete los campos obligatorios", "warning");
      return;
    }
    try {
      await financeService.expenses.create({
        ...formData,
        amount: Number(formData.amount),
      });
      showNotification("Gasto registrado correctamente", "success");
      setOpenModal(false);
      setFormData({
        ...formData,
        amount: "",
        description: "",
        supplier_name: "",
        receipt_number: "",
      }); // Reset parcial
      loadData();
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || "Error al guardar",
        "error"
      );
    }
  };

  const handleSaveCategory = async () => {
    if (!catName) return;
    try {
      await financeService.expenses.createCategory({ name: catName });
      showNotification("Categoría creada", "success");
      setOpenCatModal(false);
      setCatName("");
      loadData();
    } catch (error) {
      showNotification("Error creando categoría", "error");
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <LocalAtm fontSize="small" color="success" />;
      case "TRANSFER":
        return <AccountBalance fontSize="small" color="info" />;
      case "CHECK":
        return <ReceiptLong fontSize="small" color="warning" />;
      default:
        return null;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case "CASH":
        return "Efectivo (Caja)";
      case "TRANSFER":
        return "Transferencia";
      case "CHECK":
        return "Cheque Propio";
      default:
        return method;
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
        <Typography variant="h4" fontWeight="bold">
          Gastos y Egresos
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Label />}
            onClick={() => setOpenCatModal(true)}
            sx={{ mr: 2 }}
          >
            Nueva Categoría
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<Add />}
            onClick={() => setOpenModal(true)}
          >
            Registrar Gasto
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="inherit"
          indicatorColor="primary"
        >
          <Tab label="Historial de Gastos" />
          <Tab label="Configuración de Categorías" />
        </Tabs>
      </Paper>

      {/* TAB 0: LISTADO DE GASTOS */}
      {tab === 0 && (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Proveedor / Ref</TableCell>
                <TableCell>Método Pago</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell align="center">Usuario</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell>
                    {new Date(exp.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip label={exp.category?.name} size="small" />
                  </TableCell>
                  <TableCell>{exp.description}</TableCell>
                  <TableCell>
                    {exp.supplier_name && (
                      <Typography variant="caption" display="block">
                        {exp.supplier_name}
                      </Typography>
                    )}
                    {exp.receipt_number && (
                      <Typography variant="caption" color="text.secondary">
                        Ref: {exp.receipt_number}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getPaymentIcon(exp.payment_method)}
                      <Typography variant="body2">
                        {getPaymentLabel(exp.payment_method)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: "bold", color: "error.main" }}
                  >
                    -${Number(exp.amount).toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={exp.user?.email || ""}>
                      <Chip
                        label={exp.user?.name || "User"}
                        size="small"
                        variant="outlined"
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No hay gastos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* TAB 1: CATEGORÍAS */}
      {tab === 1 && (
        <Grid container spacing={2}>
          {categories.map((cat) => (
            <Grid item xs={12} sm={6} md={3} key={cat.id}>
              <Paper
                sx={{
                  p: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography fontWeight="bold">{cat.name}</Typography>
                <IconButton size="small" disabled>
                  <Delete fontSize="small" />
                </IconButton>
              </Paper>
            </Grid>
          ))}
          {categories.length === 0 && (
            <Grid item xs={12}>
              <Typography>No hay categorías creadas.</Typography>
            </Grid>
          )}
        </Grid>
      )}

      {/* MODAL NUEVO GASTO */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Fecha"
                type="date"
                fullWidth
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Monto ($)"
                type="number"
                fullWidth
                autoFocus
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Categoría"
                fullWidth
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Descripción / Detalle"
                fullWidth
                placeholder="Ej: Pago luz periodo Mayo"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Método de Pago"
                fullWidth
                value={formData.payment_method}
                onChange={(e) =>
                  setFormData({ ...formData, payment_method: e.target.value })
                }
                helperText={
                  formData.payment_method === "CASH"
                    ? "Se descontará de la Caja Abierta"
                    : "No afecta el saldo de caja física"
                }
              >
                <MenuItem value="CASH">
                  <LocalAtm sx={{ mr: 1, verticalAlign: "middle" }} /> Efectivo
                  (Caja)
                </MenuItem>
                <MenuItem value="TRANSFER">
                  <AccountBalance sx={{ mr: 1, verticalAlign: "middle" }} />{" "}
                  Transferencia Bancaria
                </MenuItem>
                <MenuItem value="CHECK">
                  <ReceiptLong sx={{ mr: 1, verticalAlign: "middle" }} /> Cheque
                  Propio
                </MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary">
                Datos Opcionales
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Proveedor / Destinatario"
                fullWidth
                placeholder="Opcional"
                value={formData.supplier_name}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Nro Comprobante / Factura"
                fullWidth
                placeholder="Opcional"
                value={formData.receipt_number}
                onChange={(e) =>
                  setFormData({ ...formData, receipt_number: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button onClick={handleSaveExpense} variant="contained" color="error">
            REGISTRAR GASTO
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL NUEVA CATEGORÍA */}
      <Dialog open={openCatModal} onClose={() => setOpenCatModal(false)}>
        <DialogTitle>Nueva Categoría</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre de Categoría"
            fullWidth
            placeholder="Ej: Sueldos, Alquiler, Limpieza"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCatModal(false)}>Cancelar</Button>
          <Button onClick={handleSaveCategory} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
