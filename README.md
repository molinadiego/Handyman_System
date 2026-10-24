# Handy System

Base de la aplicación de gestión para negocios de handyman. Stack: Express, PostgreSQL/Prisma y React/Tailwind como PWA. La arquitectura y el alcance funcional están documentados en `AGENTS.md` y `docs/specs/`.

## Estructura

- `apps/api`: API Express, organizada alrededor de controllers, services, repositories y Prisma.
- `apps/web`: aplicación React responsive y PWA.
- `apps/api/prisma`: esquema inicial de PostgreSQL/Prisma.

## Desarrollo local

Requiere Node.js 20.19 o superior y npm.

```sh
npm install
npm run db:generate --workspace=@handy/api
npm run dev:api
npm run dev:web
```

La API escucha en el puerto `3001` por defecto y expone `GET /health`. La PWA usa el puerto local predeterminado de Vite. Ejecuta API y frontend en terminales separadas.

Usa `.env.example` como plantilla de variables; sus valores son ficticios. La configuración local real debe permanecer sin seguimiento por Git. Para Neon, `DATABASE_URL` es el endpoint pooled para la aplicación y `DATABASE_URL_UNPOOLED` el directo para migraciones Prisma; ambos son secretos y no deben compartirse ni subirse. Las migraciones implementadas de identidad, CRM, presupuestos y órdenes están aplicadas en Neon `dev`; la rama `production` no fue modificada.

Para desarrollo local, copia `.env.example` a `.env` y añade allí la API key de Resend y el remitente configurado. El servidor la carga con `node --env-file`; no compartas ese archivo. Para ejecutar contra la rama Neon `dev`, usa `node_modules/.bin/neon-env run -- npm run dev:api`; las variables Neon inyectadas en el proceso prevalecen sobre placeholders locales.

Para guardar lockboxes, genera una clave local de 32 bytes en Base64 con `node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64"))'` y asígnala a `LOCKBOX_ENCRYPTION_KEY` en `.env`. No la compartas ni la guardes en Git. Sin esa clave, la API no permitirá guardar ni revelar credenciales de acceso.

El proveedor seleccionado es Resend. El adaptador usa `fetch` nativo. Para una prueba personal se puede usar `onboarding@resend.dev`, que solo entrega al email asociado a la cuenta Resend; para otros destinatarios hace falta verificar un dominio. Configura `RESEND_API_KEY` y `RESEND_FROM_EMAIL` localmente; no compartas ni subas la API key. Sin esos valores, el servicio falla de forma cerrada.

## Verificación

```sh
npm test
npm run build
```

Los comandos Prisma (`db:generate`, `db:validate`) están en el workspace de la API; ejecutar solo cuando la configuración de base de datos esté preparada y de forma que no se lean ni expongan archivos sensibles.

Para probar contra la rama Neon activa sin guardar variables en un archivo, usa `node_modules/.bin/neon-env run -- npm run db:e2e --workspace=@handy/api`. La prueba crea y elimina usuarios/workspaces sintéticos en esa rama; no imprime URLs ni tokens.

Para repetir la prueba E2E de Neon `dev`, ejecuta `node_modules/.bin/neon-env run -- npm run crm:e2e --workspace=@handy/api`; comprueba aislamiento CRM, historial y lockbox cifrado con una clave efímera y limpia los registros sintéticos.

El proyecto está enlazado a Neon en `.neon` (archivo local ignorado por Git); `neon.ts` contiene la política versionable. Para comandos que necesiten conexión, usa `node_modules/.bin/neon-env run -- <comando>` y no `neon env pull`, que escribiría credenciales en `.env`.

Los archivos de órdenes usan el bucket privado `work-order-media` de Neon Object Storage; metadatos y objetos ramifican juntos. En desarrollo, ejecuta la API con `neon-env run` para inyectar las credenciales S3 de la rama en memoria, sin guardarlas en `.env`. Si el almacenamiento no está disponible, las cargas fallan de forma cerrada.

Las fotos se comprimen en el dispositivo (JPEG/PNG/HEIC, máximo 5 MB); HEIC se convierte a JPEG. Videos opcionales requieren permiso explícito del dueño y admiten MP4/MOV hasta 50 MB y 60 segundos. El bucket es privado y toda lectura pasa por autorización de workspace/orden.
