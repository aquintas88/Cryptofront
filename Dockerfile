# Backend de Cryptofront. Build desde la raíz del repositorio (ver railway.toml).
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .
RUN npx prisma generate && npm run build

# Proceso sin privilegios de root (usuario «node» de la imagen base).
USER node

EXPOSE 3000
# Decisión D-01: migraciones versionadas. Se aplican antes de arrancar; nunca db push en producción.
# Las migraciones usan DATABASE_URL_ADMIN (el rol kira_app no puede crear tablas). La app usa DATABASE_URL.
CMD ["/bin/sh", "-c", "DATABASE_URL=\"${DATABASE_URL_ADMIN:-$DATABASE_URL}\" npx prisma migrate deploy && node dist/index.js"]
