import { Box, Typography, Paper, Avatar, Divider, Chip } from "@mui/material";
import { AccountCircle, Store, Badge } from "@mui/icons-material";

export const ProfilePage = () => {
  // Recuperamos el usuario guardado en el login
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  if (!user) return <Typography>Cargando...</Typography>;

  return (
    <Box maxWidth="sm" mx="auto" mt={4}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <Avatar
          sx={{
            width: 80,
            height: 80,
            mx: "auto",
            bgcolor: "primary.main",
            mb: 2,
          }}
        >
          <AccountCircle sx={{ fontSize: 50 }} />
        </Avatar>

        <Typography variant="h4" gutterBottom>
          {user.full_name}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {user.email}
        </Typography>

        <Box display="flex" justifyContent="center" gap={1} my={2}>
          <Chip
            icon={<Badge />}
            label={user.role?.name || "Sin Rol"}
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<Store />}
            label={user.tenant?.name || "Sin Empresa"}
            color="secondary"
            variant="outlined"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box textAlign="left">
          <Typography variant="caption" display="block" color="text.secondary">
            ID DE USUARIO
          </Typography>
          <Typography
            variant="body2"
            gutterBottom
            sx={{ fontFamily: "monospace" }}
          >
            {user.id}
          </Typography>

          <Typography
            variant="caption"
            display="block"
            color="text.secondary"
            mt={2}
          >
            EMPRESA (TENANT)
          </Typography>
          <Typography variant="body2">
            {user.tenant?.name} (ID: {user.tenant?.id})
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
