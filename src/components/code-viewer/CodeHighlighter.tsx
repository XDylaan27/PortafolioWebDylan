'use client';

import React, { useMemo } from 'react';

interface CodeHighlighterProps {
  code: string;
  language: 'javascript' | 'json' | 'env' | 'http';
  fontSize: number;
  wordWrap: boolean;
}

// Tokenizador seguro y rápido con los colores exactos de VS Code Dark+
function highlightLine(line: string, language: 'javascript' | 'json' | 'env' | 'http'): React.ReactNode[] {
  if (language === 'env') {
    // Archivos .env
    const commentMatch = line.match(/^(\s*#.*)$/);
    if (commentMatch) {
      return [<span key="comm" className="text-[#6a9955] italic">{line}</span>];
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx);
      const val = line.slice(eqIdx + 1);
      return [
        <span key="k" className="text-[#9cdcfe]">{key}</span>,
        <span key="eq" className="text-[#d4d4d4]">=</span>,
        <span key="v" className={/^\d+$/.test(val.trim()) ? "text-[#b5cea8]" : "text-[#ce9178]"}>{val}</span>
      ];
    }
    return [<span key="l" className="text-[#d4d4d4]">{line}</span>];
  }

  if (language === 'http') {
    // Peticiones HTTP
    if (line.startsWith('###')) {
      return [<span key="comm" className="text-[#6a9955] italic">{line}</span>];
    }
    const methodMatch = line.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(.+)$/);
    if (methodMatch) {
      return [
        <span key="m" className="text-[#4ec9b0] font-bold">{methodMatch[1]} </span>,
        <span key="u" className="text-[#9cdcfe]">{methodMatch[2]}</span>
      ];
    }
    if (line.includes(': ')) {
      const parts = line.split(': ');
      return [
        <span key="hk" className="text-[#9cdcfe]">{parts[0]}: </span>,
        <span key="hv" className="text-[#ce9178]">{parts.slice(1).join(': ')}</span>
      ];
    }
  }

  // Tokenizador para JavaScript y JSON
  // Manejo de comentarios completos de una línea
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//')) {
    const indent = line.slice(0, line.length - trimmed.length);
    return [
      indent,
      <span key="c" className="text-[#6a9955] italic">{trimmed}</span>
    ];
  }

  // Expresión regular para separar tokens manteniendo orden exacto
  const regex = /(\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:import|export|from|default|return|if|else|try|catch)\b)|(\b(?:const|let|var|async|await|function|class|new)\b)|(\b(?:true|false|null|undefined)\b)|(\b\d+\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())|([a-zA-Z_$][a-zA-Z0-9_$]*)|([^\s\w]+)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }

    const [
      full,
      comment,
      str,
      kwControl,
      kwDecl,
      boolVal,
      num,
      fnCall,
      ident
    ] = match;

    const key = `t-${match.index}`;

    if (comment) {
      nodes.push(<span key={key} className="text-[#6a9955] italic">{comment}</span>);
    } else if (str) {
      nodes.push(<span key={key} className="text-[#ce9178]">{str}</span>);
    } else if (kwControl) {
      nodes.push(<span key={key} className="text-[#c586c0] font-semibold">{kwControl}</span>);
    } else if (kwDecl) {
      nodes.push(<span key={key} className="text-[#569cd6] font-semibold">{kwDecl}</span>);
    } else if (boolVal) {
      nodes.push(<span key={key} className="text-[#569cd6]">{boolVal}</span>);
    } else if (num) {
      nodes.push(<span key={key} className="text-[#b5cea8]">{num}</span>);
    } else if (fnCall) {
      nodes.push(<span key={key} className="text-[#dcdcaa]">{fnCall}</span>);
    } else if (ident) {
      nodes.push(<span key={key} className="text-[#9cdcfe]">{ident}</span>);
    } else {
      nodes.push(<span key={key} className="text-[#d4d4d4]">{full}</span>);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : ['\u00A0'];
}

export default function CodeHighlighter({
  code,
  language,
  fontSize,
  wordWrap
}: CodeHighlighterProps) {
  const lines = useMemo(() => code.split('\n'), [code]);

  return (
    <div
      className={`font-mono select-text py-2 ${
        wordWrap ? 'w-full whitespace-pre-wrap break-words' : 'w-max min-w-full whitespace-pre'
      }`}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: `${Math.round(fontSize * 1.55)}px`
      }}
    >
      {lines.map((line, idx) => {
        const lineNum = idx + 1;
        return (
          <div key={idx} className="flex hover:bg-white/[0.03] group">
            {/* Número de línea fijo horizontalmente (sticky left) */}
            <span
              className="sticky left-0 z-10 bg-[#1e1e1e] w-10 sm:w-12 shrink-0 select-none text-right pr-3 text-[#858585] border-r border-[#333333] group-hover:text-[#c6c6c6] group-hover:bg-[#252526]"
            >
              {lineNum}
            </span>
            {/* Contenido de la línea */}
            <span className="pl-3 pr-4 flex-1">
              {highlightLine(line, language)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
