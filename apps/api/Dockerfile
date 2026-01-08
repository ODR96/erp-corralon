# 1. Usamos una imagen de Node.js ligera
FROM node:20-alpine

# 2. Creamos la carpeta de trabajo
WORKDIR /app

# 3. Instalamos pnpm (porque veo que usas pnpm-workspace)
RUN npm install -g pnpm

# 4. Copiamos los archivos de configuración globales
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 5. Copiamos el package.json de la API
COPY apps/api/package.json ./apps/api/

# 6. Instalamos dependencias
RUN pnpm install --frozen-lockfile

# 7. Copiamos el código fuente de la API
COPY apps/api ./apps/api

# 8. Construimos la API (Build)
RUN pnpm --filter api build

# 9. Exponemos el puerto
EXPOSE 3000

# 10. Comando para iniciar en producción
CMD ["node", "apps/api/dist/main"]