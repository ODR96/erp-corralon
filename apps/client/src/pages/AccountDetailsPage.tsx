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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  TrendingUp,
  TrendingDown,
  ReceiptLong,
  Payment,
  Edit,
  Print,
  Visibility,
  Close,
} from "@mui/icons-material";
import { financeService, settingsService, salesService } from "../services/api";
import { ManualMovementDialog } from "../components/finance/ManualMovementDialog";
import { generateReceiptPDF } from "../utils/receiptPdfGenerator";
import { generateSalePDF, downloadPdf } from "../utils/salePdfGenerator";

export const AccountDetailsPage = () => {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [openManualDialog, setOpenManualDialog] = useState(false);

  // Estado del nombre (se actualiza al cargar)
  const [entityName, setEntityName] = useState(
    (location.state as any)?.name || "Cuenta Corriente"
  );

  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>({});

  // --- ESTADOS PARA DETALLE DE VENTA ---
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (id && type) {
      loadAccount();
      loadSettings();
    }
  }, [id, type]);

  const loadSettings = async () => {
    try {
      const data = await settingsService.get();
      setSettings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAccount = async () => {
    try {
      const data = await financeService.getCurrentAccount(
        id!,
        type as "client" | "provider"
      );
      setBalance(data.balance);
      setMovements(data.history.data);
      if (type === "client" && data.client) setEntityName(data.client.name);
      if (type === "provider" && data.provider)
        setEntityName(data.provider.name);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- IMPRIMIR RECIBO DE PAGO/COBRO ---
  const handlePrintReceipt = (movement: any) => {
    const receiptData = {
      id: movement.id,
      date: movement.date,
      amount: movement.amount,
      concept: movement.concept,
      description: movement.description,
      entityName: entityName,
      type: type as "client" | "provider",
    };
    generateReceiptPDF(receiptData, settings);
  };

  // --- VER DETALLE DE VENTA (MODIFICADO PARA DEBUG) ---
  const handleViewDetail = async (movement: any) => {
    setErrorMsg(""); 

    // 1. Validar que sea venta
    if (movement.concept !== "SALE") {
      alert("Este movimiento no está marcado como VENTA, por eso no se abre.");
      return;
    }

    // 2. Validar que tenga ID de referencia
    if (!movement.reference_id) {
      alert(
        "Esta venta no tiene un ID de referencia guardado. Probablemente sea una venta antigua o importada antes de actualizar el sistema."
      );
      return;
    }

    // Si pasa las validaciones, abrimos
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const sale = await salesService.getById(movement.reference_id);
      setSelectedSale(sale);
    } catch (error) {
      console.error("Error cargando venta", error);
      setErrorMsg(
        "No se pudo cargar el detalle. Tal vez la venta fue eliminada."
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  // --- REIMPRIMIR COMPROBANTE DE VENTA (PDF) ---
  const handleReprintSale = () => {
    if (!selectedSale) return;

    // 1. Adaptamos los datos
    const saleDataForPdf = {
      ...selectedSale,
      type: selectedSale.type || "VENTA",
      invoice_number: selectedSale.invoice_number,
      customer_name: selectedSale.customer_name || entityName,
      total: selectedSale.total,
    };

    const itemsForPdf = selectedSale.details.map((d: any) => ({
      quantity: d.quantity,
      name: d.product_name,
      price: d.unit_price,
      subtotal: Number(d.quantity) * Number(d.unit_price),
    }));

    // 2. Generamos el PDF (Obtenemos el objeto doc)
    const doc = generateSalePDF(saleDataForPdf, itemsForPdf, settings);

    // 3. 👇 ¡ESTA ES LA LÍNEA QUE FALTABA! LO DESCARGAMOS 👇
    downloadPdf(
      doc,
      `Comprobante_${selectedSale.invoice_number || "Venta"}.pdf`
    );
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

      {/* ENCABEZADO */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Typography variant="h4" fontWeight="bold">
            {entityName}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Historial de movimientos (
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

      {/* ACCIONES */}
      <Box mb={3} display="flex" gap={2}>
        {type === "provider" ? (
          <>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Payment />}
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
              onClick={() => navigate("/sales/pos")}
            >
              Nueva Venta
            </Button>
          </>
        )}
      </Box>

      {/* TABLA */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell>FECHA</TableCell>
              <TableCell>CONCEPTO</TableCell>
              <TableCell>DESCRIPCIÓN</TableCell>
              <TableCell align="right">IMPORTE</TableCell>
              <TableCell align="center">ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Sin movimientos.
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

                  {/* COLUMNA ACCIONES */}
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center">
                      {/* BOTÓN OJO (Solo si es Venta) */}
                      {m.concept === "SALE" && (
                        <Tooltip title="Ver detalle de productos">
                          <IconButton
                            onClick={() => handleViewDetail(m)}
                            color="primary"
                            size="small"
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* BOTÓN IMPRIMIR RECIBO (Solo si es Pago/Ajuste) */}
                      {(m.concept === "PAYMENT" ||
                        m.concept === "CHECK" ||
                        m.concept === "ADJUSTMENT") && (
                        <Tooltip title="Imprimir Recibo">
                          <IconButton
                            onClick={() => handlePrintReceipt(m)}
                            color="secondary"
                            size="small"
                          >
                            <Print />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL DETALLE DE VENTA */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Detalle de Venta #{selectedSale?.invoice_number || "..."}
          <IconButton onClick={() => setDetailModalOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetail ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : errorMsg ? (
            <Alert severity="error">{errorMsg}</Alert>
          ) : (
            selectedSale && (
              <>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Fecha: {new Date(selectedSale.created_at).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vendedor: {selectedSale.user?.name || "Sistema"}
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Cant.</TableCell>
                      <TableCell align="right">P. Unit</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSale.details?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          ${Number(item.unit_price).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>
                          $
                          {(
                            Number(item.quantity) * Number(item.unit_price)
                          ).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Box mt={3} display="flex" justifyContent="flex-end">
                  <Typography variant="h6" fontWeight="bold">
                    Total: ${Number(selectedSale.total).toLocaleString()}
                  </Typography>
                </Box>
              </>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailModalOpen(false)}>Cerrar</Button>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={handleReprintSale}
            disabled={!selectedSale}
          >
            Descargar Comprobante
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO MANUAL */}
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
