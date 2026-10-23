# Portfolio & Lab Modular de Dylan

> **Instrucciones para Asistentes de IA / Chats:**
> Si eres una IA (ChatGPT, Claude, Cursor, Copilot, Antigravity, etc.) interactuando con este repositorio, **lee primero [AGENTS.md](AGENTS.md)**. Allí se encuentran las reglas obligatorias de diseño (cero emojis, uso de Lucide React), la arquitectura modular de subrutas (`/lab/[slug]`), la configuración de Supabase y el protocolo para crear nuevos proyectos.

Portafolio web editorial y laboratorio de ideas interactivas independientes alojadas bajo un único dominio con arquitectura desacoplada por subrutas (`/lab/[slug]`).

Construido con **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4** y **Supabase**.

---

## Proyectos en el Lab

- **Apuesta & Quiniela de Puntajes** (`/lab/apuesta-puntaje`):
  Salas de apuestas numéricas en tiempo real con Supabase Realtime, pronósticos secretos y resolución protegida por contraseña de creador.
- **Template Base** (`/lab/template-lab`):
  Plantilla inicial con navegación integrada de retorno para clonar al crear nuevas ideas.

---

## Cómo agregar un nuevo proyecto / experimento

Para crear un nuevo proyecto sin interferir con el portafolio ni requerir un nuevo dominio:

1. **Crea la subruta**:
   Duplica la carpeta `src/app/lab/template-lab/` renombrándola con el slug de tu nuevo proyecto (ej. `src/app/lab/mi-proyecto/`).
2. **Registra los metadatos**:
   Abre [`src/content/projects.ts`](src/content/projects.ts) y añade la entrada al arreglo `PROJECTS`.
3. **Desarrolla**:
   Edita `src/app/lab/mi-proyecto/page.tsx`. Tu proyecto estará disponible instantáneamente en `http://localhost:3000/lab/mi-proyecto`.
4. **Regla de interfaz**:
   No uses emojis. Utiliza siempre iconos vectoriales SVG de `lucide-react`.

---

## Comandos locales

- **Iniciar servidor de desarrollo**:
  ```bash
  npm run dev
  ```
  Abre [http://localhost:3000](http://localhost:3000) en el navegador.

- **Compilar para producción**:
  ```bash
  npm run build
  ```

- **Subir cambios a producción (Vercel)**:
  ```bash
  git add . ; git commit -m "feat: nuevo proyecto" ; git push origin main
  ```
