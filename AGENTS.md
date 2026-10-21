# Contexto del proyecto

Aplicación web de gestión para negocios de handyman en Estados Unidos. Su objetivo es organizar clientes, propiedades, solicitudes, presupuestos, órdenes de trabajo, agenda, empleados/ayudantes, materiales y gastos, facturas, cobros y reportes operativos. La interfaz será en inglés y español; la moneda de V1 es USD. Debe ser adaptable a computadora, tableta y teléfono e instalable como PWA. La app móvil nativa queda para V2.

## Stack oficial

- Backend: Node.js con Express.
- Base de datos: PostgreSQL con Prisma ORM.
- Frontend: React + Tailwind CSS, configurado como PWA.

## Arquitectura del backend

- Organizar el backend en capas con este flujo de persistencia: **controllers → services → repositories → Prisma/PostgreSQL**.
- Controllers reciben y responden HTTP; services orquestan casos de uso/reglas; repositories encapsulan persistencia con Prisma.
- Los modelos de dominio representan entidades e invariantes y son usados por services; no dependen de Express ni llaman a repositories. Los repositories mapean entre persistencia y dominio cuando corresponda.
- Evitar lógica de negocio en controllers y consultas directas a la base de datos desde controllers o services. No cambiar esta arquitectura sin aprobación explícita.

No sustituir ni ampliar este stack sin consultar al usuario. Mantener V1 enfocada en el trabajo diario; no añadir IA, procesamiento de pagos en línea, nómina completa, inventario avanzado ni contabilidad/impuestos oficiales.

## Seguridad y autorización obligatorias

- **Archivos sensibles:** NUNCA leer, mostrar, editar ni modificar archivos `.env` o credenciales/secretos del sistema. No imprimir secretos en logs, documentación, respuestas, capturas ni salidas de comandos. Si una tarea parece requerirlos, detenerse y solicitar instrucciones seguras.
- **Comandos destructivos:** NUNCA ejecutar comandos destructivos en terminal o base de datos (incluidos `rm -rf`, `DROP DATABASE`, `prisma migrate reset`, `git reset --hard`) ni aplicar cambios críticos sin consentimiento explícito previo del usuario. No asumir consentimiento por la solicitud general de desarrollar una función.
- **Cambios mayores:** Antes de modificar significativamente la arquitectura o borrar archivos, solicitar aprobación explícita. Preservar el trabajo existente y limitar el alcance a lo solicitado.
- **Dependencias y software:** No instalar dependencias, paquetes, herramientas ni software adicional sin autorización explícita previa del usuario. Si una tarea los requiere, explicar qué se instalaría y para qué, y esperar aprobación.
- **Aislamiento multi-tenant:** cada negocio es un workspace y todo dato de negocio debe estar aislado por `workspace_id`. Verificar autorización en servidor en cada operación; nunca confiar únicamente en filtros del cliente. Las relaciones y consultas deben impedir cruces entre workspaces, incluidos archivos, búsquedas, reportes y rutas indirectas.
- **Permisos:** el dueño titular controla el workspace. Los empleados/ayudantes solo acceden a las funciones y datos que el dueño autorice; no todos requieren cuenta.
- **Acceso de empleados a órdenes:** el dueño asigna empleados a órdenes; para cada pareja empleado-orden, la aplicación genera un código específico que permite consultar únicamente esa orden y registrar inicio, progreso y finalización. El dueño elige uno o más canales de envío (SMS, email, WhatsApp). El código caduca al finalizar el trabajo y se revoca si se cancela la orden o se retira al empleado. No concede acceso general a la aplicación. Si la orden incluye una propiedad con lockbox, el empleado asignado puede consultar ese dato dentro de la vista protegida de la orden mientras el acceso siga vigente; nunca incluir el valor del lockbox en el SMS, email o WhatsApp de envío. Registrar el acceso a ese dato.
- **Uso sin conexión:** antes de ir al sitio, el empleado debe abrir/descargar la orden asignada mientras tiene conexión. La PWA conserva localmente solo los datos necesarios de esa orden, incluido el lockbox autorizado, para consulta y registro offline; los cambios se ponen en cola y se sincronizan al reconectar. Informar que una revocación/cancelación no puede aplicarse al dispositivo mientras permanezca desconectado. Proteger y limpiar los datos locales cuando el acceso ya no sea válido y el dispositivo pueda sincronizar.
- **Conflictos offline:** al sincronizar eventos contradictorios, conservar ambos con actor/fecha y solicitar revisión del dueño; nunca sobrescribir silenciosamente ni resolver solo por timestamp.
- **Finanzas inmutables:** no borrar silenciosamente facturas emitidas, pagos ni su historial. Corregir mediante ajustes/anulaciones enlazados al registro original y conservar auditoría. Al anular una factura emitida, conservarla y poner la orden relacionada en “Pendiente de Facturar”.
- **Datos de acceso:** códigos de lockbox e instrucciones sensibles se muestran solo a usuarios autorizados, se protegen como datos sensibles y nunca se incluyen en comunicaciones externas de envío. El empleado asignado con acceso vigente a la orden puede ver el lockbox asociado dentro de esa orden; registrar el acceso.
- **Trabajos adicionales:** el silencio del cliente JAMÁS constituye aprobación. Registrar por separado motivo, importe/estimación y autorización verificable cuando corresponda.
- **Control de versiones:** usar Git para el historial del proyecto y respetar siempre los cambios existentes. Antes de ejecutar `git add` o crear un commit, preguntar al usuario y esperar su aprobación explícita, incluso si parece necesario. No reescribir historia ni usar opciones destructivas/forzadas; preguntar también antes de publicar ramas o hacer `push`. Mantener secretos, dependencias instaladas, builds y datos locales fuera del repositorio mediante `.gitignore`.

