import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
import {
  Save,
  ArrowBack,
  Delete,
  AddShoppingCart,
  Edit,
} from "@mui/icons-material";
import { inventoryService } from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

export const NewPurchasePage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Referencia para volver al buscador
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- ESTADOS DE DATOS ---
  const [providers, setProviders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- CABECERA ---
  const [header, setHeader] = useState({
    provider: null as any,
    date: new Date().toISOString().split("T")[0],
    invoice_number: "",
    observation: "",
    branch_id: "",
    status: "RECEIVED",
  });

  // --- TABLA DE ÍTEMS ---
  const [items, setItems] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // --- ZONA DE EDICIÓN (CALCULADORA) ---
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Estado del formulario borrador
  const [draftItem, setDraftItem] = useState({
    quantity: 1,
    list_price: 0,
    discount_percent: 0,
    cost_price: 0,
    profit_margin: 30,
    vat_rate: 21,
    sale_price: 0,
  });

  // --- CARGA INICIAL ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [provRes, prodRes, branchRes] = await Promise.all([
        inventoryService.getProviders(1, 100, ""),
        inventoryService.getProducts(1, 1000, ""),
        inventoryService.getBranches(),
      ]);
      setProviders(provRes.data || []);
      setProducts(prodRes.data || []);

      const branchesData = Array.isArray(branchRes)
        ? branchRes
        : branchRes?.data || [];
      if (branchesData.length > 0) {
        setBranches(branchesData);
        setHeader((prev) => ({ ...prev, branch_id: branchesData[0].id }));
      }
    } catch (error) {
      console.error(error);
      showNotification("Error cargando datos", "error");
    }
  };

  // --- LOGICA DE SELECCIÓN ---

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);

    if (product) {
      // Cargamos valores por defecto del producto maestro
      setDraftItem({
        quantity: 1,
        list_price: Number(product.list_price) || 0,
        discount_percent: Number(product.provider_discount) || 0,
        cost_price: Number(product.cost_price) || 0,
        profit_margin: Number(product.profit_margin) || 30,
        vat_rate: Number(product.vat_rate) || 21,
        sale_price: Number(product.sale_price) || 0,
      });
    }
  };

  // --- CALCULADORA ---
  const handleDraftChange = (field: string, value: number) => {
    setDraftItem((prev) => {
      const newState = { ...prev, [field]: value };

      // 1. Recalcular Costo si cambia Lista o Descuento
      if (field === "list_price" || field === "discount_percent") {
        const list = field === "list_price" ? value : prev.list_price;
        const disc =
          field === "discount_percent" ? value : prev.discount_percent;
        newState.cost_price = list - list * (disc / 100);
      }

      // 2. Recalcular Precio Venta si cambia Costo, Margen o IVA
      const currentCost = newState.cost_price;
      const margin = newState.profit_margin;
      const vat = newState.vat_rate;

      const netPrice = currentCost * (1 + margin / 100);
      const finalPrice = netPrice * (1 + vat / 100);

      newState.sale_price = parseFloat(finalPrice.toFixed(2));

      return newState;
    });
  };

  // --- ABM ÍTEMS ---

  const handleAddItem = () => {
    if (!selectedProduct) return;
    if (draftItem.quantity <= 0) {
      showNotification("Cantidad inválida", "warning");
      return;
    }

    // Datos del ítem actual en el editor
    const itemData = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: draftItem.quantity,
      list_price: draftItem.list_price,
      discount_percent: draftItem.discount_percent,
      cost: draftItem.cost_price,
      profit_margin: draftItem.profit_margin,
      vat_rate: draftItem.vat_rate,
      sale_price: draftItem.sale_price,
      subtotal: draftItem.quantity * draftItem.cost_price,
    };

    if (editingIndex !== null) {
      // --- MODO EDICIÓN: Reemplazamos exactamente la fila que estábamos tocando ---
      const newItems = [...items];
      newItems[editingIndex] = itemData; // Sobrescribimos
      setItems(newItems);
      showNotification(`Ítem actualizado`, "info");
    } else {
      // --- MODO NUEVO: Lógica de siempre (Merge o Push) ---
      const existingIndex = items.findIndex(
        (i) => i.product_id === selectedProduct.id
      );

      if (existingIndex >= 0) {
        // Si ya existe (y no estábamos editando ese específico), sumamos
        const newItems = [...items];
        const existing = newItems[existingIndex];
        existing.quantity += itemData.quantity;
        existing.subtotal = existing.quantity * existing.cost; // Actualizar subtotal
        setItems(newItems);
      } else {
        // Agregamos al final
        setItems([...items, itemData]);
      }
    }

    // Limpieza final
    setSelectedProduct(null);
    setEditingIndex(null); // Importante: salir del modo edición

    setTimeout(() => {
      const input = document.getElementById("product-search-input");
      if (input) input.focus();
    }, 100);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number) => {
    const itemToEdit = items[index];

    // 1. Marcar que estamos editando ESTA fila (para ocultarla visualmente abajo)
    setEditingIndex(index);

    // 2. Cargar datos visuales y de calculadora
    setSelectedProduct({
      id: itemToEdit.product_id,
      name: itemToEdit.product_name,
      list_price: itemToEdit.list_price,
    });

    setDraftItem({
      quantity: itemToEdit.quantity,
      list_price: Number(itemToEdit.list_price) || 0,
      discount_percent: Number(itemToEdit.discount_percent) || 0,
      cost_price: Number(itemToEdit.cost) || 0,
      profit_margin: Number(itemToEdit.profit_margin) || 30,
      vat_rate: Number(itemToEdit.vat_rate) || 21,
      sale_price: Number(itemToEdit.sale_price) || 0,
    });

    // ❌ BORRA LA LÍNEA handleRemoveItem(index); ¡Ya no la sacamos!
  };

  const handleCancelEdit = () => {
    setSelectedProduct(null); // Cierra el editor
    setEditingIndex(null); // Libera la fila (vuelve a aparecer en la tabla)
  };

  // --- GUARDAR ---
  const handleSubmit = async (isDraft: boolean) => {
    if (!header.provider) return showNotification("Falta Proveedor", "error");
    if (items.length === 0) return showNotification("Lista vacía", "error");

    setLoading(true);
    try {
      const payload = {
        ...header,
        provider_id: header.provider.id,
        status: isDraft ? "DRAFT" : "RECEIVED",
        total: items.reduce((acc, i) => acc + i.subtotal, 0),
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          cost: i.cost,
        })),
      };

      await inventoryService.createPurchase(payload);
      showNotification(
        isDraft ? "Guardado en Borradores" : "Compra Confirmada",
        "success"
      );
      navigate(-1);
    } catch (error) {
      console.error(error);
      showNotification("Error al guardar", "error");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = items.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          Nueva Compra
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* CABECERA */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Autocomplete
                  options={providers}
                  getOptionLabel={(o) => o.name}
                  value={header.provider}
                  onChange={(_, v) => setHeader({ ...header, provider: v })}
                  renderInput={(params) => (
                    <TextField {...params} label="Proveedor" />
                  )}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  label="Fecha"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={header.date}
                  onChange={(e) =>
                    setHeader({ ...header, date: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Nro. Factura"
                  fullWidth
                  value={header.invoice_number}
                  onChange={(e) =>
                    setHeader({ ...header, invoice_number: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Sucursal"
                  SelectProps={{ native: true }}
                  value={header.branch_id}
                  onChange={(e) =>
                    setHeader({ ...header, branch_id: e.target.value })
                  }
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ZONA DE CARGA */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, minHeight: "500px" }}>
            {/* BUSCADOR */}
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
                    autoFocus
                    placeholder="Código o Nombre..."
                  />
                )}
              />
            </Box>

            {/* CALCULADORA (Visible si hay producto seleccionado) */}
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
                      {draftItem.list_price > 0
                        ? "Editando Ítem"
                        : "Nuevo Ítem"}
                      : {selectedProduct.name}
                    </Typography>
                  </Grid>

                  {/* Fila 1 */}
                  <Grid item xs={2}>
                    <TextField
                      label="Cantidad"
                      type="number"
                      size="small"
                      fullWidth
                      autoFocus
                      value={draftItem.quantity}
                      onChange={(e) =>
                        handleDraftChange("quantity", Number(e.target.value))
                      }
                      // 👇 Enter funciona aquí
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      label="Precio Lista"
                      type="number"
                      size="small"
                      fullWidth
                      value={draftItem.list_price}
                      onChange={(e) =>
                        handleDraftChange("list_price", Number(e.target.value))
                      }
                      // 👇 Enter funciona aquí
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      label="Desc. %"
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
                      // 👇 Enter funciona aquí
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      label="Costo Neto"
                      type="number"
                      size="small"
                      fullWidth
                      // 👇 SOLO LECTURA (Read Only)
                      InputProps={{ readOnly: true }}
                      // Le dejamos el color warning para que se note que es importante
                      color="warning"
                      focused
                      value={draftItem.cost_price.toFixed(2)}
                    />
                  </Grid>

                  {/* Fila 2 */}
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
                      // 👇 Enter funciona aquí (último campo editable)
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      label="Precio Venta"
                      type="text"
                      size="small"
                      fullWidth
                      // 👇 SOLO LECTURA (Read Only)
                      InputProps={{ readOnly: true }}
                      color="success"
                      focused
                      value={draftItem.sale_price.toFixed(2)}
                    />
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    display="flex"
                    justifyContent="flex-end"
                    gap={1}
                  >
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleAddItem}
                      startIcon={<AddShoppingCart />}
                    >
                      AGREGAR
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* TABLA */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#fafafa" }}>
                    <TableCell>Producto</TableCell>
                    <TableCell align="center">Cant.</TableCell>
                    <TableCell align="right">Costo Unit.</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="right">Precio Venta</TableCell>
                    <TableCell width={100} align="center">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => {
                    if (editingIndex === index) return null;
                    return (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">
                          ${item.cost.toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>
                          ${item.subtotal.toFixed(2)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: "text.secondary" }}
                        >
                          ${item.sale_price?.toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" justifyContent="center">
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
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />

            {/* FOOTER */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h4" color="success.main" fontWeight="bold">
                Total: ${totalAmount.toLocaleString("es-AR")}
              </Typography>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                >
                  Guardar Borrador
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  startIcon={<Save />}
                >
                  Confirmar y Recibir
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
