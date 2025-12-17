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
} from "@mui/material";
import {
  Add,
  Visibility,
  ReceiptLong,
  PictureAsPdf,
  Edit,
  CheckCircle,
} from "@mui/icons-material";
import { inventoryService, settingsService } from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { generatePurchasePDF } from "../../utils/pdfGenerator";

// Función auxiliar para fechas
const safeDate = (dateString: any) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

// Mapa de Estados para mostrarlos bonitos
const STATUS_MAP: any = {
  DRAFT: { label: "Borrador", color: "default" },
  ORDERED: { label: "Pedido", color: "warning" },
  RECEIVED: { label: "Recibido", color: "success" },
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
  const [settings, setSettings] = useState<any>({}); // Para el PDF

  // Filtros
  const [filters, setFilters] = useState({
    provider_id: "",
    start_date: "",
    end_date: "",
    status: "", // 👈 NUEVO FILTRO
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
          {/* Filtro Proveedor */}
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

          {/* Filtro Estado (NUEVO) */}
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

          {/* Filtro Fechas */}
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

          {/* Botón Limpiar */}
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
              <TableCell>ESTADO</TableCell> {/* Nueva Columna */}
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

                  {/* CHIP DE ESTADO */}
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
                    {/* Solo mostramos monto si no es borrador o si el usuario quiere verlo */}
                    <Typography fontWeight="bold" color="success.main">
                      $
                      {(Number(purchase.total) || 0).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Stack direction="row" justifyContent="center" spacing={1}>
                      {/* PDF Button */}
                      <Tooltip title="Descargar PDF">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() =>
                            generatePurchasePDF(purchase, settings)
                          }
                        >
                          <PictureAsPdf fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Acciones Contextuales */}
                      {purchase.status === "DRAFT" ? (
                        <Tooltip title="Continuar Editando">
                          <IconButton
                            size="small"
                            color="primary"
                            // Aquí iría la navegación para editar:
                            // onClick={() => navigate(`/inventory/purchases/edit/${purchase.id}`)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Ver Detalles">
                          <IconButton size="small" color="default">
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
    </Box>
  );
};
