# Especificación inicial de datos — PostgreSQL + Prisma

**Estado:** modelo conceptual para discutir antes de convertirlo en migraciones. No ejecutar migraciones destructivas ni asumir decisiones aún no confirmadas. Todos los datos operativos pertenecen a un workspace y las relaciones deben validar el mismo `workspace_id`.

## Convenciones

- Identificadores primarios estables (`UUID` recomendado); timestamps de auditoría `createdAt`/`updatedAt` en UTC.
- Montos como `Decimal` con precisión monetaria, nunca coma flotante. Moneda de V1 USD; guardar moneda si el modelo pudiera ampliarse.
- Estados como enums o valores controlados, con transiciones validadas por servicio.
- No borrar en cascada registros financieros ni documentos históricos. Usar estados de anulación/archivo con actor, fecha, motivo y referencia al original.
- En PostgreSQL, índices para `workspace_id` y consultas habituales; las claves foráneas y validaciones deben impedir relaciones entre workspaces.
- Fechas de citas como instantes UTC (`timestamptz`); `Workspace.timeZone` guarda zona IANA para presentación local.

## Entidades principales

### Workspace y acceso

- **User:** cuenta global del dueño con email normalizado y único, `passwordHash` Argon2id, `preferredLanguage` (`en`/`es`, inicializado desde navegador con fallback `en`), `emailVerifiedAt` y timestamps. Contraseña de 12–128 caracteres validada en servicio. Una cuenta puede ser dueña de varios workspaces.
- **Workspace:** `id`, nombre del negocio, `ownerUserId` obligatorio, `timeZone`, moneda, tasa de impuesto predeterminada/configuración aplicable, plazo de factura predeterminado (30 días iniciales), preferencias regionales, timestamps y contadores independientes por tipo documental. Cada workspace tiene exactamente un dueño titular; `ownerUserId` no es único globalmente, para permitir varios workspaces por usuario.
- **AuthSession:** usuario, hash del token opaco de sesión, fechas de creación/expiración, última actividad y revocación. Vigencia inicial de 7 días; revocar al cerrar sesión y tras cambio/restablecimiento de contraseña. Nunca guardar el token de sesión en claro.
- **AuthActionToken:** usuario, hash del token, propósito (`EMAIL_VERIFICATION` o `PASSWORD_RESET`), expiración, uso y creación. Verificación expira en 24 horas; recuperación expira en 1 hora. Nunca persistir tokens en claro.
- **Employee/Helper:** empleado sin cuenta de usuario obligatoria, ligado a un workspace, con nombre/contacto, color de calendario y permisos configurables por el dueño. Por defecto puede ver órdenes asignadas, actualizar avance y añadir notas; fotos/videos desactivados hasta habilitación explícita. No puede alterar precio, alcance ni agenda.

### Clientes y propiedades

- **Customer:** `workspaceId`, tipo persona/empresa, nombre, contacto y notas.
- **PropertyManager:** `workspaceId`, nombre y contactos de administradora.
- **Property:** `workspaceId`, dirección normalizada, datos descriptivos y notas no sensibles.
- **PropertyRelationship:** `workspaceId`, propiedad, exactamente un cliente o una administradora, rol coincidente (`OWNER`/`PROPERTY_MANAGER`) y fechas de vigencia. Claves foráneas compuestas impiden vínculos entre workspaces; mantener relaciones previas y no reasignar trabajos históricos.
- **PropertyAccessCredential (restringido):** `workspaceId`, propiedad, tipo/label, ciphertext, nonce, authTag, keyVersion, autor y timestamps. Cifrar el valor en aplicación con AES-256-GCM usando secreto de entorno; no exponer en respuestas generales ni mensajes. Las revelaciones se auditan.

### Solicitudes, presupuestos y órdenes

