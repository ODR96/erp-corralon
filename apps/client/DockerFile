# ETAPA 1: Construcción (Build)
FROM node:20-alpine as builder
WORKDIR /app
RUN npm install -g pnpm

# Copiamos configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json ./apps/client/

# Instalamos dependencias
RUN pnpm install --frozen-lockfile

# Copiamos el código y construimos
COPY apps/client ./apps/client
# OJO: Aquí pasamos la variable de entorno para que se "imprima" en el código JS
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter client build

# ETAPA 2: Servidor Web (Nginx)
FROM nginx:alpine
# Copiamos los archivos construidos a la carpeta pública de Nginx
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
# Configuración básica de Nginx para React (para que no falle al recargar página)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]