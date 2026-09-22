# Portfolio & Lab Modular de Dylan

Portafolio web editorial y laboratorio de ideas independientes integradas bajo un único dominio con arquitectura por subrutas (`/lab/[slug]`).

Construido con **Next.js 15 (App Router)**, **React 19**, **TypeScript** y **Tailwind CSS**.

---

## 🚀 Cómo agregar un nuevo proyecto / experimento

Para crear un nuevo proyecto sin interferir con el portafolio ni requerir un nuevo dominio:

1. **Duplica la plantilla**:
   Copia la carpeta:
   `src/app/lab/template-lab/`
   Y renómbrala con el slug de tu nuevo proyecto (ej. `src/app/lab/mi-proyecto/`).

2. **Registra los metadatos**:
   Abre [`src/content/projects.ts`](file:///c:/Users/contr/Documents/PortafolioWebDylan/src/content/projects.ts) y añade una entrada al arreglo `PROJECTS`:
   ```ts
   {
     slug: 'mi-proyecto',
     title: 'Mi Nuevo Proyecto',
     category: 'web-app',
     summary: 'Descripción breve de lo que hace el proyecto.',
     description: 'Detalles ampliados...',
     year: '2026',
     status: 'live',
     tags: ['React', 'Next.js', 'Tailwind'],
     featured: true,
   }
   ```

3. **Desarrolla libremente**:
   Edita `src/app/lab/mi-proyecto/page.tsx`. Tu nuevo proyecto estará disponible instantáneamente en `http://localhost:3000/lab/mi-proyecto` y en producción.

---

## 🛠️ Comandos locales

- **Iniciar servidor de desarrollo**:
  ```bash
  npm run dev
  ```
  Abre [http://localhost:3000](http://localhost:3000) en el navegador.

- **Compilar para producción**:
  ```bash
  npm run build
  ```
