import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  IconButton,
  TablePagination,
  Stack,
  Tooltip,
  Grid,
  TextField,
  MenuItem,
  TableSortLabel,
  Dialog, // 👈 Nuevo import
  DialogTitle, // 👈 Nuevo import
  DialogContent, // 👈 Nuevo import
  DialogContentText, // 👈 Nuevo import
  DialogActions, // 👈 Nuevo import
} from "@mui/material";
import {
  Add,
  Visibility,
  ReceiptLong,
  PictureAsPdf,
  Edit,
  CheckCircle,
  LocalShipping,
  Cancel,
} from "@mui/icons-material";
import { inventoryService, settingsService } from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { generatePurchasePDF } from "../../utils/pdfGenerator";

// Función auxiliar para fechas
const safeDate = (dateString: any) => {
  if (!dateString) return "-";
  const rawDate = dateString.toString().split("T")[0];
  const [year, month, day] = rawDate.split("-");
  return `${day}/${month}/${year}`;
};

// Mapa de Estados
const STATUS_MAP: any = {
  DRAFT: { label: "Borrador", color: "default" },
  ORDERED: { label: "Pedido (Enviado)", color: "warning" },
  RECEIVED: { label: "Recibido (Stock)", color: "success" },
  CANCELLED: { label: "Cancelado", color: "error" },
};