## Reglas funcionales que deben preservarse

- Una solicitud no significa aceptación. No convertir automáticamente solicitudes o presupuestos en órdenes ni facturas.
- Una orden puede proceder de presupuesto aceptado o de acuerdo directo. Cancelar requiere motivo; un trabajo incompleto puede quedar pendiente o reprogramarse.
- Presupuestos, órdenes y facturas usan secuencias independientes por workspace, continuas desde 1, sin reinicio anual y con prefijos por tipo. Presupuestos vencen 15 días corridos después del envío; aceptación por enlace seguro solo mientras esté vigente.
- Mantener estados del trabajo separados de estados de facturación. Una factura anulada establece “Pendiente de Facturar” en la facturación de la orden sin alterar el estado del trabajo.
- El dueño configura la tasa de impuesto predeterminada y puede ajustarla por documento; calcular automáticamente cuando el documento sea gravable y guardar el snapshot aplicado.
- El impuesto se suma al subtotal, se redondea a dos decimales por documento y queda fijado al enviar presupuesto/emitir factura. Plazo de factura configurable por workspace, 30 días iniciales desde emisión, modificable por factura.
- Aplicar descuentos solo manualmente, como importe fijo o porcentaje.
- Al crear orden exigir destinatario/cliente, propiedad y alcance. Para borradores de presupuesto y factura exigir destinatario, propiedad y al menos una partida; permitir precios incompletos en borrador de presupuesto.
- En precio fijo, las horas no recalculan el precio; los cambios de alcance/precio requieren ajuste explícito con motivo. En tiempo y materiales, horas/materiales pueden justificar el importe.
- Permitir depósitos y facturación por etapas; registrar pagos fuera de la app, parciales y múltiples. Distribuir un pago entre varias facturas solo tras revisión y confirmación del dueño.
- Mantener historial de versiones, envíos y aceptación de presupuestos; cambiar una plantilla no altera documentos históricos.
- Los permisos se configuran por empleado; por defecto puede ver órdenes asignadas, actualizar avance y añadir notas, pero no modificar precio, alcance ni agenda. Fotos/videos requieren permiso explícito del dueño.
- Preservar el historial de relaciones con propiedades; un cambio de propietario/administradora no reasigna trabajos anteriores.
- Para propiedades administradas, el contacto/tenant de acceso de la orden es el destinatario predeterminado de recordatorios, no la administradora.
- Solicitudes de reprogramación/cancelación quedan pendientes de decisión del dueño; guardar historial de cambios. No cancelar automáticamente por falta de confirmación salvo configuración expresa.
- Guardar tiempos de citas/órdenes en UTC y mostrarlos en la zona horaria configurada para el workspace.
- Comprimir imágenes en el dispositivo antes de enviarlas; máximo 5 MB por foto. Videos opcionales con permiso del dueño, máximo 50 MB y 60 segundos por archivo.
- Aceptar JPEG, PNG y HEIC para fotos; MP4 y MOV para videos, respetando los límites establecidos.
- Informes distinguen facturado, cobrado y costos registrados; no presentarlos como contabilidad o preparación fiscal oficial.

## Criterio de implementación

Priorizar soluciones prácticas, claras y seguras que ayuden a administrar el negocio real. Consultar al usuario ante decisiones funcionales o técnicas no especificadas que afecten datos, permisos, dinero o alcance. Usar `handyman.txt` como fuente del alcance funcional vigente.
