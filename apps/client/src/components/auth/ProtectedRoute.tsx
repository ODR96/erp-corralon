import { Navigate, Outlet } from "react-router-dom";

// Definimos que este componente puede recibir un permiso requerido (opcional)
interface Props {
  requiredPermission?: string;
}

export const ProtectedRoute = ({ requiredPermission }: Props) => {
  // 1. Buscamos el token y usuario
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  // 2. Si no hay token o usuario, te vas al Login
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  // 3. Verificamos Permisos (Solo si la ruta pide uno específico)
  if (requiredPermission) {
    const user = JSON.parse(userStr);

    // GOD MODE: Si es Super Admin, pasa siempre
    if (user.is_super_admin || user.role?.name === "SUPER_ADMIN") {
      return <Outlet />;
    }

    // Buscamos si tiene el permiso en su lista
    const myPermissions = user.role?.permissions || [];
    const hasAccess = myPermissions.some(
      (p: any) => p.slug === requiredPermission
    );

    if (!hasAccess) {
      // Si no tiene permiso, lo mandamos al Dashboard (o podrías crear una pág 403)
      return <Navigate to="/" replace />;
    }
  }

  // 4. Si todo está bien, dejamos pasar
  return <Outlet />;
};