export const PurchasesPage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // --- ESTADOS ---
  const [purchases, setPurchases] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({});

  // Estados para Diálogo de Recepción
  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);
  const [purchaseToReceive, setPurchaseToReceive] = useState<string | null>(
    null
  );

  // Filtros
  const [filters, setFilters] = useState({
    provider_id: "",
    start_date: "",
    end_date: "",
    status: "",
    sort_by: "date",
    sort_order: "DESC" as "ASC" | "DESC",
  });

  const [providersList, setProvidersList] = useState<any[]>([]);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    loadAuxData();
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [page, rowsPerPage, filters]);

  const loadAuxData = async () => {
    try {
      const [provRes, settingsRes] = await Promise.all([
        inventoryService.getProviders(1, 100, ""),
        settingsService.get(),
      ]);
      setProvidersList(provRes.data || []);
      setSettings(settingsRes || {});
    } catch (error) {
      console.error("Error cargando datos auxiliares", error);
    }
  };

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getPurchases(
        page + 1,
        rowsPerPage,
        filters
      );
      if (res.data) {
        setPurchases(res.data);
        setTotal(res.total || 0);
      } else if (Array.isArray(res)) {
        setPurchases(res);
        setTotal(res.length);
      }
    } catch (error) {
      console.error(error);
      showNotification("Error cargando historial", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleSort = (column: string) => {
    const isAsc = filters.sort_by === column && filters.sort_order === "ASC";
    setFilters({
      ...filters,
      sort_by: column,
      sort_order: isAsc ? "DESC" : "ASC",
    });
  };

  const clearFilters = () => {
    setFilters({
      provider_id: "",
      start_date: "",
      end_date: "",
      status: "",
      sort_by: "date",
      sort_order: "DESC",
    });
    setPage(0);
  };

  // Lógica General de Estados (Cancelación, Envíos simples)
  const handleStatusChange = async (id: string, newStatus: string) => {
    let confirmMsg = "";
    if (newStatus === "ORDERED")
      confirmMsg =
        "¿Confirmar pedido? Esto indicará que se envió al proveedor.";
    if (newStatus === "CANCELLED") confirmMsg = "¿Cancelar esta compra?";

    if (confirmMsg && !window.confirm(confirmMsg)) return;

    try {
      await inventoryService.updatePurchase(id, { status: newStatus });
      showNotification("Estado actualizado correctamente", "success");
      loadPurchases();
    } catch (error) {
      console.error(error);
      showNotification("Error al cambiar el estado", "error");
    }
  };

  // 👇 NUEVA LÓGICA DE RECEPCIÓN (Con Diálogo)
  const handleReceiveClick = (id: string) => {
    setPurchaseToReceive(id);
    setOpenReceiveDialog(true);
  };

  const executeReceive = async () => {
    if (!purchaseToReceive) return;
    try {
      await inventoryService.updatePurchase(purchaseToReceive, {
        status: "RECEIVED",
      });
      showNotification("Mercadería recibida y stock actualizado", "success");
      loadPurchases();
    } catch (error) {
      console.error(error);
      showNotification("Error al recibir mercadería", "error");
    } finally {
      setOpenReceiveDialog(false);
      setPurchaseToReceive(null);
    }
  };

  return (
    <Box p={3}>
      {/* HEADER */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Compras y Pedidos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión de facturas, borradores y stock
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate("/inventory/purchases/new")}
        >
          Nueva Compra
        </Button>
      </Stack>

      {/* BARRA DE FILTROS */}
      <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Proveedor"
              size="small"
              value={filters.provider_id}
              onChange={(e) =>
                setFilters({ ...filters, provider_id: e.target.value })
              }
            >
              <MenuItem value="">Todos</MenuItem>
              {providersList.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              label="Estado"
              size="small"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="DRAFT">Borrador</MenuItem>
              <MenuItem value="ORDERED">Pedido</MenuItem>
              <MenuItem value="RECEIVED">Recibido</MenuItem>
              <MenuItem value="CANCELLED">Cancelado</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              type="date"
              label="Desde"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.start_date}
              onChange={(e) =>
                setFilters({ ...filters, start_date: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              type="date"
              label="Hasta"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.end_date}
              onChange={(e) =>
                setFilters({ ...filters, end_date: e.target.value })
              }
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="text"
              color="inherit"
              onClick={clearFilters}
            >
              Limpiar Filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* TABLA */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={filters.sort_by === "date"}
                  direction={
                    filters.sort_by === "date"
                      ? (filters.sort_order.toLowerCase() as "asc" | "desc")
                      : "asc"
                  }
                  onClick={() => handleSort("date")}
                >
                  FECHA
                </TableSortLabel>
              </TableCell>
              <TableCell>PROVEEDOR</TableCell>
              <TableCell>ESTADO</TableCell>
              <TableCell>FACTURA</TableCell>
              <TableCell>SUCURSAL</TableCell>
              <TableCell align="right">TOTAL</TableCell>
              <TableCell align="center">ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.map((purchase) => {
              const statusInfo = STATUS_MAP[purchase.status] || {
                label: purchase.status,
                color: "default",
              };

              return (
                <TableRow key={purchase.id} hover>
                  <TableCell>{safeDate(purchase.date)}</TableCell>

                  <TableCell>
                    <Typography
                      fontWeight="bold"
                      variant="body2"
                      color={purchase.provider ? "textPrimary" : "error"}
                    >
                      {purchase.provider?.name || "Prov. Eliminado"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={statusInfo.label}
                      color={statusInfo.color}
                      size="small"
                      variant={
                        purchase.status === "RECEIVED" ? "filled" : "outlined"
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption">
                      {purchase.invoice_number || "-"}
                    </Typography>
                  </TableCell>

                  <TableCell>{purchase.branch?.name || "-"}</TableCell>

                  <TableCell align="right">
                    <Typography fontWeight="bold" color="success.main">
                      $
                      {(Number(purchase.total) || 0).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Stack direction="row" justifyContent="center" spacing={1}>
                      {/* 1. PDF */}
                      <Tooltip title="Descargar PDF">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={async () => {
                            try {
                              const fullData =
                                await inventoryService.getPurchaseById(
                                  purchase.id
                                );
                              generatePurchasePDF(fullData, settings);
                            } catch (e) {
                              showNotification("Error al generar PDF", "error");
                            }
                          }}
                        >
                          <PictureAsPdf fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* 2. SI ES BORRADOR: EDITAR Y ENVIAR */}
                      {purchase.status === "DRAFT" && (
                        <>
                          <Tooltip title="Editar Compra">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() =>
                                navigate(`/inventory/purchases/${purchase.id}`)
                              }
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Confirmar Pedido (Enviar)">
                            <IconButton
                              size="small"
                              sx={{ color: "warning.main" }}
                              onClick={() =>
                                handleStatusChange(purchase.id, "ORDERED")
                              }
                            >
                              <LocalShipping fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}

                      {/* 3. SI ES PEDIDO: RECIBIR MERCADERÍA (BOTÓN MODIFICADO) */}
                      {purchase.status === "ORDERED" && (
                        <Tooltip title="Recibir Mercadería (Sumar Stock)">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleReceiveClick(purchase.id)} // 👈 Llama al diálogo
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* 4. SI YA ESTÁ RECIBIDO: SOLO VER */}
                      {purchase.status === "RECEIVED" && (
                        <Tooltip title="Ver Detalle">
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`/inventory/purchases/${purchase.id}`)
                            }
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}

            {purchases.length === 0 && !loading && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  align="center"
                  sx={{ py: 6, color: "text.secondary" }}
                >
                  <ReceiptLong sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                  <Typography>No se encontraron resultados.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* 👇 DIÁLOGO DE CONFIRMACIÓN DE RECEPCIÓN */}
      <Dialog
        open={openReceiveDialog}
        onClose={() => setOpenReceiveDialog(false)}
      >
        <DialogTitle>📦 Recepción de Mercadería</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Estás a punto de ingresar mercadería al stock.
            <br />
            <br />
            ¿Deseas <b>confirmar la recepción inmediatamente</b> o prefieres{" "}
            <b>revisar y ajustar</b> los precios/cantidades antes de guardar?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReceiveDialog(false)} color="inherit">
            Cancelar
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              // Navegar a la pantalla de edición
              navigate(`/inventory/purchases/${purchaseToReceive}`);
              setOpenReceiveDialog(false);
            }}
          >
            Ir a Revisar
          </Button>

          <Button
            variant="contained"
            color="success"
            onClick={executeReceive}
            autoFocus
          >
            Confirmar Directo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
