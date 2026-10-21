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
npm run dev:api
npm run dev:web
```

La API escucha en el puerto `3001` por defecto y expone `GET /health`. La PWA usa el puerto local predeterminado de Vite. Ejecuta API y frontend en terminales separadas.

La conexión PostgreSQL se configura mediante la variable de entorno `DATABASE_URL` proporcionada al proceso. No guardes credenciales en el repositorio. El esquema inicial solo contiene el workspace fundacional; aún no se han ejecutado migraciones ni se conecta automáticamente la API a una base.

## Verificación

```sh
npm test
npm run build
```

Los comandos Prisma (`db:generate`, `db:validate`) están en el workspace de la API; ejecutar solo cuando la configuración de base de datos esté preparada y de forma que no se lean ni expongan archivos sensibles.
