import { useEffect, useState } from "react";
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
  IconButton,
  Tooltip,
  Grid,
  Paper,
} from "@mui/material";
import {
  Warning,
  AccountBalance,
  Event,
  ArrowForward,
  CheckCircle,
} from "@mui/icons-material";
import { api } from "../../services/api";
import { format, isBefore, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const OutgoingChecksWidget = () => {
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await api.get("/finance/checks/dashboard/outgoing");
      setChecks(data);
    } catch (error) {
      console.error("Error cargando cheques", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsDeposited = async (id: string) => {
    try {
      await api.patch(`/finance/checks/${id}`, { status: "DEPOSITED" });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    if (
      !window.confirm("¿Confirmar que ya se descontó el dinero de la cuenta?")
    )
      return;
    try {
      await api.patch(`/finance/checks/${id}`, { status: "PAID" });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- FILTROS Y CÁLCULOS ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const delayedList = checks.filter(
    (c) => c.status === "PENDING" && isBefore(parseISO(c.payment_date), today)
  );
  const depositedList = checks.filter((c) => c.status === "DEPOSITED");
  const futureList = checks.filter(
    (c) => c.status === "PENDING" && !isBefore(parseISO(c.payment_date), today)
  );

  // Calcular Totales
  const sumTotal = (list: any[]) =>
    list.reduce((acc, c) => acc + Number(c.amount), 0);
  const delayedTotal = sumTotal(delayedList);
  const depositedTotal = sumTotal(depositedList);
  const futureTotal = sumTotal(futureList);

  // Subcomponente de Columna para no repetir código
  const ColumnSection = ({
    title,
    total,
    color,
    icon,
    list,
    btnAction,
    btnIcon,
    btnTitle,
  }: any) => (
    <Paper
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: color,
        border: "1px solid rgba(0,0,0,0.05)",
      }}
      elevation={0}
    >
      {/* Header Fijo */}
      <Box p={2} pb={1}>
        <Box display="flex" alignItems="center" mb={0.5} color="text.primary">
          {icon}
          <Typography variant="subtitle1" fontWeight="bold" ml={1}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight="bold" color="text.primary">
          $ {total.toLocaleString("es-AR")}
        </Typography>
      </Box>

      <Divider />

      {/* Lista con Scroll */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", height: 300, p: 1 }}>
        <List dense disablePadding>
          {list.map((c: any) => (
            <ListItem
              key={c.id}
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
                    $ {Number(c.amount).toLocaleString("es-AR")}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography
                      variant="caption"
                      display="block"
                      noWrap
                      title={c.provider?.name || c.recipient_name}
                    >
                      {c.provider?.name || c.recipient_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(parseISO(c.payment_date), "dd/MM", {
                        locale: es,
                      })}
                    </Typography>
                  </>
                }
              />
              {btnAction && (
                <Tooltip title={btnTitle}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => btnAction(c.id)}
                  >
                    {btnIcon}
                  </IconButton>
                </Tooltip>
              )}
            </ListItem>
          ))}
          {list.length === 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              textAlign="center"
              py={4}
            >
              Sin cheques
            </Typography>
          )}
        </List>
      </Box>
    </Paper>
  );

  if (loading) return <CircularProgress />;

  return (
    <Card sx={{ width: "100%", mb: 3, bgcolor: "#fff" }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Gestion de Cheques Emitidos 📉
        </Typography>

        <Grid container spacing={2}>
          {/* 1. ATRASADOS */}
          <Grid item xs={12} md={4}>
            <ColumnSection
              title="Atrasados"
              total={delayedTotal}
              color="#ffebee" // Rojo suave
              icon={<Warning color="error" />}
              list={delayedList}
              btnAction={handleMarkAsDeposited}
              btnIcon={<ArrowForward />}
              btnTitle="Mover a 'En Banco'"
            />
          </Grid>

          {/* 2. EN BANCO */}
          <Grid item xs={12} md={4}>
            <ColumnSection
              title="En Banco"
              total={depositedTotal}
              color="#e3f2fd" // Azul suave
              icon={<AccountBalance color="primary" />}
              list={depositedList}
              btnAction={handleMarkAsPaid}
              btnIcon={<CheckCircle color="success" />}
              btnTitle="Confirmar Débito"
            />
          </Grid>

          {/* 3. PRÓXIMOS */}
          <Grid item xs={12} md={4}>
            <ColumnSection
              title="Próximos"
              total={futureTotal}
              color="#f5f5f5" // Gris
              icon={<Event color="action" />}
              list={futureList}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
