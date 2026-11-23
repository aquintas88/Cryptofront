# Frontend de Cryptofront: build de Vite y servidor nginx que reenvía /api y /health al backend.
# Se despliega con la carpeta frontend/ como raíz (ver railway.toml del servicio frontend).
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# Backend por la red privada de Railway (sin dominio público). Se puede cambiar por variable.
ENV BACKEND_URL=http://backend.railway.internal:8080
# Railway asigna PORT en runtime; 80 por defecto en local.
ENV PORT=80
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
