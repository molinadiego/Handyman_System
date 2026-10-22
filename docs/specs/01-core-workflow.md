# Especificación funcional: flujo principal

**Estado:** especificación inicial basada en `handyman.txt`. Las decisiones no fijadas se mantienen abiertas; este documento no autoriza cambios de arquitectura ni operaciones destructivas.

## Recorrido

`Solicitud → Presupuesto o acuerdo → Orden de trabajo → Factura → Cobro`

No es una cadena automática: cada transición requiere decisión explícita del dueño y los documentos pueden existir en distintas etapas según el acuerdo.

## 1. Solicitud

- Registrar quién solicita, contacto, propiedad, descripción y datos de coordinación disponibles.
- Distinguir cliente directo de administradora; el tenant/contacto de acceso puede ser temporal y pertenecer a la orden, sin convertirse en cliente permanente.
- Estados sugeridos para organizar la revisión: recibida, en revisión, presupuestada/acordada, no aceptada o cerrada. Confirmar vocabulario final al implementar.
- Recibir una solicitud no significa que el trabajo esté aceptado ni crea automáticamente orden o factura.

## 2. Presupuesto o acuerdo

- El dueño puede conversar y acordar directamente, o crear un presupuesto editable y descargable como PDF.
- El envío por email es manual/iniciado por el dueño; este elige destinatarios. Conservar versiones, envíos y aceptación.
- Estados acordados: **Borrador → Enviado → Aceptado / Rechazado / Vencido**. El cliente acepta mediante enlace seguro; registrar la aceptación, su fecha y la versión aceptada.
- Cuando el dueño envía una nueva versión, los enlaces de aceptación de versiones anteriores se invalidan; las versiones y sus eventos se conservan en el historial.
- El enlace funciona hasta el vencimiento. Si el cliente lo abre después de vencido, se le informa que debe solicitar un presupuesto nuevo; no se acepta una versión vencida.
- El presupuesto vence a los **15 días corridos desde su envío**. Cada reenvío/versión enviada inicia su propio plazo de 15 días.
- Una modificación después del envío crea una nueva versión y conserva la versión enviada anteriormente; no altera retroactivamente el documento recibido por el cliente.
- Para guardar un presupuesto borrador se requiere cliente/destinatario, propiedad y al menos una partida. Los precios pueden quedar incompletos mientras siga en borrador; antes de enviar debe tener destinatario, propiedad, partidas y total calculable.
- Aplicar descuentos manualmente, como importe fijo o porcentaje. Todo cambio posterior de alcance o precio debe quedar registrado.
- Un presupuesto aceptado puede convertirse en orden por acción explícita del dueño. También se permite crear orden directamente cuando ya existe acuerdo, incluso sin presupuesto. La conversión guarda una copia del alcance y precio acordados.
- Modificar una plantilla no altera presupuestos históricos.

### Envío de presupuestos

- Generar el PDF en el backend; adjuntarlo al email y enviar junto al enlace seguro de aceptación.
- El dueño selecciona explícitamente uno o más destinatarios. Registrar resultado por destinatario sin guardar tokens ni secretos.

## 3. Orden de trabajo

Debe vincularse al workspace y registrar, según aplique:

- Cliente o administradora facturable, propiedad y contacto/tenant de acceso.
- Descripción y alcance, fecha/hora/duración estimada, estado y prioridad.
- Dueño y empleados/ayudantes asignados, instrucciones, materiales previstos/utilizados, notas, fotos y documentos.
- Horas de inicio y finalización; presupuesto, facturas y autorizaciones relacionadas.
- Modalidad de cobro: precio fijo o tiempo y materiales. En fijo, horas no recalculan el precio. En tiempo/materiales, pueden respaldar el importe.
- Depósitos y facturación por etapas según decisión del dueño.

Estados de trabajo acordados: **Pendiente de programar → Programada → En progreso → Completada**, con **Reprogramada** y **Cancelada** (motivo obligatorio) como estados adicionales. El estado de trabajo es independiente del estado de facturación. Si se anula una factura relacionada, la orden queda **Pendiente de Facturar** en su estado de facturación, sin alterar su estado de trabajo.

