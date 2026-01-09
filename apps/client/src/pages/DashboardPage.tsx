import React, { useState, useEffect } from "react";
import {
  Grid,
  Typography,
  Box,
  Container,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControlLabel,
  Switch,
  Button,
  DialogActions,
} from "@mui/material";
import { Settings } from "@mui/icons-material"; // Icono de engranaje

// Importamos tus widgets
import { IncomingChecksWidget } from "../components/dashboard/IncomingChecksWidget";
import { OutgoingChecksWidget } from "../components/dashboard/OutgoingCheckWidget";

const DashboardPage = () => {
  // --- ESTADO DE PREFERENCIAS ---
  // Inicializamos leyendo de localStorage o ponemos true por defecto
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem("dashboard_prefs");
    return saved
      ? JSON.parse(saved)
      : { showIncoming: true, showOutgoing: true };
  });

  const [openSettings, setOpenSettings] = useState(false);

  // Guardamos en localStorage cada vez que cambia
  useEffect(() => {
    localStorage.setItem("dashboard_prefs", JSON.stringify(preferences));
  }, [preferences]);

  // Manejador de cambios (Switches)
  const handleToggle = (key: string) => {
    setPreferences((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* HEADER CON BOTÓN DE CONFIGURACIÓN */}
      <Box
        mb={4}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            Tablero de Comando 🚀
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Resumen financiero de tu ferretería
          </Typography>
        </Box>
        <IconButton
          onClick={() => setOpenSettings(true)}
          color="primary"
          size="large"
        >
          <Settings fontSize="large" />
        </IconButton>
      </Box>

      {/* GRILLA DE WIDGETS (Renderizado Condicional) */}
      <Grid container spacing={3}>
        {/* WIDGET INGRESOS (Verde) */}
        {preferences.showIncoming && (
          <Grid item xs={12} md={4}>
            {/* Lo ponemos a un costado o full width, como prefieras. 
                     Como el de Egresos es muy ancho, quizás quede mejor poner Ingresos arriba 
                     o abajo si ocupa todo el ancho. Por ahora lo dejo en 4 columnas. */}
            <IncomingChecksWidget />
          </Grid>
        )}

        {/* WIDGET EGRESOS (Rojo - Horizontal) */}
        {preferences.showOutgoing && (
          <Grid item xs={12}>
            <OutgoingChecksWidget />
          </Grid>
        )}
      </Grid>

      {/* --- MODAL DE CONFIGURACIÓN --- */}
      <Dialog open={openSettings} onClose={() => setOpenSettings(false)}>
        <DialogTitle>Personalizar Tablero</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" pt={1}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Elige qué información quieres ver en tu pantalla de inicio.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.showIncoming}
                  onChange={() => handleToggle("showIncoming")}
                  color="success"
                />
              }
              label="Mostrar Proyección de Ingresos"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.showOutgoing}
                  onChange={() => handleToggle("showOutgoing")}
                  color="error"
                />
              }
              label="Mostrar Gestión de Egresos (Cheques)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettings(false)}>Listo</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DashboardPage;
