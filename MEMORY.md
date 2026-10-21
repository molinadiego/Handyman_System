# Memoria del proyecto

## Producto

Aplicación comercial para que negocios de handyman administren sus operaciones diarias y finanzas básicas desde un lugar práctico y claro. `handyman.txt` es la fuente funcional de referencia (versión 1.0, borrador completo revisado).

## Stack oficial

- Backend: Node.js + Express.
- Datos: PostgreSQL + Prisma ORM.
- Frontend: React + Tailwind CSS como PWA.
- Arquitectura backend: controllers → services → repositories → Prisma/PostgreSQL. Los modelos de dominio son independientes de Express y repositories, los usan los services y los repositories los mapean a persistencia cuando corresponda.

## Control de versiones

- Git es el sistema de control de versiones del proyecto.
- `.gitignore` excluye archivos de entorno/credenciales, dependencias, artefactos de build, bases de datos y datos/cargas locales.
- Preguntar y esperar aprobación explícita antes de ejecutar `git add` o crear commits, incluso si parecen necesarios; preguntar también antes de publicar ramas o hacer `push`. Nunca reescribir historia con operaciones forzadas/destructivas.

## Decisiones establecidas

- Mercado inicial: Estados Unidos; interfaz inglés/español; moneda V1 USD.
- V1 web responsive e instalable como PWA. App nativa iOS/Android para V2.
- Un dueño titular por workspace en V1; empleados con permisos limitados según autorización del dueño.
- El dueño asigna empleados a órdenes. La aplicación genera un código de acceso específico por empleado y orden para ver esa orden y registrar inicio, progreso y finalización. El dueño elige SMS, email y/o WhatsApp; el código caduca al finalizar el trabajo y se revoca si se cancela la orden o se quita la asignación.
- Si la orden asignada corresponde a una propiedad vacía con lockbox, el empleado puede ver el código dentro de la vista protegida de la orden mientras su acceso esté vigente. El lockbox no se incluye en el mensaje SMS/email/WhatsApp; se registra quién accede al dato y cuándo.
- La PWA debe permitir preparar/descargar una orden asignada mientras hay conexión, consultar offline la orden y el lockbox autorizado, y registrar inicio/progreso/finalización offline para sincronizarlos al reconectar. La revocación no alcanza un dispositivo desconectado hasta que sincronice; debe comunicarse este límite y limpiar los datos locales al recuperar conexión.
- Separación estricta de negocios mediante `workspace_id`.
- Pagos se registran manualmente; la aplicación no procesa pagos en línea de clientes.
- Conservar historial financiero. Ajustes/anulaciones relacionados, nunca borrado silencioso.
- Fechas/horas de órdenes y citas se almacenan en UTC y se presentan en la zona horaria del workspace.
- Las imágenes se comprimen en el dispositivo antes de subirlas; tamaño máximo recomendado 5 MB por archivo.
- No incluir IA, nómina completa, inventario avanzado, pagos online ni contabilidad/impuestos oficiales en el núcleo MVP.
- Presupuestos, órdenes y facturas tienen secuencias independientes por workspace, continuas desde 1 y sin reinicio anual, con prefijos por tipo (ejemplos: `PRE-1`, `OT-1`, `FAC-1`). Documentos relacionados conservan sus referencias.
- Presupuestos: estados Borrador/Enviado/Aceptado/Rechazado/Vencido; aceptación mediante enlace seguro válido hasta vencimiento; vencen 15 días corridos después del envío. Un enlace vencido informa que debe solicitarse un nuevo presupuesto.
- Estados del trabajo y de facturación son independientes. Factura anulada pone la facturación de la orden en “Pendiente de Facturar” sin cambiar el estado de trabajo.
- El dueño configura tasa de impuesto predeterminada por workspace y puede ajustarla por documento; se agrega al subtotal, se redondea a dos decimales por documento y el snapshot se fija al enviar presupuesto/emitir factura.
- Plazo de factura configurable por workspace: 30 días iniciales desde emisión; editable por factura. Descuentos manuales por importe fijo o porcentaje.
- Fotos comprimidas hasta 5 MB; videos opcionales con permiso explícito, hasta 50 MB/60 segundos.
- Formatos aceptados: JPEG/PNG/HEIC para fotos y MP4/MOV para videos.
- Conflictos entre eventos offline y cambios del dueño se conservan con actor/fecha y se remiten a revisión del dueño; no se sobrescriben automáticamente.
- Campos mínimos: orden requiere destinatario/cliente, propiedad y alcance; presupuesto e invoice draft requieren destinatario, propiedad y al menos una partida. El borrador de presupuesto puede tener precios incompletos.
- Permisos de empleados configurables por empleado. Por defecto pueden ver órdenes asignadas, actualizar avance y añadir notas; el dueño puede habilitar fotos/videos. No modifican precio, alcance ni agenda.

## Reglas críticas

- Solicitud no equivale a aceptación y no genera automáticamente orden/factura.
- Trabajo fijo: horas informativas, no alteran precio. Cambios requieren ajuste con motivo.
- Trabajo adicional: el silencio jamás es aprobación.
- Lockboxes e instrucciones de acceso solo visibles para usuarios autorizados. Un empleado asignado puede ver el lockbox dentro de la orden protegida mientras su código siga vigente; no incluirlo en mensajes de envío y auditar su consulta.
- Facturas emitidas y pagos mantienen historia. Al anular factura, conservarla y devolver la orden a “Pendiente de Facturar”.
- Confirmación o reprogramación/cancelación de cita sigue las reglas y aprobación del dueño definidas en `handyman.txt`.

## Criterios de trabajo

- Mantener el alcance centrado en la gestión diaria del negocio.
- Solicitar aprobación explícita antes de cambios mayores de arquitectura, eliminación de archivos o cambios críticos.
- Nunca leer, mostrar ni modificar `.env`, credenciales o secretos. Nunca ejecutar comandos destructivos.
- Los detalles de implementación aún no fijados (proveedores, autenticación concreta, hosting, políticas de retención y formato exacto de números/documentos) deben confirmarse antes de imponerlos.
