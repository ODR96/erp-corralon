import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, TextField, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  MenuItem, Autocomplete, InputAdornment, Card, CardContent, Divider
} from '@mui/material';
import { Save, ArrowBack, Delete, AddShoppingCart, Search } from '@mui/icons-material';
import { inventoryService } from '../../services/api'; 
import { useNotification } from '../../context/NotificationContext';

// Mock de Sucursales (Idealmente vendría de un endpoint o del usuario logueado)
// Si ya tienes un contexto de usuario con branch_id, úsalo aquí.
export const NewPurchasePage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Estados de Carga
  const [providers, setProviders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulario Cabecera
  const [header, setHeader] = useState({
    provider: null as any,
    date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    observation: '',
    branch_id: ''
  });

  // Ítems de la Compra
  const [items, setItems] = useState<any[]>([]);
  
  // Producto seleccionado temporalmente (para agregar a la lista)
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [provRes, prodRes] = await Promise.all([
        inventoryService.getProviders(1, 100, ''),
        inventoryService.getProducts(1, 1000, ''),
        inventoryService.getBranches()
      ]);
      setProviders(provRes.data || []);
      setProducts(prodRes.data || []);
      if (branchRes && branchRes.length > 0) {
          // Seleccionamos la primera sucursal que encontremos (normalmente la principal)
          setHeader(prev => ({ ...prev, branch_id: branchRes[0].id }));
      } else {
          showNotification('Advertencia: No se encontraron sucursales activas', 'warning');
      }
    } catch (error) {
      console.error(error);
      showNotification('Error cargando datos', 'error');
    }
  };

  // --- LÓGICA DE ÍTEMS ---

  const handleAddItem = () => {
    if (!selectedProduct) return;

    // Verificar si ya está en la lista
    const exists = items.find(i => i.product_id === selectedProduct.id);
    if (exists) {
      showNotification('El producto ya está en la lista', 'warning');
      return;
    }

    // Agregar nueva fila
    const newItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: 1,
      cost: Number(selectedProduct.cost_price) || 0,
      subtotal: Number(selectedProduct.cost_price) || 0
    };

    setItems([...items, newItem]);
    setSelectedProduct(null); // Limpiar buscador
  };

  const handleUpdateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    const item = newItems[index];
    
    // Actualizar campo
    item[field] = value;
    
    // Recalcular subtotal
    item.subtotal = item.quantity * item.cost;
    
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // --- CÁLCULO TOTAL ---
  const totalAmount = items.reduce((acc, item) => acc + item.subtotal, 0);

  // --- GUARDAR ---
  const handleSubmit = async () => {
    if (!header.provider) {
        showNotification('Selecciona un proveedor', 'error');
        return;
    }
    if (items.length === 0) {
        showNotification('La lista de productos está vacía', 'error');
        return;
    }

    setLoading(true);
    try {
        const payload = {
            provider_id: header.provider.id,
            date: header.date,
            invoice_number: header.invoice_number,
            observation: header.observation,
            branch_id: header.branch_id, // 👈 Importante para el stock
            total: totalAmount,
            items: items.map(i => ({
                product_id: i.product_id,
                quantity: i.quantity,
                cost: i.cost
            }))
        };

        await inventoryService.createPurchase(payload);
        showNotification('Compra registrada con éxito', 'success');
        navigate(-1); // Volver atrás
    } catch (error) {
        console.error(error);
        showNotification('Error al guardar la compra', 'error');
    } finally {
        setLoading(false);
    }
  };

  return (
    <Box p={3}>
      {/* HEADER TÍTULO */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
        <Typography variant="h4" fontWeight="bold">Nueva Compra</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* COLUMNA IZQUIERDA: DATOS FACTURA */}
        <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Datos del Comprobante</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Autocomplete
                            options={providers}
                            getOptionLabel={(option) => option.name}
                            value={header.provider}
                            onChange={(_, newValue) => setHeader({...header, provider: newValue})}
                            renderInput={(params) => <TextField {...params} label="Proveedor" fullWidth />}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField 
                            label="Fecha" 
                            type="date" 
                            fullWidth 
                            InputLabelProps={{ shrink: true }}
                            value={header.date}
                            onChange={(e) => setHeader({...header, date: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField 
                            label="Nro. Factura" 
                            fullWidth 
                            placeholder="0001-12345678"
                            value={header.invoice_number}
                            onChange={(e) => setHeader({...header, invoice_number: e.target.value})}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField 
                            label="Observaciones" 
                            fullWidth multiline rows={2}
                            value={header.observation}
                            onChange={(e) => setHeader({...header, observation: e.target.value})}
                        />
                    </Grid>
                    {/* INFO TOTAL */}
                    <Grid item xs={12}>
                        <Card variant="outlined" sx={{ bgcolor: '#f1f8e9', mt: 1 }}>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="body2" color="textSecondary">TOTAL A PAGAR</Typography>
                                <Typography variant="h4" fontWeight="bold" color="success.main">
                                    ${totalAmount.toLocaleString('es-AR')}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12}>
                        <Button 
                            variant="contained" 
                            size="large" 
                            fullWidth 
                            startIcon={<Save />}
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : 'Confirmar Compra'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
        </Grid>

        {/* COLUMNA DERECHA: ÍTEMS */}
        <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, minHeight: '500px' }}>
                <Typography variant="h6" gutterBottom>Detalle de Productos</Typography>
                
                {/* BUSCADOR PARA AGREGAR */}
                <Box display="flex" gap={2} mb={2} bgcolor="#f5f5f5" p={2} borderRadius={2}>
                    <Autocomplete
                        options={products}
                        getOptionLabel={(option) => `${option.name} (Stock: ${option.stock || 0})`}
                        fullWidth
                        value={selectedProduct}
                        onChange={(_, newValue) => setSelectedProduct(newValue)}
                        renderInput={(params) => (
                            <TextField {...params} label="Buscar Producto para agregar..." placeholder="Escribe nombre o código" />
                        )}
                    />
                    <Button 
                        variant="contained" 
                        color="primary" 
                        disabled={!selectedProduct}
                        onClick={handleAddItem}
                        startIcon={<AddShoppingCart />}
                    >
                        Agregar
                    </Button>
                </Box>

                {/* TABLA DE ÍTEMS */}
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Producto</TableCell>
                                <TableCell width={120}>Cantidad</TableCell>
                                <TableCell width={150}>Costo Unit.</TableCell>
                                <TableCell width={150} align="right">Subtotal</TableCell>
                                <TableCell width={50}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((item, index) => (
                                <TableRow key={item.product_id}>
                                    <TableCell>{item.product_name}</TableCell>
                                    <TableCell>
                                        <TextField 
                                            type="number" 
                                            size="small" 
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField 
                                            type="number" 
                                            size="small" 
                                            value={item.cost}
                                            onChange={(e) => handleUpdateItem(index, 'cost', Number(e.target.value))}
                                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography fontWeight="bold">
                                            ${item.subtotal.toLocaleString('es-AR')}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <IconButton color="error" size="small" onClick={() => handleRemoveItem(index)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                        <AddShoppingCart sx={{ fontSize: 40, mb: 1, display: 'block', mx: 'auto', opacity: 0.5 }} />
                                        Agrega productos usando el buscador de arriba
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};