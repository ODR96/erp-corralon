import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Tabs, Tab, Button, CircularProgress, Chip, Divider } from '@mui/material';
import { ArrowBack, Business } from '@mui/icons-material';
import { inventoryService } from '../services/api';
import { ProviderAccountsTab } from '../components/inventory/ProviderAccountsTab';
import { useNotification } from '../context/NotificationContext';

export const ProviderProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (id) loadProvider(id);
  }, [id]);

  const loadProvider = async (providerId: string) => {
    try {
      const data = await inventoryService.getProviderById(providerId);
      setProvider(data);
    } catch (error) {
      showNotification('No se pudo cargar el proveedor', 'error');
      navigate('/inventory/providers');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  if (loading) return <Box p={5} textAlign="center"><CircularProgress /></Box>;
  if (!provider) return null;

  return (
    <Box p={3}>
      {/* HEADER */}
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/inventory/providers')} sx={{ mb: 2 }}>
        Volver a la lista
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box display="flex" gap={2} alignItems="center">
                <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 1.5, borderRadius: 2 }}>
                    <Business fontSize="large" />
                </Box>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        {provider.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {provider.tax_condition} • {provider.tax_id || 'Sin CUIT'}
                    </Typography>
                </Box>
            </Box>
            <Box textAlign="right">
                <Chip 
                    label={provider.is_active ? "ACTIVO" : "INACTIVO"} 
                    color={provider.is_active ? "success" : "default"} 
                    variant="outlined" 
                />
                <Typography variant="caption" display="block" mt={1} color="textSecondary">
                    ID: {provider.id}
                </Typography>
            </Box>
        </Box>
      </Paper>

      {/* TABS Y CONTENIDO */}
      <Paper sx={{ minHeight: '400px' }}>
        <Tabs value={tabIndex} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Datos Generales" />
            <Tab label="Cuentas Bancarias" />
            <Tab label="Historial Compras (Próximamente)" disabled />
        </Tabs>

        {/* TAB 0: DATOS GENERALES (Solo lectura por ahora, la edición full está en el modal de la lista) */}
        <Box p={3} role="tabpanel" hidden={tabIndex !== 0}>
            {tabIndex === 0 && (
                <Box>
                    <Typography variant="h6" gutterBottom>Información de Contacto</Typography>
                    <Typography><strong>Email:</strong> {provider.email || '-'}</Typography>
                    <Typography><strong>Teléfono:</strong> {provider.phone || '-'}</Typography>
                    <Typography><strong>Dirección:</strong> {provider.address || '-'}</Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="h6" gutterBottom>Observaciones</Typography>
                    <Typography sx={{ fontStyle: 'italic', bgcolor: '#f9f9f9', p: 2, borderRadius: 1 }}>
                        {provider.observation || 'Sin observaciones registradas.'}
                    </Typography>
                </Box>
            )}
        </Box>

        {/* TAB 1: CUENTAS BANCARIAS */}
        <Box p={3} role="tabpanel" hidden={tabIndex !== 1}>
            {tabIndex === 1 && <ProviderAccountsTab providerId={provider.id} />}
        </Box>
      </Paper>
    </Box>
  );
};