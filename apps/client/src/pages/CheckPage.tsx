import { useState, useEffect, useRef } from "react";
import {
  isBusinessDay,
  getNextBusinessDay,
  getFriendlyDate,
} from "../utils/dateUtils";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Tabs,
  Tab,
  MenuItem,
  Autocomplete,
  Tooltip,
  Menu,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  Stack,
} from "@mui/material";
import {
  Add,
  Edit,
  AccountBalance,
  Search,
  Warning,
  AutoFixHigh,
  EventBusy,
  SyncAlt,
  AutoMode,
  CloudUpload,
  CloudDownload,
} from "@mui/icons-material";
import { financeService, inventoryService } from "../services/api";
import { useNotification } from "../context/NotificationContext";
import { BatchChecksDialog } from "../components/finance/BatchChecksDialog";

const BANCOS_ARG = [
  "Banco Galicia",
  "Banco Nación",
  "Banco Provincia",
  "Banco Santander",
  "Banco BBVA",
  "Banco Macro",
  "Banco Credicoop",
  "HSBC",
  "Brubank",
  "Otro",
];

const CHECK_STATUSES = [
  { value: "PENDING", label: "En Cartera / Pendiente", color: "info" },
  { value: "DEPOSITED", label: "Depositado", color: "warning" },
  { value: "PAID", label: "Cobrado / Debitado", color: "success" },
  { value: "USED", label: "Entregado a Proveedor", color: "default" },
  { value: "LENT", label: "Prestado", color: "secondary" },
  { value: "REJECTED", label: "RECHAZADO", color: "error" },
  { value: "VOID", label: "ANULADO (Error/Cancelado)", color: "error" },
];

