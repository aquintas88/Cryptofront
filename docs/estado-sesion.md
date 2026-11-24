# Estado del proyecto (traspaso entre sesiones)

Documento para retomar el trabajo en una sesión nueva. Fuente de verdad: el código y los commits de la rama `prepro`.

## Repositorio y entornos
- GitHub: `aquintas88/Cryptofront`, rama `prepro` (PRE). Rama `main` para PRO (sin nada desplegado).
- Railway: proyecto `CryptofrontWeb` (id `214f7037-e352-4b0b-9670-6be8ca17f2f5`), entorno `pre` con servicios `Postgres`, `backend` y `frontend`. Entorno `production` sin cambios.
- Frontend público: https://frontend-pre-21b6c705.up.railway.app/ (web en `/`, términos en `/terminos`, acceso en `/acceso`).
- Despliegue: los servicios se suben con `railway up` desde la carpeta del repo (backend con la raíz del repo; frontend con `frontend/` como raíz, `--path-as-root`). La integración automática con GitHub no está autorizada en Railway.
- **Railway, comandos:** cualquier comando debe llevar el proyecto y el entorno explícitos: `railway up -p 214f7037-e352-4b0b-9670-6be8ca17f2f5 -e pre -s <servicio>`. No confiar en el vínculo de la carpeta: en esta máquina, la carpeta padre estaba vinculada a `Web_KiraLevel` (producción de otro proyecto).
- **Importante:** nginx resuelve `backend.railway.internal` al arrancar. Tras cada despliegue del backend hay que redesplegar también el frontend, o el proxy `/api` y `/health` quedan apuntando a una IP antigua y no responde.
- Migraciones: el arranque del backend las aplica con `DATABASE_URL_ADMIN`. La app usa el rol `kira_app` (sin superusuario ni BYPASSRLS).

## Cuentas de prueba (entorno PRE)
- Contraseña común en la variable `SEED_PASSWORD` del servicio `backend` (no está en el repositorio ni en este documento).
- Inversores: `inversor01@ejemplo.test` a `inversor10@ejemplo.test` (rol INVERSOR).
- Gestor de pruebas: `gestor@ejemplo.test`; y `aquintas@gmail.com` como DIRECTOR_EMPRESA de la empresa de pruebas.
- Superadmin de plataforma: `superadmin@ejemplo.test`.

## Lo implementado
- Modelo de datos y seguridad: tablas de inversiones con RLS en Postgres (`PosicionInversion`, `MovimientoInversion`, `ValorDiarioInversion`, `CondicionesInversion`), claves compuestas y pruebas de aislamiento inversor–inversor y empresa–empresa.
- API: `/api/inversiones` (resumen, serie, movimientos, rentabilidad mensual y acumulada, gestión) y `/api/plataforma/cargas` (solo SUPERADMIN).
- Frontend: web pública con diseño propio; zona de inversores con gráfico interactivo (ejes, cursor, teclado), tabla de rentabilidad, aviso de última carga y próxima prevista; panel de gestión; panel de superadmin con el historial de cargas.
- Datos de prueba: 10 inversores con historiales distintos en los tres productos desde enero de 2026; cargas semanales de prueba.

## Pendiente
- **Acceso con Google** (login con Google): requiere crear el cliente OAuth en Google Cloud (lo hace Antonio) y configurar las variables en Railway.
- **2FA obligatorio para INVERSOR** (regla R05): hoy el 2FA es opcional en el login.
- **Formulario de contacto** de la web: no envía nada. Necesita el correo del sistema (SMTP) configurado en Railway y un endpoint de solicitudes.
- **Ingesta real** desde los sistemas de la empresa: hoy solo hay datos de prueba; falta el proceso de carga (`sincronizacion_inversion`).
- **Textos legales**: las rentabilidades y garantías de la web (27 % anual, «reposición total») deben revisarse con un abogado antes de PRO.
- **CIF y datos legales** de la sociedad: pendientes de confirmar.
- **Informes PDF** para inversores y para la renta: aplazados.
- **Auditoría de seguridad**: el registro `docs/seguridad/2026-11-05.md` está en el repo de InmoKira. En Cryptofront, la CSP se añadió al nginx del frontend; el resto de hallazgos de la base de seguridad figura en el registro de auditorías de InmoKira.

## Decisiones tomadas (provisionales)
- Solo DIRECTOR_EMPRESA ve la gestión completa de la empresa; COORDINADOR y USUARIO no ven inversiones.
- Los inversores no leen las condiciones de inversión en esta fase.
- Rentabilidad mensual: aproximación Dietz simplificada con aportes netos del mes; el mes en curso se marca como parcial.
- Próxima carga prevista: última carga correcta más 7 días (estimada).
- La contraseña de las cuentas de prueba es común y se cambia rotando `SEED_PASSWORD`.

## Comprobaciones
- Verificación en PRE: `/health` con 200 por el dominio público; `/api/inversiones/rentabilidad` y `/api/plataforma/cargas` con las cuentas de prueba.
- Backend: `npx vitest run` (205 pruebas) y `npx tsc --noEmit`.
- Frontend: `npx tsc --noEmit` y `npx vite build`.


## Aviso: cambios manuales y caché del panel
- El acumulado de la empresa se guarda en memoria del backend durante 2 minutos.
- Los cambios hechos desde la aplicación (alta de movimientos, correcciones) vacían esa caché al momento.
- Los cambios hechos directamente en la base de datos (scripts de carga o de datos de prueba, consultas manuales) no la vacían: reiniciar el backend o esperar 2 minutos.


## Estado actual (24/11/2026)

**Desplegado en PRE** (rama `prepro`, último commit `4bf3989`, CI en verde; backend y frontend redesplegados).

**Datos de prueba**
- Empresa «Cryptofront» con 300 inversores (`inversor001…300@ejemplo.test`), histórico desde enero de 2025 y cargas semanales desde el 6/01/2025.
- Cuentas superadmin: `superadmin@ejemplo.test` y la cuenta de Adri (`aquintas@gmail.com`, ahora SUPERADMIN).
- Contraseña común de las cuentas de prueba: variable `SEED_PASSWORD` en Railway (no se escribe aquí).

**Roles**: SUPERADMIN e INVERSOR. Las cuentas con los roles eliminados se han desactivado.

**Zona de superadmin**: panel de inversiones (acumulado o por inversor, con resumen de inversores, rentabilidad mensual y anual y movimientos), cargas, usuarios (filtros, claves temporales, bloqueos, ficha de inversor con altas y correcciones de movimientos) y auditoría (filtros, orden, exportación a Excel).

**Zona de inversores**: solo consulta. Sin informes (eliminados).

**Rendimiento**: el acumulado responde en unos 2 s en frío y menos de 1 s con la caché de 2 minutos. Los cambios manuales desde la aplicación vacían la caché al momento; los cambios directos en la base de datos no (reiniciar el backend o esperar 2 minutos).

**Comercial**: oferta enviada a Adri el 24/11/2026. Pendiente de su aceptación antes de enviar el contrato.

**Pendiente**
- Contrato v6 (prompt en mi mensaje anterior) y revisión jurídica.
- Correo a Adri: pendiente de su respuesta (comisiones, Excel, datos de la sociedad, alojamiento).
- Subida del Excel desde la pantalla: pendiente de construir (botón desactivado).
- Revisión de traducciones por Cryptofront.
- Historia de `prepro`: reescrita con push forzado autorizado (`1bdbe18` y posteriores).
- Pruebas del panel con 300 inversores en pantalla: revisadas por API, no visualmente en todas las vistas.
