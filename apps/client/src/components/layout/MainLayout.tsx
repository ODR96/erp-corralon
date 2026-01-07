import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Collapse,
  Badge,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  ExitToApp as LogoutIcon,
  AccountCircle,
  Store,
  Settings,
  PeopleAlt,
  AccountBalanceWallet,
  ExpandLess,
  ExpandMore,
  AttachMoney,
  Output,
  RemoveCircle,
} from "@mui/icons-material";
import { financeService } from "../../services/api";

const drawerWidth = 260;

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    finance: true,
    inventory: false,
    sales: false,
  });

  // 👇 LÓGICA DE PERMISOS
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  const hasPermission = (requiredSlug?: string) => {
    if (!user) return false;
    if (!requiredSlug) return true; // Público
    // Si es Super Admin, ve todo (o si tiene rol SUPER_ADMIN)
    if (user.is_super_admin || user.role?.name === "SUPER_ADMIN") return true;

    const myPermissions = user.role?.permissions || [];
    return myPermissions.some((p: any) => p.slug === requiredSlug);
  };
  // -----------------------

  useEffect(() => {
    // Solo chequeamos alertas si tiene permiso de finanzas
    if (hasPermission("finance.view")) {
      checkAlerts();
    }
  }, []);

  const checkAlerts = async () => {
    try {
      const res = await financeService.getUpcomingChecks();
      setAlertCount(res.length);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenuUser = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleCloseUser = () => setAnchorEl(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleSubmenuClick = (menuKey: string) => {
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  // --- DEFINICIÓN DEL MENÚ CON PERMISOS ---
  const menuStructure = [
    {
      id: "dashboard",
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/",
      permission: null, // Público
    },

    // MÓDULO VENTAS
    {
      id: "sales",
      text: "Ventas",
      icon: <ShoppingCartIcon />,
      permission: "sales.view", // 👈 Requiere permiso base
      children: [
        { text: "Nueva Venta", path: "/sales/pos", permission: "sales.create" },
        { text: "Historial Ventas", path: "/sales", permission: "sales.view" },
        { text: "Clientes", path: "/sales/clients", permission: "sales.view" },
      ],
    },

    // MÓDULO INVENTARIO
    {
      id: "inventory",
      text: "Inventario & Compras",
      icon: <InventoryIcon />,
      permission: "inventory.view", // 👈 Requiere permiso base
      children: [
        { text: "Productos", path: "/inventory", permission: "inventory.view" },
        {
          text: "Historial Compras",
          path: "/inventory/purchases",
          permission: "inventory.view",
        }, // O inventory.manage
        {
          text: "Proveedores",
          path: "/inventory/providers",
          permission: "providers.manage",
        },
      ],
    },

    // MÓDULO FINANZAS
    {
      id: "finance",
      text: "Finanzas",
      icon: <AttachMoney />,
      permission: "finance.view", // 👈 Solo Admins/Contadores
      children: [
        {
          text: "Caja / Tesorería",
          path: "/finance/cash",
          icon: <Store fontSize="small" />,
          permission: "finance.view",
        },
        {
          text: "Gastos",
          path: "/finance/expenses",
          icon: <RemoveCircle fontSize="small" />,
          permission: "finance.manage",
        },
        {
          text: "Nueva Orden Pago",
          path: "/finance/payments/new",
          icon: <Output fontSize="small" />,
          permission: "finance.manage",
        },
        {
          text: "Cartera Cheques",
          path: "/finance/checks",
          icon: (
            <Badge badgeContent={alertCount} color="error" variant="dot">
              <AccountBalanceWallet fontSize="small" />
            </Badge>
          ),
          permission: "finance.view",
        },
      ],
    },

    // SISTEMA
    {
      id: "system",
      text: "Sistema",
      isHeader: true,
      permission: "users.view", // Solo si puede ver usuarios o config
    },
    {
      id: "users",
      text: "Usuarios",
      icon: <PeopleAlt />,
      path: "/users",
      permission: "users.view",
    },
    {
      id: "branches",
      text: "Sucursales",
      icon: <Store />,
      path: "/branches",
      permission: "settings.view",
    },
    {
      id: "settings",
      text: "Configuración",
      icon: <Settings />,
      path: "/settings",
      permission: "settings.view",
    },
  ];

  const drawerContent = (
    <div>
      <Toolbar
        sx={{
          backgroundColor: "primary.main",
          color: "white",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          py: 1,
        }}
      >
        <Typography variant="h6" noWrap component="div" fontWeight="bold">
          MI ERP
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {user?.role?.name || "Usuario"} {/* Mostramos el rol */}
        </Typography>
      </Toolbar>
      <Divider />

      <List component="nav" sx={{ pt: 1 }}>
        {menuStructure.map((item: any) => {
          // 1. FILTRO PADRE: Si no tiene permiso para el módulo, no renderizamos nada
          if (!hasPermission(item.permission)) return null;

          // Si es un separador
          if (item.isHeader) {
            return (
              <Typography
                key={item.id}
                variant="caption"
                color="text.secondary"
                sx={{ px: 3, mt: 2, display: "block", fontWeight: "bold" }}
              >
                {item.text.toUpperCase()}
              </Typography>
            );
          }

          // Si tiene hijos (Submenú)
          if (item.children) {
            // 2. FILTRO HIJOS: Filtramos los sub-items que puede ver
            const visibleChildren = item.children.filter((child: any) =>
              hasPermission(child.permission)
            );

            // Si después de filtrar no queda ningún hijo, no mostramos el padre tampoco
            if (visibleChildren.length === 0) return null;

            const isOpen = openMenus[item.id];
            const isChildActive = visibleChildren.some(
              (child: any) => location.pathname === child.path
            );

            return (
              <div key={item.id}>
                <ListItemButton
                  onClick={() => handleSubmenuClick(item.id)}
                  selected={isChildActive}
                  sx={{ mb: 0.5 }}
                >
                  <ListItemIcon
                    sx={{ color: isChildActive ? "primary.main" : "inherit" }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isChildActive ? "bold" : "medium",
                    }}
                  />
                  {isOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>

                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {visibleChildren.map((child: any) => (
                      <ListItemButton
                        key={child.path}
                        sx={{ pl: 4 }}
                        selected={location.pathname === child.path}
                        onClick={() => {
                          navigate(child.path);
                          if (mobileOpen) setMobileOpen(false);
                        }}
                      >
                        {child.icon && (
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            {child.icon}
                          </ListItemIcon>
                        )}
                        <ListItemText primary={child.text} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </div>
            );
          }

          // Si es un item normal
          const isActive = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.id}
              onClick={() => {
                navigate(item.path!);
                if (mobileOpen) setMobileOpen(false);
              }}
              selected={isActive}
              sx={{ mb: 0.5 }}
            >
              <ListItemIcon
                sx={{ color: isActive ? "primary.main" : "inherit" }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: isActive ? "bold" : "medium",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      {/* ... (Resto del return igual que antes) ... */}
      {/* Copia tu return original desde <CssBaseline /> hasta el final del componente MainLayout */}
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 2 }}
          >
            <Typography variant="h6" noWrap component="div">
              Panel de Control
            </Typography>
          </Box>
          <div>
            <IconButton size="large" onClick={handleMenuUser} color="primary">
              <AccountCircle fontSize="large" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseUser}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <MenuItem onClick={() => navigate("/profile")}>
                Mi Perfil
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" color="error" />
                </ListItemIcon>
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          bgcolor: "#f4f6f8",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};
