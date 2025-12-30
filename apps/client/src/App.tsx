import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, Typography } from "@mui/material";

// 👇 1. IMPORTAMOS NUESTRO CONTEXTO PROPIO
import { NotificationProvider } from "./context/NotificationContext";

// --- IMPORTS DE PÁGINAS ---
import { LoginPage } from "./pages/LoginPage";
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// import { DashboardPage } from "./pages/DashboardPage"; // (Idealmente muévelo a su propio archivo, pero si no, deja el const aquí)
import { UsersPage } from "./pages/UsersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { BranchesPage } from "./pages/BranchesPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { SettingsPage } from "./pages/SettingPage";
import { ProductsPage } from "./pages/ProductosPage";
import { ProvidersPage } from "./pages/ProvidersPage";
import { ProviderProfilePage } from "./pages/ProviderProfilePage";
import { ClientsPage } from "./pages/ClientsPage";
import { ChecksPage } from "./pages/CheckPage";
import { AccountDetailsPage } from "./pages/AccountDetailsPage";
import { NewPurchasePage } from "./pages/inventory/NewPurchasPage";
import { PurchasesPage } from "./pages/inventory/PurchasesPage";
import { NewPaymentPage } from "./pages/finance/NewPaymentPage";
import { TenantsPage } from "./pages/admin/TenantsPage";
import { POSPage } from "./pages/sales/POSPage";
import { CashPage } from "./pages/finance/CashPage";
import { ExpensesPage } from "./pages/finance/ExpensesPage";

// Si DashboardPage es muy simple, puedes dejarlo aquí o moverlo.
const DashboardPlaceholder = () => (
  <Typography variant="h4">Bienvenido al Dashboard</Typography>
);

function App() {
  return (
    <BrowserRouter>
      {/* 👇 2. AQUÍ ENVOLVEMOS CON NUESTRO SISTEMA DE NOTIFICACIONES */}
      <NotificationProvider>
        <CssBaseline />

        <Routes>
          {/* RUTA PÚBLICA */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* 🔐 ZONA PRIVADA (PROTEGIDA) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* DASHBOARD */}
              <Route path="/" element={<DashboardPlaceholder />} />
              {/* USUARIOS & PERFIL */}
              <Route path="/users" element={<UsersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              {/* CONFIGURACIÓN & SUCURSALES */}
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* 📦 INVENTARIO */}
              <Route path="/inventory" element={<ProductsPage />} />{" "}
              {/* Ojo: quizás quieras cambiar la URL a /inventory/products para ser consistente */}
              <Route path="/inventory/products" element={<ProductsPage />} />{" "}
              {/* Agregué esta por consistencia */}
              {/* 👥 PROVEEDORES */}
              <Route path="/inventory/providers" element={<ProvidersPage />} />
              <Route
                path="/inventory/providers/:id"
                element={<ProviderProfilePage />}
              />
              <Route path="/sales/clients" element={<ClientsPage />} />
              <Route path="/finance/checks" element={<ChecksPage />} />
              <Route
                path="finance/account/:type/:id"
                element={<AccountDetailsPage />}
              />
              <Route
                path="/inventory/purchases/new"
                element={<NewPurchasePage />}
              />
              <Route path="/inventory/purchases" element={<PurchasesPage />} />
              <Route
                path="/finance/payments/new"
                element={<NewPaymentPage />}
              />
              <Route
                path="/inventory/purchases/:id"
                element={<NewPurchasePage />}
              />
              <Route path="/finance/cash" element={<CashPage />} />
              <Route path="/finance/expenses" element={<ExpensesPage />} />
            </Route>
          </Route>

          {/* 404 - REDIRECCIÓN */}
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route path="/admin/tenants" element={<TenantsPage />} />
          <Route path="/sales/pos" element={<POSPage />} />
        </Routes>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
