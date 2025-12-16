import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  MenuItem, Alert, IconButton, Typography
} from '@mui/material';
import { AutoFixHigh, Save, Delete } from '@mui/icons-material';
import { getNextBusinessDay, getFriendlyDate } from '../../utils/dateUtils';
import { financeService, inventoryService } from '../../services/api'; // Importamos inventoryService
import { useNotification } from '../../context/NotificationContext';

const BANCOS_ARG = ["Banco Galicia", "Banco Nación", "Banco Santander", "Banco BBVA", "Banco Macro", "Otro"];

const INITIAL_CONFIG = {
    totalAmount: 0,
    quantity: 1,
    intervalDays: 30,
    startDate: new Date().toISOString().split('T')[0],
    bank_name: 'Banco Galicia',
    startNumber: '',
    provider_id: '', // 👈 Nuevo campo
};

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const BatchChecksDialog = ({ open, onClose, onSuccess }: Props) => {
    const { showNotification } = useNotification();
    
    const [config, setConfig] = useState(INITIAL_CONFIG);
    const [generatedChecks, setGeneratedChecks] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]); // Lista de proveedores

    // Cargar proveedores al abrir
    useEffect(() => {
        if (open && providers.length === 0) {
            inventoryService.getProviders(1, 100, '').then(res => {
                if(res.data) setProviders(res.data);
            });
        }
    }, [open]);

    const handleReset = () => {
        setConfig(INITIAL_CONFIG);
        setGeneratedChecks([]);
    };

    const handleGenerate = () => {
        if (!config.totalAmount || !config.quantity) return;

        const amountPerCheck = Number((config.totalAmount / config.quantity).toFixed(2));
        const newChecks = [];
        let currentDate = config.startDate;
        let currentNumber = Number(config.startNumber) || 0;

        for (let i = 0; i < config.quantity; i++) {
            // Validar fecha hábil
            const validDate = getNextBusinessDay(currentDate);

            newChecks.push({
                index: i, // ID temporal
                bank_name: config.bank_name,
                number: currentNumber ? (currentNumber + i).toString() : '',
                amount: amountPerCheck,
                issue_date: new Date().toISOString().split('T')[0],
                payment_date: validDate, // 👈 Esto se podrá editar luego
                status: 'PENDING',
                type: 'OWN'
            });

            // Calcular siguiente fecha
            const nextDateObj = new Date(validDate);
            nextDateObj.setDate(nextDateObj.getDate() + Number(config.intervalDays));
            currentDate = nextDateObj.toISOString().split('T')[0];
        }
        setGeneratedChecks(newChecks);
    };

    // ✏️ FUNCIÓN PARA EDITAR UNA FILA ESPECÍFICA
    const handleEditRow = (index: number, field: string, value: string) => {
        const updated = [...generatedChecks];
        updated[index] = { ...updated[index], [field]: value };
        setGeneratedChecks(updated);
    };

    const handleRemoveRow = (index: number) => {
        const updated = generatedChecks.filter((_, i) => i !== index);
        setGeneratedChecks(updated);
    };

    const handleSaveAll = async () => {
        try {
            for (const check of generatedChecks) {
                // Removemos el campo 'index' antes de enviar
                const { index, ...checkData } = check;
                await financeService.createCheck({
                    ...checkData,
                    amount: Number(checkData.amount),
                    provider_id: config.provider_id || null // Asignamos proveedor
                });
            }
            showNotification(`¡${generatedChecks.length} cheques generados!`, 'success');
            handleReset();
            onSuccess();
            onClose();
        } catch (error) {
            showNotification('Error al guardar. Verifica números duplicados.', 'error');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoFixHigh color="primary" /> Generador de Tanda
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    {/* FILA 1: Configuración Numérica */}
                    <Grid item xs={12} md={3}>
                        <TextField label="Monto Total ($)" type="number" fullWidth value={config.totalAmount} onChange={(e) => setConfig({...config, totalAmount: Number(e.target.value)})} />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <TextField label="Cantidad" type="number" fullWidth value={config.quantity} onChange={(e) => setConfig({...config, quantity: Number(e.target.value)})} />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <TextField label="Intervalo (Días)" type="number" fullWidth value={config.intervalDays} onChange={(e) => setConfig({...config, intervalDays: Number(e.target.value)})} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField label="Primer Vencimiento" type="date" fullWidth InputLabelProps={{ shrink: true }} value={config.startDate} onChange={(e) => setConfig({...config, startDate: e.target.value})} />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button variant="contained" fullWidth sx={{ height: '100%' }} onClick={handleGenerate} disabled={!config.totalAmount}>
                            Calcular
                        </Button>
                    </Grid>

                    {/* FILA 2: Configuración de Datos */}
                    <Grid item xs={12} md={4}>
                        <TextField select label="Banco" fullWidth value={config.bank_name} onChange={(e) => setConfig({...config, bank_name: e.target.value})}>
                            {BANCOS_ARG.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Nro. Inicial" fullWidth value={config.startNumber} onChange={(e) => setConfig({...config, startNumber: e.target.value})} />
                    </Grid>
                    
                    {/* SELECTOR DE PROVEEDOR */}
                    <Grid item xs={12} md={4}>
                        <TextField 
                            select label="Asignar a Proveedor" fullWidth 
                            value={config.provider_id} 
                            onChange={(e) => setConfig({...config, provider_id: e.target.value})}
                        >
                            <MenuItem value="">-- Sin asignar --</MenuItem>
                            {providers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                </Grid>

                {/* PREVISUALIZACIÓN EDITABLE */}
                {generatedChecks.length > 0 && (
                    <>
                        <Alert severity="info" sx={{ mb: 1 }}>
                            Revisa las fechas. Puedes <b>editarlas manualmente</b> aquí antes de confirmar.
                        </Alert>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Nro</TableCell>
                                        <TableCell>Fecha Cobro (Editable)</TableCell>
                                        <TableCell>Día</TableCell>
                                        <TableCell>Monto</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {generatedChecks.map((c, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <TextField 
                                                    variant="standard" 
                                                    value={c.number} 
                                                    onChange={(e) => handleEditRow(idx, 'number', e.target.value)}
                                                    InputProps={{ disableUnderline: true }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {/* 📅 INPUT DE FECHA EDITABLE */}
                                                <TextField 
                                                    type="date"
                                                    variant="standard"
                                                    value={c.payment_date}
                                                    onChange={(e) => handleEditRow(idx, 'payment_date', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="textSecondary">
                                                    {getFriendlyDate(c.payment_date)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <TextField 
                                                    type="number"
                                                    variant="standard"
                                                    value={c.amount}
                                                    onChange={(e) => handleEditRow(idx, 'amount', e.target.value)}
                                                    InputProps={{ startAdornment: '$' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small" color="error" onClick={() => handleRemoveRow(idx)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleReset} color="error" disabled={generatedChecks.length === 0}>Limpiar</Button>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSaveAll} variant="contained" color="success" disabled={generatedChecks.length === 0}>
                    Confirmar
                </Button>
            </DialogActions>
        </Dialog>
    );
};