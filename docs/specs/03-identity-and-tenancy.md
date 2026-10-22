# Especificación de identidad y multi-tenant

**Alcance:** identidad, aislamiento y preferencias de cuenta de la Fase 2. Neon Free se usa para desarrollo/pruebas; producción permanece separada.

## Cuenta del dueño

- Registro e inicio de sesión mediante email y contraseña.
- Normalizar email a minúsculas antes de guardarlo; debe ser único globalmente.
- Preferencia de idioma (`en`/`es`) almacenada por usuario y compartida entre sus workspaces. En registro, usar el idioma del navegador como valor inicial, con inglés como fallback.
- Hash de contraseña con Argon2id. Nunca almacenar ni registrar contraseñas en claro.
- Contraseña de 12 a 128 caracteres; permitir frases largas sin reglas artificiales de composición.
- La cuenta queda bloqueada para iniciar sesión y usar el producto hasta verificar el email.
- Enlace de verificación: token aleatorio de un solo uso, guardado en base de datos solo como hash, válido 24 horas.
- Recuperación: token de un solo uso, guardado solo como hash, válido 1 hora; al cambiar/restablecer contraseña, revocar sesiones existentes.
- `EmailService` es una interfaz intercambiable con adaptador HTTP para Resend usando `fetch` de Node. No se requiere SDK adicional. El adaptador falla de forma cerrada si faltan `RESEND_API_KEY` o `RESEND_FROM_EMAIL`; nunca imprime claves, enlaces ni tokens.
- Para enviar a destinatarios reales, el dueño debe verificar un dominio en Resend y configurar una API key dedicada a esta aplicación fuera del repositorio.

## Sesiones

- Usar sesión opaca almacenada del lado servidor y cookie `HttpOnly`, `SameSite=Lax`, `Path=/`; activar `Secure` en producción.
- Duración máxima inicial: 7 días. Cerrar sesión, cambiar contraseña o restablecerla revoca la sesión correspondiente/todas las sesiones activas según el caso.
- Guardar en base de datos únicamente el hash del token de sesión, nunca su valor en claro.

## Workspaces y aislamiento

- Un `User` dueño puede ser propietario de varios `Workspace`.
- Cada workspace pertenece a exactamente un dueño titular. Un dueño puede crear/seleccionar varios workspaces; los datos y contadores documentales permanecen aislados por `workspaceId`.
- Empleados/ayudantes son registros del workspace, no cuentas con acceso general.
- El contexto de workspace de cada petición se valida en servidor contra la sesión autenticada y la propiedad del workspace. No confiar en IDs enviados por el cliente sin autorización.
- Los accesos limitados de empleados se implementan con los códigos específicos por asignación/orden definidos en `01-core-workflow.md`, no con una sesión de dueño.

## Información de acceso a propiedades

- Lockboxes e instrucciones de acceso se cifran en aplicación con AES-256-GCM antes de persistir.
- La clave debe ser de 32 bytes, venir de un secreto del entorno (`LOCKBOX_ENCRYPTION_KEY`) y nunca guardarse en DB, código, Git o logs.
- El propietario puede gestionar y revelar credenciales de propiedades de su workspace; cada revelación se audita. El valor no aparece en listas ni comunicaciones.
- El acceso del empleado a una credencial se habilita solo mediante su código vigente para la orden asignada; la integración con órdenes se completa al modelar WorkOrder/Assignment.

## Arquitectura y dependencias externas

- Mantener el backend: Controllers → Services → Repositories → Prisma/PostgreSQL; modelos de dominio independientes.
- La verificación y recuperación usan Resend mediante la abstracción `EmailService`; una API key dedicada y un remitente verificado se configuran localmente, nunca se comparten ni se registran.
- La implementación no debe leer ni requerir archivos `.env`; configuración sensible se suministrará al proceso de forma segura.
