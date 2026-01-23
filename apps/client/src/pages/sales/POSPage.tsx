import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  useMediaQuery,
  useTheme,
  Drawer,
  Fab,
  Badge, // 👈 Importamos componentes móviles
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
  ShoppingCartCheckout,
  WhatsApp, // Icono para el FAB
} from "@mui/icons-material";
import { useNotification } from "../../context/NotificationContext";
import { api } from "../../services/api";
import { generateSalePDF, getPdfUrl } from "../../utils/salePdfGenerator";

// ... Interfaces ...
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
  details: any[]; // Agregado para tipado
}

export const POSPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  // 👇 Detectamos si es celular
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { showNotification } = useNotification();

  // --- ESTADOS ---
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<"VENTA" | "PRESUPUESTO">("VENTA");
  const [settings, setSettings] = useState<any>({});

  // Cheques
  const [checkBank, setCheckBank] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [checkDate, setCheckDate] = useState("");

  // Móvil
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

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

  // Impresión
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Pagos
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
            })),
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

  // --- LOGICA CARRITO ---
  const addToCart = (product: Product, qty: number = 1) => {
    const allowNegative = settings.allow_negative_stock;
    if (saleType === "VENTA" && product.stock <= 0 && !allowNegative) {
      showNotification("¡Sin stock!", "error");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
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
            : item,
        );
      }
      return [
        ...prev,
        { ...product, quantity: qty, subtotal: qty * product.price },
      ];
    });

    // Feedback visual en móvil (opcional)
    if (isMobile) showNotification("Agregado al carrito", "success");
  };

  const updateQuantity = (id: string, delta: number) => {
    const allowNegative = settings.allow_negative_stock;
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty < 1) return item;
          if (saleType === "VENTA" && newQty > item.stock && !allowNegative) {
            showNotification("Tope stock", "warning");
            return item;
          }
          return { ...item, quantity: newQty, subtotal: newQty * item.price };
        }
        return item;
      }),
    );
  };

  const deleteFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.subtotal, 0),
    [cart],
  );
  const interestAmount = useMemo(
    () =>
      paymentMethod === "CREDITO" && interestPercent > 0
        ? (subtotal * interestPercent) / 100
        : 0,
    [subtotal, paymentMethod, interestPercent],
  );
  const total = subtotal + interestAmount;

  // --- CLIENTE & PRESUPUESTOS ---
  const handleCreateClient = async () => {
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
      window.open(`/sales/clients/${selectedClient.id}`, "_blank");
    }
  };

  // --- CHECKOUT ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "CUENTA_CORRIENTE" && !selectedClient) {
      showNotification(
        "Cuenta Corriente requiere cliente registrado.",
        "error",
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
              amount: total,
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
      setMobileCartOpen(false); // Cerrar drawer en móvil
    } catch (error: any) {
      showNotification(error.response?.data?.message || "Error", "error");
    }
  };

  // --- IMPRESIÓN ---
  const handleOpenPreview = (overrideFormat?: "A4" | "80mm") => {
    if (!lastSaleData) return;
    const printSettings = overrideFormat
      ? { ...settings, printer_format: overrideFormat }
      : settings;

    const doc = generateSalePDF(
      lastSaleData,
      lastSaleData.items,
      printSettings,
    );
    const url = getPdfUrl(doc);
    setPdfBlobUrl(url);
    setPrintPreviewOpen(true);
    setSuccessModalOpen(false);
  };

  const handlePrintFromIframe = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // 🔥 COMPONENTE REUTILIZABLE: TICKET
  // Este bloque lo usamos tanto en el panel derecho de PC como en el Drawer de Móvil
  const TicketContent = () => (
    <Box display="flex" flexDirection="column" height="100%">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          display="flex"
          alignItems="center"
          gap={1}
        >
          {saleType === "VENTA" ? <ShoppingCart /> : <Description />}
          {saleType === "VENTA" ? "Ticket Venta" : "Presupuesto"}
        </Typography>
        {isMobile && (
          <IconButton onClick={() => setMobileCartOpen(false)}>
            <Close />
          </IconButton>
        )}
      </Box>
      <Divider />
      <List sx={{ flex: 1, overflowY: "auto" }}>
        {cart.map((item) => (
          <ListItem key={item.id} divider sx={{ px: 0 }}>
            <Box width="100%">
              <Box display="flex" justifyContent="space-between">
                <Typography variant="subtitle2" noWrap sx={{ maxWidth: 180 }}>
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
                  onClick={() => deleteFromCart(item.id)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </ListItem>
        ))}
        {cart.length === 0 && (
          <Box textAlign="center" py={4} color="text.secondary">
            <ShoppingCartCheckout sx={{ fontSize: 60, opacity: 0.2 }} />
            <Typography>Carrito vacío</Typography>
          </Box>
        )}
      </List>
      <Box mt="auto" pt={2}>
        {interestAmount > 0 && (
          <Box display="flex" justifyContent="space-between" color="error.main">
            <Typography>Recargo</Typography>
            <Typography>+${interestAmount.toLocaleString()}</Typography>
          </Box>
        )}
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="h5" fontWeight="bold">
            Total
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="primary">
            ${total.toLocaleString()}
          </Typography>
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
          {saleType === "PRESUPUESTO" ? "GUARDAR" : "COBRAR"}
        </Button>
      </Box>
    </Box>
  );

  return (
    // 🔥 LAYOUT RESPONSIVE: Columna en móvil, Fila en PC
    <Box
      sx={{
        height: "calc(100vh - 80px)",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 2,
        p: { xs: 1, md: 2 },
      }}
    >
      {/* IZQUIERDA: PRODUCTOS (Ocupa todo en móvil) */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          height: "100%",
        }}
      >
        {/* BARRA SUPERIOR */}
        <Paper sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
          <Tooltip title="Salir">
            <IconButton
              onClick={() => navigate("/")}
              size={isMobile ? "small" : "medium"}
            >
              <ArrowBack />
            </IconButton>
          </Tooltip>

          <TextField
            fullWidth
            size="small"
            placeholder={isMobile ? "Buscar..." : "Buscar producto..."}
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

          {!isMobile && (
            <FormControlLabel
              control={
                <Switch
                  checked={saleType === "PRESUPUESTO"}
                  onChange={(e) =>
                    setSaleType(e.target.checked ? "PRESUPUESTO" : "VENTA")
                  }
                />
              }
              label={saleType === "PRESUPUESTO" ? "PRESUP" : "VENTA"}
            />
          )}
          <Tooltip title="Recuperar Presupuesto">
            <IconButton color="primary" onClick={handleOpenBudgets}>
              <Restore />
            </IconButton>
          </Tooltip>
        </Paper>

        {/* Switch móvil para ahorrar espacio */}
        {isMobile && (
          <Box display="flex" justifyContent="center">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={saleType === "PRESUPUESTO"}
                  onChange={(e) =>
                    setSaleType(e.target.checked ? "PRESUPUESTO" : "VENTA")
                  }
                />
              }
              label={
                <Typography variant="caption" fontWeight="bold">
                  {saleType}
                </Typography>
              }
            />
          </Box>
        )}

        {/* GRILLA DE PRODUCTOS (Scrollable) */}
        <Box sx={{ flex: 1, overflowY: "auto", pb: 10 }}>
          <Grid container spacing={1}>
            {filteredProducts.map((p) => {
              const isBlocked =
                saleType === "VENTA" &&
                p.stock <= 0 &&
                !settings.allow_negative_stock;
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
                  <Card
                    sx={{
                      opacity: isBlocked ? 0.6 : 1,
                      bgcolor: isBlocked ? "#f5f5f5" : "white",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <CardActionArea
                      onClick={() => addToCart(p)}
                      disabled={isBlocked}
                      sx={{ flex: 1, p: 1 }}
                    >
                      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="start"
                        >
                          <Typography
                            variant="subtitle2"
                            fontWeight="bold"
                            lineHeight={1.2}
                          >
                            {p.name}
                          </Typography>
                          <Chip
                            label={p.stock}
                            size="small"
                            color={p.stock < 1 ? "error" : "default"}
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.7rem", ml: 1 }}
                          />
                        </Box>

                        <Typography
                          variant="h6"
                          color="primary"
                          fontWeight="bold"
                          mt={1}
                        >
                          ${p.price.toLocaleString()}
                        </Typography>
                        {isBlocked && (
                          <Typography
                            variant="caption"
                            color="error"
                            fontWeight="bold"
                          >
                            SIN STOCK
                          </Typography>
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

      {/* DERECHA (SOLO PC): TICKET FIJO */}
      {!isMobile && (
        <Paper
          sx={{ width: 400, p: 2, display: "flex", flexDirection: "column" }}
          elevation={3}
        >
          <TicketContent />
        </Paper>
      )}

      {/* DERECHA (SOLO MÓVIL): DRAWER + FAB */}
      {isMobile && (
        <>
          <Fab
            color="primary"
            aria-label="cart"
            onClick={() => setMobileCartOpen(true)}
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              width: 65,
              height: 65,
            }}
          >
            <Badge badgeContent={cart.length} color="error">
              <ShoppingCartCheckout sx={{ fontSize: 28 }} />
            </Badge>
          </Fab>

          <Drawer
            anchor="bottom"
            open={mobileCartOpen}
            onClose={() => setMobileCartOpen(false)}
            PaperProps={{
              sx: {
                height: "85vh",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                p: 2,
              },
            }}
          >
            <TicketContent />
          </Drawer>
        </>
      )}

      {/* --- MODALES --- */}

      {/* MODAL COBRO */}
      <Dialog
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        fullScreen={isMobile} // 🔥 En móvil ocupa toda la pantalla
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {saleType === "VENTA" ? "Finalizar Venta" : "Guardar Presupuesto"}
          {isMobile && (
            <IconButton
              onClick={() => setPaymentModalOpen(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Box textAlign="center" mb={3}>
            <Typography variant="h3" fontWeight="bold" color="primary">
              ${total.toLocaleString()}
            </Typography>
          </Box>

          {/* ... (Selectores de Cliente igual que antes) ... */}
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
            {selectedClient && (
              <Tooltip title="Ver Perfil">
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
              label={`Cliente: ${selectedClient.name}`}
              onDelete={() => setSelectedClient(null)}
              color="success"
              sx={{ mb: 2 }}
            />
          )}

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
                <Grid container spacing={2}>
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

              {paymentMethod === "TRANSFERENCIA" && (
                <TextField
                  label="N° Operación / Referencia"
                  fullWidth
                  margin="normal"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              )}

              {paymentMethod === "CHEQUE" && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <TextField
                      label="Banco"
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
                      label="Fecha Cobro"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={checkDate}
                      onChange={(e) => setCheckDate(e.target.value)}
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
        fullScreen={isMobile}
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

      {/* MODAL ÉXITO */}
      <Dialog
        open={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <Box p={3} textAlign="center">
          <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" fontWeight="bold">
            ¡Venta Registrada!
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            #{lastSaleData?.invoice_number}
          </Typography>

          <Grid container spacing={2}>
            {/* 👇 LÓGICA INTELEGENTE PARA CELULAR */}
            {isMobile && navigator.share ? (
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  color="success"
                  startIcon={<WhatsApp />} // Importa WhatsApp de @mui/icons-material
                  onClick={async () => {
                    // 1. Generar PDF
                    const doc = generateSalePDF(
                      lastSaleData,
                      lastSaleData.items,
                      settings,
                    );
                    const blob = doc.output("blob");
                    const file = new File(
                      [blob],
                      `Ticket_${lastSaleData.invoice_number}.pdf`,
                      { type: "application/pdf" },
                    );

                    // 2. Intentar Compartir Nativamente
                    try {
                      await navigator.share({
                        title: "Comprobante de Venta",
                        text: `Hola ${lastSaleData.customer_name}, aquí tienes tu comprobante.`,
                        files: [file],
                      });
                    } catch (err) {
                      console.log("No se pudo compartir o se canceló");
                    }
                  }}
                  sx={{ py: 1.5 }}
                >
                  ENVIAR A WHATSAPP
                </Button>
              </Grid>
            ) : (
              // Si es PC, mostramos el botón clásico de Imprimir
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
            )}

            {/* Botones secundarios */}
            {!isMobile && (
              <>
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
              </>
            )}

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
      {/* MODAL VISTA PREVIA PDF */}
      <Dialog
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
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
              IMPRIMIR
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

      {/* MODAL CLIENTE NUEVO */}
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
