# Hoja de ruta del MVP

Plan derivado de `handyman.txt`. Marcar una casilla solo cuando el alcance esté implementado y verificado según el criterio de cierre de la fase. Este plan no autoriza cambios destructivos ni cambios mayores de arquitectura.

## Fase 1 — Alcance funcional y fundamentos

- [x] Confirmar reglas base del flujo de documentos, estados de presupuesto y orden, y separación entre estado de trabajo y facturación; la solicitud no se acepta automáticamente.
- [x] Definir numeración independiente por workspace desde 1, continua y con prefijos por tipo; impuestos configurables y calculados por documento; campos mínimos para orden, presupuesto y factura.
- [x] Definir redondeo de impuestos, plazo inicial de facturas, permisos predeterminados de empleados, descuentos y límites de fotos/videos.
- [x] Preparar monorepo con API Express, frontend React + Tailwind y esquema inicial Prisma para PostgreSQL.
- [x] Definir convenciones iniciales de validación, errores, logging seguro, pruebas y documentación.
- [x] Establecer arquitectura backend por capas: controllers → services → repositories → Prisma/PostgreSQL, con modelos de dominio independientes.
- [x] Configurar la experiencia responsive y la base de la PWA.
- [x] Inicializar Git y mantener `.gitignore` para excluir secretos, dependencias, builds y datos locales.
- [ ] Validar el esquema Prisma y conectar una instancia PostgreSQL cuando esté disponible una configuración segura; aún no se ejecutaron migraciones.

**Criterio de cierre:** el flujo principal y sus decisiones críticas están documentados; las pruebas de salud de la API y el build PWA pasan; el esquema Prisma se valida con una configuración segura de base de datos.

## Fase 2 — Workspace, usuarios y permisos

- [x] Modelar dueño, workspaces múltiples por usuario, titular único por workspace y empleados en Prisma.
- [x] Implementar la lógica base de registro/login Argon2id, verificación obligatoria, tokens y recuperación; cubrir reglas centrales con pruebas unitarias.
- [x] Implementar base de cookie HttpOnly, sesión de 7 días, revocación, middleware de sesión y control de origen.
- [x] Implementar interfaz EmailService y adaptador Resend con `fetch` nativo, sin exponer tokens.
- [x] Aplicar ownership/`workspaceId` y autorización del dueño en modelos y repositorios de identidad/workspaces de Fase 2.
- [x] Guardar zona horaria en workspace y validar identificadores IANA; las fechas de citas se almacenarán UTC al crear esos modelos.
- [x] Definir permisos para información sensible y funciones de empleados; por defecto pueden ver órdenes asignadas, actualizar avance y notas, pero no precio/alcance/agenda.
- [x] Implementar preferencia de idioma de cuenta, detección inicial del navegador y selector persistente en Configuración.
- [x] Aplicar migración de idioma a Neon `dev` con aprobación y verificar persistencia de preferencia en sesión.
- [x] Definir acceso de empleados a órdenes asignadas mediante códigos específicos por orden, generados por la app y enviados por los canales elegidos por el dueño.
- [x] Crear la rama Neon `dev`, aplicar la migración inicial allí y probar login/sesión/aislamiento de workspaces con PostgreSQL; `production` permanece intacta.
- [x] Elegir Resend e implementar adaptador HTTP sin SDK ni exposición de secretos.
- [x] Probar envío de verificación Resend a la dirección asociada a la cuenta usando `onboarding@resend.dev`.
- [ ] Antes del lanzamiento, verificar un dominio propio para enviar correos a destinatarios distintos de la cuenta de pruebas Resend.

**Criterio de cierre:** las pruebas con PostgreSQL validan login, sesión, preferencia de idioma persistente y aislamiento de workspaces; la verificación por email funciona en Resend test mode. Antes de producción, verificar un dominio propio para enviar a clientes.

## Fase 3 — Clientes, administradoras y propiedades

- [ ] Gestionar clientes directos, administradoras, contactos y propiedades.
- [ ] Mantener historial de relaciones de cada propiedad sin reasignar trabajos pasados.
- [ ] Registrar contactos temporales de acceso en las órdenes, sin exigir que sean clientes permanentes.
- [ ] Restringir el acceso a códigos de lockbox e instrucciones sensibles.
- [ ] Excluir datos de acceso de búsquedas generales, logs y comunicaciones automáticas.

**Criterio de cierre:** se pueden consultar los historiales correctos y las pruebas de permisos confirman que solo usuarios autorizados ven datos de acceso.

## Fase 4 — Solicitudes y presupuestos

