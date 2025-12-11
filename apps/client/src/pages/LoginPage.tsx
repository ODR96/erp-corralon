import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom"; // <--- 1. Importar Hook de navegación
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  Avatar,
  Alert,
  Link,
  Grid, // <--- 2. Importar Alert para errores
} from "@mui/material";
import { Visibility, VisibilityOff, LockOutlined } from "@mui/icons-material";
import { authService } from "../services/api"; // <--- 3. Importar nuestro servicio

export const LoginPage = () => {
  const navigate = useNavigate(); // Para redirigir al dashboard

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); // Estado para guardar errores (ej: "Pass incorrecta")

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(""); // Limpiamos errores viejos

    try {
      // A. LLAMADA REAL A LA API
      const data = await authService.login(email, password);

      console.log("Login exitoso:", data);

      // B. GUARDAR TOKEN (La llave del edificio)
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // C. REDIRIGIR AL DASHBOARD
      navigate("/");
    } catch (err: any) {
      console.error("Error login:", err);
      // Si falla, mostramos mensaje amigable
      if (err.response && err.response.status === 401) {
        setError("Credenciales incorrectas. Verifique email y contraseña.");
      } else {
        setError("Error de conexión con el servidor. Intente más tarde.");
      }
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
          <LockOutlined />
        </Avatar>

        <Typography component="h1" variant="h5">
          Ingresar al Sistema
        </Typography>

        <Card sx={{ mt: 3, width: "100%", boxShadow: 3 }}>
          <CardContent>
            <Box
              component="form"
              onSubmit={handleSubmit}
              noValidate
              sx={{ mt: 1 }}
            >
              {/* MOSTRAR ALERTA DE ERROR SI EXISTE */}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Correo Electrónico"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: "bold" }}
              >
                Iniciar Sesión
              </Button>
              <Grid container justifyContent="flex-end">
                <Grid item>
                  <Link
                    component={RouterLink}
                    to="/forgot-password"
                    variant="body2"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 4 }}
        >
          {"Copyright © ERP Corralón/Kiosco 2025."}
        </Typography>
      </Box>
    </Container>
  );
};
