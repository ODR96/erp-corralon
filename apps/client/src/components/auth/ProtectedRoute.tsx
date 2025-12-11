import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
  // 1. Busamos el token en la caja fuerte del navegador
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  // 2. Si no hay token o usuario, te vas al Login
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  // 3. Si todo está bien, dejamos pasar a las rutas hijas (Outlet)
  return <Outlet />;
};