export const ChecksPage = () => {
  const { showNotification } = useNotification();

  // Datos
  const [checks, setChecks] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [tabValue, setTabValue] = useState("OWN");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hideFinalized, setHideFinalized] = useState(true);

  // Modal Edición Completa
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const dateValidation = isBusinessDay(formData.payment_date);
  const [openGenerator, setOpenGenerator] = useState(false);

  // Menú Rápido de Estado
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);

  // Importación / Exportación
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Carga inicial
  useEffect(() => {
    loadChecks();
    if (providers.length === 0) loadProviders();
  }, [
    page,
    rowsPerPage,
    search,
    tabValue,
    filterProvider,
    filterStatus,
    dateFrom,
    dateTo,
    hideFinalized,
  ]);

  const loadChecks = async () => {
    setLoading(true);
    try {
      const data = await financeService.getChecks(
        page + 1,
        rowsPerPage,
        search,
        tabValue,
        filterStatus,
        filterProvider,
        dateFrom,
        dateTo,
        hideFinalized
      );
      setChecks(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showOverdueOnly = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setDateFrom("2020-01-01");
    setDateTo(yesterday.toISOString().split("T")[0]);
    showNotification(
      "Mostrando cheques vencidos (anteriores a hoy)",
      "warning"
    );
  };

  const clearFilters = () => {
    setSearch("");
    setFilterProvider("");
    setFilterStatus("");
    setDateFrom("");
    setDateTo("");
  };

  const loadProviders = async () => {
    try {
      const res = await inventoryService.getProviders(1, 100, "");
      if (res.data) setProviders(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // --- IMPORTAR / EXPORTAR ---
  const handleExport = async () => {
    try {
      showNotification("Generando reporte...", "info");
      const blob = await financeService.exportChecks();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cheques_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showNotification("Exportación exitosa", "success");
    } catch (e) {
      showNotification("Error al exportar", "error");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImporting(true);
      try {
        showNotification("Subiendo cheques...", "info");
        const res = await financeService.importChecks(e.target.files[0]);
        showNotification(
          `Importados: ${res.created} - Errores: ${res.errors}`,
          res.errors > 0 ? "warning" : "success"
        );
        loadChecks();
      } catch (error) {
        showNotification("Error al importar archivo", "error");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  // --- MANEJO DE ESTADO RÁPIDO ---
  const handleStatusClick = (
    event: React.MouseEvent<HTMLElement>,
    checkId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedCheckId(checkId);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedCheckId) return;
    const oldChecks = [...checks];
    setChecks((prev) =>
      prev.map((c) =>
        c.id === selectedCheckId ? { ...c, status: newStatus } : c
      )
    );
    setAnchorEl(null);
    try {
      await financeService.updateCheck(selectedCheckId, { status: newStatus });
      showNotification("Estado actualizado", "success");
    } catch (error) {
      setChecks(oldChecks);
      showNotification("Error al actualizar estado", "error");
    }
  };

  // --- MODAL ---
  const handleSave = async () => {
    try {
      const { id } = formData;
      const payload = {
        number: formData.number,
        bank_name: formData.bank_name,
        amount: Number(formData.amount),
        issue_date: formData.issue_date,
        payment_date: formData.payment_date,
        type: formData.type,
        status: formData.status,
        drawer_name: formData.drawer_name,
        // Lógica condicional de proveedor/destinatario
        provider_id:
          formData.type === "OWN" && formData.provider_id
            ? formData.provider_id
            : null,
        recipient_name:
          formData.type === "OWN" && !formData.provider_id
            ? formData.recipient_name
            : null,
        // Campos opcionales de texto
        observation: formData.observation,
        description: formData.description,
      };

      if (isEditing) {
        await financeService.updateCheck(id, payload);
        showNotification("Cheque actualizado", "success");
      } else {
        await financeService.createCheck(payload);
        showNotification("Cheque creado", "success");
      }
      setOpen(false);
      loadChecks();
    } catch (error: any) {
      const message = error.response?.data?.message || "Error al guardar";
      const finalMsg = Array.isArray(message) ? message[0] : message;
      showNotification(finalMsg, "error");
    }
  };

  const openModal = (check?: any) => {
    if (check) {
      setIsEditing(true);
      setFormData({
        ...check,
        issue_date: check.issue_date?.split("T")[0] || "",
        payment_date: check.payment_date?.split("T")[0] || "",
        provider_id: check.provider?.id || "",
        recipient_name: check.recipient_name || "",
        drawer_name: check.drawer_name || "",
      });
    } else {
      setIsEditing(false);
      setFormData({
        id: "",
        number: "",
        bank_name: "",
        amount: 0,
        issue_date: new Date().toISOString().split("T")[0],
        payment_date: new Date().toISOString().split("T")[0],
        type: tabValue,
        status: "PENDING",
        drawer_name: "",
        provider_id: "",
        recipient_name: "",
        observation: "",
      });
    }
    setOpen(true);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(val);
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-AR", { timeZone: "UTC" });
  };
  const getStatusInfo = (status: string) =>
    CHECK_STATUSES.find((s) => s.value === status) || {
      label: status,
      color: "default",
    };

  const getRowColor = (check: any) => {
    if (check.status === "PAID") return "inherit";
    if (check.status === "REJECTED" || check.status === "VOID")
      return "#ffebee";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = new Date(check.payment_date);
    paymentDate.setHours(0, 0, 0, 0);
    const expirationDate = new Date(paymentDate);
    expirationDate.setDate(expirationDate.getDate() + 30);

    if (today > expirationDate) return "#e1bee7";
    if (paymentDate < today) return "#fff4e5";

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    if (paymentDate <= nextWeek && paymentDate >= today) return "#fffde7";

    return "inherit";
  };

  const findBetterDate = () => {
    let nextDate = getNextBusinessDay(formData.payment_date);
    let safety = 0;
    while (
      checks.some(
        (c) =>
          c.payment_date.split("T")[0] === nextDate && c.type === formData.type
      ) &&
      safety < 5
    ) {
      nextDate = getNextBusinessDay(nextDate);
      safety++;
    }
    setFormData({ ...formData, payment_date: nextDate });
    showNotification(
      `Fecha ajustada al ${getFriendlyDate(nextDate)}`,
      "success"
    );
  };

  const checksOnSameDay = checks.filter(
    (c) =>
      c.payment_date?.split("T")[0] === formData.payment_date &&
      c.type === formData.type &&
      c.id !== formData.id
  ).length;

  return (
    <Box p={3}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h4" fontWeight="bold" color="primary">
          🏦 Gestión de Cheques
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={handleExport}
            size="small"
          >
            Exportar
          </Button>

          <Button
            variant="outlined"
            startIcon={
              importing ? <CircularProgress size={20} /> : <CloudUpload />
            }
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            size="small"
          >
            {importing ? "Subiendo..." : "Importar"}
          </Button>
          <input
            type="file"
            hidden
            ref={fileInputRef}
            accept=".xlsx, .xls"
            onChange={handleImportFile}
          />
        </Box>
      </Stack>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newVal) => {
            setTabValue(newVal);
            setPage(0);
          }}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Cheques de Terceros (Entradas)" value="THIRD_PARTY" />
          <Tab label="Cheques Propios (Salidas)" value="OWN" />
        </Tabs>
      </Paper>

      {/* BARRA DE FILTROS */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mb={2}>
          <TextField
            size="small"
            placeholder="Buscar nro, banco..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ endAdornment: <Search color="action" /> }}
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
          {tabValue === "OWN" && (
            <TextField
              select
              label="Proveedor"
              size="small"
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {providers.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
            label="Estado"
            size="small"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {CHECK_STATUSES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                <Chip label={s.label} color={s.color as any} size="small" />
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Desde"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Tooltip title="Ver solo este día">
            <IconButton
              size="small"
              onClick={() => setDateTo(dateFrom)}
              disabled={!dateFrom}
            >
              <SyncAlt fontSize="small" />
            </IconButton>
          </Tooltip>
          <TextField
            label="Hasta"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Button
            variant="text"
            color="primary"
            size="small"
            startIcon={<AutoMode />}
            onClick={() => setOpenGenerator(true)}
          >
            Generar Tanda
          </Button>
          <Box flexGrow={1} />
          <FormControlLabel
            control={
              <Switch
                checked={!hideFinalized}
                onChange={(e) => setHideFinalized(!e.target.checked)}
                color="primary"
              />
            }
            label="Ver Historial"
            sx={{ mr: 2, color: "text.secondary" }}
          />
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Warning />}
            onClick={showOverdueOnly}
          >
            Ver Atrasados
          </Button>
          <Button color="inherit" size="small" onClick={clearFilters}>
            Limpiar
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => openModal()}
          >
            {tabValue === "OWN" ? "Emitir" : "Ingresar"}
          </Button>
        </Box>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{
          position: "relative",
          opacity: loading ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {loading && (
          <Box
            sx={{
              position: "absolute",
              top: 20,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}

        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell>BANCO / NRO</TableCell>
              <TableCell>VENCIMIENTO</TableCell>
              <TableCell>
                {tabValue === "THIRD_PARTY" ? "FIRMANTE" : "DESTINATARIO"}
              </TableCell>
              <TableCell>MONTO</TableCell>
              <TableCell>ESTADO (Click para cambiar)</TableCell>
              <TableCell align="right">ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {checks.map((c) => {
              const rowColor = getRowColor(c);
              const statusInfo = getStatusInfo(c.status);
              const isOverdue =
                tabValue === "OWN" &&
                c.status !== "PAID" &&
                new Date(c.payment_date) < new Date();
              const paymentDate = new Date(c.payment_date);
              const legalLimit = new Date(paymentDate);
              legalLimit.setDate(legalLimit.getDate() + 30);
              const today = new Date();
              const isExpiredLegal =
                !["PAID", "REJECTED", "VOID"].includes(c.status) &&
                today > legalLimit;

              return (
                <TableRow key={c.id} sx={{ bgcolor: rowColor }}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {c.bank_name}
                      </Typography>
                      <Typography variant="caption">#{c.number}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {isExpiredLegal && (
                        <Tooltip title="⚠️ CADUCADO: Pasaron más de 30 días">
                          <Warning sx={{ color: "#9c27b0" }} fontSize="small" />
                        </Tooltip>
                      )}
                      {isOverdue && !isExpiredLegal && (
                        <Tooltip title="Vencido / Pendiente de Débito">
                          <Warning color="error" fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={isOverdue ? "error.main" : "inherit"}
                      >
                        {formatDate(c.payment_date)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {tabValue === "THIRD_PARTY" ? (
                      c.drawer_name
                    ) : c.provider ? (
                      <Chip
                        label={c.provider.name}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      c.recipient_name
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">
                      {formatCurrency(Number(c.amount))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusInfo.label}
                      color={statusInfo.color as any}
                      size="small"
                      onClick={(e) => handleStatusClick(e, c.id)}
                      sx={{ cursor: "pointer", fontWeight: "bold" }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => openModal(c)}
                    >
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {checks.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No hay cheques registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value))}
        />
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {tabValue === "THIRD_PARTY" &&
          selectedCheckId &&
          (() => {
            const currentCheck = checks.find((c) => c.id === selectedCheckId);
            if (!currentCheck) return null;
            if (currentCheck.status === "PENDING")
              return [
                <MenuItem
                  key="dep"
                  onClick={() => handleStatusChange("DEPOSITED")}
                >
                  <AccountBalance sx={{ mr: 2, color: "warning.main" }} />{" "}
                  Depositar en Banco
                </MenuItem>,
                <MenuItem key="used" onClick={() => handleStatusChange("USED")}>
                  <SyncAlt sx={{ mr: 2, color: "text.secondary" }} /> Marcar
                  como Entregado
                </MenuItem>,
                <MenuItem
                  key="rej"
                  onClick={() => handleStatusChange("REJECTED")}
                >
                  <Warning sx={{ mr: 2, color: "error.main" }} /> Marcar como
                  Rechazado
                </MenuItem>,
              ];
            if (currentCheck.status === "DEPOSITED")
              return [
                <MenuItem key="paid" onClick={() => handleStatusChange("PAID")}>
                  <AutoFixHigh sx={{ mr: 2, color: "success.main" }} />{" "}
                  Confirmar Acreditación
                </MenuItem>,
                <MenuItem
                  key="rej_bank"
                  onClick={() => handleStatusChange("REJECTED")}
                >
                  <Warning sx={{ mr: 2, color: "error.main" }} /> Rechazado por
                  Banco
                </MenuItem>,
              ];
            if (currentCheck.status === "REJECTED")
              return [
                <MenuItem
                  key="pend"
                  onClick={() => handleStatusChange("PENDING")}
                >
                  <SyncAlt sx={{ mr: 2 }} /> Volver a Cartera
                </MenuItem>,
              ];
            return null;
          })()}

        {tabValue === "OWN" &&
          selectedCheckId &&
          (() => {
            const currentCheck = checks.find((c) => c.id === selectedCheckId);
            if (!currentCheck) return null;
            if (currentCheck.status === "PENDING")
              return [
                <MenuItem
                  key="debit"
                  onClick={() => handleStatusChange("PAID")}
                >
                  <AutoFixHigh sx={{ mr: 2, color: "success.main" }} />{" "}
                  Confirmar Débito
                </MenuItem>,
                <MenuItem key="void" onClick={() => handleStatusChange("VOID")}>
                  <EventBusy sx={{ mr: 2, color: "error.main" }} /> Anular
                  Cheque
                </MenuItem>,
              ];
            return null;
          })()}

        <MenuItem disabled>
          <Typography variant="caption">--- Corrección Manual ---</Typography>
        </MenuItem>
        {CHECK_STATUSES.map((status) => (
          <MenuItem
            key={status.value}
            onClick={() => handleStatusChange(status.value)}
            dense
          >
            <Chip
              label={status.label}
              color={status.color as any}
              size="small"
              variant="outlined"
            />
          </MenuItem>
        ))}
      </Menu>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditing
            ? "Editar Cheque"
            : tabValue === "OWN"
            ? "Emitir Cheque"
            : "Ingresar Cheque"}
        </DialogTitle>
        <DialogContent dividers>
          {checksOnSameDay > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              ⚠️ Atención: Ya tienes{" "}
              <b>
                {checksOnSameDay} cheque{checksOnSameDay > 1 ? "s" : ""}
              </b>{" "}
              agendado{checksOnSameDay > 1 ? "s" : ""} para el{" "}
              {formatDate(formData.payment_date)}.
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={BANCOS_ARG}
                value={formData.bank_name || ""}
                onChange={(_, newValue) =>
                  setFormData({ ...formData, bank_name: newValue || "" })
                }
                renderInput={(params) => (
                  <TextField {...params} label="Banco" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Número"
                fullWidth
                value={formData.number || ""}
                onChange={(e) =>
                  setFormData({ ...formData, number: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="F. Emisión"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.issue_date}
                onChange={(e) =>
                  setFormData({ ...formData, issue_date: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label={`F. Cobro (${getFriendlyDate(formData.payment_date)})`}
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.payment_date}
                onChange={(e) =>
                  setFormData({ ...formData, payment_date: e.target.value })
                }
                error={!dateValidation.valid}
              />
              <Button
                size="small"
                startIcon={<AutoFixHigh />}
                onClick={findBetterDate}
                sx={{ mt: 0.5, textTransform: "none" }}
                disabled={checksOnSameDay === 0 && dateValidation.valid}
              >
                Sugerir mejor fecha
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Monto"
                type="number"
                fullWidth
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: Number(e.target.value) })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Estado Inicial"
                fullWidth
                value={formData.status || "PENDING"}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                {CHECK_STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {formData.type === "THIRD_PARTY" ? (
              <Grid item xs={12}>
                <TextField
                  label="Firmante (Cliente)"
                  fullWidth
                  value={formData.drawer_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, drawer_name: e.target.value })
                  }
                />
              </Grid>
            ) : (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Proveedor (Opcional)"
                    fullWidth
                    value={formData.provider_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        provider_id: e.target.value,
                        recipient_name: "",
                      })
                    }
                  >
                    <MenuItem value="">-- Ninguno / Préstamo --</MenuItem>
                    {providers.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Otro Destinatario"
                    fullWidth
                    value={formData.recipient_name || ""}
                    disabled={!!formData.provider_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recipient_name: e.target.value,
                      })
                    }
                    placeholder="Ej: Préstamo a Tío Jorge"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
      <BatchChecksDialog
        open={openGenerator}
        onClose={() => setOpenGenerator(false)}
        onSuccess={loadChecks}
      />
    </Box>
  );
};