Si no se completa, registrar motivo y dejar pendiente, reprogramar o cancelar; cancelar requiere motivo. Cambios en fecha/alcance conservan historial.

### Numeración e impuestos

- Presupuestos, órdenes y facturas tienen secuencias independientes por workspace, continuas y comenzando en 1; no se reinician anualmente.
- Mostrar cada número con prefijo y secuencia (por ejemplo, `PRE-1`, `OT-1`, `FAC-1`). La orden conserva la referencia al presupuesto si aplica; la factura referencia la orden y el presupuesto cuando corresponda.
- El dueño configura una tasa de impuesto predeterminada para el workspace y puede modificarla para un documento. La aplicación calcula automáticamente el impuesto cuando el dueño indica que ese documento está sujeto a impuesto; la base imponible es el subtotal menos el descuento.
- Mostrar subtotal, impuesto y total; el impuesto se suma al subtotal.
- Redondear el impuesto a dos decimales al nivel del documento.
- Los borradores usan la configuración vigente; fijar tasa, base imponible e importe calculado al enviar el presupuesto o emitir la factura, preservando así el documento aunque cambie la configuración después.

### Acceso del empleado a su orden

- Al asignar un empleado, la aplicación genera un código específico para esa combinación de empleado y orden. El código permite consultar únicamente la orden asignada y actualizar el avance: **Inicio → Progreso → Finalización**.
- Por defecto, el empleado puede consultar la orden asignada, marcar inicio/progreso/finalización y añadir notas. El dueño configura permisos por empleado y puede habilitar carga de fotos y/o videos. El empleado no modifica precio, alcance ni agenda.
- El dueño elige desde la aplicación uno, dos o los tres canales para enviarlo: SMS, email y WhatsApp (este último sujeto a proveedor compatible).
- El código permanece vigente mientras el trabajo siga activo. Caduca cuando la orden se marca como finalizada y se revoca también si la orden se cancela o se retira al empleado de la asignación.
- El código no da acceso general a la aplicación ni a otras órdenes. Si la orden asignada contiene información de lockbox, el empleado puede verla dentro de la vista protegida de esa orden mientras su código siga vigente.
- El lockbox nunca se incluye en el SMS, email o WhatsApp que entrega la orden o el código de acceso. El empleado lo consulta dentro de la orden; registrar quién accedió y cuándo.
- Registrar las actualizaciones atribuidas a la asignación/código correspondiente. No incluir el código de acceso a la orden ni el lockbox en logs o comunicaciones ajenas al envío autorizado.

### Uso sin conexión

- Antes de desplazarse, el empleado abre/prepara la orden asignada mientras tiene conexión. La PWA guarda localmente solo los datos necesarios de esa orden, incluyendo el lockbox si está autorizado.
- Sin señal, el empleado puede consultar la orden preparada y registrar inicio, progreso y finalización. Las acciones se guardan en una cola local y se sincronizan al recuperar conexión, conservando su hora local/UTC y orden de eventos.
- El código de acceso se usa para autorizar la preparación inicial; no debe estar dentro de la orden como requisito para abrirla offline.
- La aplicación informa al dueño y al empleado que una revocación o cancelación no puede llegar a un dispositivo desconectado. El acceso local puede persistir hasta que el dispositivo vuelva a sincronizar; al reconectar se valida la asignación, se suben cambios permitidos y se limpia el contenido local que ya no esté autorizado.
- Resolver conflictos de sincronización sin sobrescribir silenciosamente el historial; estados terminales o revocaciones del servidor requieren reconciliación explícita.
- Si un evento offline contradice un cambio del dueño, conservar ambos eventos con actor/fecha y solicitar revisión del dueño para determinar el estado final. No elegir automáticamente por timestamp ni descartar eventos.

### Cambios de alcance y precio

- Registrar cada cambio mediante un ajuste asociado a la orden, con motivo, alcance afectado, importe delta y autor/fecha.
- En precio fijo, las horas no cambian el precio acordado. Una reducción o modificación del alcance tampoco recalcula el total automáticamente: requiere ajuste explícito con motivo.
- En tiempo y materiales, horas y materiales pueden respaldar el importe final.
- El ajuste no sobrescribe el alcance ni los importes de documentos previamente emitidos; los documentos posteriores reflejan los valores vigentes.

