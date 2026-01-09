import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, Typography } from "@mui/material";

import { NotificationProvider } from "./context/NotificationContext";

// --- IMPORTS DE PÁGINAS ---
import { LoginPage } from "./pages/LoginPage";
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

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
import DashboardPage from "./pages/DashboardPage";

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <CssBaseline />

        <Routes>
          {/* --- RUTAS PÚBLICAS (Login) --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* --- ZONA PRIVADA (Requiere Login) --- */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* 1. ACCESO GENERAL (Todos los logueados ven esto) */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* 2. VENTAS (Requiere 'sales.view' o 'sales.create') */}
              <Route
                element={<ProtectedRoute requiredPermission="sales.view" />}
              >
                <Route path="/sales/clients" element={<ClientsPage />} />
                {/* POS podría requerir un permiso más fuerte como 'sales.create' */}
                <Route path="/sales/pos" element={<POSPage />} />
              </Route>

              {/* 3. INVENTARIO (Requiere 'inventory.view') */}
              <Route
                element={<ProtectedRoute requiredPermission="inventory.view" />}
              >
                <Route path="/inventory" element={<ProductsPage />} />
                <Route path="/inventory/products" element={<ProductsPage />} />
                <Route
                  path="/inventory/purchases"
                  element={<PurchasesPage />}
                />
                <Route
                  path="/inventory/purchases/:id"
                  element={<NewPurchasePage />}
                />
                {/* Crear compra podría requerir 'inventory.manage' */}
                <Route
                  path="/inventory/purchases/new"
                  element={<NewPurchasePage />}
                />
              </Route>

              {/* 4. PROVEEDORES (Requiere 'providers.manage') */}
              <Route
                element={
                  <ProtectedRoute requiredPermission="providers.manage" />
                }
              >
                <Route
                  path="/inventory/providers"
                  element={<ProvidersPage />}
                />
                <Route
                  path="/inventory/providers/:id"
                  element={<ProviderProfilePage />}
                />
              </Route>

              {/* 5. FINANZAS (Requiere 'finance.view') */}
              <Route
                element={<ProtectedRoute requiredPermission="finance.view" />}
              >
                <Route path="/finance/cash" element={<CashPage />} />
                <Route path="/finance/checks" element={<ChecksPage />} />
                <Route
                  path="/finance/account/:type/:id"
                  element={<AccountDetailsPage />}
                />
              </Route>

              {/* 6. FINANZAS AVANZADAS (Requiere 'finance.manage') */}
              <Route
                element={<ProtectedRoute requiredPermission="finance.manage" />}
              >
                <Route path="/finance/expenses" element={<ExpensesPage />} />
                <Route
                  path="/finance/payments/new"
                  element={<NewPaymentPage />}
                />
              </Route>

              {/* 7. ADMINISTRACIÓN (Requiere 'users.view' o 'settings.view') */}
              <Route
                element={<ProtectedRoute requiredPermission="users.view" />}
              >
                <Route path="/users" element={<UsersPage />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="settings.view" />}
              >
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/branches" element={<BranchesPage />} />
              </Route>

              {/* ADMIN GLOBAL (Multi-Tenant) */}
              <Route
                element={<ProtectedRoute requiredPermission="super_admin" />}
              >
                <Route path="/admin/tenants" element={<TenantsPage />} />
              </Route>
            </Route>
          </Route>

          {/* 404 - Cualquier otra cosa va al login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
