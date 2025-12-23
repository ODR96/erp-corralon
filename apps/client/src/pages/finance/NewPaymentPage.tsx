import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Divider,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Chip,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  Save,
  Add,
  Delete,
  Search,
  AccountBalanceWallet,
  AttachMoney,
  LocalAtm,
  Payment,
  ArrowBack,
} from "@mui/icons-material";
import { inventoryService, financeService } from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { generatePaymentPDF } from "../../utils/paymentPdfGenerator";
import { settingsService } from "../../services/api";

// Helper para moneda
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    amount
  );

export const NewPaymentPage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const location = useLocation();
  const [transferRef, setTransferRef] = useState("");

  // --- ESTADOS PRINCIPALES ---
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);

  // Datos del Pago
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [providerBalance, setProviderBalance] = useState<number | null>(null);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [observation, setObservation] = useState("");

  // --- FORMAS DE PAGO ---
  const [cashAmount, setCashAmount] = useState<string>(""); // String para evitar el 0 inicial molesto
  const [transferAmount, setTransferAmount] = useState<string>("");

  // Cheques Propios (A emitir)
  const [ownChecks, setOwnChecks] = useState<any[]>([]);

  // Cheques de Terceros (Seleccionados de Cartera)
  const [selectedThirdPartyChecks, setSelectedThirdPartyChecks] = useState<
    any[]
  >([]);

  // --- ESTADOS DEL MODAL (Cartera) ---
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletChecks, setWalletChecks] = useState<any[]>([]); // Lista cruda de la API
  const [walletSearch, setWalletSearch] = useState(""); // Filtro del modal

  // --- CARGA INICIAL ---
  useEffect(() => {
    loadProviders();
    if (location.state && location.state.providerId) {
      setSelectedProvider(location.state.providerId);
    }
  }, []);

  // Al cambiar proveedor, buscamos su saldo
  useEffect(() => {
    if (selectedProvider) {
      loadBalance(selectedProvider);
    } else {
      setProviderBalance(null);
    }
  }, [selectedProvider]);

  const loadProviders = async () => {
    try {
      const res = await inventoryService.getProviders();
      setProviders(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBalance = async (id: string) => {
    try {
      const bal = await financeService.getProviderBalance(id);
      setProviderBalance(Number(bal));
    } catch (e) {
      console.error(e);
    }
  };

  // --- LÓGICA DE CARTERA (Cheques Terceros) ---
  const handleOpenWallet = async () => {
    setLoading(true);
    try {
      // Buscamos cheques PENDING y THIRD_PARTY
      const res = await financeService.getWalletChecks("");
      // Ajuste según si tu API devuelve { data: [] } o []
      const checks = Array.isArray(res) ? res : res.data || [];
      setWalletChecks(checks);
      setWalletModalOpen(true);
    } catch (e) {
      showNotification("Error cargando cartera de cheques", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleThirdPartyCheck = (check: any) => {
    const isSelected = selectedThirdPartyChecks.find((c) => c.id === check.id);
    if (isSelected) {
      setSelectedThirdPartyChecks((prev) =>
        prev.filter((c) => c.id !== check.id)
      );
    } else {
      setSelectedThirdPartyChecks((prev) => [...prev, check]);
    }
  };

  // Filtro en memoria para el modal (Rápido y Furioso)
  const filteredWalletChecks = walletChecks.filter(
    (c) =>
      c.number.toLowerCase().includes(walletSearch.toLowerCase()) ||
      c.bank_name.toLowerCase().includes(walletSearch.toLowerCase()) ||
      c.amount.toString().includes(walletSearch)
  );

  // --- LÓGICA DE CHEQUES PROPIOS ---
  const addOwnCheckRow = () => {
    setOwnChecks([
      ...ownChecks,
      {
        bank_name: "",
        number: "",
        amount: "",
        payment_date: "",
        issue_date: paymentDate,
      },
    ]);
  };

  const updateOwnCheck = (index: number, field: string, value: any) => {
    const updated = [...ownChecks];
    updated[index][field] = value;
    setOwnChecks(updated);
  };

  const removeOwnCheck = (index: number) => {
    setOwnChecks(ownChecks.filter((_, i) => i !== index));
  };

  // --- TOTALES ---
  const totalCash = Number(cashAmount) || 0;
  const totalTransfer = Number(transferAmount) || 0;
  const totalOwnChecks = ownChecks.reduce(
    (sum, c) => sum + (Number(c.amount) || 0),
    0
  );
  const totalThirdParty = selectedThirdPartyChecks.reduce(
    (sum, c) => sum + Number(c.amount),
    0
  );

  const grandTotal =
    totalCash + totalTransfer + totalOwnChecks + totalThirdParty;

  // --- GUARDAR ---
  const handleSubmit = async () => {
    if (!selectedProvider)
      return showNotification("Seleccione un proveedor", "warning");
    if (grandTotal <= 0)
      return showNotification("El monto total debe ser mayor a 0", "warning");

    // Validar cheques propios incompletos
    const invalidOwnCheck = ownChecks.find(
      (c) => !c.bank_name || !c.number || !c.amount || !c.payment_date
    );
    if (invalidOwnCheck)
      return showNotification(
        "Complete todos los datos de los cheques propios",
        "warning"
      );

    setLoading(true);
    try {
      const payload = {
        provider_id: selectedProvider,
        date: paymentDate,
        observation,
        cash_amount: totalCash,
        transfer_amount: totalTransfer,
        transfer_reference: transferRef,
        third_party_check_ids: selectedThirdPartyChecks.map((c) => c.id),
        own_checks: ownChecks.map((c) => ({
          ...c,
          amount: Number(c.amount),
          type: "OWN", // Forzamos
        })),
      };

      await financeService.createPayment(payload);
      const settings = await settingsService.get();
      // Provider data lo tenemos en el array providers.find(...)
      const providerData = providers.find((p) => p.id === selectedProvider);

      // 3. Preparar datos para el PDF (Unimos lo que tenemos en el state)
      const pdfData = {
        date: paymentDate,
        cash_amount: totalCash,
        transfer_amount: totalTransfer,
        transfer_reference: transferRef,
        third_party_checks: selectedThirdPartyChecks,
        own_checks: ownChecks,
      };

      // 4. GENERAR PDF
      generatePaymentPDF(pdfData, providerData, settings);

      showNotification("Pago registrado y PDF generado", "success");
      navigate(-1);
    } catch (error) {
      console.error(error);
      showNotification("Error al registrar el pago", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      {/* HEADER */}
      <Grid container spacing={2} alignItems="center" mb={3}>
        <Grid item>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>
        </Grid>
        <Grid item xs>
          <Typography variant="h5" fontWeight="bold">
            Nueva Orden de Pago
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Registrar salida de dinero a proveedor
          </Typography>
        </Grid>
        <Grid item>
          {/* TOTAL FLOTANTE */}
          <Paper
            sx={{
              p: 2,
              bgcolor: "primary.main",
              color: "white",
              minWidth: 200,
              textAlign: "right",
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              TOTAL A PAGAR
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {formatCurrency(grandTotal)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* COLUMNA IZQUIERDA: DATOS Y EFECTIVO */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              1. Destinatario
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Proveedor"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                >
                  {providers.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {providerBalance !== null && (
                <Grid item xs={12}>
                  <Alert
                    severity={providerBalance > 0 ? "error" : "success"}
                    icon={<AccountBalanceWallet />}
                  >
                    Saldo Actual:{" "}
                    <strong>{formatCurrency(providerBalance)}</strong>
                    {providerBalance > 0 ? " (Debemos)" : " (A favor)"}
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  type="date"
                  fullWidth
                  label="Fecha de Pago"
                  InputLabelProps={{ shrink: true }}
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography
              variant="h6"
              gutterBottom
              display="flex"
              alignItems="center"
              gap={1}
            >
              <LocalAtm color="success" /> 2. Tesorería
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Efectivo"
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Transferencia Bancaria"
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Nro. Comprobante / Ref"
                  sx={{ width: "40%" }}
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  placeholder="Ej: 4500921"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* COLUMNA DERECHA: CHEQUES */}
        <Grid item xs={12} md={8}>
          {/* CHEQUES DE TERCEROS */}
          <Card sx={{ mb: 3, border: "1px solid #e0e0e0" }} elevation={0}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography
                  variant="h6"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <AccountBalanceWallet color="primary" /> 3. Cheques en Cartera
                  (Terceros)
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Search />}
                  onClick={handleOpenWallet}
                >
                  Buscar en Cartera
                </Button>
              </Box>

              {selectedThirdPartyChecks.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ py: 2 }}
                >
                  No se seleccionaron cheques de terceros.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Banco</TableCell>
                      <TableCell>Número</TableCell>
                      <TableCell>Cobro</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell align="center">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedThirdPartyChecks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell>{check.bank_name}</TableCell>
                        <TableCell>{check.number}</TableCell>
                        <TableCell>
                          {new Date(check.payment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>
                          {formatCurrency(Number(check.amount))}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => toggleThirdPartyCheck(check)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {totalThirdParty > 0 && (
                <Box textAlign="right" mt={2}>
                  <Typography variant="subtitle2" color="primary">
                    Subtotal Terceros: {formatCurrency(totalThirdParty)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* CHEQUES PROPIOS */}
          <Card sx={{ border: "1px solid #e0e0e0" }} elevation={0}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography
                  variant="h6"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <Payment color="secondary" /> 4. Emitir Cheques Propios
                </Typography>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<Add />}
                  onClick={addOwnCheckRow}
                >
                  Agregar Cheque
                </Button>
              </Box>

              {ownChecks.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ py: 2 }}
                >
                  No se emitirán cheques propios.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {ownChecks.map((check, index) => (
                    <Paper
                      key={index}
                      variant="outlined"
                      sx={{
                        p: 2,
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <TextField
                        label="Banco"
                        size="small"
                        sx={{ width: 150 }}
                        value={check.bank_name}
                        onChange={(e) =>
                          updateOwnCheck(index, "bank_name", e.target.value)
                        }
                      />
                      <TextField
                        label="Número"
                        size="small"
                        sx={{ width: 120 }}
                        value={check.number}
                        onChange={(e) =>
                          updateOwnCheck(index, "number", e.target.value)
                        }
                      />
                      <TextField
                        label="Fecha Cobro"
                        type="date"
                        size="small"
                        sx={{ width: 150 }}
                        InputLabelProps={{ shrink: true }}
                        value={check.payment_date}
                        onChange={(e) =>
                          updateOwnCheck(index, "payment_date", e.target.value)
                        }
                      />
                      <TextField
                        label="Monto"
                        type="number"
                        size="small"
                        sx={{ flexGrow: 1 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">$</InputAdornment>
                          ),
                        }}
                        value={check.amount}
                        onChange={(e) =>
                          updateOwnCheck(index, "amount", e.target.value)
                        }
                      />
                      <IconButton
                        color="error"
                        onClick={() => removeOwnCheck(index)}
                      >
                        <Delete />
                      </IconButton>
                    </Paper>
                  ))}
                  <Box textAlign="right">
                    <Typography variant="subtitle2" color="secondary">
                      Subtotal Propios: {formatCurrency(totalOwnChecks)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <TextField
              fullWidth
              label="Observaciones / Notas"
              multiline
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            size="large"
            startIcon={<Save />}
            onClick={handleSubmit}
            disabled={loading || grandTotal <= 0}
            sx={{ px: 5, py: 1.5, fontSize: "1.1rem" }}
          >
            {loading
              ? "Procesando..."
              : `Confirmar Pago Total: ${formatCurrency(grandTotal)}`}
          </Button>
        </Grid>
      </Grid>

      {/* --- MODAL DE SELECCIÓN DE CHEQUES (CARTERA) --- */}
      <Dialog
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Seleccionar Cheques de Cartera</DialogTitle>
        <DialogContent dividers>
          {/* FILTRO BUSCADOR */}
          <Box mb={2}>
            <TextField
              fullWidth
              placeholder="Buscar por número, banco o monto..."
              InputProps={{ startIcon: <Search color="action" /> }}
              size="small"
              value={walletSearch}
              onChange={(e) => setWalletSearch(e.target.value)}
            />
          </Box>

          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"></TableCell>
                <TableCell>Banco</TableCell>
                <TableCell>Número</TableCell>
                <TableCell>Fecha Cobro</TableCell>
                <TableCell>Emisor Original</TableCell>
                <TableCell align="right">Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredWalletChecks.length > 0 ? (
                filteredWalletChecks.map((check) => {
                  const isSelected = selectedThirdPartyChecks.some(
                    (c) => c.id === check.id
                  );
                  return (
                    <TableRow
                      key={check.id}
                      hover
                      onClick={() => toggleThirdPartyCheck(check)}
                      selected={isSelected}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell padding="checkbox">
                        <Chip
                          label={isSelected ? "Elegido" : "+"}
                          color={isSelected ? "success" : "default"}
                          size="small"
                          variant={isSelected ? "filled" : "outlined"}
                        />
                      </TableCell>
                      <TableCell>{check.bank_name}</TableCell>
                      <TableCell>{check.number}</TableCell>
                      <TableCell>
                        {new Date(check.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{check.drawer_name || "-"}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        {formatCurrency(Number(check.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    No se encontraron cheques en cartera.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWalletModalOpen(false)}>Listo</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
