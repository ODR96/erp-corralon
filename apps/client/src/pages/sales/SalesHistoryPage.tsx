import { useEffect, useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import {
  Visibility,
  Print,
  Search,
  AttachMoney,
  CreditCard,
  ReceiptLong,
  QrCode,
  Close,
  Cancel as CancelIcon, // Icono para anular
  Block as BlockIcon, // Icono visual para estado anulado
} from "@mui/icons-material";
import { api } from "../../services/api";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
// 👇 Reutilizamos tu generador de PDFs existente
import { generateSalePDF, getPdfUrl } from "../../utils/salePdfGenerator";

export const SalesHistoryPage = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado para Modal de Detalle
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Estado para Modal de Impresión
  const [printOpen, setPrintOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Estado para Anular Venta
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<any>(null);

  // Configuración del sistema (para formato de ticket por defecto)
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesRes, settingsRes] = await Promise.all([
        api.get("/sales?type=VENTA"), // Solo traemos VENTAS, no presupuestos
        api.get("/settings"),
      ]);
      setSales(
        Array.isArray(salesRes.data) ? salesRes.data : salesRes.data.data
      );
      setSettings(settingsRes.data || {});
    } catch (error) {
      console.error("Error cargando historial", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES ---
  const handleOpenDetail = (sale: any) => {
    setSelectedSale(sale);
    setDetailOpen(true);
  };

  // 👇 LÓGICA DE REIMPRESIÓN
  const handleReprint = (sale: any, formatOverride?: "A4" | "80mm") => {
    try {
      // Usamos la config global o la forzada por el botón
      const printSettings = formatOverride
        ? { ...settings, printer_format: formatOverride }
        : settings;

      const doc = generateSalePDF(sale, sale.details, printSettings);
      const url = getPdfUrl(doc);
      setPdfUrl(url);
      setPrintOpen(true);
    } catch (error) {
      console.error("Error generando PDF", error);
    }
  };

  const handlePrintNow = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  // 👇 LÓGICA DE ANULACIÓN
  const handleOpenCancel = (sale: any) => {
    setSaleToCancel(sale);
    setCancelDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (!saleToCancel) return;
    try {
      await api.post(`/sales/${saleToCancel.id}/cancel`);

      // Actualizamos la lista localmente para no recargar todo
      setSales((prev) =>
        prev.map((s) =>
          s.id === saleToCancel.id ? { ...s, status: "CANCELLED" } : s
        )
      );

      setCancelDialogOpen(false);
      setSaleToCancel(null);
      // Opcional: Podrías mostrar una notificación de éxito aquí
    } catch (error) {
      console.error("Error anulando venta", error);
      alert(
        "No se pudo anular la venta. Revise si ya estaba anulada o si la caja tiene fondos."
      );
    }
  };

  // --- UTILS ---
  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "EFECTIVO":
        return <AttachMoney fontSize="small" />;
      case "DEBITO":
      case "CREDITO":
        return <CreditCard fontSize="small" />;
      case "CHEQUE":
        return <ReceiptLong fontSize="small" />;
      case "TRANSFERENCIA":
        return <QrCode fontSize="small" />;
      default:
        return <AttachMoney fontSize="small" />;
    }
  };

  // Filtrado local (Cliente o N° Factura)
  const filteredSales = sales.filter(
    (s) =>
      (s.customer_name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) || (s.invoice_number || "").includes(searchTerm)
  );

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Historial de Ventas
      </Typography>

      {/* BARRA DE BÚSQUEDA */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar por cliente o número de comprobante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* TABLA */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell>FECHA</TableCell>
              <TableCell>COMPROBANTE</TableCell>
              <TableCell>CLIENTE</TableCell>
              <TableCell>PAGO</TableCell>
              <TableCell align="right">TOTAL</TableCell>
              <TableCell align="center">ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  No se encontraron ventas registradas.
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <TableRow
                  key={sale.id}
                  hover
                  sx={{
                    opacity: sale.status === "CANCELLED" ? 0.6 : 1,
                    bgcolor:
                      sale.status === "CANCELLED" ? "#fff0f0" : "inherit",
                  }}
                >
                  <TableCell>
                    {sale.created_at
                      ? format(parseISO(sale.created_at), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      #{sale.invoice_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {sale.customer_name || "Consumidor Final"}
                  </TableCell>
                  <TableCell>
                    {sale.status === "CANCELLED" ? (
                      <Chip
                        label="ANULADA"
                        color="error"
                        size="small"
                        icon={<BlockIcon />}
                        variant="outlined"
                      />
                    ) : (
                      <Chip
                        icon={getPaymentIcon(sale.payment_method)}
                        label={sale.payment_method}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color={
                        sale.status === "CANCELLED"
                          ? "text.secondary"
                          : "success.main"
                      }
                      sx={{
                        textDecoration:
                          sale.status === "CANCELLED" ? "line-through" : "none",
                      }}
                    >
                      ${" "}
                      {Number(sale.total).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalle">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDetail(sale)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>

                    {/* Solo permitimos anular e imprimir si NO está anulada */}
                    {sale.status !== "CANCELLED" && (
                      <>
                        <Tooltip title="Re-Imprimir Ticket">
                          <IconButton
                            color="secondary"
                            onClick={() => handleReprint(sale)}
                          >
                            <Print />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Anular Venta">
                          <IconButton
                            color="error"
                            onClick={() => handleOpenCancel(sale)}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL DETALLE DE VENTA */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Venta #{selectedSale?.invoice_number}
          <IconButton
            onClick={() => setDetailOpen(false)}
            sx={{ color: "white" }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSale && (
            <>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="caption" color="text.secondary">
                  Cliente:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedSale.customer_name}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="caption" color="text.secondary">
                  Vendedor:
                </Typography>
                <Typography variant="body2">
                  {selectedSale.user?.username || "Sistema"}
                </Typography>
              </Box>

              <Typography
                variant="subtitle2"
                sx={{ mt: 2, mb: 1, bgcolor: "#eee", p: 0.5 }}
              >
                ITEMS
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Cant</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedSale.details?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell sx={{ fontSize: "0.9rem" }}>
                        {d.product_name}
                      </TableCell>
                      <TableCell align="right">{d.quantity}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        $ {Number(d.subtotal).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Box
                mt={3}
                textAlign="right"
                borderTop={1}
                borderColor="divider"
                pt={2}
              >
                <Typography variant="h5" fontWeight="bold" color="primary">
                  Total: $ {Number(selectedSale.total).toLocaleString()}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
          {/* Botones de impresión dentro del detalle también */}
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => handleReprint(selectedSale, "80mm")}
          >
            Ticket 80mm
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => handleReprint(selectedSale, "A4")}
          >
            Hoja A4
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL VISTA PREVIA PDF */}
      <Dialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          Vista Previa de Impresión
          <Box>
            <Button
              variant="contained"
              startIcon={<Print />}
              onClick={handlePrintNow}
              sx={{ mr: 1 }}
            >
              IMPRIMIR
            </Button>
            <IconButton onClick={() => setPrintOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: "550px", bgcolor: "#555" }}>
          {pdfUrl && (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              width="100%"
              height="100%"
              style={{ border: "none", backgroundColor: "white" }}
              title="PDF Preview"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOGO DE CONFIRMACIÓN ANULACIÓN */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle sx={{ color: "error.main", fontWeight: "bold" }}>
          ¿Anular Venta?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Estás a punto de anular la venta{" "}
            <b>#{saleToCancel?.invoice_number}</b> por{" "}
            <b>${saleToCancel?.total}</b>.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            ⚠️ Esto devolverá el stock a los productos y restará el dinero de la
            caja (si fue efectivo). Esta acción es irreversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Cancelar</Button>
          <Button onClick={confirmCancel} variant="contained" color="error">
            CONFIRMAR ANULACIÓN
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
