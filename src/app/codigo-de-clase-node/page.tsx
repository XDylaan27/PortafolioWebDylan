'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  Settings,
  Globe
} from 'lucide-react';
import { NODE_CLASS_FILES, FileItem } from '@/content/nodeClassCode';
import CodeHighlighter from '@/components/code-viewer/CodeHighlighter';

export default function CodigoDeClaseNodePage() {
  const [selectedPath, setSelectedPath] = useState<string>('src/controllers/productos.controller.js');
  const [isExplorerOpen, setIsExplorerOpen] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    'src': true,
    'src/config': true,
    'src/controllers': true,
    'src/routes': true,
  });
  const [fontSize, setFontSize] = useState<number>(12);
  const [wordWrap, setWordWrap] = useState<boolean>(false);

  // Archivo actual
  const activeFile: FileItem =
    NODE_CLASS_FILES.find((f) => f.path === selectedPath) || NODE_CLASS_FILES[0];

  const toggleFolder = (folderPath: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const selectFile = (path: string) => {
    setSelectedPath(path);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.js')) {
      return (
        <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
          JS
        </span>
      );
    }
    if (fileName.endsWith('.json')) {
      return (
        <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">
          {'{}'}
        </span>
      );
    }
    if (fileName.endsWith('.env')) {
      return <Settings className="w-3.5 h-3.5 text-teal-400 shrink-0" />;
    }
    if (fileName.endsWith('.http')) {
      return <Globe className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    }
    return <FileCode className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#1e1e1e] text-[#d4d4d4] flex overflow-hidden font-sans select-none z-50">
      
      {/* ====================================================================
          COLUMNA IZQUIERDA: EXPLORADOR DE ARCHIVOS (COLAPSABLE)
          ==================================================================== */}
      {isExplorerOpen && (
        <aside className="w-56 min-w-[220px] max-w-[240px] bg-[#252526] border-r border-[#333333] flex flex-col shrink-0 h-full overflow-hidden relative">
          
          {/* Cabecera del Explorador con Menú de 3 puntos y botón para colapsar */}
          <div className="h-8 min-h-[32px] px-2.5 bg-[#2d2d2d] border-b border-[#333333] flex items-center justify-between relative">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Explorador
            </span>

            <div className="flex items-center gap-1">
              {/* Botón de 3 puntos con opciones A-, A+, Wrap */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-1 rounded hover:bg-[#3e3e42] text-neutral-400 hover:text-white transition-colors ${
                  menuOpen ? 'bg-[#3e3e42] text-white' : ''
                }`}
                title="Opciones de visualización"
                aria-label="Opciones"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Botón para esconder/colapsar el explorador */}
              <button
                onClick={() => setIsExplorerOpen(false)}
                className="p-1 rounded hover:bg-[#3e3e42] text-neutral-400 hover:text-white transition-colors"
                title="Ocultar explorador"
                aria-label="Ocultar explorador"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Menú flotante de los 3 puntos */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-1 top-8.5 z-50 bg-[#252526] border border-[#444] rounded shadow-2xl p-2.5 min-w-[170px] space-y-2 text-xs font-sans">
                  
                  {/* Control A- / A+ */}
                  <div>
                    <span className="text-[10px] uppercase text-neutral-400 font-semibold block mb-1">
                      Tamaño de fuente
                    </span>
                    <div className="flex items-center justify-between bg-[#1e1e1e] border border-[#3e3e42] rounded px-1 py-0.5">
                      <button
                        onClick={() => setFontSize((s) => Math.max(9, s - 1))}
                        className="px-2 py-0.5 hover:bg-white/10 rounded font-bold text-neutral-200"
                      >
                        A-
                      </button>
                      <span className="text-neutral-300 font-mono text-[11px]">
                        {fontSize}px
                      </span>
                      <button
                        onClick={() => setFontSize((s) => Math.min(20, s + 1))}
                        className="px-2 py-0.5 hover:bg-white/10 rounded font-bold text-neutral-200"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Control Wrap */}
                  <div className="pt-1.5 border-t border-[#3e3e42]">
                    <button
                      onClick={() => setWordWrap(!wordWrap)}
                      className={`w-full py-1 px-2 rounded text-left flex items-center justify-between transition-colors ${
                        wordWrap
                          ? 'bg-[#094771] text-white'
                          : 'hover:bg-white/5 text-neutral-300'
                      }`}
                    >
                      <span>Ajuste (Wrap)</span>
                      <span className="text-[10px] font-mono font-bold">
                        {wordWrap ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>

                  {/* Volver al portafolio */}
                  <div className="pt-1.5 border-t border-[#3e3e42]">
                    <Link
                      href="/"
                      className="flex items-center gap-1.5 text-neutral-400 hover:text-white py-1 px-2 rounded hover:bg-white/5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Volver al portafolio</span>
                    </Link>
                  </div>

                </div>
              </>
            )}
          </div>

          {/* Árbol de Carpetas con scroll solo en la lista */}
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
      )}

      {/* ====================================================================
          COLUMNA DERECHA: VISOR DE CÓDIGO
          ==================================================================== */}
      <section className="flex-1 h-full overflow-hidden bg-[#1e1e1e] relative flex flex-col">
        
        {/* Botón flotante para reabrir el explorador cuando esté cerrado */}
        {!isExplorerOpen && (
          <button
            onClick={() => setIsExplorerOpen(true)}
            className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#252526]/90 hover:bg-[#333333] border border-[#444444] text-neutral-200 text-xs shadow-lg backdrop-blur-xs transition-colors"
            title="Abrir explorador"
          >
            <PanelLeftOpen className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-sans font-medium text-[11px]">Explorador</span>
          </button>
        )}

        {/* Contenedor del código con scroll interno propio */}
        <div className="flex-1 h-full overflow-auto bg-[#1e1e1e] p-0 m-0">
          <CodeHighlighter
            code={activeFile.content}
            language={activeFile.language}
            fontSize={fontSize}
            wordWrap={wordWrap}
          />
        </div>

      </section>

    </div>
  );
}
