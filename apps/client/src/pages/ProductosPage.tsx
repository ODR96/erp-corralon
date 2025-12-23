import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Chip,
  Divider,
  IconButton,
  Grid,
  TableContainer,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Stack,
  Card,
  CardContent,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Store, // Icono para la tabla de stock
  TrendingUp,
  TrendingDown,
  RestoreFromTrash,
  DeleteForever,
  ShoppingCart,
  Inventory2,
} from "@mui/icons-material";
import { useNotification } from "../context/NotificationContext";
import { inventoryService, settingsService } from "../services/api";
import { useNavigate } from "react-router-dom";

// --- ESTILOS ---
const DELETED_ROW_STYLE = {
  bgcolor: "#fcfcfc",
  color: "#9e9e9e",
  fontStyle: "italic",
};

const initialForm = {
  name: "",
  description: "",
  sku: "",
  barcode: "",
  category_id: "",
  unit_id: "",
  provider_id: "",
  currency: "ARS",
  list_price: "",
  provider_discount: 0,
  cost_price: 0,
  profit_margin: 30,
  vat_rate: 21,
  sale_price: 0,
  min_stock_alert: 5,
};

// --- SUB-COMPONENTE: TABLA DE STOCK POR SUCURSAL ---
const StockPerBranchTable = ({ stocks }: { stocks: any[] }) => {
  if (!stocks || stocks.length === 0) {
    return (
      <Box bgcolor="#f5f5f5" p={2} borderRadius={1} textAlign="center">
        <Typography variant="caption" color="text.secondary">
          No hay stock registrado en ninguna sucursal.
        </Typography>
      </Box>
    );
  }

  return (
    <Box mt={2}>
      <Typography
        variant="subtitle2"
        gutterBottom
        fontWeight="bold"
        display="flex"
        alignItems="center"
        gap={1}
      >
        <Store fontSize="small" color="primary" /> Existencias por Sucursal
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell>Sucursal</TableCell>
              <TableCell align="right">Cantidad</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stocks.map((stock) => (
              <TableRow key={stock.id}>
                <TableCell>
                  {stock.branch?.name || "Sucursal Eliminada"}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>
                  {stock.quantity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const ProductsPage = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // Estados Principales
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [roundingRule, setRoundingRule] = useState(0);

  // Auxiliares
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Filtros
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterProv, setFilterProv] = useState("");
  const [withDeleted, setWithDeleted] = useState(false);

  // Modales ABM
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(initialForm);

  // Estado para el detalle de stock en el modal de edición
  const [stockDetails, setStockDetails] = useState<any[]>([]);

  // Stock Modal (Ajuste Rápido)
  const [stockOpen, setStockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentStock, setCurrentStock] = useState(0);
  const [stockForm, setStockForm] = useState({
    branch_id: "",
    type: "IN",
    quantity: "",
    reason: "",
  });

  // --- DATA LOADING ---
  useEffect(() => {
    loadAuxData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, rowsPerPage, search, filterCat, filterProv, withDeleted]);

  const loadAuxData = async () => {
    try {
      const config = await settingsService.get();
      setExchangeRate(Number(config.exchange_rate) || 1);
      setRoundingRule(Number(config.price_rounding) || 0);

      setFormData((prev: any) => ({
        ...prev,
        profit_margin: Number(config.default_profit_margin) || 30,
        vat_rate: Number(config.default_vat_rate) || 21,
        currency: config.currency || "ARS",
      }));

      const [cats, unitsData, provs, branchesData] = await Promise.all([
        inventoryService.getCategories().catch(() => []),
        inventoryService.getUnits().catch(() => []),
        inventoryService.getProviders().catch(() => []),
        inventoryService.getBranches().catch(() => []),
      ]);

      setCategories(cats);
      setUnits(unitsData);
      setBranches(branchesData);

      if (Array.isArray(provs)) {
        setProviders(provs);
      } else if (provs && provs.data) {
        setProviders(provs.data);
      } else {
        setProviders([]);
      }

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const defaultBranchId =
        user.branch?.id || (branchesData.length > 0 ? branchesData[0].id : "");
      setStockForm((prev) => ({ ...prev, branch_id: defaultBranchId }));
    } catch (err) {
      console.error("Error loading data", err);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await inventoryService.getProducts(
        page + 1,
        rowsPerPage,
        search,
        filterCat,
        filterProv,
        withDeleted
      );
      setProducts(res.data);
      setTotal(res.total);
    } catch (err) {
      showNotification("Error cargando productos", "error");
    }
  };

  // --- HANDLERS ---

  // Calculadora de Precios
  useEffect(() => {
    if (!open) return;
    const listPrice = Number(formData.list_price) || 0;
    const discount = Number(formData.provider_discount) || 0;
    const margin = Number(formData.profit_margin) || 0;
    const vat = Number(formData.vat_rate) || 0;

    const cost = listPrice - listPrice * (discount / 100);
    const netPrice = cost + cost * (margin / 100);
    let finalPrice = netPrice + netPrice * (vat / 100);

    if (formData.currency === "ARS" && roundingRule > 0 && finalPrice > 10) {
      finalPrice = Math.ceil(finalPrice / roundingRule) * roundingRule;
    }

    setFormData((prev: any) => {
      const prevCost = Number(prev.cost_price);
      const prevSale = Number(prev.sale_price);
      if (
        Math.abs(prevCost - cost) < 0.01 &&
        Math.abs(prevSale - finalPrice) < 0.01
      )
        return prev;
      return { ...prev, cost_price: cost, sale_price: finalPrice };
    });
  }, [
    formData.list_price,
    formData.provider_discount,
    formData.profit_margin,
    formData.vat_rate,
    formData.currency,
    open,
    roundingRule,
  ]);

  // Stock Modal Handlers
  const handleOpenStock = async (product: any) => {
    setSelectedProduct(product);
    setStockOpen(true);
    setStockForm((prev) => ({ ...prev, type: "IN", quantity: "", reason: "" }));
    if (stockForm.branch_id) fetchStock(product.id, stockForm.branch_id);
  };

  const fetchStock = async (prodId: string, branchId: string) => {
    try {
      const res = await inventoryService.getStock(prodId, branchId);
      setCurrentStock(Number(res.quantity) || 0);
    } catch (error) {
      setCurrentStock(0);
    }
  };

  useEffect(() => {
    if (stockOpen && selectedProduct && stockForm.branch_id)
      fetchStock(selectedProduct.id, stockForm.branch_id);
  }, [stockForm.branch_id]);

  const handleStockSubmit = async () => {
    try {
      await inventoryService.adjustStock({
        product_id: selectedProduct.id,
        branch_id: stockForm.branch_id,
        type: stockForm.type,
        quantity: Number(stockForm.quantity),
        reason: stockForm.reason || "Ajuste manual",
      });
      showNotification("Stock actualizado correctamente", "success");
      setStockOpen(false);
      loadProducts();
    } catch (err: any) {
      showNotification(err.response?.data?.message, "error");
    }
  };

  // ABM Handlers
  const handleOpen = async (product?: any) => {
    if (product) {
      // 1. Cargamos datos básicos del listado para que se vea rápido
      setFormData({
        ...initialForm,
        ...product,
        category_id: product.category?.id || "",
        unit_id: product.unit?.id || "",
        provider_id: product.provider?.id || "",
        list_price: product.list_price || 0,
        provider_discount: Number(product.provider_discount || 0),
        cost_price: Number(product.cost_price || 0),
        profit_margin: Number(product.profit_margin || 0),
        vat_rate: Number(product.vat_rate || 21),
        sale_price: Number(product.sale_price || 0),
        currency: product.currency || "ARS",
      });
      setEditingId(product.id);
      setIsEditing(true);

      // 2. Traemos el detalle completo (incluyendo STOCKS) del backend
      setStockDetails([]); // Limpiamos anterior
      try {
        const fullProduct = await inventoryService.getProduct(product.id);
        setStockDetails(fullProduct.stocks || []);
      } catch (error) {
        console.error("Error cargando detalles de stock", error);
      }
    } else {
      setIsEditing(false);
      setStockDetails([]);
      const defaultCat =
        categories.find((c) => c.name === "General" || c.name === "Varios")
          ?.id || "";
      const defaultUnit =
        units.find((u) => u.short_name === "u" || u.name === "Unidad")?.id ||
        "";
      setFormData((prev: any) => ({
        ...initialForm,
        currency: prev.currency || "ARS",
        profit_margin: prev.profit_margin || 30,
        vat_rate: prev.vat_rate || 21,
        category_id: defaultCat,
        unit_id: defaultUnit,
      }));
    }
    setOpen(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        barcode: formData.barcode,
        category_id: formData.category_id,
        unit_id: formData.unit_id,
        provider_id: formData.provider_id === "" ? null : formData.provider_id,
        currency: formData.currency,
        list_price: Number(formData.list_price),
        provider_discount: Number(formData.provider_discount),
        cost_price: Number(formData.cost_price),
        profit_margin: Number(formData.profit_margin),
        vat_rate: Number(formData.vat_rate),
        sale_price: Number(formData.sale_price),
        min_stock_alert: Number(formData.min_stock_alert),
      };

      if (isEditing && editingId) {
        await inventoryService.updateProduct(editingId, payload);
        showNotification("Producto actualizado", "success");
      } else {
        await inventoryService.createProduct(payload);
        showNotification("Producto creado", "success");
      }
      setOpen(false);
      loadProducts();
    } catch (err: any) {
      showNotification("Error al guardar", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Enviar producto a papelera?")) {
      await inventoryService.deleteProduct(id, false);
      loadProducts();
    }
  };
  const handleRestore = async (id: string) => {
    await inventoryService.restoreProduct(id);
    loadProducts();
  };

  const handleHardDelete = async (id: string) => {
    if (
      confirm(
        "⚠️ ¿Estás seguro? Esto eliminará el producto y SU HISTORIAL para siempre."
      )
    ) {
      try {
        await inventoryService.deleteProduct(id, true);
        showNotification("Producto eliminado definitivamente", "success");
        loadProducts();
      } catch (err: any) {
        showNotification(
          "No se puede eliminar: Probablemente tenga stock o ventas asociadas.",
          "error"
        );
      }
    }
  };

  // --- RENDER ---
  return (
    <Box>
      {/* HEADER */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Inventario
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión de productos y precios
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ShoppingCart />}
            onClick={() => navigate("/inventory/purchases/new")}
          >
            Ingresar Compra
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen()}
            size="large"
          >
            Nuevo Producto
          </Button>
        </Box>
      </Stack>

      {/* FILTROS CARD */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search color="action" sx={{ mr: 1 }} />,
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                select
                fullWidth
                label="Rubro"
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                size="small"
              >
                <MenuItem value="">Todos los Rubros</MenuItem>
                {categories.map((c: any) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                select
                fullWidth
                label="Proveedor"
                value={filterProv}
                onChange={(e) => setFilterProv(e.target.value)}
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                {providers.map((p: any) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={withDeleted}
                    onChange={(e) => setWithDeleted(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Ver Inactivos
                  </Typography>
                }
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  setSearch("");
                  setFilterCat("");
                  setFilterProv("");
                  setWithDeleted(false);
                }}
              >
                Limpiar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* TABLA PRINCIPAL */}
      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: "#f8f9fa" }}>
            <TableRow>
              <TableCell>DESCRIPCIÓN</TableCell>
              <TableCell>RUBRO</TableCell>
              <TableCell align="center">UNIDAD</TableCell>
              <TableCell align="right">COSTO BASE</TableCell>
              <TableCell align="center">STOCK TOTAL</TableCell>
              <TableCell align="right">PRECIO VENTA</TableCell>
              <TableCell align="right">ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => {
              const isDeleted = !!p.deleted_at;
              const isUsdItem = p.currency === "USD";
              const arsPrice = isUsdItem
                ? Number(p.sale_price) * exchangeRate
                : Number(p.sale_price);

              return (
                <TableRow
                  key={p.id}
                  sx={
                    isDeleted
                      ? DELETED_ROW_STYLE
                      : { "&:hover": { bgcolor: "#f5f5f5" } }
                  }
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {isDeleted && (
                        <Chip
                          label="INACTIVO"
                          size="small"
                          color="default"
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.6rem" }}
                        />
                      )}
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {p.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {p.provider?.name || "Sin proveedor"} • SKU:{" "}
                          {p.sku || "-"}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={p.category?.name}
                      size="small"
                      sx={{
                        bgcolor: "#e3f2fd",
                        color: "#1565c0",
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {p.unit?.short_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {p.currency} {Number(p.cost_price).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${p.total_stock || 0} ${
                        p.unit?.short_name || "u"
                      }`}
                      color={
                        Number(p.total_stock) <= (p.min_stock_alert || 0)
                          ? "error"
                          : "default"
                      }
                      variant={
                        Number(p.total_stock) <= (p.min_stock_alert || 0)
                          ? "filled"
                          : "outlined"
                      }
                      size="small"
                      sx={{ fontWeight: "bold" }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color={isDeleted ? "text.disabled" : "success.main"}
                    >
                      ${" "}
                      {arsPrice.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </Typography>
                    {isUsdItem && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        USD {Number(p.sale_price).toFixed(2)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {isDeleted ? (
                      <Stack direction="row" justifyContent="flex-end">
                        <Tooltip title="Restaurar">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleRestore(p.id)}
                          >
                            <RestoreFromTrash fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar Definitivamente">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleHardDelete(p.id)}
                          >
                            <DeleteForever fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <Stack direction="row" justifyContent="flex-end">
                        <Tooltip title="Ajustar Stock">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleOpenStock(p)}
                          >
                            <Inventory2 fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpen(p)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">
                    No se encontraron productos
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* --- MODALES --- */}

      {/* MODAL AJUSTE DE STOCK */}
      <Dialog
        open={stockOpen}
        onClose={() => setStockOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleStockSubmit();
          }}
        >
          <DialogTitle>Ajuste Rápido de Stock</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} pt={1}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Seleccionar Sucursal"
                  value={stockForm.branch_id}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, branch_id: e.target.value })
                  }
                >
                  {branches.map((b: any) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Card
                  variant="outlined"
                  sx={{ bgcolor: "#f8f9fa", textAlign: "center", py: 2 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    STOCK DISPONIBLE
                  </Typography>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {currentStock}{" "}
                    <Typography component="span" variant="h6">
                      {selectedProduct?.unit?.short_name}
                    </Typography>
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant={stockForm.type === "IN" ? "contained" : "outlined"}
                  color="success"
                  onClick={() => setStockForm({ ...stockForm, type: "IN" })}
                  startIcon={<TrendingUp />}
                >
                  ENTRADA
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant={stockForm.type === "OUT" ? "contained" : "outlined"}
                  color="error"
                  onClick={() => setStockForm({ ...stockForm, type: "OUT" })}
                  startIcon={<TrendingDown />}
                >
                  SALIDA
                </Button>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Cantidad"
                  type="number"
                  fullWidth
                  autoFocus
                  required
                  value={stockForm.quantity}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, quantity: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Motivo del ajuste"
                  fullWidth
                  required
                  placeholder="Ej: Compra, Rotura..."
                  value={stockForm.reason}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, reason: e.target.value })
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStockOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Confirmar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL PRODUCTO (ABM) */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
            <Typography
              variant="caption"
              component="div"
              color="text.secondary"
            >
              Los campos con * son obligatorios
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography
                  variant="overline"
                  color="primary"
                  fontWeight="bold"
                >
                  Datos Generales
                </Typography>
              </Grid>
              <Grid item xs={8}>
                <TextField
                  label="Nombre del Producto *"
                  fullWidth
                  autoFocus
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="SKU"
                  fullWidth
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  disabled={isEditing}
                  helperText={isEditing ? "El SKU no se puede modificar" : ""}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Código Barras"
                  fullWidth
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  select
                  fullWidth
                  label="Rubro"
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                >
                  {categories.map((c: any) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  select
                  fullWidth
                  label="Unidad"
                  value={formData.unit_id}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_id: e.target.value })
                  }
                >
                  {units.map((u: any) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* 👇 AQUÍ INSERTAMOS LA TABLA DE STOCK SI ESTAMOS EDITANDO */}
              {isEditing && (
                <Grid item xs={12}>
                  <StockPerBranchTable stocks={stockDetails} />
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider />
              </Grid>
              <Grid item xs={12}>
                <Typography
                  variant="overline"
                  color="primary"
                  fontWeight="bold"
                >
                  Precios
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <TextField
                  select
                  fullWidth
                  label="Moneda"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                >
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Costo Lista"
                  type="number"
                  fullWidth
                  value={formData.list_price}
                  onChange={(e) =>
                    setFormData({ ...formData, list_price: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Desc. Prov %"
                  type="number"
                  fullWidth
                  value={formData.provider_discount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      provider_discount: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Costo Neto"
                  disabled
                  fullWidth
                  value={Number(formData.cost_price).toFixed(2)}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Margen %"
                  type="number"
                  fullWidth
                  value={formData.profit_margin}
                  onChange={(e) =>
                    setFormData({ ...formData, profit_margin: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  select
                  fullWidth
                  label="IVA %"
                  value={formData.vat_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, vat_rate: e.target.value })
                  }
                >
                  <MenuItem value={0}>0%</MenuItem>
                  <MenuItem value={10.5}>10.5%</MenuItem>
                  <MenuItem value={21}>21%</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="PRECIO VENTA"
                  focused
                  color="success"
                  fullWidth
                  value={Number(formData.sale_price).toFixed(2)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Proveedor"
                  value={formData.provider_id}
                  onChange={(e) =>
                    setFormData({ ...formData, provider_id: e.target.value })
                  }
                >
                  {providers.map((p: any) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Guardar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
