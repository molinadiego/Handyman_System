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

Usa `.env.example` como plantilla de variables; sus valores son ficticios. La configuración local real debe permanecer sin seguimiento por Git. Para Neon, `DATABASE_URL` es el endpoint pooled para la aplicación y `DATABASE_URL_UNPOOLED` el directo para migraciones Prisma; ambos son secretos y no deben compartirse ni subirse. El esquema inicial de identidad/workspaces está migrado en la rama Neon `dev`; la rama `production` no fue modificada.

Para desarrollo local, copia `.env.example` a `.env` y añade allí la API key de Resend y el remitente configurado. El servidor la carga con `node --env-file`; no compartas ese archivo. Para ejecutar contra la rama Neon `dev`, usa `node_modules/.bin/neon-env run -- npm run dev:api`; las variables Neon inyectadas en el proceso prevalecen sobre placeholders locales.

El proveedor seleccionado es Resend. El adaptador usa `fetch` nativo. Para una prueba personal se puede usar `onboarding@resend.dev`, que solo entrega al email asociado a la cuenta Resend; para otros destinatarios hace falta verificar un dominio. Configura `RESEND_API_KEY` y `RESEND_FROM_EMAIL` localmente; no compartas ni subas la API key. Sin esos valores, el servicio falla de forma cerrada.

## Verificación

```sh
npm test
npm run build
```

Los comandos Prisma (`db:generate`, `db:validate`) están en el workspace de la API; ejecutar solo cuando la configuración de base de datos esté preparada y de forma que no se lean ni expongan archivos sensibles.

Para probar contra la rama Neon activa sin guardar variables en un archivo, usa `node_modules/.bin/neon-env run -- npm run db:e2e --workspace=@handy/api`. La prueba crea y elimina usuarios/workspaces sintéticos en esa rama; no imprime URLs ni tokens.

El proyecto está enlazado a Neon en `.neon` (archivo local ignorado por Git); `neon.ts` contiene la política versionable. Para comandos que necesiten conexión, usa `node_modules/.bin/neon-env run -- <comando>` y no `neon env pull`, que escribiría credenciales en `.env`.