### Trabajo adicional

Registrar separadamente motivo, importe o estimación y autorización del cliente cuando sea necesaria. La autorización puede documentarse como recibida en persona/por teléfono o mediante enlace seguro. **El silencio nunca cuenta como aprobación.** No tratar la falta de respuesta como consentimiento.

### Citas y comunicaciones

- Guardar instantes de órdenes/citas en UTC y presentar en zona horaria del workspace.
- Advertir conflictos de agenda y mostrar asignaciones.
- Para cliente directo, recordar al cliente/contacto designado; para propiedad administrada, al tenant/contacto de acceso indicado en la orden, no a la administradora por defecto.
- Enlaces seguros permiten confirmar o solicitar cambio/cancelación. Solicitudes de cambio quedan pendientes hasta que el dueño apruebe/rechace.
- Reprogramar actualiza agenda, conserva historial y notifica a afectados. Una cita no confirmada no se cancela automáticamente salvo regla configurada expresamente.
- Mantener registro básico del envío y resultado. WhatsApp depende de proveedor compatible y habilitado.
- Nunca incluir lockbox ni información sensible de acceso automáticamente en mensajes externos.

## 4. Factura

- El dueño decide cuándo emitirla (antes, durante o después del trabajo) y si aplica depósito o etapas.
- Estados acordados: **Borrador → Emitida → Parcialmente pagada / Pagada**; una factura emitida también puede quedar **Anulada** mediante una acción explícita con motivo.
- Para guardar una factura en borrador se requiere destinatario, propiedad y al menos una partida. Antes de emitir, los importes deben estar completos y calcularse los impuestos según la configuración aplicable.
- Facturar al cliente directo o a la administradora que corresponda. Incluir nombre del destinatario y dirección de la propiedad.
- Distinguir importe presupuestado/acordado, facturado, cobrado y saldo pendiente. Configurar plazo de pago.
- Generar y enviar PDF cuando el dueño lo decida.
- Facturas emitidas son históricas e inmutables en sentido de auditoría: corregir con ajuste o anulación enlazada, sin borrado silencioso.
- Si una factura emitida se anula (`voided`), conservarla en el historial y actualizar la orden relacionada a “Pendiente de Facturar”, permitiendo emitir documento corregido.
- El PDF emitido conserva un snapshot de destinatario, propiedad, partidas y totales para que cambios posteriores no lo alteren.

## 5. Cobro

- Registrar pagos recibidos fuera de la aplicación: importe, fecha, método y factura relacionada.
- Aceptar pagos parciales y varios pagos por factura.
- Calcular saldo pendiente a partir del importe facturado y las asignaciones válidas; no editar el saldo directamente.
- Si un pago cubre varias facturas, el dueño revisa y confirma la distribución antes de aplicarla.
- Conservar pagos y su historial. Correcciones por ajustes/anulaciones vinculadas; nunca borrar silenciosamente.
- Permitir recibo PDF para pagos en efectivo.
- El dinero corresponde al negocio/dueño, no se procesa ni se paga a empleados mediante la app.

## Reglas transversales

- Todas las entidades y acciones están limitadas por `workspace_id`; permisos verificados en backend.
- Datos de acceso a propiedades son restringidos por autorización.
- Informes distinguen presupuestado, facturado, cobrado y costos; no son contabilidad oficial ni asesoría fiscal.
- No se incluyen en V1 pagos online, portal completo de clientes/tenants, IA, nómina completa o inventario avanzado.

## Decisiones funcionales pendientes

- Definir el tratamiento de impuestos en casos especiales antes de implementar facturación.
- Definir la estrategia concreta de reconciliación/interfaz para que el dueño revise y resuelva conflictos offline.

## Adjuntos de empleados

- Aceptar JPEG, PNG y HEIC para fotos; comprimirlas en el dispositivo y limitar cada archivo a 5 MB.
- Aceptar MP4 y MOV para videos; requieren permiso del dueño y se limitan a 50 MB y 60 segundos por archivo.