- [ ] Registrar y revisar solicitudes sin tratarlas como trabajos aceptados.
- [ ] Crear y editar presupuestos con versiones, partidas, descuentos manuales y aceptación registrada.
- [ ] Permitir descuentos manuales por importe fijo o porcentaje.
- [ ] Aceptar presupuestos mediante enlace seguro; vencimiento a 15 días corridos del envío y tratamiento del enlace vencido.
- [ ] Generar PDF y permitir envíos explícitos con destinatarios elegidos por el dueño.
- [ ] Conservar historial de versiones, envíos y respuestas.
- [ ] Permitir crear una orden desde un presupuesto aceptado o desde un acuerdo directo.

**Criterio de cierre:** una solicitud o presupuesto no genera automáticamente una orden o factura; las versiones anteriores permanecen consultables.

## Fase 5 — Órdenes de trabajo, costos y agenda

- [ ] Gestionar alcance, estado, prioridad, fechas, asignaciones y cancelaciones con motivo.
- [ ] Soportar precio fijo y tiempo y materiales.
- [ ] Registrar horas, materiales y ajustes explícitos de alcance o precio.
- [ ] Registrar trabajos adicionales por separado y su autorización; el silencio nunca cuenta como aprobación.
- [ ] Crear calendario y lista de trabajos con avisos de conflicto.
- [ ] Registrar solicitudes de reprogramación/cancelación como pendientes hasta que el dueño decida.
- [ ] Configurar recordatorios y registro de comunicaciones, con el contacto adecuado para cada tipo de cliente.
- [ ] Permitir al empleado asignado consultar su orden con su código específico y registrar inicio, progreso y finalización.
- [ ] Revocar el código al finalizar/cancelar la orden o retirar la asignación del empleado.
- [ ] Permitir preparar la orden asignada con conexión, consultarla y registrar avances sin conexión, y sincronizar al reconectar; documentar el límite de revocación offline.
- [ ] Resolver conflictos offline conservando eventos y solicitando revisión del dueño.
- [ ] Restringir carga de fotos/videos a permisos habilitados por el dueño.

**Criterio de cierre:** las pruebas confirman que las horas no alteran precios fijos, que los cambios requieren motivo y que las solicitudes de cambio no modifican la agenda hasta ser aprobadas.

## Fase 6 — Facturas, pagos y saldos

- [ ] Crear facturas PDF para el cliente o administradora correspondiente.
- [ ] Aplicar impuesto configurable automáticamente por documento cuando sea gravable y conservar snapshot de la tasa y cálculo.
- [ ] Redondear el impuesto a dos decimales por documento; configurar plazo de pago por workspace (30 días iniciales) y permitir ajuste por factura.
- [ ] Soportar depósitos, facturación por etapas, pagos parciales y varios pagos por factura.
- [ ] Permitir distribuir un pago entre facturas tras revisión y confirmación del dueño.
- [ ] Conservar facturas emitidas y pagos; corregirlos mediante ajustes o anulaciones relacionadas.
- [ ] Al anular una factura, conservarla y devolver la orden a “Pendiente de Facturar”.
- [ ] Generar recibos PDF para pagos en efectivo cuando corresponda.

**Criterio de cierre:** las pruebas cubren facturación, pagos parciales, saldos y anulaciones; no se puede borrar silenciosamente un registro financiero ni asignar más de lo permitido por las reglas acordadas.

## Fase 7 — Gastos, búsqueda e informes

- [ ] Registrar gastos generales, costos de viaje y pagos/saldos de ayudantes o subcontratistas.
- [ ] Añadir búsqueda de clientes, propiedades, trabajos, presupuestos y facturas.
- [ ] Adjuntar documentos e imágenes; admitir JPEG/PNG/HEIC y comprimir fotos en el dispositivo (máximo 5 MB); admitir MP4/MOV con permiso (máximo 50 MB/60 segundos).
- [ ] Crear tablero e informes que distingan importes acordados, facturados, cobrados y costos.
- [ ] Añadir exportación de datos e informes cuando corresponda.

**Criterio de cierre:** los informes muestran las categorías financieras por separado, respetan el aislamiento por workspace y no se presentan como contabilidad oficial ni asesoría fiscal.

## Fase 8 — Calidad, seguridad y entrega PWA

- [ ] Revisar permisos, aislamiento multi-tenant y protección de datos sensibles.
- [ ] Probar los flujos principales y las reglas de negocio críticas de extremo a extremo.
- [ ] Completar interfaz en inglés y español, responsive e instalable como PWA.
- [ ] Verificar el uso offline de órdenes asignadas, protección/limpieza de datos locales y sincronización tras recuperar conexión.
- [ ] Revisar accesibilidad, rendimiento, manejo de errores y documentación de despliegue.
- [ ] Confirmar el alcance y la preparación para el lanzamiento con el usuario.

**Criterio de cierre:** las pruebas críticas pasan, la PWA puede instalarse y funciona en los tamaños objetivo, y el usuario aprueba el alcance de lanzamiento.
