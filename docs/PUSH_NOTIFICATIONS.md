# Recordatorios Web Push

## Uso

En Pedidos con amigos > Recordatorios, pulsa **Activar notificaciones** en cada dispositivo, concede el permiso y pulsa **Probar notificación push**. La prueba recorre servidor, proveedor push y dispositivo; no simula una notificación local. Está limitada a una por minuto y dispositivo.

Cuenta Clara reutiliza las claves y las suscripciones del dispositivo con preferencias separadas en push_topic_preferences. Sus avisos se envían desde send-cuenta-clara. Desactivar un proyecto solo cambia su preferencia; cerrar sesión desactiva la suscripción completa. Ver [Cuenta Clara](CUENTA_CLARA.md).

Programa después un recordatorio para unos minutos más tarde y cierra la pestaña. El envío tiene una resolución aproximada de un minuto, más la demora del proveedor y del sistema operativo. Al cerrar sesión se cancela la suscripción de ese navegador. Desactivar las notificaciones dentro de la aplicación cancela la suscripción sin cambiar el permiso global del navegador.

## Flujo del servidor

Supabase Cron ejecuta `private.dispatch_order_reminders()` cada minuto. Solo invoca la Edge Function cuando hay recordatorios vencidos y dispositivos suscritos. `send-order-reminders` verifica el secreto del cron y reserva hasta 25 entregas, procesadas en grupos de cinco. El navegador recibe el mensaje cifrado mediante su service worker sin necesitar la página abierta.

Al pulsar el aviso se abre `/lab/pedidos-amigos?action=new-order`. El frontend consulta el estado visual periódicamente, pero no dispara ni marca los envíos.

## Configuración privada

Supabase Vault contiene el secreto JSON `order_push_config`:

| Campo | Uso |
| --- | --- |
| `public_key` | Clave VAPID pública para suscribirse. |
| `private_key` | Clave privada para firmar los envíos. |
| `subject` | URL HTTPS o contacto válido del responsable. |
| `cron_secret` | Token aleatorio que autoriza el trabajo programado. |
| `function_url` | URL HTTPS de la Edge Function del proyecto. |

La copia opcional `ORDER_PUSH_CONFIG` de `.env.local` es privada. No publicarla ni agregarla a Git. El frontend no lee esta variable. La Edge Function usa sus credenciales internas de Supabase; no hace falta recuperar service_role en el portátil ni añadir secretos push a Vercel.

Las RPC `get_order_push_config`, `claim_order_push_deliveries` y `complete_order_push_delivery` no pueden ejecutarse con anon o authenticated. `get_order_push_public_key` solo devuelve la clave pública a cuentas autenticadas. Su acceso privilegiado a Vault está limitado a ese campo: no ampliar su respuesta para incluir el JSON completo.

No regenerar VAPID en cada despliegue. Cambiar sus claves obliga a volver a suscribir dispositivos; el botón de activación detecta cambios de clave.

## Despliegue y recuperación

La migración `supabase/migrations/*_order_reminders_web_push.sql` presupone las tablas históricas de pedidos; ya está aplicada en el proyecto existente. No es una restauración completa del esquema.

En una instalación nueva, restaurar primero las tablas y políticas históricas, aplicar la migración push, configurar el secreto de Vault por un canal privado y desplegar la función:

    npx supabase functions deploy send-order-reminders --project-ref mpltesmsnwsxfkdmybbm

La configuración versionada usa verify_jwt=false porque la función valida dos autorizaciones: JWT de usuario para las pruebas y secreto de cron para despachar. No eliminar estas validaciones internas.

Los crons `order-reminders-web-push` y `cuenta-clara-web-push` usan `* * * * *` y no dependen de Vercel. Los cambios en la interfaz y el service worker sí necesitan desplegar el frontend. Para actualizar las funciones hay que desplegar ambas; comparten el módulo de cifrado _shared/web-push.ts.

## Entregas y reintentos

- Una entrega corresponde a un recordatorio, dispositivo y fecha programada.
- La reserva de dos minutos y el bloqueo de filas evitan procesar simultáneamente la misma entrega.
- Los fallos se reintentan con espera creciente, hasta una hora entre intentos. Los endpoints con respuesta 404 o 410 se eliminan.
- Editar o reprogramar invalida las entregas anteriores. Borrar el recordatorio cancela pendientes por cascada. Un aviso que ya haya salido no puede retirarse del proveedor.
- `notified=true` significa que los proveedores aceptaron el aviso para todos los dispositivos vigentes. **Enviado** no es una confirmación de lectura.
- Sin suscripción o ante un fallo, el recordatorio queda pendiente. Los avisos vencidos pendientes pueden enviarse al activar después un dispositivo.
- Un fallo entre aceptación del proveedor y registro del resultado puede causar un reintento. El tag estable reduce notificaciones duplicadas.

## Límites

Se necesita HTTPS, permiso de notificaciones y Push API. En iPhone/iPad hay que instalar la web en pantalla de inicio y usar una versión compatible. No molestar, ahorro de batería, falta de conexión, permisos del sistema o forzar el cierre del navegador pueden retrasar o bloquear la recepción.

El service worker no implementa modo offline: consultar y guardar pedidos requiere red.

## Diagnóstico

1. Confirmar la suscripción del dispositivo y ejecutar la prueba push.
2. Revisar el historial de Cron y las respuestas de `net._http_response`.
3. Consultar los logs de `send-order-reminders` sin registrar claves, endpoints ni notas.
4. Revisar intentos, reservas y envíos en `order_push_deliveries`, accesible solo desde el servidor.
5. Ejecutar `supabase/tests/order_push_queue.sql`: usa una transacción y rollback, sin enviar mensajes.

El asesor puede señalar RLS sin políticas en order_push_deliveries: es intencional, pues no tiene acceso de cliente. La RPC pública de clave VAPID solo expone información pública. No quitar controles para silenciar avisos.
