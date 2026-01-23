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
  useMediaQuery,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
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
  ChevronLeft,
  Search as SearchIcon, // 👈 Importamos la Lupa
  ShoppingCartCheckout,
} from "@mui/icons-material";
import { financeService } from "../../services/api";

const DRAWER_WIDTH = 260;
const MINI_DRAWER_WIDTH = 70;

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [dolarBlue, setDolarBlue] = useState<{
    purchase: number;
    sale: number;
  } | null>(null);

  // Estados
  const [alertCount, setAlertCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Menús colapsables
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    finance: true,
    inventory: false,
    sales: false,
  });

  // 🔥 CORRECCIÓN: Variable maestra para saber si mostrar texto o no
  // En móvil SIEMPRE mostramos texto (cuando el drawer está abierto).
  // En escritorio, depende del toggle.
  const showFullDrawer = isMobile || isSidebarOpen;

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  const hasPermission = (requiredSlug?: string) => {
    if (!user) return false;
    if (!requiredSlug) return true;
    if (user.is_super_admin || user.role?.name === "SUPER_ADMIN") return true;
    const myPermissions = user.role?.permissions || [];
    return myPermissions.some((p: any) => p.slug === requiredSlug);
  };

  useEffect(() => {
    // Fetch a la API gratuita
    fetch("https://dolarapi.com/v1/dolares/blue")
      .then((res) => res.json())
      .then((data) => {
        setDolarBlue({ purchase: data.compra, sale: data.venta });
      })
      .catch((err) => console.error("Error dolar:", err));
  }, []);

  useEffect(() => {
    if (hasPermission("finance.view")) {
      checkAlerts();
    }
    // En pantallas chicas, arrancamos con sidebar "lógico" cerrado para desktop
    if (isMobile) {
      setIsSidebarOpen(false);
    } else {
      // Opcional: Si agrandan la pantalla, restaurar
      setIsSidebarOpen(true);
    }
  }, [isMobile]);

  const checkAlerts = async () => {
    try {
      const res = await financeService.getUpcomingChecks();
      setAlertCount(res.length);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

  const handleMenuUser = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleCloseUser = () => setAnchorEl(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleSubmenuClick = (menuKey: string) => {
    // Si la sidebar está colapsada en DESKTOP y clicamos, la expandimos
    if (!isSidebarOpen && !isMobile) setIsSidebarOpen(true);
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  // --- MENU ---
  const menuStructure = [
    {
      id: "dashboard",
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/",
      permission: null,
    },
    {
      id: "sales",
      text: "Ventas",
      icon: <ShoppingCartIcon />,
      permission: "sales.view",
      children: [
        { text: "Nueva Venta", path: "/sales/pos", permission: "sales.create" },
        { text: "Historial Ventas", path: "/sales", permission: "sales.view" },
        { text: "Clientes", path: "/sales/clients", permission: "sales.view" },
      ],
    },
    {
      id: "inventory",
      text: "Inventario",
      icon: <InventoryIcon />,
      permission: "inventory.view",
      children: [
        { text: "Productos", path: "/inventory", permission: "inventory.view" },
        {
          text: "Historial Compras",
          path: "/inventory/purchases",
          permission: "inventory.view",
        },
        {
          text: "Proveedores",
          path: "/inventory/providers",
          permission: "providers.manage",
        },
      ],
    },
    {
      id: "finance",
      text: "Finanzas",
      icon: <AttachMoney />,
      permission: "finance.view",
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
          text: "Pagos / Ordenes",
          path: "/finance/payments/new",
          icon: <Output fontSize="small" />,
          permission: "finance.manage",
        },
        {
          text: "Cheques",
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
    {
      id: "system",
      text: "Sistema",
      isHeader: true,
      permission: "users.view",
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

  // Contenido del Drawer
  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* HEADER DRAWER */}
      <Toolbar
        sx={{
          bgcolor: "primary.main",
          color: "white",
          minHeight: "64px",
          px: 2,
          display: "flex",
          // 🔥 CORRECCIÓN: Alineación según showFullDrawer
          justifyContent: showFullDrawer ? "space-between" : "center",
          alignItems: "center",
        }}
      >
        {/* 🔥 CORRECCIÓN: Mostrar título si es móvil O si sidebar abierta */}
        {showFullDrawer ? (
          <>
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                lineHeight={1.2}
              >
                MI ERP
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {user?.role?.name || "Usuario"}
              </Typography>
            </Box>
            {!isMobile && (
              <IconButton
                onClick={handleSidebarToggle}
                size="small"
                sx={{ color: "white" }}
              >
                <ChevronLeft />
              </IconButton>
            )}
          </>
        ) : (
          <Typography variant="h6" fontWeight="bold">
            ERP
          </Typography>
        )}
      </Toolbar>
      <Divider />

      <List
        component="nav"
        sx={{ flexGrow: 1, pt: 1, px: showFullDrawer ? 1 : 0.5 }}
      >
        {menuStructure.map((item: any) => {
          if (!hasPermission(item.permission)) return null;

          if (item.isHeader) {
            // 🔥 CORRECCIÓN: Header visible si showFullDrawer
            return showFullDrawer ? (
              <Typography
                key={item.id}
                variant="caption"
                color="text.secondary"
                sx={{
                  px: 2,
                  mt: 2,
                  mb: 1,
                  display: "block",
                  fontWeight: "bold",
                }}
              >
                {item.text.toUpperCase()}
              </Typography>
            ) : (
              <Divider sx={{ my: 1 }} key={item.id} />
            );
          }

          const isActive = !item.children && location.pathname === item.path;

          return (
            <Box key={item.id}>
              <ListItemButton
                onClick={() =>
                  item.children
                    ? handleSubmenuClick(item.id)
                    : navigate(item.path)
                }
                selected={isActive}
                sx={{
                  mb: 0.5,
                  borderRadius: 1,
                  // 🔥 CORRECCIÓN: Alineación
                  justifyContent: showFullDrawer ? "initial" : "center",
                  px: 2.5,
                }}
              >
                <Tooltip
                  title={!showFullDrawer ? item.text : ""}
                  placement="right"
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      // 🔥 CORRECCIÓN: Margen
                      mr: showFullDrawer ? 2 : "auto",
                      justifyContent: "center",
                      color: isActive ? "primary.main" : "inherit",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                </Tooltip>

                {/* 🔥 CORRECCIÓN: Mostrar texto */}
                {showFullDrawer && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isActive ? "bold" : "medium",
                    }}
                  />
                )}

                {/* 🔥 CORRECCIÓN: Mostrar flechas */}
                {showFullDrawer &&
                  item.children &&
                  (openMenus[item.id] ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>

              {/* 🔥 CORRECCIÓN: Submenú visible */}
              {item.children && showFullDrawer && (
                <Collapse in={openMenus[item.id]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children
                      .filter((c: any) => hasPermission(c.permission))
                      .map((child: any) => (
                        <ListItemButton
                          key={child.path}
                          sx={{ pl: 4, borderRadius: 1, mb: 0.5 }}
                          selected={location.pathname === child.path}
                          onClick={() => {
                            navigate(child.path);
                            // Cierra el drawer en móvil al hacer clic
                            if (isMobile) setMobileOpen(false);
                          }}
                        >
                          {child.icon && (
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              {child.icon}
                            </ListItemIcon>
                          )}
                          <ListItemText
                            primary={child.text}
                            primaryTypographyProps={{ fontSize: "0.9rem" }}
                          />
                        </ListItemButton>
                      ))}
                  </List>
                </Collapse>
              )}
            </Box>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* --- APP BAR --- */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: {
            sm: `calc(100% - ${
              isSidebarOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH
            }px)`,
          },
          ml: { sm: `${isSidebarOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px` },
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid #e0e0e0",
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          {/* Botón Mobile (Hamburguesa) */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Botón Desktop (Colapsar) */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleSidebarToggle}
            sx={{ mr: 2, display: { xs: "none", sm: "block" } }}
          >
            {isSidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>

          {/* Título */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" noWrap fontWeight="bold">
              Panel de Control
            </Typography>
          </Box>

          {dolarBlue && (
            <Box
              sx={{
                display: { xs: "none", md: "flex" }, // Oculto en celular muy chico, visible en PC
                alignItems: "center",
                bgcolor: "success.dark",
                color: "white",
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                mr: 2,
                boxShadow: 1,
              }}
            >
              <AttachMoney fontSize="small" />
              <Typography variant="body2" fontWeight="bold">
                Blue: ${dolarBlue.sale}
              </Typography>
            </Box>
          )}

          {/* 🔥 ATAJOS RÁPIDOS (NUEVO) */}
          <Tooltip title="Consultar Precios">
            <IconButton
              color="inherit"
              onClick={() => navigate("/inventory?mode=readonly")}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Nueva Venta (POS)">
            <IconButton
              color="inherit"
              onClick={() => navigate("/sales/pos")}
              sx={{ mr: 1 }}
            >
              <ShoppingCartCheckout />
            </IconButton>
          </Tooltip>

          {/* Avatar Usuario */}
          <IconButton onClick={handleMenuUser} color="inherit">
            {/* Cambié color="primary" a "inherit" para que se vea blanco en la barra azul */}
            <AccountCircle fontSize="large" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseUser}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem onClick={() => navigate("/profile")}>Mi Perfil</MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* --- DRAWER --- */}
      <Box
        component="nav"
        sx={{
          width: { sm: isSidebarOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH },
          flexShrink: { sm: 0 },
        }}
      >
        {/* Drawer Mobile (Temporal) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH, // En móvil siempre ancho completo
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Drawer Desktop (Permanente) */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: isSidebarOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: "hidden",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: {
            sm: `calc(100% - ${
              isSidebarOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH
            }px)`,
          },
          mt: 8,
          bgcolor: "#f4f6f8",
          minHeight: "100vh",
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};
