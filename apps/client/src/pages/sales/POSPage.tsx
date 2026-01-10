import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom"; // 👈 Importar hook de navegación
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  List,
  ListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Chip,
  Autocomplete,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import {
  Search,
  ShoppingCart,
  Delete,
  Add,
  Remove,
  AttachMoney,
  QrCode,
  CreditCard,
  ReceiptLong,
  PersonAdd,
  Description,
  Print,
  CheckCircle,
  Restore,
  Visibility,
  ArrowBack,
  Close,
} from "@mui/icons-material";
import { useNotification } from "../../context/NotificationContext";
import { api } from "../../services/api";
// 👇 Importamos las nuevas funciones del generador
import { generateSalePDF, getPdfUrl } from "../../utils/salePdfGenerator";

// ... (Interfaces iguales que antes) ...
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
}
interface CartItem extends Product {
  quantity: number;
  subtotal: number;
}
interface Client {
  id: string;
  name: string;
  tax_id: string;
}
interface Sale {
  id: string;
  created_at: string;
  customer_name: string;
  total: number;
  invoice_number: string;
}

export const POSPage = () => {
  const navigate = useNavigate(); // 👈 Hook para salir
  const { showNotification } = useNotification();

  // --- ESTADOS ---
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<"VENTA" | "PRESUPUESTO">("VENTA");
  const [settings, setSettings] = useState<any>({});
  const [checkBank, setCheckBank] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [checkDate, setCheckDate] = useState(""); // YYYY-MM-DD

  // Cliente
  const [clientInputValue, setClientInputValue] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [budgetsModalOpen, setBudgetsModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // 👇 NUEVO: Modal de Vista Previa de Impresión
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null); // Referencia para imprimir directo

  // Datos Pagos
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
  const [paymentReference, setPaymentReference] = useState("");
  const [installments, setInstallments] = useState(1);
  const [interestPercent, setInterestPercent] = useState(0);

  // Datos Temporales
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [budgetsList, setBudgetsList] = useState<Sale[]>([]);
  const [newClientData, setNewClientData] = useState({
    name: "",
    tax_id: "",
    phone: "",
    address: "",
  });

  // 1. CARGA INICIAL
  useEffect(() => {
    const initData = async () => {
      try {
        const [resProd, resSettings] = await Promise.all([
          api.get("/inventory/products?limit=1000"),
          api.get("/settings"),
        ]);
        const productsRaw = Array.isArray(resProd.data)
          ? resProd.data
          : resProd.data.data;
        if (Array.isArray(productsRaw)) {
          setProducts(
            productsRaw.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: Number(p.sale_price) || 0,
              stock: Number(p.total_stock) || 0,
              category: p.category?.name || "General",
            }))
          );
        }
        setSettings(resSettings.data || {});
      } catch (error) {
        showNotification("Error cargando datos", "error");
      }
    };
    initData();
  }, []);

  // 2. BUSCAR CLIENTES
  useEffect(() => {
    if (clientInputValue.length < 2) return;
    const timeoutId = setTimeout(async () => {
      setLoadingClients(true);
      try {
        const res = await api.get(`/sales/clients?search=${clientInputValue}`);
        setClients(res.data.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingClients(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [clientInputValue]);

  // --- LOGICA CARRITO (Igual que antes) ---
  const addToCart = (product: Product, qty: number = 1) => {
    // 👇 LEEMOS LA CONFIGURACIÓN
    const allowNegative = settings.allow_negative_stock;

    // 👇 SOLO BLOQUEAMOS SI LA CONFIGURACIÓN DICE "FALSE" (NO PERMITIR)
    if (saleType === "VENTA" && product.stock <= 0 && !allowNegative) {
      showNotification("¡Sin stock!", "error");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        // 👇 AQUÍ TAMBIÉN AGREGAMOS EL "!allowNegative"
        if (
          saleType === "VENTA" &&
          existing.quantity + qty > product.stock &&
          !allowNegative
        ) {
          showNotification("Tope stock", "warning");
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + qty,
                subtotal: (item.quantity + qty) * item.price,
              }
            : item
        );
      }
      return [
        ...prev,
        { ...product, quantity: qty, subtotal: qty * product.price },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    const allowNegative = settings.allow_negative_stock; // 👇 Leemos config

    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty < 1) return item;

          // 👇 SOLO BLOQUEAMOS SI NO SE PERMITE NEGATIVO
          if (saleType === "VENTA" && newQty > item.stock && !allowNegative) {
            showNotification("Tope stock", "warning");
            return item;
          }
          return { ...item, quantity: newQty, subtotal: newQty * item.price };
        }
        return item;
      })
    );
  };

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.subtotal, 0),
    [cart]
  );
  const interestAmount = useMemo(
    () =>
      paymentMethod === "CREDITO" && interestPercent > 0
        ? (subtotal * interestPercent) / 100
        : 0,
    [subtotal, paymentMethod, interestPercent]
  );
  const total = subtotal + interestAmount;

  // --- CLIENTE & PRESUPUESTOS ---
  const handleCreateClient = async () => {
    /* ... Código igual al anterior ... */
    // (Si lo necesitas completo dímelo, resumo para no hacer el código infinito)
    try {
      const res = await api.post("/sales/clients", newClientData);
      setSelectedClient(res.data);
      setClientInputValue(res.data.name);
      setClients([res.data]);
      setNewClientModalOpen(false);
      showNotification("Cliente creado", "success");
    } catch (e) {
      showNotification("Error", "error");
    }
  };

  const handleOpenBudgets = async () => {
    try {
      const res = await api.get("/sales?type=PRESUPUESTO");
      setBudgetsList(Array.isArray(res.data) ? res.data : res.data.data || []);
      setBudgetsModalOpen(true);
    } catch (e) {
      showNotification("Error al cargar presupuestos", "error");
    }
  };

  const handleLoadBudget = async (saleId: string) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      const budget = res.data;
      const newCart: CartItem[] = [];
      for (const detail of budget.details) {
        const product = products.find((p) => p.id === detail.product.id);
        if (product)
          newCart.push({
            ...product,
            quantity: detail.quantity,
            subtotal: detail.quantity * product.price,
          });
      }
      setCart(newCart);
      if (budget.customer_name) setClientInputValue(budget.customer_name);
      setBudgetsModalOpen(false);
      setSaleType("VENTA");
      showNotification("Presupuesto cargado", "success");
    } catch (e) {
      showNotification("Error", "error");
    }
  };

  const handleGoToClientProfile = () => {
    if (selectedClient) {
      // Navegamos al perfil del cliente (Asumiendo que esta ruta existirá)
      // Puedes abrir en nueva pestaña para no perder la venta:
      window.open(`/sales/clients/${selectedClient.id}`, "_blank");
    }
  };

  // --- CHECKOUT ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "CUENTA_CORRIENTE" && !selectedClient) {
      showNotification(
        "Cuenta Corriente requiere cliente registrado.",
        "error"
      );
      return;
    }
    if (paymentMethod === "CHEQUE") {
      if (!checkBank || !checkNumber || !checkDate) {
        showNotification("Por favor complete los datos del Cheque.", "warning");
        return;
      }
    }

    const finalCustomerName = selectedClient
      ? selectedClient.name
      : clientInputValue || "Consumidor Final";
    const finalTaxId = selectedClient ? selectedClient.tax_id : null;

    const payload = {
      type: saleType,
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      installments: paymentMethod === "CREDITO" ? installments : 1,
      interest_amount: interestAmount,
      customer_name: finalCustomerName,
      customer_tax_id: finalTaxId,
      items: cart.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      check_details:
        paymentMethod === "CHEQUE"
          ? {
              bank_name: checkBank,
              number: checkNumber,
              payment_date: checkDate,
              amount: total, // Asumimos que el cheque cubre el total exacto
            }
          : undefined,
    };

    try {
      const res = await api.post("/sales", payload);
      setLastSaleData({
        ...res.data,
        type: saleType,
        customer_name: finalCustomerName,
        customer_tax_id: finalTaxId,
        installments: payload.installments,
        interest_amount: payload.interest_amount,
        total: res.data.total || total,
        items: [...cart],
      });

      setCart([]);
      setPaymentModalOpen(false);
      setSuccessModalOpen(true);
      setClientInputValue("");
      setSelectedClient(null);
      setPaymentMethod("EFECTIVO");
      setInstallments(1);
      setInterestPercent(0);
      setCheckBank("");
      setCheckNumber("");
      setCheckDate("");
    } catch (error: any) {
      showNotification(error.response?.data?.message || "Error", "error");
    }
  };

  // --- LÓGICA DE IMPRESIÓN / VISTA PREVIA ---
  const handleOpenPreview = (overrideFormat?: "A4" | "80mm") => {
    if (!lastSaleData) return;
    const printSettings = overrideFormat
      ? { ...settings, printer_format: overrideFormat }
      : settings;

    // 1. Generamos el DOC (Sin guardar)
    const doc = generateSalePDF(
      lastSaleData,
      lastSaleData.items,
      printSettings
    );

    // 2. Obtenemos URL Blob
    const url = getPdfUrl(doc);
    setPdfBlobUrl(url);

    // 3. Abrimos Modal de Preview
    setPrintPreviewOpen(true);
    setSuccessModalOpen(false); // Cerramos el de éxito
  };

  const handlePrintFromIframe = () => {
    // Intentamos forzar la impresión del iframe
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ height: "calc(100vh - 100px)", display: "flex", gap: 2, p: 2 }}>
      {/* IZQUIERDA: PRODUCTOS */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <Paper sx={{ p: 2, display: "flex", gap: 2, alignItems: "center" }}>
          {/* 👇 BOTÓN SALIR / VOLVER */}
          <Tooltip title="Salir al Dashboard">
            <IconButton onClick={() => navigate("/")} sx={{ mr: 1 }}>
              <ArrowBack />
            </IconButton>
          </Tooltip>

          <TextField
            fullWidth
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            autoFocus
          />

          <FormControlLabel
            control={
              <Switch
                checked={saleType === "PRESUPUESTO"}
                onChange={(e) =>
                  setSaleType(e.target.checked ? "PRESUPUESTO" : "VENTA")
                }
              />
            }
            label={saleType === "PRESUPUESTO" ? "PRESUPUESTO" : "VENTA"}
            sx={{
              bgcolor:
                saleType === "PRESUPUESTO" ? "warning.light" : "transparent",
              px: 2,
              borderRadius: 1,
            }}
          />
          <Tooltip title="Recuperar Presupuesto">
            <IconButton
              color="primary"
              onClick={handleOpenBudgets}
              sx={{ border: "1px solid", borderColor: "primary.main" }}
            >
              <Restore />
            </IconButton>
          </Tooltip>
        </Paper>

        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Grid container spacing={2}>
            {filteredProducts.map((p) => {
              // 1. Aquí definimos si se bloquea o no (YA LO TIENES BIEN)
              const isBlocked =
                saleType === "VENTA" &&
                p.stock <= 0 &&
                !settings.allow_negative_stock;

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
                  <Card
                    sx={{
                      // 👇 2. USAR isBlocked AQUÍ
                      opacity: isBlocked ? 0.6 : 1,
                      bgcolor: isBlocked ? "#f5f5f5" : "white",
                    }}
                  >
                    <CardActionArea
                      onClick={() => addToCart(p)}
                      // 👇 3. USAR isBlocked AQUÍ (Esto es lo que impide el click)
                      disabled={isBlocked}
                    >
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {p.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Stock: {p.stock}
                        </Typography>
                        <Typography
                          variant="h5"
                          color="primary"
                          fontWeight="bold"
                          mt={1}
                        >
                          ${p.price.toLocaleString()}
                        </Typography>

                        {/* 👇 4. USAR isBlocked AQUÍ TAMBIÉN (Para mostrar u ocultar el cartel) */}
                        {isBlocked && (
                          <Chip label="AGOTADO" color="error" size="small" />
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Box>

      {/* DERECHA: TICKET */}
      <Paper
        sx={{ width: 400, display: "flex", flexDirection: "column", p: 2 }}
        elevation={3}
      >
        {/* ... (Sección Ticket Igual) ... */}
        <Typography
          variant="h5"
          fontWeight="bold"
          mb={2}
          display="flex"
          alignItems="center"
          gap={1}
        >
          {saleType === "VENTA" ? <ShoppingCart /> : <Description />}{" "}
          {saleType === "VENTA" ? "Ticket Venta" : "Presupuesto"}
        </Typography>
        <Divider />
        <List sx={{ flex: 1, overflowY: "auto" }}>
          {cart.map((item) => (
            <ListItem key={item.id} divider sx={{ px: 0 }}>
              <Box width="100%">
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="subtitle2" noWrap sx={{ maxWidth: 200 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="bold">
                    ${(item.price * item.quantity).toLocaleString()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Remove fontSize="small" />
                    </IconButton>
                    <Typography>{item.quantity}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Add fontSize="small" />
                    </IconButton>
                  </Box>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() =>
                      setCart((prev) => prev.filter((i) => i.id !== item.id))
                    }
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>
        <Box mb={2}>
          {interestAmount > 0 && (
            <Box
              display="flex"
              justifyContent="space-between"
              color="error.main"
            >
              <Typography>Recargo</Typography>
              <Typography>+${interestAmount.toLocaleString()}</Typography>
            </Box>
          )}
          <Box display="flex" justifyContent="space-between">
            <Typography variant="h4" fontWeight="bold">
              Total
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="primary">
              ${total.toLocaleString()}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={cart.length === 0}
          onClick={() => setPaymentModalOpen(true)}
          color={saleType === "PRESUPUESTO" ? "warning" : "primary"}
          sx={{ py: 1.5, fontSize: "1.2rem" }}
        >
          {saleType === "PRESUPUESTO" ? "GENERAR PRESUPUESTO" : "COBRAR"}
        </Button>
      </Paper>

      {/* MODAL COBRO */}
      <Dialog
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {saleType === "VENTA" ? "Finalizar Venta" : "Guardar Presupuesto"}
        </DialogTitle>
        <DialogContent dividers>
          <Box textAlign="center" mb={3}>
            <Typography variant="h3" fontWeight="bold" color="primary">
              ${total.toLocaleString()}
            </Typography>
          </Box>

          <Box mb={2} display="flex" alignItems="flex-start" gap={1}>
            <Autocomplete
              freeSolo
              sx={{ flex: 1 }}
              options={clients}
              loading={loadingClients}
              getOptionLabel={(option) =>
                typeof option === "string"
                  ? option
                  : `${option.name} (${option.tax_id || "S/DNI"})`
              }
              onInputChange={(_, value) => setClientInputValue(value)}
              onChange={(_, newValue) => {
                if (typeof newValue !== "string") setSelectedClient(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  placeholder="Consumidor Final"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingClients && <CircularProgress size={20} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Tooltip title="Registrar Cliente">
              <IconButton
                color="secondary"
                onClick={() => setNewClientModalOpen(true)}
                sx={{ mt: 1, border: "1px solid" }}
              >
                <PersonAdd />
              </IconButton>
            </Tooltip>

            {/* 👇 BOTÓN OJO (Visible si hay cliente seleccionado) */}
            {selectedClient && (
              <Tooltip title="Ver Perfil de Cliente">
                <IconButton
                  color="primary"
                  onClick={handleGoToClientProfile}
                  sx={{ mt: 1, border: "1px solid" }}
                >
                  <Visibility />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {selectedClient && (
            <Chip
              label={`Registrado: ${selectedClient.name}`}
              onDelete={() => setSelectedClient(null)}
              color="success"
              sx={{ mb: 2 }}
            />
          )}

          {/* ... (Selectores de pago iguales) ... */}
          {saleType === "VENTA" && (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  value={paymentMethod}
                  label="Método de Pago"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <MenuItem value="EFECTIVO">
                    <AttachMoney sx={{ mr: 1 }} /> Efectivo
                  </MenuItem>
                  <MenuItem value="DEBITO">
                    <CreditCard sx={{ mr: 1 }} /> Débito
                  </MenuItem>
                  <MenuItem value="CREDITO">
                    <CreditCard sx={{ mr: 1 }} /> Crédito (Cuotas)
                  </MenuItem>
                  <MenuItem value="TRANSFERENCIA">
                    <QrCode sx={{ mr: 1 }} /> Transferencia / QR
                  </MenuItem>
                  <MenuItem value="CHEQUE">
                    <ReceiptLong sx={{ mr: 1 }} /> Cheque
                  </MenuItem>
                  <MenuItem
                    value="CUENTA_CORRIENTE"
                    sx={{ color: "warning.main" }}
                  >
                    Cuenta Corriente
                  </MenuItem>
                </Select>
              </FormControl>

              {paymentMethod === "CREDITO" && (
                <Grid container spacing={2} mt={0}>
                  <Grid item xs={6}>
                    <TextField
                      label="Cuotas"
                      type="number"
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="% Recargo"
                      type="number"
                      value={interestPercent}
                      onChange={(e) =>
                        setInterestPercent(Number(e.target.value))
                      }
                      fullWidth
                      InputProps={{ endAdornment: "%" }}
                    />
                  </Grid>
                </Grid>
              )}
              {/* Opción A: TRANSFERENCIA (Solo referencia) */}
              {paymentMethod === "TRANSFERENCIA" && (
                <TextField
                  label="N° Operación / Referencia"
                  fullWidth
                  margin="normal"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              )}

              {/* Opción B: CHEQUE (Datos completos) */}
              {paymentMethod === "CHEQUE" && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <TextField
                      label="Banco"
                      placeholder="Ej: Galicia"
                      fullWidth
                      value={checkBank}
                      onChange={(e) => setCheckBank(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="N° Cheque"
                      fullWidth
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Fecha de Cobro"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={checkDate}
                      onChange={(e) => setCheckDate(e.target.value)}
                      helperText="Fecha en la que se podrá depositar"
                    />
                  </Grid>
                </Grid>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleCheckout}
            variant="contained"
            color="success"
            size="large"
            fullWidth
          >
            CONFIRMAR
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL RECUPERAR PRESUPUESTO */}
      <Dialog
        open={budgetsModalOpen}
        onClose={() => setBudgetsModalOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Recuperar Presupuesto</DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Total</TableCell>
                <TableCell align="right">Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budgetsList.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell>
                    {new Date(b.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{b.customer_name || "Anónimo"}</TableCell>
                  <TableCell>${Number(b.total).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleLoadBudget(b.id)}
                    >
                      CARGAR
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {budgetsList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No hay presupuestos guardados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBudgetsModalOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL ÉXITO VENTA - SELECCIÓN DE ACCIÓN */}
      <Dialog
        open={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <Box p={3} textAlign="center">
          <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" fontWeight="bold">
            ¡Operación Exitosa!
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            #{lastSaleData?.invoice_number}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<Print />}
                onClick={() => handleOpenPreview()}
                sx={{ py: 1.5 }}
              >
                VISTA PREVIA / IMPRIMIR
              </Button>
            </Grid>
            {/* Botones rápidos específicos */}
            <Grid item xs={6}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => handleOpenPreview("80mm")}
              >
                Ticket 80mm
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => handleOpenPreview("A4")}
              >
                Hoja A4
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Button
                color="secondary"
                fullWidth
                onClick={() => setSuccessModalOpen(false)}
              >
                Nueva Venta
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Dialog>

      {/* 👇 NUEVO: MODAL VISTA PREVIA PDF */}
      <Dialog
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Vista Previa
          <Box>
            <Button
              variant="contained"
              startIcon={<Print />}
              onClick={handlePrintFromIframe}
              sx={{ mr: 1 }}
            >
              IMPRIMIR AHORA
            </Button>
            <IconButton onClick={() => setPrintPreviewOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: "500px" }}>
          {pdfBlobUrl && (
            <iframe
              ref={iframeRef}
              src={pdfBlobUrl}
              title="Vista Previa PDF"
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL CLIENTE NUEVO (Igual que antes) */}
      <Dialog
        open={newClientModalOpen}
        onClose={() => setNewClientModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Nuevo Cliente</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre"
            fullWidth
            value={newClientData.name}
            onChange={(e) =>
              setNewClientData({ ...newClientData, name: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="DNI/CUIT"
            fullWidth
            value={newClientData.tax_id}
            onChange={(e) =>
              setNewClientData({ ...newClientData, tax_id: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Teléfono"
            fullWidth
            value={newClientData.phone}
            onChange={(e) =>
              setNewClientData({ ...newClientData, phone: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewClientModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateClient} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
