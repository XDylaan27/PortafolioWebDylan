# Guía de arquitectura para asistentes

## Contexto

- Propietario: Dylan. Proyecto: PortafolioWebDylan.
- Producción: https://portafoliowebdylan.vercel.app/
- Repositorio: https://github.com/XDylaan27/PortafolioWebDylan.git
- Rama principal: main. Un push a main activa el despliegue de Vercel.
- Stack: Next.js 15 App Router, React 19, TypeScript estricto, Tailwind CSS v4, Supabase y Lucide React.

## Reglas obligatorias

1. No usar emojis en interfaces, textos, botones, tooltips ni comentarios. Usar iconos SVG de lucide-react para acciones visuales y verificar que existan en la versión instalada.
2. Cada proyecto vive en src/app/lab/[slug]/. No crear aplicaciones nuevas fuera de /lab. El layout compartido añade navegación de retorno y autenticación.
3. Registrar cada aplicación en src/content/projects.ts. No enlazar entradas sin una ruta implementada.
4. Ejecutar npm run build y corregir errores antes de hacer push. npm run typecheck también está disponible; no afirmar que existe ESLint.
5. Variables de navegador: prefijo NEXT_PUBLIC_, tipo Config en Vercel. Nunca exponer claves privadas, service_role ni credenciales de envío con ese prefijo.
6. Mantener .env.local ignorado por Git y .env.example libre de secretos.
7. Usar Tailwind oscuro en el laboratorio: bg-neutral-950, border-neutral-800, text-white y text-neutral-400. Conservar los temas propios de herramientas existentes.
8. Separar responsabilidades cuando una página combine muchos flujos. Evitar refactorizaciones masivas ajenas a la tarea.

## Organización actual

- src/app/page.tsx: portada editorial y filtros.
- src/app/layout.tsx, globals.css, manifest.ts: base y PWA.
- src/app/lab/layout.tsx: navegación compartida y autenticación.
- Aplicaciones: stoky-catalogo, subtitulos, codigo-node, calculadora, pedidos-amigos, apuesta-puntaje y template-lab.
- Cuenta Clara: /lab/cuenta-clara, aplicación privada registrada con visibility=private y excluida de todos los listados públicos. Mantener noindex, entrada de cuatro clics en contacto y autorización real en Supabase.
- src/app/codigo-de-clase-node/: redirección heredada a /lab/codigo-node.
- src/app/api/bets/: listar, crear, participar y resolver salas.
- src/app/api/supabase-ping/: comprobación de conexión.
- src/components/: autenticación, PWA y carpetas calculator, code-viewer y orders.
- src/content/: catálogo de proyectos y archivos estáticos de clase.
- src/lib/: cliente Supabase, apuestas, catálogo y suscripción push.
- public/sw.js: recepción de Web Push.
- supabase/functions/, migrations/, tests/: backend de recordatorios y pruebas.
- docs/PUSH_NOTIFICATIONS.md: configuración, límites y diagnóstico.

## Supabase

Proyecto PortafolioWebDatabase, referencia mpltesmsnwsxfkdmybbm. Configuración local:

    NEXT_PUBLIC_SUPABASE_URL=https://mpltesmsnwsxfkdmybbm.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=clave_publica

Importar el cliente desde @/lib/supabase. Pedidos usa Auth y RLS por user_id; los filtros del cliente no sustituyen la autorización.

Tablas: profiles; bet_rooms y bet_participants; friend_contacts, friend_orders, friend_order_items y friend_order_reminders; stoky_stickers; order_push_subscriptions y order_push_deliveries. También existe usuarios, ajena a pedidos.

Cuenta Clara usa las tablas cc_*, el bucket privado cc-proofs y las RPC cc_state/cc_action. No permitir escritura directa ni edición de movimientos confirmados. Las anulaciones aceptadas generan compensaciones. Mantener montos enteros transmitidos como cadenas y saldo calculado con precisión BigInt. Ver docs/CUENTA_CLARA.md.

RPC previas: check_username_available, get_email_by_username, resolve_bet_room. Bucket de imágenes: order-images. La migración push es incremental; no reconstruye las tablas históricas.

Para cambios SQL, crear una migración con Supabase CLI, revisar privilegios, RLS e índices, aplicarla y comprobar el resultado. Nunca guardar secretos en SQL versionado.

## Recordatorios Web Push

- La programación corre cada minuto en Supabase Cron, no en el navegador ni en Vercel.
- send-order-reminders autoriza el cron con un secreto privado y las pruebas con el JWT verificado del usuario. verify_jwt=false permite ambos mecanismos; nunca eliminar la autenticación interna.
- Supabase Vault guarda el JSON order_push_config con claves VAPID y secreto de cron. La copia local ORDER_PUSH_CONFIG es privada y opcional para recuperación.
- get_order_push_public_key solo devuelve la clave pública a usuarios autenticados.
- get_order_push_config, claim_order_push_deliveries y complete_order_push_delivery son exclusivos de service_role.
- Las suscripciones son privadas por usuario. Las entregas no tienen políticas de cliente deliberadamente: solo las procesa el servidor.
- La cola reserva entregas por dispositivo, reintenta fallos y elimina endpoints caducados. Enviado significa aceptación del proveedor, no lectura.
- Los dispositivos se comparten entre proyectos mediante push_topic_preferences (orders y cuenta-clara). Desactivar un tema no debe cancelar el otro. Cuenta Clara tiene su propia función send-cuenta-clara y solo envía texto genérico sin datos financieros.
- No reintroducir temporizadores de frontend como mecanismo de notificación. Un intervalo para refrescar el estado visual es válido.
- La recepción depende de permisos, red y ajustes del sistema. En iPhone se requiere instalación en pantalla de inicio y una versión compatible.

## Contrato de subtítulos

Este repositorio contiene solo la parte del celular. La aplicación independiente del portátil recibe el audio, lo transcribe y muestra los subtítulos. El audio se transporta mediante Supabase Realtime Broadcast. Conservar formatos y nombres de eventos: audio_chunk, subtitle_feedback, settings_update, mobile_ping y pc_pong. No afirmar que el audio nunca pasa por servidores externos.

## Crear una aplicación

1. Crear src/app/lab/[slug]/page.tsx desde la plantilla. Añadir use client si necesita interacción en el navegador.
2. Mantener navegación compartida, diseño oscuro e iconos Lucide.
3. Registrar título, categoría, resumen, descripción, año, estado, etiquetas y destacado en PROJECTS.
4. Usar Route Handlers bajo src/app/api/[modulo]/ o funciones Supabase según el flujo. Versionar SQL y verificar controles de acceso.
5. Ejecutar npm run build y revisar el diff antes de publicar. No incluir .env.local.

## Verificación

    npm ci
    npm run typecheck
    npm run test:push
    npm run build
    npm audit

Para push, ejecutar además las pruebas SQL transaccionales y comprobar función desplegada, cron y recepción en un dispositivo suscrito. No confundir una respuesta aceptada con una notificación efectivamente mostrada.