- **ServiceRequest:** `workspaceId`, solicitante, propiedad opcional, descripción, estado, fechas, notas.
- **Estimate:** `workspaceId`, cliente/administradora facturable, propiedad, número con prefijo y secuencia (`PRE-1` como ejemplo), estado (`DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`), totales, fecha de expiración (15 días corridos desde cada envío) y versión vigente. Los números son secuenciales por workspace, independientes por tipo y no se reinician anualmente.
- **EstimateVersion:** presupuesto, número de versión, snapshot inmutable de partidas/condiciones/totales/descuento/tasa y cálculo de impuesto, autor y fecha. Cada edición crea versión; envíos y aceptación se conservan en eventos relacionados. La versión enviada fija el snapshot fiscal.
- **EstimateCommunication:** presupuesto, destinatarios, canal, resultado, fecha y referencia externa no secreta.
- **EstimateEvent (o auditoría equivalente):** presupuesto/versión, tipo de evento (envío, aceptación por enlace seguro, rechazo, vencimiento), actor o evidencia, fecha y metadatos no sensibles. Un enlace vencido informa al cliente que debe solicitar un nuevo presupuesto.
- **WorkOrder:** `workspaceId`, request/estimate opcionales, facturación a customer o manager, property, número con prefijo y secuencia (`OT-1` como ejemplo), snapshot de alcance y precio acordados, estado de trabajo (`PENDING_SCHEDULE`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `RESCHEDULED`, `CANCELED`), estado de facturación separado (incluido `PENDING_TO_INVOICE`), prioridad, modalidad `FIXED`/`TIME_AND_MATERIALS` y fechas UTC. Cliente/destinatario, propiedad y alcance son obligatorios al crear; fecha y precio pueden definirse después.
- **WorkOrderAssignment:** orden, empleado/miembro, rol y periodo de asignación. El acceso está limitado a órdenes asignadas y aplica los permisos configurados para ese empleado.
- **WorkOrderAccessCode:** `workspaceId`, orden, asignación/empleado, hash del código (no guardar el código legible), estado, creación, revocación y caducidad. Un código queda limitado a la pareja empleado-orden; caduca al completar la orden y se revoca al cancelarla o retirar al empleado. No representa acceso a otras órdenes ni acceso general.
- **SensitiveDataAccessEvent:** workspace, orden, referencia al dato sensible consultado, actor/asignación, fecha UTC y resultado; registrar acceso sin guardar el valor del lockbox en el evento.
- **WorkOrderProgressEvent:** orden/asignación, etapa (`STARTED`, `IN_PROGRESS`, `COMPLETED`), fecha UTC y actor de acceso. Mantener historial de cambios y atribuirlos al código/asignación que los originó.
- **OfflineProgressEvent (o mecanismo equivalente de sincronización):** identificador idempotente generado por cliente, orden/asignación, etapa/acción, hora del dispositivo, fecha de recepción del servidor y resultado de reconciliación. Evitar duplicados al reintentar sincronización y conservar conflictos para revisión del dueño.
- **WorkOrderContact:** orden, nombre, datos mínimos de contacto, tipo (tenant/acceso/otro) e instrucciones restringidas.
- **WorkLog:** orden, actor, inicio/fin UTC y nota; horas informativas para precio fijo.
- **WorkOrderAdjustment:** orden, importe delta, alcance afectado, motivo, autor/fecha y relación con aprobación del cliente cuando corresponda. Es un registro separado y no sobrescribe snapshots anteriores.
- **AdditionalWork:** orden, descripción/motivo, estimación/importe, estado de autorización, método/evidencia, actor y timestamps. Nunca inferir aprobación por silencio.

### Agenda y comunicación

- **Appointment/WorkOrder schedule:** orden, inicio/fin UTC, zona de visualización derivada del workspace, estado de confirmación y metadatos de reprogramación.
- **ScheduleChangeRequest:** solicitud segura de cambio/cancelación, estado pendiente/aprobada/rechazada, decisión del dueño y fechas.
- **CommunicationLog:** workspace, entidad relacionada, canal, destinatario, resultado y fecha. Excluir códigos de acceso del contenido automático.
- Los envíos del código pueden registrar canal(es) elegidos por el dueño (`SMS`, `EMAIL`, `WHATSAPP`), resultado y fecha en el registro de comunicaciones; no registrar el valor del código en claro ni incluir el lockbox en el contenido enviado.

### Costos y adjuntos

- **MaterialLine:** workspace/orden, descripción, cantidad, costo, importe cobrado si aplica, pagador y recibo.
- **Expense:** workspace, fecha, importe, categoría, descripción, vínculo opcional con orden y comprobante.
- **HelperPayment/ContractorCost:** workspace, orden, persona/proveedor, importe adeudado/pagado, fechas y saldo calculable; son registros manuales, no pagos ejecutados por la app.
- **Attachment:** workspace, entidad asociada, metadatos/tipo/tamaño/duración y referencia de almacenamiento con control de acceso. Fotos JPEG/PNG/HEIC comprimidas en cliente, máximo 5 MB; videos MP4/MOV opcionales según permiso, máximo 50 MB y 60 segundos; no exponer URLs públicas para documentos privados.

### Facturación y cobros

