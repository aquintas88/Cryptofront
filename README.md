# Cryptofront

Plataforma de gestión de inversiones en criptoactivos: zona pública, zona de inversores, panel de gestión de la empresa y panel de plataforma.

Estado: ver `docs/estado-sesion.md`.

## Stack (fijo)

- Frontend: React, Vite, TypeScript, Tailwind, Zustand, React Query
- Backend: Node 20, Express, TypeScript, Prisma
- Base de datos: PostgreSQL
- Despliegue: Railway (backend, frontend y Postgres)

## Estructura

```
backend/            API Express + Prisma
frontend/           SPA React + Vite
scripts/db/         Creación del rol de la aplicación (sin privilegios)
docs/               Estado del proyecto y documentación
```

## Desarrollo local

Requisitos: Node 20, PostgreSQL 16 o 17.

1. Crear la base de datos y el rol de la aplicación (una vez):
   ```bash
   createdb cryptofront_dev
   psql "postgresql://ADMIN@localhost/cryptofront_dev" -v ON_ERROR_STOP=1 \
     -v dbname=cryptofront_dev -v password=CONTRASEÑA_NUEVA \
     -f scripts/db/crear-rol-app.sql
   ```
2. Copiar `.env.example` a `backend/.env` y rellenar los valores (nunca se commitean).
3. Migraciones y pruebas del backend:
   ```bash
   cd backend
   npm ci
   npx prisma migrate deploy   # con DATABASE_URL_ADMIN
   node --env-file=.env node_modules/.bin/vitest run
   ```
4. Frontend: `cd frontend && npm ci && npm run dev`.

## Decisiones de base de datos

- **Migraciones versionadas** (`backend/prisma/migrations`), aplicadas con `prisma migrate deploy`. No se usa `db push` en ningún entorno (D-01).
- **La aplicación conecta con el rol `kira_app`**, que no es superusuario ni tiene `BYPASSRLS` (D-03). Una prueba falla si la conexión es de superusuario.

## Entornos

- **PRE** (rama `prepro`) y **PRO** (rama `main`). Nada llega a PRO sin visto bueno explícito de Antonio.
- Los entornos de Railway se crean con el primer proyecto a construir, no antes. El constructor no despliega nada por sí mismo.
- Variables de cada entorno en Railway, nunca en el repositorio.

## Pruebas

- Pruebas de integración obligatorias para cada módulo nuevo.
- Antes de cada push: tipos y tests en verde. La CI lo comprueba en cada PR y push.
