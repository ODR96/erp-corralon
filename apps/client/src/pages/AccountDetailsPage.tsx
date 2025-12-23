import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  TrendingUp,
  TrendingDown,
  ReceiptLong,
  Payment,
  Edit,
} from "@mui/icons-material";
import { financeService } from "../services/api";
import { ManualMovementDialog } from "../components/finance/ManualMovementDialog";

export const AccountDetailsPage = () => {
  const { id, type } = useParams(); // type puede ser 'client' o 'provider'
  const navigate = useNavigate();
  const location = useLocation();
  const [openManualDialog, setOpenManualDialog] = useState(false);

  const entityName = (location.state as any)?.name || "Cuenta Corriente";

  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && type) loadAccount();
  }, [id, type]);

  const loadAccount = async () => {
    try {
      const data = await financeService.getCurrentAccount(
        id!,
        type as "client" | "provider"
      );
      setBalance(data.balance);
      setMovements(data.history.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(val);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getMovementColor = (movType: string) =>
    movType === "DEBIT" ? "error.main" : "success.main";

  return (
    <Box p={3}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      {/* ENCABEZADO Y SALDO */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Typography variant="h4" fontWeight="bold">
            {entityName}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Historial de movimientos y saldo actual (
            {type === "client" ? "Cliente" : "Proveedor"})
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            elevation={3}
            sx={{ bgcolor: balance > 0 ? "#ffebee" : "#e8f5e9" }}
          >
            <CardContent sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="overline" fontWeight="bold">
                SALDO ACTUAL
              </Typography>
              <Typography
                variant="h3"
                fontWeight="bold"
                color={balance > 0 ? "error.main" : "success.main"}
              >
                {formatCurrency(balance)}
              </Typography>
              <Typography variant="caption" display="block">
                {balance > 0
                  ? type === "client"
                    ? "Te debe"
                    : "Le debes"
                  : "Saldo a favor"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* BOTONES DE ACCIÓN INTELIGENTES */}
      <Box mb={3} display="flex" gap={2}>
        {type === "provider" ? (
          // --- ACCIONES PARA PROVEEDOR ---
          <>
            <Button
              variant="contained"
              color="primary" // Azul para diferenciar
              size="large"
              startIcon={<Payment />}
              // Pasamos el providerId para que la pantalla de pago se pre-cargue
              onClick={() =>
                navigate("/finance/payments/new", { state: { providerId: id } })
              }
            >
              Nueva Orden de Pago
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => setOpenManualDialog(true)}
            >
              Ajuste Manual
            </Button>
          </>
        ) : (
          // --- ACCIONES PARA CLIENTE ---
          <>
            <Button
              variant="contained"
              color="success"
              startIcon={<Add />}
              onClick={() => setOpenManualDialog(true)}
            >
              Registrar Cobro
            </Button>
            <Button
              variant="outlined"
              startIcon={<ReceiptLong />}
              // onClick={() => navigate('/sales/new')} // Descomentar cuando exista
            >
              Nueva Venta
            </Button>
          </>
        )}
      </Box>

      {/* TABLA DE MOVIMIENTOS */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell>FECHA</TableCell>
              <TableCell>CONCEPTO</TableCell>
              <TableCell>COMPROBANTE</TableCell>
              <TableCell align="right">IMPORTE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Sin movimientos registrados.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatDate(m.date)}</TableCell>
                  <TableCell>
                    <Chip
                      label={m.concept}
                      size="small"
                      color={
                        m.concept === "PAYMENT" || m.concept === "CHECK"
                          ? "success"
                          : "default"
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {m.description || "-"}
                    </Typography>
                    {m.check && (
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        display="block"
                      >
                        Cheque #{m.check.number} ({m.check.bank_name})
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="flex-end"
                      gap={1}
                    >
                      {m.type === "DEBIT" ? (
                        <TrendingUp color="error" fontSize="small" />
                      ) : (
                        <TrendingDown color="success" fontSize="small" />
                      )}
                      <Typography
                        fontWeight="bold"
                        color={getMovementColor(m.type)}
                      >
                        {formatCurrency(Number(m.amount))}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DIÁLOGO MANUAL (Para ajustes o cobros rápidos) */}
      {id && type && (
        <ManualMovementDialog
          open={openManualDialog}
          onClose={() => setOpenManualDialog(false)}
          onSuccess={loadAccount}
          entityId={id}
          type={type as "client" | "provider"}
        />
      )}
    </Box>
  );
};
