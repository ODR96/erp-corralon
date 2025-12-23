import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  Divider,
  Stack,
  CircularProgress,
  Chip,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import {
  ArrowBack,
  Delete,
  Edit,
  CheckCircle,
  Lock,
  LocalShipping,
  PictureAsPdf,
  Save,
} from "@mui/icons-material";
import {
  inventoryService,
  settingsService,
  branchesService,
} from "../../services/api"; // 👈 Asegúrate de importar branchesService
import { useNotification } from "../../context/NotificationContext";
import { generatePurchasePDF } from "../../utils/pdfGenerator";

const VAT_RATES = [0, 10.5, 21, 27];

export const NewPurchasePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showNotification } = useNotification();
  const isEditMode = Boolean(id);

  const [globalExchangeRate, setGlobalExchangeRate] = useState(1);
  const [providers, setProviders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  // Cabecera
  const [header, setHeader] = useState({
    provider: null as any,
    date: new Date().toLocaleDateString("en-CA"),
    invoice_number: "",
    observation: "",
    branch_id: "", // 👈 Aquí se guarda la sucursal seleccionada
    status: "DRAFT",
    currency: "ARS",
    exchange_rate: 1,
  });

  const isReadOnly =
    header.status === "RECEIVED" || header.status === "CANCELLED";
  const [items, setItems] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Estado del Formulario Borrador (Item temporal)
  const [draftItem, setDraftItem] = useState({
    quantity: 1,
    list_price: 0,
    discount_percent: 0,
    cost_price: 0,
    profit_margin: 30,
    vat_rate: 21,
    sale_price: 0,
  });

  // INICIO
  useEffect(() => {
    initPage();
  }, [id]);

  const initPage = async () => {
    setInitialLoading(true);
    setProducts([]);

    try {
      // Cargamos todo en paralelo
      const [provRes, prodRes, branchRes, settingsRes] = await Promise.all([
        inventoryService.getProviders(1, 100, ""),
        inventoryService.getProducts(1, 1000, ""), // Traemos productos frescos
        branchesService.getAll(), // 👈 Traemos sucursales
        settingsService.get(),
      ]);

      setProviders(provRes.data || []);
      setProducts(prodRes.data || []);

      // Manejo robusto de branches (puede venir como array directo o paginado)
      const branchesData = Array.isArray(branchRes)
        ? branchRes
        : branchRes?.data || [];
      setBranches(branchesData);

      const settings = settingsRes.data || settingsRes;
      const dollarPrice = Number(
        settings?.dollar_price || settings?.exchange_rate
      );
      setGlobalExchangeRate(dollarPrice > 0 ? dollarPrice : 1);

      // Valores por defecto para Nueva Compra
      if (!isEditMode) {
        setHeader((prev) => ({
          ...prev,
          exchange_rate: dollarPrice > 0 ? dollarPrice : 1,
          // Si hay sucursales, pre-seleccionamos la primera (o la del usuario si tuvieras esa info)
          branch_id: branchesData.length > 0 ? branchesData[0].id : "",
        }));
      }

      if (isEditMode && id) await loadPurchaseToEdit(id, provRes.data || []);
    } catch (error) {
      console.error(error);
      showNotification("Error cargando datos", "error");
    } finally {
      setInitialLoading(false);
    }
  };

  const loadPurchaseToEdit = async (
    purchaseId: string,
    currentProviders: any[]
  ) => {
    try {
      const data = await inventoryService.getPurchaseById(purchaseId);
      let foundProvider = null;
      if (data.provider) {
        foundProvider =
          currentProviders.find((p) => p.id === data.provider.id) ||
          data.provider;
      }
      const rawDate = data.date
        ? String(data.date).split("T")[0]
        : new Date().toLocaleDateString("en-CA");

      setHeader({
        provider: foundProvider,
        date: rawDate,
        invoice_number: data.invoice_number || "",
        branch_id: data.branch?.id || "", // 👈 Cargamos la sucursal guardada
        status: data.status,
        observation: data.observation || "",
        currency: data.currency || "ARS",
        exchange_rate: Number(data.exchange_rate) || 1,
      });

      const details = data.details || [];
      const mappedItems = details.map((d: any) => ({
        product_id: d.product?.id,
        product_name: d.product?.name || "Producto Desconocido",
        quantity: Number(d.quantity),
        list_price: 0,
        discount_percent: 0,
        cost: Number(d.cost),
        profit_margin: Number(d.profit_margin) || 30,
        vat_rate: Number(d.vat_rate) || 0,
        sale_price: Number(d.sale_price) || 0,
      }));

      setItems(mappedItems);
    } catch (error) {
      showNotification("Error cargando compra", "error");
      navigate("/inventory/purchases");
    }
  };

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    if (product) {
      const invoiceCurrency = header.currency;
      const productCurrency = product.currency || "ARS";
      let baseListPrice =
        Number(product.list_price) || Number(product.cost_price) || 0;
      let baseCost = Number(product.cost_price) || 0;
      const discount = Number(product.provider_discount) || 0;

      // Conversión cruzada
      if (invoiceCurrency === "ARS" && productCurrency === "USD") {
        baseListPrice = baseListPrice * globalExchangeRate;
        baseCost = baseCost * globalExchangeRate;
      } else if (invoiceCurrency === "USD" && productCurrency === "ARS") {
        baseListPrice = baseListPrice / globalExchangeRate;
        baseCost = baseCost / globalExchangeRate;
      }

      const margin = Number(product.profit_margin) || 30;
      const vat = Number(product.vat_rate) || 21;

      const costInArs =
        invoiceCurrency === "USD" ? baseCost * globalExchangeRate : baseCost;
      const netPrice = costInArs * (1 + margin / 100);
      const finalPrice = netPrice * (1 + vat / 100);

      setDraftItem({
        quantity: 1,
        list_price: parseFloat(baseListPrice.toFixed(2)),
        discount_percent: discount,
        cost_price: parseFloat(baseCost.toFixed(2)),
        profit_margin: margin,
        vat_rate: vat,
        sale_price: parseFloat(finalPrice.toFixed(2)),
      });
    }
  };

  const handleDraftChange = (field: string, value: number) => {
    setDraftItem((prev) => {
      const newState = { ...prev, [field]: value };

      // Recalcular Costo si cambia Lista o Descuento
      if (field === "list_price" || field === "discount_percent") {
        const list = field === "list_price" ? value : prev.list_price;
        const disc =
          field === "discount_percent" ? value : prev.discount_percent;
        newState.cost_price = list - list * (disc / 100);
      }

      const currentInputCost = newState.cost_price;
      const costInArs =
        header.currency === "USD"
          ? currentInputCost * globalExchangeRate
          : currentInputCost;
      const margin = newState.profit_margin;
      const vat = newState.vat_rate;
      const netPrice = costInArs * (1 + margin / 100);
      const finalSalePrice = netPrice * (1 + vat / 100);

      newState.sale_price = parseFloat(finalSalePrice.toFixed(2));
      return newState;
    });
  };

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) return;
    if (draftItem.quantity <= 0)
      return showNotification("Cantidad inválida", "warning");

    const itemData = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name || selectedProduct.product_name,
      quantity: draftItem.quantity,
      list_price: draftItem.list_price,
      discount_percent: draftItem.discount_percent,
      cost: draftItem.cost_price,
      profit_margin: draftItem.profit_margin,
      vat_rate: draftItem.vat_rate,
      sale_price: draftItem.sale_price,
    };

    if (editingIndex !== null) {
      const newItems = [...items];
      newItems[editingIndex] = itemData;
      setItems(newItems);
    } else {
      setItems([...items, itemData]);
    }

    setSelectedProduct(null);
    setEditingIndex(null);
    setTimeout(() => {
      document.getElementById("product-search-input")?.focus();
    }, 100);
  };

  const handleEditItem = (index: number) => {
    const item = items[index];
    setEditingIndex(index);
    setSelectedProduct({
      id: item.product_id,
      name: item.product_name,
      currency:
        products.find((p) => p.id === item.product_id)?.currency || "ARS",
    });

    setDraftItem({
      quantity: item.quantity,
      list_price: item.list_price || 0,
      discount_percent: item.discount_percent || 0,
      cost_price: item.cost,
      profit_margin: item.profit_margin || 30,
      vat_rate: item.vat_rate || 21,
      sale_price: item.sale_price || 0,
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (targetStatus: string) => {
    if (!header.provider) return showNotification("Falta Proveedor", "error");
    if (!header.branch_id)
      return showNotification("Selecciona una Sucursal", "error");
    if (items.length === 0) return showNotification("Lista vacía", "error");

    setLoading(true);
    try {
      const payload = {
        ...header,
        provider_id: header.provider.id,
        status: targetStatus,
        total: totals.total,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          cost: i.cost,
          profit_margin: i.profit_margin,
          vat_rate: i.vat_rate,
          sale_price: i.sale_price,
        })),
      };

      if (isEditMode && id) {
        await inventoryService.updatePurchase(id, payload);
        showNotification(`Compra actualizada (${targetStatus})`, "success");
      } else {
        await inventoryService.createPurchase(payload);
        showNotification("Compra creada", "success");
      }
      navigate(-1);
    } catch (error) {
      console.error(error);
      showNotification("Error al guardar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = () => {
    const tempPurchase = {
      ...header,
      id: id || "BORRADOR",
      // Agregamos nombre de sucursal para el PDF si quieres
      branch: branches.find((b) => b.id === header.branch_id),
      items: items.map((i) => ({
        ...i,
        product: { sku: "---", name: i.product_name },
      })),
    };
    generatePurchasePDF(tempPurchase, {});
  };

  // --- CÁLCULOS TOTALES ---
  const totals = items.reduce(
    (acc, item) => {
      const net = item.quantity * item.cost;
      const vat = net * (item.vat_rate / 100);
      return {
        net: acc.net + net,
        vat: acc.vat + vat,
        total: acc.total + (net + vat),
      };
    },
    { net: 0, vat: 0, total: 0 }
  );

  const totalInArs =
    header.currency === "USD"
      ? totals.total * (header.exchange_rate || 1)
      : totals.total;

  if (initialLoading)
    return (
      <Box p={5} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );

  return (
    <Box p={3}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {isEditMode ? `Editar Compra` : "Nueva Compra"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ESTADO: <b>{header.status}</b>
            </Typography>
          </Box>
        </Box>
        {isReadOnly && (
          <Chip icon={<Lock />} label="Solo Lectura" variant="outlined" />
        )}
      </Box>

      <Grid container spacing={3}>
        {/* CABECERA */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {/* 1. Proveedor */}
              <Grid item xs={12} md={4}>
                <Autocomplete
                  disabled={isReadOnly}
                  options={providers}
                  getOptionLabel={(o) => o.name}
                  value={header.provider}
                  onChange={(_, v) => setHeader({ ...header, provider: v })}
                  renderInput={(params) => (
                    <TextField {...params} label="Proveedor" />
                  )}
                />
              </Grid>

              {/* 2. Sucursal (¡RECUPERADA!) */}
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Sucursal Destino"
                  fullWidth
                  value={header.branch_id}
                  onChange={(e) =>
                    setHeader({ ...header, branch_id: e.target.value })
                  }
                  disabled={isReadOnly}
                >
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* 3. Fecha */}
              <Grid item xs={12} md={4}>
                <TextField
                  disabled={isReadOnly}
                  type="date"
                  label="Fecha"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={header.date}
                  onChange={(e) =>
                    setHeader({ ...header, date: e.target.value })
                  }
                />
              </Grid>

              {/* 4. Moneda */}
              <Grid item xs={6} md={3}>
                <TextField
                  select
                  label="Moneda Factura"
                  fullWidth
                  SelectProps={{ native: true }}
                  disabled={isReadOnly}
                  value={header.currency}
                  onChange={(e) =>
                    setHeader({
                      ...header,
                      currency: e.target.value,
                      exchange_rate:
                        e.target.value === "ARS" ? 1 : header.exchange_rate,
                    })
                  }
                >
                  <option value="ARS">Pesos (ARS)</option>
                  <option value="USD">Dólares (USD)</option>
                </TextField>
              </Grid>

              {/* 5. Cotización (Solo si es USD) */}
              <Grid item xs={6} md={3}>
                <TextField
                  label="Cotización"
                  type="number"
                  fullWidth
                  disabled={isReadOnly || header.currency === "ARS"}
                  value={header.exchange_rate}
                  onChange={(e) =>
                    setHeader({
                      ...header,
                      exchange_rate: Number(e.target.value),
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* 6. Nro Factura */}
              <Grid item xs={12} md={6}>
                <TextField
                  disabled={isReadOnly}
                  label="Nro. Factura"
                  fullWidth
                  value={header.invoice_number}
                  onChange={(e) =>
                    setHeader({ ...header, invoice_number: e.target.value })
                  }
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2, minHeight: "500px" }}>
            {!isReadOnly && (
              <>
                <Box mb={2}>
                  <Autocomplete
                    id="product-search-input"
                    options={products}
                    getOptionLabel={(o) => `${o.name} (${o.sku || "-"})`}
                    value={selectedProduct}
                    onChange={(_, v) => handleProductSelect(v)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Buscar Producto"
                        placeholder="Escribir..."
                      />
                    )}
                  />
                </Box>
                {/* CALCULADORA */}
                {selectedProduct && (
                  <Box
                    bgcolor="#e3f2fd"
                    p={2}
                    borderRadius={2}
                    mb={3}
                    border="1px solid #90caf9"
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12}>
                        <Typography
                          variant="subtitle2"
                          color="primary"
                          fontWeight="bold"
                        >
                          {editingIndex !== null
                            ? "EDITANDO ÍTEM"
                            : "NUEVO ÍTEM"}
                          : {selectedProduct.name}
                        </Typography>
                      </Grid>
                      <Grid item xs={1}>
                        <TextField
                          label="Cant."
                          type="number"
                          size="small"
                          fullWidth
                          autoFocus
                          value={draftItem.quantity}
                          onChange={(e) =>
                            handleDraftChange(
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          onKeyDown={handleEnter}
                        />
                      </Grid>
                      <Grid item xs={2}>
                        <TextField
                          label="P. Lista"
                          type="number"
                          size="small"
                          fullWidth
                          value={draftItem.list_price}
                          onChange={(e) =>
                            handleDraftChange(
                              "list_price",
                              Number(e.target.value)
                            )
                          }
                          onKeyDown={handleEnter}
                        />
                      </Grid>
                      <Grid item xs={1}>
                        <TextField
                          label="Desc %"
                          type="number"
                          size="small"
                          fullWidth
                          value={draftItem.discount_percent}
                          onChange={(e) =>
                            handleDraftChange(
                              "discount_percent",
                              Number(e.target.value)
                            )
                          }
                          onKeyDown={handleEnter}
                        />
                      </Grid>
                      <Grid item xs={2}>
                        {selectedProduct.currency === "USD" && (
                          <Chip
                            label="Base U$D"
                            color="warning"
                            size="small"
                            sx={{ mb: 0.5, height: 20, fontSize: "0.7rem" }}
                          />
                        )}
                        <TextField
                          label="Costo Neto"
                          type="number"
                          size="small"
                          fullWidth
                          value={draftItem.cost_price}
                          onChange={(e) =>
                            handleDraftChange(
                              "cost_price",
                              Number(e.target.value)
                            )
                          }
                          onKeyDown={handleEnter}
                        />
                      </Grid>
                      <Grid item xs={2}>
                        <TextField
                          select
                          label="IVA %"
                          size="small"
                          fullWidth
                          value={draftItem.vat_rate}
                          onChange={(e) =>
                            handleDraftChange(
                              "vat_rate",
                              Number(e.target.value)
                            )
                          }
                          onKeyDown={handleEnter}
                        >
                          {VAT_RATES.map((rate) => (
                            <MenuItem key={rate} value={rate}>
                              {rate}%
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={2}>
                        <TextField
                          label="Margen %"
                          type="number"
                          size="small"
                          fullWidth
                          value={draftItem.profit_margin}
                          onChange={(e) =>
                            handleDraftChange(
                              "profit_margin",
                              Number(e.target.value)
                            )
                          }
                          onKeyDown={handleEnter}
                        />
                      </Grid>
                      <Grid item xs={2}>
                        <TextField
                          label="Venta Sug."
                          size="small"
                          fullWidth
                          InputProps={{ readOnly: true }}
                          color="success"
                          focused
                          value={draftItem.sale_price.toFixed(2)}
                        />
                        {selectedProduct.currency === "USD" && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.65rem" }}
                          >
                            (U$D x {globalExchangeRate})
                          </Typography>
                        )}
                      </Grid>
                      <Grid
                        item
                        xs={12}
                        display="flex"
                        justifyContent="flex-end"
                        gap={1}
                      >
                        <IconButton
                          color="error"
                          onClick={() => {
                            setSelectedProduct(null);
                            setEditingIndex(null);
                          }}
                        >
                          <Delete />
                        </IconButton>
                        <Button variant="contained" onClick={handleAddItem}>
                          OK
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </>
            )}

            {/* TABLA DE ÍTEMS */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#fafafa" }}>
                    <TableCell>Producto</TableCell>
                    <TableCell align="center">Cant.</TableCell>
                    <TableCell align="right">Costo Neto</TableCell>
                    <TableCell align="center">IVA</TableCell>
                    <TableCell align="right">Subtotal + IVA</TableCell>
                    {!isReadOnly && (
                      <TableCell align="center">Acciones</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => {
                    if (editingIndex === index) return null;
                    const subtotalNeto = item.quantity * item.cost;
                    const subtotalConIva =
                      subtotalNeto * (1 + item.vat_rate / 100);
                    return (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">
                          ${item.cost.toFixed(2)}
                        </TableCell>
                        <TableCell align="center">{item.vat_rate}%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>
                          ${subtotalConIva.toFixed(2)}
                        </TableCell>
                        {!isReadOnly && (
                          <TableCell align="center">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => handleEditItem(index)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />

            {/* FOOTER: Desglose */}
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Paper
                variant="outlined"
                sx={{ p: 2, minWidth: 250, bgcolor: "#f9f9f9" }}
              >
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Subtotal Neto:
                    </Typography>
                    <Typography variant="body1">
                      {header.currency === "USD" ? "U$D" : "$"}{" "}
                      {totals.net.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      IVA Total:
                    </Typography>
                    <Typography variant="body1">
                      {header.currency === "USD" ? "U$D" : "$"}{" "}
                      {totals.vat.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box display="flex" justifyContent="space-between">
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="success.main"
                    >
                      TOTAL:
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      color="success.main"
                    >
                      {header.currency === "USD" ? "U$D" : "$"}{" "}
                      {totals.total.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                  {header.currency === "USD" && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      align="right"
                    >
                      ≈ ${" "}
                      {totalInArs.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ARS
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Box>

            <Box display="flex" justifyContent="flex-end">
              {!isReadOnly && !selectedProduct && (
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="text"
                    startIcon={<PictureAsPdf />}
                    onClick={handlePDF}
                  >
                    PDF
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Save />}
                    onClick={() => handleSubmit("DRAFT")}
                  >
                    Guardar Borrador
                  </Button>
                  {header.status === "DRAFT" && (
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<LocalShipping />}
                      onClick={() => handleSubmit("ORDERED")}
                    >
                      Enviar Pedido
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Confirmar recepción? Esto sumará el stock."
                        )
                      )
                        handleSubmit("RECEIVED");
                    }}
                  >
                    Recibir Mercadería
                  </Button>
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
