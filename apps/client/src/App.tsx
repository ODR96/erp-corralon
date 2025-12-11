import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, Typography } from "@mui/material";
import { SnackbarProvider } from "notistack"; // <--- 1. IMPORTAR

import { LoginPage } from "./pages/LoginPage";
import { MainLayout } from "./components/layout/MainLayout";
import { UsersPage } from "./pages/UsersPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ProfilePage } from './pages/ProfilePage';
import { BranchesPage } from "./pages/BranchesPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { SettingsPage } from "./pages/SettingPage";

const DashboardPage = () => (
  <Typography variant="h4">Bienvenido al Dashboard</Typography>
);

function App() {
  return (
    // 2. ENVOLVER LA APP (Configuramos que duren 3 seg y salgan abajo a la derecha)
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      autoHideDuration={3000}
    >
      <BrowserRouter>
        <CssBaseline />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* 🔐 ZONA PRIVADA */}
          <Route element={<ProtectedRoute />}>
            {" "}
            {/* <--- EL PORTERO */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/profile" element={<ProfilePage />} />{" "}
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* <--- Próximo paso */}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </SnackbarProvider>
  );
}

export default App;
