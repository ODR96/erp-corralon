import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
  MenuItem, InputAdornment, ToggleButton, ToggleButtonGroup // 👈 Nuevos imports
} from '@mui/material';
import { AttachMoney, Description, Tag, AccountBalance, Money } from '@mui/icons-material';
import { financeService } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    entityId: string;
    type: 'client' | 'provider';
}

export const ManualMovementDialog = ({ open, onClose, onSuccess, entityId, type }: Props) => {
    const { showNotification } = useNotification();
    
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        concept: 'PAYMENT',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH', // 👈 Nuevo: Efectivo por defecto
        reference: ''          // 👈 Nuevo: Nro de comprobante/transferencia
    });

    const handleSubmit = async () => {
        if (!formData.amount) return;

        try {
            // Construimos una descripción enriquecida automática
            // Ej: "Transferencia #123456 - Pago parcial"
            const methodLabel = formData.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Efectivo';
            const refText = formData.reference ? `Ref: ${formData.reference}` : '';
            
            // Unimos todo en la descripción para que se vea claro en la tabla
            const finalDescription = `[${methodLabel}] ${refText} - ${formData.description}`;

            const movementType = 'CREDIT'; 

            const payload = {
                amount: Number(formData.amount),
                type: movementType,
                concept: formData.concept,
                description: finalDescription, // Guardamos la info combinada
                date: formData.date,
                client_id: type === 'client' ? entityId : null,
                provider_id: type === 'provider' ? entityId : null,
            };

            await financeService.addMovement(payload);
            
            showNotification('Movimiento registrado', 'success');
            setFormData({ 
                amount: '', description: '', concept: 'PAYMENT', 
                date: new Date().toISOString().split('T')[0],
                paymentMethod: 'CASH', reference: ''
            }); 
            onSuccess();
            onClose();
        } catch (error) {
            showNotification('Error al registrar', 'error');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {type === 'client' ? 'Registrar Cobro' : 'Registrar Pago'}
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Monto"
                            type="number"
                            fullWidth
                            autoFocus
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><AttachMoney /></InputAdornment>,
                            }}
                        />
                    </Grid>

                    {/* SELECCIÓN DE MÉTODO DE PAGO */}
                    {formData.concept === 'PAYMENT' && (
                        <Grid item xs={12}>
                             <ToggleButtonGroup
                                color="primary"
                                value={formData.paymentMethod}
                                exclusive
                                onChange={(_, newMethod) => {
                                    if(newMethod) setFormData({...formData, paymentMethod: newMethod})
                                }}
                                fullWidth
                                size="small"
                            >
                                <ToggleButton value="CASH"><Money sx={{ mr: 1 }}/> Efectivo</ToggleButton>
                                <ToggleButton value="TRANSFER"><AccountBalance sx={{ mr: 1 }}/> Transferencia</ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    )}

                    {/* SI ES TRANSFERENCIA, PEDIMOS EL CÓDIGO */}
                    {formData.concept === 'PAYMENT' && formData.paymentMethod === 'TRANSFER' && (
                        <Grid item xs={12}>
                             <TextField
                                label="Nro. Comprobante / Referencia Bancaria"
                                fullWidth
                                size="small"
                                value={formData.reference}
                                onChange={(e) => setFormData({...formData, reference: e.target.value})}
                                placeholder="Ej: 00982312"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><Tag fontSize="small" /></InputAdornment>,
                                }}
                            />
                        </Grid>
                    )}
                    
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="Tipo de Movimiento"
                            fullWidth
                            value={formData.concept}
                            onChange={(e) => setFormData({...formData, concept: e.target.value})}
                        >
                            <MenuItem value="PAYMENT">{type === 'client' ? 'Cobro Normal' : 'Pago Normal'}</MenuItem>
                            <MenuItem value="ADJUSTMENT">Ajuste / Corrección</MenuItem>
                            <MenuItem value="INITIAL">Saldo Inicial</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Fecha"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Observaciones (Opcional)"
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Description /></InputAdornment>,
                            }}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" color="success" disabled={!formData.amount}>
                    Confirmar
                </Button>
            </DialogActions>
        </Dialog>
    );
};