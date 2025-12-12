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
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  QrCodeScanner,
  AttachMoney,
  Clear,
  Info,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { inventoryService, settingsService } from "../services/api";

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

export const ProductsPage = () => {
  const { enqueueSnackbar } = useSnackbar();

  // ESTADOS
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [roundingRule, setRoundingRule] = useState(0);

  // Listas
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  // Filtros
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterProv, setFilterProv] = useState("");

  // Modal
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(initialForm);

  useEffect(() => {
    loadAuxData();
  }, []);
  useEffect(() => {
    loadProducts();
  }, [page, rowsPerPage, search, filterCat, filterProv]);

  const loadAuxData = async () => {
    try {
      const [cats, unitsData, provs, config] = await Promise.all([
        inventoryService.getCategories(),
        inventoryService.getUnits(),
        inventoryService.getProviders(),
        settingsService.get(),
      ]);
      setCategories(cats);
      setUnits(unitsData);
      setProviders(provs);
      setExchangeRate(Number(config.exchange_rate) || 1);
      setRoundingRule(Number(config.price_rounding) || 0);

      setFormData((prev: any) => ({
        ...prev,
        profit_margin: Number(config.default_profit_margin) || 30,
        vat_rate: Number(config.default_vat_rate) || 21,
        currency: config.currency || "ARS",
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await inventoryService.getProducts(
        page + 1,
        rowsPerPage,
        search,
        filterCat,
        filterProv
      );
      setProducts(res.data);
      setTotal(res.total);
    } catch (err) {
      enqueueSnackbar("Error cargando productos", { variant: "error" });
    }
  };

  // --- 🧮 CALCULADORA INTELIGENTE CON REDONDEO ---
  useEffect(() => {
    if (!open) return;

    const listPrice = Number(formData.list_price) || 0;
    const discount = Number(formData.provider_discount) || 0;
    const margin = Number(formData.profit_margin) || 0;
    const vat = Number(formData.vat_rate) || 0;

    // 1. Costo
    const cost = listPrice - listPrice * (discount / 100);

    // 2. Neto
    const netPrice = cost + cost * (margin / 100);

    // 3. Final Matemático
    let finalPrice = netPrice + netPrice * (vat / 100);

    // 4. APLICAR REDONDEO (Solo si es ARS)
    // Regla: Redondear hacia arriba al múltiplo de 10 más cercano
    // Ejemplo: 101 -> 110, 109 -> 110.
    if (formData.currency === "ARS" && roundingRule > 0) {
      // Truco matemático: Dividir, redondear techo, multiplicar.
      // Ej: 108 / 10 = 10.8 -> Ceil(10.8) = 11 -> 11 * 10 = 110.
      finalPrice = Math.ceil(finalPrice / roundingRule) * roundingRule;
    }

setFormData((prev: any) => {
      const prevCost = Number(prev.cost_price);
      const prevSale = Number(prev.sale_price);
      if (Math.abs(prevCost - cost) < 0.01 && Math.abs(prevSale - finalPrice) < 0.01) return prev;
      return { ...prev, cost_price: cost, sale_price: finalPrice };
    });
  }, [formData.list_price, formData.provider_discount, formData.profit_margin, formData.vat_rate, formData.currency, open, roundingRule]);

  const handleOpen = (product?: any) => {
    if (product) {
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
    } else {
      setIsEditing(false);
      const defaultCat =
        categories.find((c) => c.name === "General" || c.name === "Varios")
          ?.id || "";
      const defaultUnit =
        units.find((u) => u.short_name === "u" || u.name === "Unidad")?.id ||
        "";

      setFormData((prev) => ({
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
        enqueueSnackbar("Producto actualizado", { variant: "success" });
      } else {
        await inventoryService.createProduct(payload);
        enqueueSnackbar("Producto creado", { variant: "success" });
      }
      setOpen(false);
      loadProducts();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Error al guardar";
      enqueueSnackbar(Array.isArray(msg) ? msg[0] : msg, { variant: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Enviar producto a papelera?")) {
      try {
        await inventoryService.deleteProduct(id, false);
        enqueueSnackbar("Producto eliminado", { variant: "success" });
        loadProducts();
      } catch (err) {
        enqueueSnackbar("Error", { variant: "error" });
      }
    }
  };

  // VARIABLES PARA VISUALIZACIÓN EN EL MODAL
  const isUsd = formData.currency === "USD";
  const costInArs = Number(formData.cost_price) * exchangeRate;
  const priceInArs = Number(formData.sale_price) * exchangeRate;

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">Inventario</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
        >
          Nuevo
        </Button>
      </Box>

      {/* FILTROS */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
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
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">Todos</MenuItem>
              {categories.map((c: any) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              select
              fullWidth
              label="Proveedor"
              value={filterProv}
              onChange={(e) => setFilterProv(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">Todos</MenuItem>
              {providers.map((p: any) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              startIcon={<Clear />}
              onClick={() => {
                setSearch("");
                setFilterCat("");
                setFilterProv("");
              }}
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* TABLA INVERTIDA (PESOS GRANDE) */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>Categoría / Prov.</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell align="right">Costo Ref.</TableCell>
              <TableCell align="right">Precio Público (ARS)</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => {
              const isUsdItem = p.currency === "USD";
              const price = Number(p.sale_price);
              const arsValue = isUsdItem ? price * exchangeRate : price;

              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      SKU: {p.sku || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={p.category?.name}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="caption" display="block">
                      {p.provider?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{p.unit?.short_name}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {p.currency} {Number(p.cost_price).toFixed(2)}
                    </Typography>
                  </TableCell>

                  {/* PRECIO INVERTIDO: SIEMPRE PESOS GRANDE */}
                  <TableCell align="right">
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color="success.main"
                    >
                      ${" "}
                      {arsValue.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                    {isUsdItem && (
                      <Tooltip title={`Cotización: $${exchangeRate}`}>
                        <Chip
                          label={`USD ${price.toFixed(2)}`}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 20,
                            fontSize: "0.7rem",
                            borderColor: "rgba(0,0,0,0.1)",
                          }}
                        />
                      </Tooltip>
                    )}
                  </TableCell>

                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => handleOpen(p)}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
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

      {/* MODAL */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ pb: 1 }}>
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
            >
              Complete los datos obligatorios (*)
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
                  Identificación
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
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
              <Grid item xs={6} md={3}>
                <TextField
                  label="SKU / Código"
                  fullWidth
                  placeholder="Ej: 001"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Cód. Barras"
                  fullWidth
                  placeholder="Escanear"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <QrCodeScanner color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Rubro / Categoría"
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                >
                  {categories.map((c: any) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Unidad de Medida"
                  value={formData.unit_id}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_id: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                >
                  {units.map((u: any) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name} ({u.short_name})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Proveedor"
                  value={formData.provider_id}
                  onChange={(e) =>
                    setFormData({ ...formData, provider_id: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="">
                    <em>Sin Proveedor</em>
                  </MenuItem>
                  {providers.map((p: any) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sx={{ mt: 1 }}>
                <Divider textAlign="left">
                  <Chip
                    label="💰 Costos y Precios"
                    size="small"
                    icon={<Info fontSize="small" />}
                  />
                </Divider>
              </Grid>

              <Grid item xs={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Moneda Compra"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                  helperText={
                    isUsd ? `Cotización: $${exchangeRate}` : "Moneda local"
                  }
                >
                  <MenuItem value="ARS">🇦🇷 Pesos (ARS)</MenuItem>
                  <MenuItem value="USD">🇺🇸 Dólares (USD)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={6} md={3}>
                <TextField
                  label="Precio Lista"
                  type="number"
                  fullWidth
                  value={formData.list_price}
                  onChange={(e) =>
                    setFormData({ ...formData, list_price: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {formData.currency === "USD" ? "US$" : "$"}
                      </InputAdornment>
                    ),
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Desc. Prov."
                  type="number"
                  fullWidth
                  value={formData.provider_discount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      provider_discount: e.target.value,
                    })
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">%</InputAdornment>
                    ),
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Costo Neto"
                  type="number"
                  fullWidth
                  disabled
                  value={Number(formData.cost_price).toFixed(2)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: "#f5f5f5" }}
                  helperText={
                    isUsd
                      ? `≈ $ ${costInArs.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })} ARS`
                      : ""
                  }
                />
              </Grid>

              <Grid item xs={6} md={4}>
                <TextField
                  label="Margen Ganancia"
                  type="number"
                  fullWidth
                  value={formData.profit_margin}
                  onChange={(e) =>
                    setFormData({ ...formData, profit_margin: e.target.value })
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">%</InputAdornment>
                    ),
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField
                  select
                  fullWidth
                  label="IVA"
                  value={formData.vat_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, vat_rate: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value={0}>0%</MenuItem>
                  <MenuItem value={10.5}>10.5%</MenuItem>
                  <MenuItem value={21}>21%</MenuItem>
                  <MenuItem value={27}>27%</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                {/* PRECIO FINAL BLOQUEADO */}
                <TextField
                  label="PRECIO FINAL (Calculado)"
                  type="number"
                  fullWidth
                  color="success"
                  focused
                  value={Number(formData.sale_price).toFixed(2)}
                  disabled // <--- AHORA ES SOLO LECTURA
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoney />
                      </InputAdornment>
                    ),
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    bgcolor: "#e8f5e9",
                    "& .MuiInputBase-input": {
                      fontWeight: "bold",
                      color: "green",
                    },
                  }}
                  helperText={
                    isUsd ? (
                      <Typography
                        variant="caption"
                        color="success.main"
                        fontWeight="bold"
                      >
                        Venta en Pesos: ${" "}
                        {priceInArs.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </Typography>
                    ) : (
                      "Incluye Redondeo a $10"
                    )
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpen(false)} color="inherit">
              Cancelar
            </Button>
            <Button variant="contained" type="submit" size="large">
              Guardar Producto
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
