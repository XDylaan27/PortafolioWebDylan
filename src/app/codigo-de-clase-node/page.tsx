'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, Settings, Globe } from 'lucide-react';
import { NODE_CLASS_FILES, FileItem } from '@/content/nodeClassCode';
import CodeHighlighter from '@/components/code-viewer/CodeHighlighter';

export default function CodigoDeClaseNodePage() {
  const [selectedPath, setSelectedPath] = useState<string>('src/controllers/productos.controller.js');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    'src': true,
    'src/config': true,
    'src/controllers': true,
    'src/routes': true,
  });
  const [fontSize, setFontSize] = useState<number>(12);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Archivo actual
  const activeFile: FileItem = NODE_CLASS_FILES.find((f) => f.path === selectedPath) || NODE_CLASS_FILES[0];

  const toggleFolder = (folderPath: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const selectFile = (path: string) => {
    setSelectedPath(path);
    setSidebarOpen(false);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.js')) {
      return <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400">JS</span>;
    }
    if (fileName.endsWith('.json')) {
      return <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">{'{}'}</span>;
    }
    if (fileName.endsWith('.env')) {
      return <Settings className="w-3.5 h-3.5 text-teal-400" />;
    }
    if (fileName.endsWith('.http')) {
      return <Globe className="w-3.5 h-3.5 text-purple-400" />;
    }
    return <FileCode className="w-3.5 h-3.5 text-neutral-400" />;
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#1e1e1e] text-[#d4d4d4] flex flex-col overflow-hidden font-sans select-none">
      
      {/* ====================================================================
          BARRA SUPERIOR (HEADER COMPACTO)
          ==================================================================== */}
      <header className="h-8 min-h-[32px] bg-[#333333] border-b border-[#2d2d2d] px-2 flex items-center justify-between text-xs z-30">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Botón de volver */}
          <Link
            href="/"
            className="flex items-center gap-1 text-neutral-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
            title="Volver al portafolio"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>

          {/* Botón de toggle en modo vertical */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sm:hidden px-2 py-0.5 rounded bg-[#252526] border border-[#444] text-[11px] text-white"
          >
            Carpetas
          </button>

          {/* Migas de pan / Ruta activa */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-neutral-300 truncate">
            <span className="text-teal-400 font-semibold">01-clase-CRUD-node</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-100">{activeFile.path}</span>
          </div>
          <span className="sm:hidden font-mono text-[11px] text-neutral-200 truncate">
            {activeFile.name}
          </span>
        </div>

        {/* Controles: A- / A+ y Wrap */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono">
          <div className="flex items-center bg-[#252526] border border-[#444] rounded overflow-hidden text-[11px]">
            <button
              onClick={() => setFontSize((s) => Math.max(9, s - 1))}
              className="px-2 py-0.5 hover:bg-[#37373d] active:bg-[#444] text-neutral-300 font-bold"
              title="Reducir fuente"
            >
              A-
            </button>
            <span className="px-1.5 text-[10px] text-neutral-400 min-w-[24px] text-center">
              {fontSize}px
            </span>
            <button
              onClick={() => setFontSize((s) => Math.min(20, s + 1))}
              className="px-2 py-0.5 hover:bg-[#37373d] active:bg-[#444] text-neutral-300 font-bold"
              title="Aumentar fuente"
            >
              A+
            </button>
          </div>

          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`px-2 py-0.5 rounded border text-[11px] transition-colors ${
              wordWrap
                ? 'bg-[#094771] border-[#007acc] text-white'
                : 'bg-[#252526] border-[#444] text-neutral-400 hover:text-neutral-200'
            }`}
            title="Alternar ajuste de línea"
          >
            Wrap
          </button>
        </div>
      </header>

      {/* ====================================================================
          CUERPO PRINCIPAL (2 COLUMNAS EN CELULAR HORIZONTAL)
          ==================================================================== */}
      <main className="flex-1 flex relative overflow-hidden">
        
        {/* Fondo oscuro para móvil vertical */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="sm:hidden fixed inset-0 top-8 bg-black/60 z-20 backdrop-blur-xs"
          />
        )}

        {/* ==================================================================
            COLUMNA IZQUIERDA: ÁRBOL DE CARPETAS
            ================================================================== */}
        <aside
          className={`
            w-52 min-w-[208px] max-w-[220px] bg-[#252526] border-r border-[#333333] flex flex-col shrink-0 z-20
            sm:relative sm:translate-x-0
            ${sidebarOpen ? 'absolute top-0 bottom-0 left-0 translate-x-0 shadow-2xl' : 'max-sm:-translate-x-full absolute top-0 bottom-0 left-0'}
            transition-transform duration-150 ease-out
          `}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-[#2d2d2d] border-b border-[#333333]">
            Explorador
          </div>

          <div className="flex-1 overflow-y-auto py-1 text-xs font-mono">
            
            {/* Carpeta: src */}
            <div>
              <div
                onClick={() => toggleFolder('src')}
                className="flex items-center gap-1.5 px-2 py-1 text-neutral-300 hover:bg-[#2a2d2e] cursor-pointer"
              >
                {openFolders['src'] ? (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                )}
                {openFolders['src'] ? (
                  <FolderOpen className="w-4 h-4 text-amber-300" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-300" />
                )}
                <span className="font-semibold">src</span>
              </div>

              {openFolders['src'] && (
                <div className="pl-3">
                  
                  {/* Subcarpeta: config */}
                  <div>
                    <div
                      onClick={() => toggleFolder('src/config')}
                      className="flex items-center gap-1.5 px-2 py-1 text-neutral-300 hover:bg-[#2a2d2e] cursor-pointer"
                    >
                      {openFolders['src/config'] ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                      <Folder className="w-3.5 h-3.5 text-amber-300" />
                      <span>config</span>
                    </div>

                    {openFolders['src/config'] && (
                      <div className="pl-4">
                        <div
                          onClick={() => selectFile('src/config/db.js')}
                          className={`flex items-center gap-2 px-2 py-1 cursor-pointer rounded-sm ${
                            selectedPath === 'src/config/db.js'
                              ? 'bg-[#094771] text-white font-medium'
                              : 'text-neutral-400 hover:bg-[#2a2d2e] hover:text-neutral-200'
                          }`}
                        >
                          {getFileIcon('db.js')}
                          <span>db.js</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subcarpeta: controllers */}
                  <div>
                    <div
                      onClick={() => toggleFolder('src/controllers')}
                      className="flex items-center gap-1.5 px-2 py-1 text-neutral-300 hover:bg-[#2a2d2e] cursor-pointer"
                    >
                      {openFolders['src/controllers'] ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                      <Folder className="w-3.5 h-3.5 text-amber-300" />
                      <span>controllers</span>
                    </div>

                    {openFolders['src/controllers'] && (
                      <div className="pl-4">
                        <div
                          onClick={() => selectFile('src/controllers/productos.controller.js')}
                          className={`flex items-center gap-2 px-2 py-1 cursor-pointer rounded-sm ${
                            selectedPath === 'src/controllers/productos.controller.js'
                              ? 'bg-[#094771] text-white font-medium'
                              : 'text-neutral-400 hover:bg-[#2a2d2e] hover:text-neutral-200'
                          }`}
                        >
                          {getFileIcon('productos.controller.js')}
                          <span className="truncate">productos.controller.js</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subcarpeta: routes */}
                  <div>
                    <div
                      onClick={() => toggleFolder('src/routes')}
                      className="flex items-center gap-1.5 px-2 py-1 text-neutral-300 hover:bg-[#2a2d2e] cursor-pointer"
                    >
                      {openFolders['src/routes'] ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                      <Folder className="w-3.5 h-3.5 text-amber-300" />
                      <span>routes</span>
                    </div>

                    {openFolders['src/routes'] && (
                      <div className="pl-4">
                        <div
                          onClick={() => selectFile('src/routes/productos.routes.js')}
                          className={`flex items-center gap-2 px-2 py-1 cursor-pointer rounded-sm ${
                            selectedPath === 'src/routes/productos.routes.js'
                              ? 'bg-[#094771] text-white font-medium'
                              : 'text-neutral-400 hover:bg-[#2a2d2e] hover:text-neutral-200'
                          }`}
                        >
                          {getFileIcon('productos.routes.js')}
                          <span className="truncate">productos.routes.js</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Archivo: src/index.js */}
                  <div
                    onClick={() => selectFile('src/index.js')}
                    className={`flex items-center gap-2 px-2 py-1 cursor-pointer rounded-sm ml-2 ${
                      selectedPath === 'src/index.js'
                        ? 'bg-[#094771] text-white font-medium'
                        : 'text-neutral-400 hover:bg-[#2a2d2e] hover:text-neutral-200'
                    }`}
                  >
                    {getFileIcon('index.js')}
                    <span>index.js</span>
                  </div>

                </div>
              )}
            </div>

            {/* Archivos en la raíz */}
            <div className="mt-1 pt-1 border-t border-[#333333]">
              <div
                onClick={() => selectFile('.env')}
                className={`flex items-center gap-2 px-3 py-1 cursor-pointer rounded-sm ${
                  selectedPath === '.env'
                    ? 'bg-[#094771] text-white font-medium'
                    : 'text-neutral-400 hover:bg-[#2a2d2e] hover:text-neutral-200'
                }`}
              >
                {getFileIcon('.env')}
                <span>.env</span>
              </div>

              <div
                onClick={() => selectFile('package.json')}
                className={`flex items-center gap-2 px-3 py-1 cursor-pointer rounded-sm ${
                  selectedPath === 'package.json'
                    ? 'bg-[#094771] text-white font-medium'
                    : 'text-neutral-400 hover:bg-[#2a2d2e] hover:text-neutral-200'
                }`}
              >
                {getFileIcon('package.json')}
                <span>package.json</span>
              </div>

              <div
                onClick={() => selectFile('peticiones.http')}
                className={`flex items-center gap-2 px-3 py-1 cursor-pointer rounded-sm ${
                  selectedPath === 'peticiones.http'
                    ? 'bg-[#094771] text-white font-medium'
                    : 'text-neutral-400 hover:bg-[#2a2d2e] hover:text-neutral-200'
                }`}
              >
                {getFileIcon('peticiones.http')}
                <span>peticiones.http</span>
              </div>
            </div>

          </div>
        </aside>

        {/* ==================================================================
            COLUMNA DERECHA: VISOR DE CÓDIGO
            ================================================================== */}
        <section className="flex-1 h-full overflow-auto bg-[#1e1e1e] relative">
          <CodeHighlighter
            code={activeFile.content}
            language={activeFile.language}
            fontSize={fontSize}
            wordWrap={wordWrap}
          />
        </section>

      </main>

      {/* ====================================================================
          BARRA DE ESTADO INFERIOR
          ==================================================================== */}
      <footer className="h-5 min-h-[20px] bg-[#007acc] text-white text-[10px] font-mono px-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <span>Node.js ESM</span>
          <span className="hidden sm:inline">01-clase-CRUD-node</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{activeFile.lines} líneas</span>
          <span>UTF-8</span>
        </div>
      </footer>

    </div>
  );
}
