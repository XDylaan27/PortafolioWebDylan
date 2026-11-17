# Cuenta Clara

Aplicación privada en `/lab/cuenta-clara`, reservada al propietario y una persona invitada. Cuatro clics en “contacto” dentro de tres segundos abren su dirección. El gesto no sustituye la autenticación ni los permisos de Supabase.

## Uso

1. El propietario inicia sesión y genera una invitación de siete días.
2. El invitado abre el enlace, inicia sesión y solicita acceso. El propietario comprueba el username antes de aprobarlo.
3. Se empieza con saldo cero. El propietario propone las deudas, incluido el saldo inicial; el invitado debe aceptarlas.
4. El invitado solicita abonos; el propietario los acepta o rechaza. El propietario también puede registrar directamente dinero recibido.
5. Las solicitudes pendientes, rechazadas y canceladas no cambian el saldo. Un abono mayor que la deuda genera saldo a favor del invitado.
6. Ambos pueden solicitar anular un movimiento confirmado. La otra persona decide. Aceptarlo crea una compensación inversa; el original nunca se borra.

Los rechazos y las solicitudes de anulación requieren motivo. Las solicitudes pendientes del propio usuario pueden cancelarse, conservando el historial. Para corregir una solicitud pendiente se cancela y se registra otra.

## Acceso y privacidad

El propietario se vincula por el UUID de su cuenta existente en la migración inicial, no por un username editable. Solo hay una cuenta y dos roles únicos: owner y debtor. Aprobar una admisión bloquea la cuenta y revoca las invitaciones; no permite un tercer participante.

Las invitaciones usan 32 bytes aleatorios, hash SHA-256 en la base de datos y token en el fragmento del enlace. El fragmento se retira de la barra al cargar y se conserva temporalmente en sessionStorage para completar el inicio de sesión. El token por sí solo no concede acceso. Generar otro enlace revoca el anterior.

El catálogo registra el proyecto con visibility=private; la portada filtra esa propiedad antes de aplicar las categorías. La ruta declara noindex. La dirección y el código del proyecto pueden conocerse: RLS y las RPC protegen los datos.

Los comprobantes usan el bucket privado cc-proofs, con una imagen JPEG, PNG o WebP de hasta 5 MB. La ruta vincula cuenta, autor y movimiento. Los participantes pueden obtener enlaces firmados de 60 segundos; otras cuentas no pueden leerlos. Los archivos adjuntos a movimientos no se sobrescriben ni eliminan desde el cliente.

## Backend

Tablas: cc_accounts, cc_members, cc_invitations, cc_join_requests, cc_movements, cc_void_requests y cc_events. cc_push_deliveries sigue las entregas del servidor.

Las únicas interfaces de contabilidad para el cliente son:

- cc_state(): estado autorizado, saldo como cadena de pesos, historial, solicitudes, participantes y avisos propios. Un tercero solo recibe su estado de solicitud, sin saldo ni movimientos.
- cc_action(p_action, p_payload): acciones join, read_events, invite_create, invite_revoke, join_decide, propose, decide, cancel, void_request, void_decide y void_cancel.

Las funciones públicas son SECURITY INVOKER y delegan en funciones privadas con autenticación y comprobaciones de rol. No hay permisos de escritura directa para authenticated. Las decisiones bloquean la cuenta para serializar operaciones; IDs de solicitud y restricciones únicas evitan duplicar movimientos y compensaciones.

Los montos se almacenan como bigint y se transmiten como cadenas. Cada movimiento admite de 1 a 999.999.999.999 pesos enteros. El saldo se calcula con los movimientos confirmados y se formatea con BigInt para evitar pérdida de precisión. La fecha de un movimiento no puede estar en el futuro; se usa America/Bogota como referencia.

Realtime escucha cambios autorizados. Al reconectar, recuperar visibilidad o actualizar manualmente se consulta nuevamente el estado. Las operaciones sin conexión se rechazan: no se guardan movimientos offline para enviarlos silenciosamente después.

## Avisos

Los dispositivos mantienen una sola suscripción Web Push en order_push_subscriptions. push_topic_preferences diferencia orders y cuenta-clara. set_push_topic permite cambiar únicamente las preferencias del dispositivo propio. Cuenta Clara exige ser miembro o haber solicitado admisión.

La Edge Function send-cuenta-clara comparte las claves VAPID existentes, pero tiene su propia cola y cron de un minuto. Solo usa mensajes genéricos, sin montos, conceptos ni comprobantes. El service worker admite únicamente los destinos conocidos de Pedidos y Cuenta Clara. Desactivar un tema no cancela el otro; cerrar sesión cancela la suscripción completa.

La aceptación del proveedor no garantiza que el sistema muestre el aviso. Cada participante debe activar las notificaciones en sus dispositivos y realizar la prueba real. En iPhone se requiere una instalación compatible en la pantalla de inicio.

## Verificación

Ejecutar npm run typecheck, npm run test:push, npm run build y npm audit. Comprobar las funciones con deno check usando supabase/functions/deno.json.

Las suites SQL de supabase/tests/ usan transacciones y rollback:

- cuenta_clara.sql: invitaciones, aprobaciones mutuas, ejemplo 50k/20k/40k, saldo a favor, duplicados, anulaciones, motivos, cancelación, permisos y comprobantes.
- cuenta_clara_push.sql: preferencias independientes, reservas, reintentos, deduplicación y privacidad de la cola.
- order_push_queue.sql: regresión de los recordatorios de Pedidos.

La suite de admisión debe ejecutarse antes de vincular al participante real. No crea deudas reales ni deja usuarios de prueba. La prueba final de recepción push requiere los dispositivos de ambos.

## Publicación y recuperación

Aplicar las migraciones incrementales y desplegar ambas funciones antes de publicar el frontend. La configuración privada existente en Vault permanece sin cambios. No se añaden nuevas credenciales públicas o privadas al repositorio.

La publicación del frontend incluye también los cambios previos pendientes del portafolio y de Pedidos de esta misma conversación. Comprobar en producción la entrada oculta, el noindex, el acceso anónimo y que Pedidos siga abriendo sus propios avisos.

Ante un problema de interfaz puede revertirse el despliegue conservando el historial de Supabase. No eliminar tablas ni movimientos para revertir una publicación.
