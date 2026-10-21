# Especificación de arquitectura inicial

**Stack:** Node.js + Express, PostgreSQL + Prisma, React + Tailwind CSS como PWA.

## Backend por capas

El flujo de una petición y su persistencia será:

`Controllers → Services → Repositories → Prisma/PostgreSQL`

- **Controllers:** adaptan HTTP a casos de uso: reciben y validan la forma de la petición, invocan un service y construyen la respuesta HTTP. No contienen reglas de negocio ni acceden directamente a Prisma/base de datos.
- **Services:** implementan y orquestan casos de uso, autorizaciones y reglas de negocio. Usan modelos de dominio y repositories; no manejan detalles HTTP ni acceden directamente a Prisma.
- **Modelos de dominio:** representan conceptos, estados, invariantes y cálculos propios de las entidades. Son independientes de Express y de la persistencia; no llaman a repositories.
- **Repositories:** encapsulan lectura/escritura y consultas a PostgreSQL mediante Prisma. Aplican el alcance `workspace_id` validado y mapean registros de persistencia a modelos de dominio cuando corresponda, sin exponer detalles de persistencia a controllers.

## Reglas de diseño

- Mantener responsabilidades separadas y dependencias unidireccionales; los modelos de dominio pueden ser usados por services y repositories sin depender de infraestructura.
- Las operaciones de escritura financiera y las transiciones importantes deben conservar auditoría e historial.
- La autorización multi-tenant se verifica en servidor; ningún controller/repository debe confiar en un `workspace_id` suministrado sin validación.
- Mantener la estructura suficientemente simple para el MVP; no agregar capas o patrones adicionales sin una necesidad concreta.
- Esta especificación registra la decisión inicial; cambios mayores de arquitectura requieren aprobación del usuario.

## Convenciones iniciales de calidad

- Controllers validan la forma de entrada y delegan las reglas de dominio a services/models.
- Respuestas de error usan un objeto `error` con `code` y `message`; no exponer stack traces ni detalles internos al cliente.
- No registrar secretos, códigos de acceso, lockboxes ni contenido sensible de órdenes. Los errores inesperados se responden de forma genérica.
- Usar el runner integrado `node:test` para pruebas iniciales; agregar herramientas de testing solo con autorización.

## Frontend y PWA

React + Tailwind CSS es una PWA responsive. La experiencia offline prepara órdenes asignadas de forma explícita mientras hay conexión, almacena localmente los datos mínimos autorizados y sincroniza eventos al reconectar. La app móvil nativa queda fuera de V1.
