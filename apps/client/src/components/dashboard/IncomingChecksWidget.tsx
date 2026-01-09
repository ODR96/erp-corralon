import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // 👈 Importar
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  Divider,
  CircularProgress,
  Paper,
  Chip,
} from "@mui/material";
import {
  TrendingUp,
  AccountBalance,
  NotificationImportant,
} from "@mui/icons-material";
import { api } from "../../services/api";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const IncomingChecksWidget = () => {
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate(); // 👈 Hook

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await api.get("/finance/checks/dashboard/incoming");
      setChecks(data);
      const sum = data.reduce(
        (acc: number, curr: any) => acc + Number(curr.amount),
        0
      );
      setTotal(sum);
    } catch (error) {
      console.error("Error cargando ingresos", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Card sx={{ width: "100%", mb: 3, bgcolor: "#fff" }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Proyeccion de Ingresos 📈
        </Typography>

        <Paper
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            bgcolor: "#e8f5e9",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
          elevation={0}
        >
          <Box p={2} pb={1}>
            <Box display="flex" alignItems="center" mb={0.5} color="#2e7d32">
              <TrendingUp />
              <Typography variant="subtitle1" fontWeight="bold" ml={1}>
                Por Acreditar
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold" color="#1b5e20">
              $ {total.toLocaleString("es-AR")}
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ overflowY: "auto", height: 250, p: 1 }}>
            <List dense disablePadding>
              {checks.map((check) => {
                const isDeposited = check.status === "DEPOSITED";
                return (
                  <ListItem
                    key={check.id}
                    button // 👈 Habilita efecto botón
                    onClick={() => navigate("/finance/checks")} // 👈 Navegación
                    sx={{
                      px: 1.5,
                      py: 1,
                      bgcolor: "background.paper",
                      mb: 1,
                      borderRadius: 1,
                      boxShadow: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" fontWeight="bold">
                          $ {Number(check.amount).toLocaleString("es-AR")}
                        </Typography>
                      }
                      secondary={
                        <>
                          {/* 👇 Mostramos el N° de Cheque */}
                          <Typography
                            variant="caption"
                            display="block"
                            fontWeight="bold"
                          >
                            #{check.number} -{" "}
                            {check.client?.name || "Cliente Desconocido"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(parseISO(check.payment_date), "EEEE d", {
                              locale: es,
                            })}
                          </Typography>
                        </>
                      }
                    />
                    <Chip
                      label={isDeposited ? "EN BANCO" : "EN MANO"}
                      size="small"
                      icon={
                        isDeposited ? (
                          <AccountBalance fontSize="small" />
                        ) : (
                          <NotificationImportant fontSize="small" />
                        )
                      }
                      color={isDeposited ? "success" : "warning"}
                      variant="outlined"
                      sx={{ height: 24, fontSize: "0.7rem" }}
                    />
                  </ListItem>
                );
              })}
              {checks.length === 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  textAlign="center"
                  py={4}
                >
                  Nada por entrar próximamente 😴
                </Typography>
              )}
            </List>
          </Box>
        </Paper>
      </CardContent>
    </Card>
  );
};
