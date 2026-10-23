# Guía de Arquitectura y Contexto para Asistentes de IA (AGENTS.md)

Este documento contiene toda la información técnica, reglas de diseño, estructura de rutas y convenciones necesarias para que cualquier Inteligencia Artificial o desarrollador entienda el portafolio y pueda crear nuevos proyectos interactivos sin romper la arquitectura existente.

---

## 1. Información General y Repositorio

- **Propietario / Desarrollador:** Dylan
- **Nombre del Proyecto:** `PortafolioWebDylan`
- **Repositorio Remoto (GitHub):** `https://github.com/XDylaan27/PortafolioWebDylan.git`
- **Rama Principal:** `main`
- **Plataforma de Despliegue:** [Vercel](https://vercel.com) (despliegue continuo automático en cada `git push origin main`)
- **Stack Tecnológico:**
  - **Framework:** Next.js 15 (App Router)
  - **Librería UI:** React 19
  - **Lenguaje:** TypeScript 5.7+ (configuración estricta)
  - **Estilos:** Tailwind CSS v4 (`@tailwindcss/postcss`)
  - **Base de Datos & Realtime:** Supabase (`@supabase/supabase-js`)
  - **Iconografía:** Lucide React (`lucide-react`)
  - **Efectos:** `canvas-confetti`

---

## 2. Reglas de Oro para Asistentes de IA

Cualquier IA que genere o modifique código en este repositorio **DEBE** respetar estas directivas:

1. **PROHIBIDO EL USO DE EMOJIS:**
   - No usar emojis (🚫 nada de 🏆, 🔒, 🟢, 🎯, 🎉, etc.) en texto, botones, tooltips ni comentarios visibles.
   - En su lugar, **usar exclusivamente iconos vectoriales SVG de `lucide-react`** (ej: `Trophy`, `Lock`, `Target`, `Users`, `Radio`, `CheckCircle2`, `ArrowRight`, `Plus`, etc.).
2. **Arquitectura Modular por Subrutas (`/lab/[slug]`):**
   - El portafolio principal y los proyectos conviven en un solo despliegue.
   - Cada proyecto o experimento interactivo vive de forma aislada bajo `src/app/lab/[slug]/`.
   - Nunca crear proyectos en la raíz `src/app/` que colisionen con el portafolio editorial.
3. **Registro Obligatorio en `src/content/projects.ts`:**
   - Todo proyecto que se agregue al lab debe registrarse en el arreglo `PROJECTS` de `src/content/projects.ts` para que aparezca en el índice del portafolio.
4. **Verificación de Compilación Antes de Confirmar:**
   - Siempre verificar que `npm run build` compile sin errores de TypeScript ni de paquetes antes de hacer push.
5. **Variables de Entorno Públicas:**
   - Cualquier variable consumida en el navegador debe llevar el prefijo `NEXT_PUBLIC_` y configurarse como tipo **Config** en Vercel (nunca como *Secret*).

---

## 3. Estructura de Carpetas y Rutas

```text
PortafolioWebDylan/
├── .env.local                   # Credenciales locales de Supabase (ignorado en git)
├── .gitignore                   # Protección de credenciales y node_modules
├── next.config.ts               # Configuración de Next.js (devIndicators deshabilitados)
├── package.json                 # Dependencias y scripts
├── tsconfig.json                # Configuración TypeScript (alias @/* -> ./src/*)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Layout general de la aplicación (html, body, fuentes)
│   │   ├── globals.css          # Estilos globales y directivas de Tailwind v4
│   │   ├── page.tsx             # Portafolio Principal (Hero editorial, destacados y filtros)
│   │   │
│   │   ├── lab/                 # ZONA DE PROYECTOS INDEPENDIENTES
│   │   │   ├── layout.tsx       # Layout persistente para /lab/* con barra superior de retorno
│   │   │   │
│   │   │   ├── template-lab/    # Plantilla base para clonar nuevos proyectos
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── apuesta-puntaje/ # Proyecto: Apuestas y Quiniela en Vivo
│   │   │       ├── page.tsx     # Directorio de apuestas, filtros, búsqueda y formulario
│   │   │       └── [code]/
│   │   │           └── page.tsx # Sala en vivo con Supabase Realtime y podio
│   │   │
│   │   └── api/                 # ENDPOINTS BACKEND (Next.js Route Handlers)
│   │       └── bets/
│   │           ├── route.ts         # GET (listar apuestas), POST (crear apuesta)
│   │           └── [code]/route.ts  # GET (sala/participantes), POST (votar), PATCH (resolver)
│   │
│   ├── content/
│   │   └── projects.ts          # Metadata centralizada de los proyectos (PROJECTS array)
│   │
│   └── lib/
│       ├── supabase.ts          # Cliente singleton de Supabase (@supabase/supabase-js)
│       └── bets.ts              # Utilidades, cálculo de diferencias, hash SHA-256 y tipos
```

---

## 4. Base de Datos y Backend (Supabase)

El proyecto utiliza **Supabase** como BaaS (Backend-as-a-Service).

### Variables Requeridas en `.env.local` y Vercel:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://mpltesmsnwsxfkdmybbm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(En Vercel deben ser de tipo **Config** para permitir el prefijo `NEXT_PUBLIC_`).*

### Tablas Existentes en Postgres:
1. **`public.bet_rooms`**:
   - `id` (UUID, PK)
   - `code` (VARCHAR(12), UNIQUE): Código alfanumérico amigable de 6 caracteres (ej: `HA5FSH`).
   - `title` (TEXT): Nombre de la apuesta.
   - `description` (TEXT, Nullable): Reglas o detalles.
   - `creator_name` (TEXT): Nombre del creador.
   - `password_hash` (TEXT): Hash SHA-256 de la contraseña para resolver la sala.
   - `status` (TEXT): `'open'` o `'finished'`.
   - `final_score` (NUMERIC, Nullable): Resultado oficial final.
   - `created_at` (TIMESTAMPTZ).
2. **`public.bet_participants`**:
   - `id` (UUID, PK)
   - `room_id` (UUID, FK a `bet_rooms.id` ON DELETE CASCADE).
   - `name` (TEXT): Nombre del participante.
   - `predicted_score` (NUMERIC): Pronóstico secreto.
   - `created_at` (TIMESTAMPTZ).
   - `CONSTRAINT unique_room_participant UNIQUE(room_id, name)`: Evita nombres repetidos en la misma sala.

### Publicación Realtime:
Ambas tablas están agregadas a la publicación de Supabase:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.bet_rooms, public.bet_participants;
```

---

## 5. Protocolo para Crear un Nuevo Proyecto / Experimento

Cualquier chat o desarrollador que reciba la instrucción de añadir un nuevo proyecto debe seguir **estrictamente estos 4 pasos**:

### Paso 1: Crear la subruta bajo `src/app/lab/[nuevo-slug]/`
1. Crear la carpeta `src/app/lab/[nuevo-slug]/`.
2. Crear `page.tsx` con directiva `'use client';` si utiliza hooks interactivos.
3. El proyecto hereda automáticamente la cabecera con botón de "Volver al portafolio" provista por `src/app/lab/layout.tsx`.
4. Diseñar con estilos de Tailwind en modo oscuro (`bg-neutral-950`, bordes `border-neutral-800`, textos `text-white` y `text-neutral-400`).
5. Usar iconos de `lucide-react` para cada acción visual (nunca emojis).

### Paso 2: Registrar el proyecto en `src/content/projects.ts`
Abrir `src/content/projects.ts` y añadir la entrada al array `PROJECTS`:
```typescript
{
  slug: 'nombre-del-slug',
  title: 'Título Claro del Proyecto',
  category: 'web-app', // 'web-app' | 'tool' | 'ai' | 'experiment' | 'design-system'
  summary: 'Resumen conciso en una oración.',
  description: 'Descripción más amplia de las funcionalidades y tecnologías.',
  year: '2026',
  status: 'live',      // 'live' | 'wip' | 'concept'
  tags: ['Next.js', 'React', 'Tailwind'],
  featured: true,      // true si debe destacar en portada
}
```

### Paso 3: Integración de Backend o Base de Datos (Si aplica)
- Si el proyecto requiere persistencia, importar el cliente Supabase desde `@/lib/supabase`:
  ```typescript
  import { supabase } from '@/lib/supabase';
  ```
- Si requiere operaciones seguras de servidor o enmascaramiento de datos, crear Route Handlers bajo `src/app/api/[nombre-modulo]/route.ts`.

### Paso 4: Validar y Desplegar
Ejecutar en la terminal:
```bash
npm run build
```
Si el resultado es `✓ Compiled successfully`, hacer commit y push:
```bash
git add .
git commit -m "feat: add [nombre-del-proyecto] project to lab"
git push origin main
```
Vercel compilará y publicará la nueva subruta automáticamente.

---

## 6. Comandos de Terminal Habituales

| Acción | Comando PowerShell / Bash |
| :--- | :--- |
| Servidor de desarrollo | `npm run dev` (abre en `http://localhost:3000`) |
| Compilación de prueba | `npm run build` |
| Ver estado de Git | `git status` |
| Subir cambios a producción | `git add . ; git commit -m "mensaje" ; git push origin main` |

---

> **Nota para IAs:** Al interactuar con el usuario, mantener un tono técnico, claro y profesional. No usar emojis en las interfaces de código que generes.
