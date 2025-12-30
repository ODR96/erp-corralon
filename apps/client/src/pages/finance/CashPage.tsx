import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
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
  Divider,
  Alert,
} from "@mui/material";
import {
  Storefront,
  LockOpen,
  Lock,
  AddCircle,
  RemoveCircle,
  History,
  AttachMoney,
  TrendingUp,
  TrendingDown,
} from "@mui/icons-material";
import { useNotification } from "../../context/NotificationContext";
import { api, financeService } from "../../services/api";

export const CashPage = () => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [boxStatus, setBoxStatus] = useState<any>(null); // { status: 'OPEN' | 'CLOSED', ... }
  const [movements, setMovements] = useState<any[]>([]);

  // Estados para Modals
  const [openBoxModal, setOpenBoxModal] = useState(false);
  const [closeBoxModal, setCloseBoxModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);

  // Formularios
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("OUT"); // Para gastos/ingresos manuales

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const status = await financeService.cash.getStatus();
      setBoxStatus(status);

      if (status.status === "OPEN") {
        const movs = await financeService.cash.getMovements();
        setMovements(movs);
      }
    } catch (error) {
      console.error(error);
      showNotification("Error cargando estado de caja", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES ---

  const handleOpenBox = async () => {
    try {
      await financeService.cash.open({
        opening_balance: Number(amount),
        notes,
      });
      showNotification("Caja abierta correctamente", "success");
      setOpenBoxModal(false);
      resetForms();
      loadData();
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || "Error al abrir",
        "error"
      );
    }
  };

  const handleCloseBox = async () => {
    try {
      await financeService.cash.close({
        closing_balance: Number(amount), // Lo que el usuario contó
        notes,
      });
      showNotification("Caja cerrada. Turno finalizado.", "success");
      setCloseBoxModal(false);
      resetForms();
      loadData();
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || "Error al cerrar",
        "error"
      );
    }
  };

  const handleManualMovement = async () => {
    try {
      await financeService.cash.addManualMovement({
        type: movementType,
        concept: movementType === "IN" ? "ADJUSTMENT" : "EXPENSE", // Simplificado por ahora
        amount: Number(amount),
        description: notes,
      });
      showNotification("Movimiento registrado", "success");
      setMovementModal(false);
      resetForms();
      loadData(); // Recargar para ver el nuevo saldo
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || "Error al registrar",
        "error"
      );
    }
  };

  const resetForms = () => {
    setAmount("");
    setNotes("");
  };

  // --- VISTAS ---

  if (loading) return <Typography>Cargando Tesorería...</Typography>;

  // VISTA 1: CAJA CERRADA
  if (!boxStatus || boxStatus.status === "CLOSED") {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <Paper sx={{ p: 5, textAlign: "center", maxWidth: 500 }}>
          <Storefront sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Caja Cerrada
          </Typography>
          <Typography color="text.secondary" paragraph>
            No hay un turno activo. Para comenzar a vender en efectivo, debes
            abrir la caja.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<LockOpen />}
            onClick={() => setOpenBoxModal(true)}
          >
            ABRIR CAJA
          </Button>
        </Paper>

        {/* MODAL APERTURA */}
        <Dialog open={openBoxModal} onClose={() => setOpenBoxModal(false)}>
          <DialogTitle>Apertura de Caja</DialogTitle>
          <DialogContent>
            <Typography variant="body2" mb={2}>
              Ingrese el dinero inicial (cambio) en caja.
            </Typography>
            <TextField
              autoFocus
              label="Saldo Inicial ($)"
              type="number"
              fullWidth
              margin="dense"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <TextField
              label="Notas (Opcional)"
              fullWidth
              margin="dense"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBoxModal(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleOpenBox}
              disabled={!amount}
            >
              ABRIR TURNO
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // VISTA 2: CAJA ABIERTA (DASHBOARD)
  return (
    <Box p={3}>
      {/* CABECERA */}
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
            display="flex"
            alignItems="center"
            gap={1}
          >
            <AttachMoney fontSize="large" /> Control de Caja
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Abierta el {new Date(boxStatus.opened_at).toLocaleString()}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Lock />}
          onClick={() => setCloseBoxModal(true)}
        >
          CERRAR CAJA
        </Button>
      </Box>

      {/* TARJETAS DE RESUMEN */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: "primary.main", color: "white" }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                SALDO ACTUAL
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                ${Number(boxStatus.current_balance).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                SALDO INICIAL
              </Typography>
              <Typography variant="h4">
                ${Number(boxStatus.opening_balance).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  startIcon={<RemoveCircle />}
                  onClick={() => {
                    setMovementType("OUT");
                    setMovementModal(true);
                  }}
                >
                  REGISTRAR GASTO / RETIRO
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  fullWidth
                  startIcon={<AddCircle />}
                  onClick={() => {
                    setMovementType("IN");
                    setMovementModal(true);
                  }}
                >
                  INGRESO EXTRA
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* TABLA DE MOVIMIENTOS */}
      <Paper>
        <Box p={2} display="flex" alignItems="center" gap={1}>
          <History />
          <Typography variant="h6">Movimientos del Turno</Typography>
        </Box>
        <Divider />
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Hora</TableCell>
              <TableCell>Concepto</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Monto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.map((mov) => (
              <TableRow key={mov.id}>
                <TableCell>
                  {new Date(mov.created_at).toLocaleTimeString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={mov.concept}
                    size="small"
                    color={mov.type === "IN" ? "success" : "error"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{mov.description}</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: "bold",
                    color: mov.type === "IN" ? "success.main" : "error.main",
                  }}
                >
                  {mov.type === "IN" ? "+" : "-"}$
                  {Number(mov.amount).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No hay movimientos aún.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* MODAL DE MOVIMIENTO MANUAL */}
      <Dialog open={movementModal} onClose={() => setMovementModal(false)}>
        <DialogTitle>
          {movementType === "IN"
            ? "Registrar Ingreso"
            : "Registrar Gasto/Retiro"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Monto ($)"
            type="number"
            fullWidth
            margin="dense"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <TextField
            label="Motivo / Descripción"
            fullWidth
            margin="dense"
            placeholder={
              movementType === "IN"
                ? "Ej: Cambio traído del banco"
                : "Ej: Pago de flete"
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovementModal(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color={movementType === "IN" ? "success" : "error"}
            onClick={handleManualMovement}
            disabled={!amount || !notes}
          >
            CONFIRMAR
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE CIERRE (ARQUEO) */}
      <Dialog open={closeBoxModal} onClose={() => setCloseBoxModal(false)}>
        <DialogTitle>Cierre de Caja (Arqueo)</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Cuente el dinero físico en el cajón e ingrese el total real.
          </Alert>
          <Typography variant="h6" align="center" gutterBottom>
            Sistema espera:{" "}
            <b>${Number(boxStatus.current_balance).toLocaleString()}</b>
          </Typography>
          <TextField
            autoFocus
            label="Dinero Real en Caja ($)"
            type="number"
            fullWidth
            margin="normal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            helperText="Total de billetes y monedas contados"
          />
          <TextField
            label="Observaciones del Cierre"
            fullWidth
            margin="dense"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseBoxModal(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCloseBox}
            disabled={!amount}
          >
            FINALIZAR TURNO
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
