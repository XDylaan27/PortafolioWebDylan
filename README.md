# Portafolio y laboratorio de Dylan

[Sitio publicado](https://portafoliowebdylan.vercel.app/) · [Repositorio](https://github.com/XDylaan27/PortafolioWebDylan)

Portafolio editorial y aplicaciones pequeñas bajo un mismo dominio. La portada obtiene sus entradas de src/content/projects.ts. Cada aplicación vive en /lab/[slug] y comparte navegación y autenticación.

Stack: Next.js 15, React 19, TypeScript estricto, Tailwind CSS v4, Lucide React y Supabase (Auth, Postgres, Realtime, Storage y Edge Functions). Antes de modificar el proyecto, lee [AGENTS.md](AGENTS.md).

## Aplicaciones

| Ruta | Propósito |
| --- | --- |
| /lab/stoky-catalogo | Catálogo sincronizado con Supabase y carrito para pedidos por WhatsApp. |
| /lab/subtitulos | Interfaz móvil para hablar desde el celular y mostrar subtítulos en el portátil. |
| /lab/codigo-node | Visor de archivos de una clase de Node, Express y MySQL. |
| /lab/calculadora | HyperCalc: teclado, portapapeles, sonidos y animaciones. |
| /lab/pedidos-amigos | Amigos, pedidos, artículos, imágenes, pagos y recordatorios push por cuenta. |
| /lab/apuesta-puntaje | Salas de pronósticos numéricos con actualizaciones en vivo. |
| /lab/template-lab | Plantilla para nuevos experimentos. |

La dirección anterior /codigo-de-clase-node redirige a /lab/codigo-node. No registrar proyectos sin una página disponible.

Cuenta Clara es un módulo privado, excluido del índice público. Su flujo, permisos y operación se describen en [Cuenta Clara](docs/CUENTA_CLARA.md).

### Subtítulos: dos aplicaciones

Este repositorio contiene la parte del celular: captura el micrófono con Web Audio API, envía fragmentos de audio mediante Supabase Realtime Broadcast y permite ajustar la apariencia de los subtítulos. Recibe texto de vuelta como confirmación.

La otra mitad está instalada en el portátil, fuera de este repositorio: recibe el audio, lo transcribe y muestra los subtítulos en vivo. Ambas usan el mismo código de sala y conservan el protocolo de eventos (audio_chunk, subtitle_feedback, settings_update, mobile_ping, pc_pong). El audio sí transita por Supabase; este flujo no es completamente local.

## Preparación local

Se recomienda Node.js 22 LTS o posterior y npm.

    npm ci
    Copy-Item .env.example .env.local

La copia es solo para una instalación nueva: no sobrescribir un .env.local ya configurado. Completa sus variables con la URL y clave pública de PortafolioWebDatabase:

    NEXT_PUBLIC_SUPABASE_URL=https://mpltesmsnwsxfkdmybbm.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=clave_publica_del_proyecto

La clave pública llega al navegador por diseño: la protección de datos depende de permisos y RLS. Las credenciales privadas nunca deben llevar NEXT_PUBLIC_. El archivo .env.local está ignorado por Git.

    npm run dev
    npm run typecheck
    npm run test:push
    npm run build
    npm start

El último comando requiere compilar antes. typecheck verifica tipos; todavía no existe una configuración de ESLint. El override de PostCSS utiliza una versión corregida dentro de Next.js 15.

## Organización

- src/app/page.tsx: portada y filtros.
- src/app/lab/: aplicaciones y layout compartido.
- src/app/api/bets/: API de apuestas.
- src/app/api/supabase-ping/: comprobación de conexión.
- src/components/calculator/, code-viewer/, orders/: componentes por responsabilidad.
- src/content/: proyectos y código de clase estático.
- src/lib/: cliente Supabase, utilidades y suscripción push.
- public/sw.js: recepción de Web Push y apertura de pedidos.
- supabase/functions/: envío de recordatorios desde el servidor.
- supabase/migrations/: cambios SQL incrementales.
- supabase/tests/: pruebas SQL transaccionales.
- src/components/cuenta-clara/: interfaz privada de contabilidad y confirmaciones.
- tests/service-worker.test.cjs: recepción y apertura de avisos en el service worker.

## Persistencia

Tablas utilizadas: profiles; bet_rooms y bet_participants; friend_contacts, friend_orders, friend_order_items y friend_order_reminders; stoky_stickers; order_push_subscriptions y order_push_deliveries.

Cuenta Clara añade las tablas cc_*, y push_topic_preferences separa los avisos de cada proyecto. Las operaciones contables pasan por cc_state y cc_action, con RLS y escritura restringida a funciones verificadas.

Funciones previas: check_username_available, get_email_by_username y resolve_bet_room. Las imágenes de pedidos usan el bucket order-images.

La migración local de notificaciones es **incremental** y presupone las tablas históricas. No es una copia completa de la base de datos. Antes de reconstruirla, exportar también esquema, funciones, políticas RLS y configuración de Auth, Storage y Realtime.

## Recordatorios con la página cerrada

Supabase Cron consulta los recordatorios cada minuto e invoca send-order-reminders. Esta Edge Function envía Web Push; el navegador recibe el mensaje en su service worker sin necesitar una pestaña abierta.

En Pedidos con amigos > Recordatorios, activar las notificaciones en cada dispositivo. El botón de prueba realiza un envío desde el servidor. Desactivar los avisos de un proyecto no afecta al otro; al cerrar sesión se cancela la suscripción completa del navegador. Consulta [configuración y límites de Web Push](docs/PUSH_NOTIFICATIONS.md).

## Añadir un proyecto y publicar

1. Duplicar src/app/lab/template-lab/ con el nuevo slug.
2. Desarrollar con estilos oscuros y Lucide; separar responsabilidades en componentes.
3. Registrar metadatos en src/content/projects.ts cuando la ruta exista.
4. Versionar SQL y comprobar RLS si necesita persistencia.
5. Ejecutar npm run build antes de publicar.

Vercel despliega automáticamente los cambios subidos a main. Las variables NEXT_PUBLIC_* deben ser Config. Las claves privadas push permanecen en Supabase Vault; no se añaden a Vercel.

El cron de vercel.json conserva únicamente /api/supabase-ping. Cambiar archivos localmente no actualiza el sitio publicado; el frontend necesita el despliegue habitual.