- **Invoice:** `workspaceId`, orden, destinatario, número con prefijo y secuencia (`FAC-1` como ejemplo), presupuesto relacionado opcional, estado (`DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `VOIDED`), snapshot de destinatario/propiedad/partidas/totales/impuesto, importes, vencimiento y emisión. Destinatario, propiedad y partidas son obligatorios para crear borrador. El plazo por defecto del workspace es 30 días desde emisión y puede modificarse por factura. La transición a `VOIDED` exige motivo y actor/fecha.
- **InvoiceLine:** invoice, descripción/cantidad/precio; conservar snapshot documental. La sujeción a impuesto se define por documento.
- **TaxSnapshot (o campos equivalentes):** documento, tasa predeterminada del workspace o tasa modificada por el dueño para ese documento, indicador de sujeción, base imponible e importe calculado redondeado a dos decimales por documento. El impuesto se suma al subtotal. Fijar el snapshot al enviar presupuesto o emitir factura.
- **Discount (o campos equivalentes):** documento, modalidad (`FIXED_AMOUNT` o `PERCENTAGE`), valor, importe calculado y motivo/autor cuando corresponda; aplicación manual.
- **InvoiceAdjustment/VoidRecord:** factura original, tipo, motivo, importe si aplica, actor/fecha y documento de reemplazo. Anular actualiza estado de orden a “Pendiente de Facturar”; no elimina factura.
- **Payment:** `workspaceId`, fecha, importe, método, referencia/nota y estado. Registro manual de pago recibido; no credenciales financieras.
- **PaymentAllocation:** pago, factura, importe asignado; distribución entre varias facturas confirmada por el dueño. Validar suma asignada y saldos.
- **PaymentReceipt:** referencia a pago y datos/snapshot del recibo generado.

## Relaciones e invariantes

- Cada entidad comercial incluye `workspaceId`; toda consulta y autorización valida la pertenencia al workspace activo.
- Para reducir errores de tenant, considerar claves únicas compuestas `(workspaceId, id)` y claves foráneas compuestas hacia el mismo workspace.
- Factura debe pertenecer al mismo workspace que orden y destinatario; pago/asignación igual para factura.
- Presupuestos, órdenes, facturas y plantillas guardan snapshots suficientes para que cambios posteriores no alteren documentos pasados.
- Toda edición de presupuesto enviado crea una versión nueva; los documentos emitidos mantienen su snapshot histórico.
- Las transiciones de estado se validan en la lógica de negocio y se auditan. El estado de trabajo y el estado de facturación son independientes.
- Secuencias de presupuesto, orden y factura independientes por workspace, continuas desde 1 y sin reinicio anual; aplicar prefijo por tipo y garantizar asignación concurrente segura.
- Un presupuesto enviado expira 15 días corridos después del envío; registrar aceptación mediante enlace seguro válido hasta expiración. Un enlace vencido no puede aceptar la versión.
- El borrador de orden requiere destinatario/cliente, propiedad y alcance; los borradores de presupuesto y factura requieren destinatario, propiedad y al menos una partida. Presupuesto puede tener precios incompletos mientras sea borrador.
- Los impuestos se calculan automáticamente por documento usando configuración predeterminada del workspace o tasa modificada por el dueño; sumar al subtotal, redondear a dos decimales por documento y fijar snapshot al enviar presupuesto/emitir factura.
- Un código de acceso de empleado está vinculado a una sola orden y asignación; validar el alcance en servidor en cada solicitud. Revocarlo al completar/cancelar la orden o retirar la asignación, y guardar solo un hash verificable del código.
- Si la orden contiene un lockbox, el empleado con código vigente para esa orden puede consultar el dato en la vista protegida de la orden. Cifrar el valor almacenado y auditar cada consulta sin copiar el secreto al log.
- El almacenamiento offline es local a la PWA y de alcance mínimo: solo órdenes que el empleado haya preparado con conexión y sus datos necesarios. La implementación cliente debe proteger el almacenamiento local, encolar eventos de forma idempotente y sincronizar/reconciliar al reconectar; nunca asumir que una revocación remota se aplica instantáneamente a un dispositivo offline.
- Si un evento offline contradice una acción del dueño, preservar ambos eventos con actor/fecha y estado de conflicto para revisión; no aplicar “último cambio gana” ni descartar silenciosamente.
- Un cambio de precio/alcance genera un ajuste con motivo; las horas registradas nunca modifican automáticamente el precio fijo.
- Anular una factura conserva el documento y cambia la orden asociada a `PENDING_TO_INVOICE`; cualquier nueva factura es otro registro relacionado, no reemplaza la anulada.
- Propiedades conservan historial de relaciones y órdenes siempre mantienen su asociación histórica original.
- Pagado y saldo pendiente se calculan a partir de importes y asignaciones válidas; aplicar reglas monetarias de redondeo definidas.
- Soft delete no reemplaza auditoría y no debe ocultar eventos financieros; definir política explícita antes de agregarlo.

## Identidad y autorización

- El dueño usa email y contraseña; no puede iniciar sesión ni crear/usar workspaces hasta verificar el email.
- Las contraseñas se hashean con Argon2id; nunca se almacenan en texto plano ni se registran.
- Sesiones opacas del lado servidor se entregan en cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción; duración máxima inicial de 7 días y revocación explícita.
- La interfaz de envío de correo será una abstracción intercambiable (`EmailService`) sin proveedor configurado por ahora. No imprimir enlaces, tokens ni secretos en logs.
- Empleados no tienen sesión general: acceden solo mediante el código específico de su asignación/orden.
- Toda petición a recursos de negocio resuelve un workspace que pertenezca al dueño autenticado y aplica `workspaceId` en las lecturas y escrituras.

## Decisiones pendientes antes de migraciones

Confirmar estrategia de autenticación y detalles de permisos, tratamiento fiscal en casos especiales, tipos de archivo admitidos, retención/anexos y proveedor de almacenamiento, cifrado de datos de acceso y política de auditoría. Este esquema no implica que todo campo opcional deba entrar en la primera migración.
