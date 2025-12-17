import { useState } from "react";
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
  Chip,
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
  ReceiptLong,
  Output,
  LocalShipping,
} from "@mui/icons-material";

const drawerWidth = 260; // Un poco más ancho para que se lean bien los submenús

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Para saber dónde estamos parados

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Estado para controlar qué menús están abiertos
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    finance: true, // Finanzas abierto por defecto (opcional)
    inventory: false,
    sales: false,
  });

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

  // --- DEFINICIÓN DEL MENÚ ---
  const menuStructure = [
    {
      id: "dashboard",
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/",
    },

    // MÓDULO VENTAS
    {
      id: "sales",
      text: "Ventas",
      icon: <ShoppingCartIcon />,
      children: [
        { text: "Nueva Venta", path: "/sales/new" }, // Futuro
        { text: "Historial Ventas", path: "/sales" },
        { text: "Clientes", path: "/sales/clients" },
      ],
    },

    // MÓDULO INVENTARIO
    {
      id: "inventory",
      text: "Inventario & Compras",
      icon: <InventoryIcon />,
      children: [
        { text: "Productos", path: "/inventory" },
        { text: "Historial Compras", path: "/inventory/purchases" },
        { text: "Proveedores", path: "/inventory/providers" },
      ],
    },

    // MÓDULO FINANZAS (EL NUEVO!)
    {
      id: "finance",
      text: "Finanzas",
      icon: <AttachMoney />,
      children: [
        {
          text: "Nueva Orden Pago",
          path: "/finance/payments/new",
          icon: <Output fontSize="small" />,
        },
        {
          text: "Cartera Cheques",
          path: "/finance/checks",
          icon: <AccountBalanceWallet fontSize="small" />,
        },
        // { text: "Cta. Cte. Proveedores", path: "/finance/current-account", icon: <ReceiptLong fontSize="small"/> },
      ],
    },

    // SISTEMA
    {
      id: "system",
      text: "Sistema",
      isHeader: true, // Solo visual, separador
    },
    { id: "users", text: "Usuarios", icon: <PeopleAlt />, path: "/users" },
    { id: "branches", text: "Sucursales", icon: <Store />, path: "/branches" },
    {
      id: "settings",
      text: "Configuración",
      icon: <Settings />,
      path: "/settings",
    },
  ];

  const drawerContent = (
    <div>
      {/* CABECERA DEL DRAWER */}
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
          Sucursal Principal
        </Typography>
      </Toolbar>
      <Divider />

      <List component="nav" sx={{ pt: 1 }}>
        {menuStructure.map((item) => {
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
            const isOpen = openMenus[item.id];
            // Verificamos si alguna ruta hija está activa para resaltar el padre
            const isChildActive = item.children.some(
              (child) => location.pathname === child.path
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
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.path}
                        sx={{ pl: 4 }} // Indentación
                        selected={location.pathname === child.path}
                        onClick={() => {
                          navigate(child.path);
                          if (mobileOpen) setMobileOpen(false); // Cerrar en mobile al clickear
                        }}
                      >
                        {/* Si tiene icono específico lo mostramos, sino nada */}
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
      <CssBaseline />

      {/* NAVBAR SUPERIOR */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: "background.paper", // Fondo blanco moderno
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

          {/* Espacio para el Dolar / Info Empresa */}
          <Box
            sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 2 }}
          >
            <Typography variant="h6" noWrap component="div">
              Panel de Control
            </Typography>

            {/* EJEMPLO FUTURO: CHIP DEL DOLAR */}
            {/* <Chip 
                label="USD $1.200" 
                color="success" 
                variant="outlined" 
                size="small" 
                icon={<AttachMoney />}
             /> 
             */}
          </Box>

          {/* MENÚ USUARIO */}
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
              <MenuItem onClick={() => navigate("/settings")}>
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

      {/* SIDEBAR RESPONSIVE */}
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

      {/* CONTENIDO PRINCIPAL */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          bgcolor: "#f4f6f8", // Fondo gris muy clarito para que resalten las cards
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};
