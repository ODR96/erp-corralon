import { useState, useEffect, useMemo } from "react";
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
  ListItemText,
  ListItemSecondaryAction,
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
} from "@mui/icons-material";
import { useNotification } from "../../context/NotificationContext";
import { api } from "../../services/api";

// --- TIPOS ---
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

// --- DATOS MOCK (BORRAR LUEGO) ---
const mockProducts: Product[] = [
  {
    id: "1",
    name: "Martillo Galponero",
    price: 15000,
    stock: 10,
    category: "Herramientas",
  },
  {
    id: "2",
    name: 'Clavos Punta Paris 2"',
    price: 4500,
    stock: 50,
    category: "Ferretería",
  },
  {
    id: "3",
    name: "Pintura Latex 20L",
    price: 85000,
    stock: 5,
    category: "Pinturas",
  },
  {
    id: "4",
    name: "Destornillador Phillips",
    price: 3200,
    stock: 0,
    category: "Herramientas",
  }, // Sin stock
  {
    id: "5",
    name: "Cinta Métrica 5m",
    price: 6500,
    stock: 20,
    category: "Medición",
  },
];

export const POSPage = () => {
  const { showNotification } = useNotification();

  // Estados
  const [products, setProducts] = useState<Product[]>([]); // Aquí irán los de la API
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Estado del Pago
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
  const [paymentReference, setPaymentReference] = useState("");

  // Cargar productos (Simulado por ahora)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // 1. Pedimos un límite alto (1000) para tener todo el catálogo en el POS
        const res = await api.get("/inventory/products?limit=1000");
        console.log("🔥 DATA DEL BACKEND:", res.data.data || res.data);

        // 2. DETECTIVE DE ESTRUCTURA 🕵️‍♂️
        // Si el backend devuelve paginación, la lista está en res.data.data
        // Si devuelve array directo (backup), está en res.data
        const productsRaw = Array.isArray(res.data) ? res.data : res.data.data;

        // Validación extra por si acaso
        if (!Array.isArray(productsRaw)) {
          console.error("Formato inesperado de productos:", res.data);
          return;
        }

        // 3. Mapeo seguro
        const mappedProducts = productsRaw.map((p: any) => ({
          id: p.id,
          name: p.name,

          // 1. PRECIO: Priorizamos 'sale_price' que viene en tu JSON
          price: Number(p.sale_price) || Number(p.price) || 0,

          // 2. STOCK: Usamos 'total_stock' que es el que vale 10
          stock: Number(p.total_stock) || 0,

          category: p.category?.name || "General",
        }));

        setProducts(mappedProducts);
      } catch (error) {
        console.error(error);
        showNotification("Error cargando productos", "error");
      }
    };

    fetchProducts();
  }, []);

  // Filtrado de productos (Buscador)
  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // --- LÓGICA DEL CARRITO ---

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showNotification("¡Sin stock disponible!", "error");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        // Si ya existe, validamos que no supere el stock
        if (existing.quantity >= product.stock) {
          showNotification("Stock máximo alcanzado", "warning");
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item
        );
      } else {
        // Nuevo item
        return [...prev, { ...product, quantity: 1, subtotal: product.price }];
      }
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty < 1) return item; // Mínimo 1
          if (newQty > item.stock) {
            showNotification("No hay más stock", "warning");
            return item;
          }
          return { ...item, quantity: newQty, subtotal: newQty * item.price };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const total = useMemo(
    () => cart.reduce((acc, item) => acc + item.subtotal, 0),
    [cart]
  );

  // --- PROCESAR VENTA ---

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // Armamos el DTO para el backend
    const salePayload = {
      type: "VENTA",
      payment_method: paymentMethod,
      payment_reference: paymentReference, // Para MP o Cheques
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    };

    console.log("Enviando al backend:", salePayload);

    try {
      await api.post("/sales", salePayload);
      showNotification(`Venta registrada! Total: $${total}`, "success");
      setCart([]); // Limpiar carrito
      setPaymentModalOpen(false);
      // Aquí podrías recargar productos para actualizar stock visual
    } catch (error) {
      console.error(error);
      showNotification("Error al procesar la venta", "error");
    }
  };

  return (
    <Box sx={{ height: "calc(100vh - 100px)", display: "flex", gap: 2, p: 2 }}>
      {/* SECCIÓN IZQUIERDA: BUSCADOR Y PRODUCTOS */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Buscador */}
        <Paper sx={{ p: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar por nombre, código o escanear..."
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
        </Paper>

        {/* Grilla de Productos */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Grid container spacing={2}>
            {filteredProducts.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Card
                  sx={{
                    opacity: product.stock === 0 ? 0.6 : 1,
                    bgcolor: product.stock === 0 ? "#f5f5f5" : "white",
                  }}
                >
                  <CardActionArea
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                  >
                    <CardContent>
                      <Typography variant="h6" noWrap title={product.name}>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Stock: {product.stock}
                      </Typography>
                      <Typography
                        variant="h5"
                        color="primary"
                        fontWeight="bold"
                        mt={1}
                      >
                        ${product.price.toLocaleString()}
                      </Typography>
                      {product.stock === 0 && (
                        <Chip
                          label="AGOTADO"
                          color="error"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* SECCIÓN DERECHA: TICKET / CARRITO */}
      <Paper
        sx={{
          width: 400,
          display: "flex",
          flexDirection: "column",
          p: 2,
          bgcolor: "#fff",
        }}
        elevation={3}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          mb={2}
          display="flex"
          alignItems="center"
          gap={1}
        >
          <ShoppingCart /> Nueva Venta
        </Typography>

        <Divider />

        {/* Lista de Items */}
        <List sx={{ flex: 1, overflowY: "auto" }}>
          {cart.length === 0 && (
            <Typography
              variant="body1"
              color="text.secondary"
              align="center"
              mt={4}
            >
              El carrito está vacío.
              <br />
              Escanea o selecciona productos.
            </Typography>
          )}
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
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mt={1}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Remove fontSize="small" />
                    </IconButton>
                    <Typography fontWeight="bold">{item.quantity}</Typography>
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
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Totales */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography>Subtotal</Typography>
            <Typography>${total.toLocaleString()}</Typography>
          </Box>
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
          sx={{ py: 1.5, fontSize: "1.2rem" }}
        >
          COBRAR
        </Button>
      </Paper>

      {/* MODAL DE PAGO */}
      <Dialog
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Finalizar Venta</DialogTitle>
        <DialogContent dividers>
          <Box textAlign="center" mb={3}>
            <Typography variant="body2" color="text.secondary">
              Total a Pagar
            </Typography>
            <Typography variant="h3" fontWeight="bold" color="primary">
              ${total.toLocaleString()}
            </Typography>
          </Box>

          <FormControl fullWidth margin="normal">
            <InputLabel>Método de Pago</InputLabel>
            <Select
              value={paymentMethod}
              label="Método de Pago"
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {/* 👇 Estos VALUE deben ser idénticos a los de tu Base de Datos */}
              <MenuItem value="EFECTIVO">
                <AttachMoney sx={{ mr: 1 }} /> Efectivo
              </MenuItem>
              <MenuItem value="TRANSFERENCIA">
                <QrCode sx={{ mr: 1 }} /> Mercado Pago / QR
              </MenuItem>
              <MenuItem value="DEBITO">
                <CreditCard sx={{ mr: 1 }} /> Débito
              </MenuItem>
              <MenuItem value="CREDITO">
                <CreditCard sx={{ mr: 1 }} /> Crédito
              </MenuItem>
              <MenuItem value="CHEQUE">Cheque</MenuItem>
              <MenuItem value="CUENTA_CORRIENTE">Cuenta Corriente</MenuItem>
            </Select>
          </FormControl>

          {(paymentMethod === "TRANSFERENCIA" ||
            paymentMethod === "CHEQUE") && (
            <TextField
              fullWidth
              margin="normal"
              label={
                paymentMethod === "CHEQUE"
                  ? "Número de Cheque"
                  : "Nro Operación / Referencia"
              }
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              helperText="Opcional: Para conciliación"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPaymentModalOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleCheckout}
            variant="contained"
            color="success"
            size="large"
            fullWidth
          >
            CONFIRMAR PAGO
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
