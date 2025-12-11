import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, TextField, Typography, Card, CardContent, Avatar, Link } from '@mui/material';
import { LockReset } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

export const ForgotPasswordPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // SIMULACIÓN DE ENVÍO
    // Aquí en Fase 4 conectaremos con authService.recoverPassword(email)
    setTimeout(() => {
      setIsLoading(false);
      enqueueSnackbar('Si el email existe, recibirás instrucciones para recuperar tu clave.', { 
        variant: 'success', 
        autoHideDuration: 6000 
      });
    }, 1500);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockReset />
        </Avatar>
        <Typography component="h1" variant="h5">Recuperar Contraseña</Typography>
        
        <Card sx={{ mt: 3, width: '100%', boxShadow: 3 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu acceso.
            </Typography>
            
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal" required fullWidth id="email" label="Correo Electrónico"
                name="email" autoComplete="email" autoFocus
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar Enlace'}
              </Button>
              
              <Box textAlign="center">
                <Link component={RouterLink} to="/login" variant="body2">
                  Volver al Login
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};