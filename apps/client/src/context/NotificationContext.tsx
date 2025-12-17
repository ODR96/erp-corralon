import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';
import type { AlertColor } from '@mui/material';

interface NotificationContextType {
  showNotification: (message: string, severity?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Lista de colores permitidos por Material UI
const VALID_SEVERITIES = ['success', 'error', 'warning', 'info'];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('info');

  const showNotification = (msg: string, sev: string = 'info') => {
    // 1. Guardamos el mensaje (si llega un objeto, lo forzamos a string)
    setMessage(String(msg));

    // 2. VALIDACIÓN ESTRICTA:
    // Si 'sev' no es una de las palabras permitidas (ej: porque le pasaste un objeto error),
    // forzamos a que sea 'info' o 'error' según el contexto.
    if (VALID_SEVERITIES.includes(sev)) {
        setSeverity(sev as AlertColor);
    } else {
        // Si mandaron basura, ponemos 'info' por defecto para que no crashee
        console.warn('Se intentó usar una severidad inválida:', sev);
        setSeverity('info');
    }

    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar 
        open={open} 
        autoHideDuration={6000} 
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {/* Aquí severity ya está limpio y seguro */}
        <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }} variant="filled">
          {message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};