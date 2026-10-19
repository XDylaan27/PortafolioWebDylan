'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardPaste,
  Copy,
  Check,
  History,
  Volume2,
  VolumeX,
  RotateCcw,
  Delete,
  Calculator as CalcIcon,
} from 'lucide-react';
import { formatThousands, parsePastedInput, cleanFloat } from './calculatorUtils';
import { soundManager } from './soundEffects';
import GlassIcons, { GlassIconItem } from './GlassIcons';

interface HistoryItem {
  id: string;
  equation: string;
  result: string;
  timestamp: string;
}

export default function Calculator() {
  // Estado del display y operaciones
  const [currentValue, setCurrentValue] = useState<string>('0');
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [isNewNumber, setIsNewNumber] = useState<boolean>(true);
  const [lastAnswer, setLastAnswer] = useState<string>('0');

  // Historial y utilidades
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundManager.enabled = next;
      return next;
    });
  }, []);

  // Manejo de dígitos (0-9 y coma)
  const handleDigit = useCallback(
    (digit: string) => {
      soundManager.playKeyClick();

      if (isNewNumber) {
        if (digit === ',') {
          setCurrentValue('0,');
        } else {
          setCurrentValue(digit);
        }
        setIsNewNumber(false);
      } else {
        if (digit === ',') {
          if (!currentValue.includes(',')) {
            setCurrentValue((prev) => prev + ',');
          }
        } else {
          const rawDigits = currentValue.replace(/\D/g, '');
          if (rawDigits.length >= 16) return;
          setCurrentValue((prev) => (prev === '0' ? digit : prev + digit));
        }
      }
    },
    [currentValue, isNewNumber]
  );

  // Operadores (+, -, ×, ÷)
  const handleOperator = useCallback(
    (nextOp: string) => {
      soundManager.playOperatorClick();
      const currentNum = parseFloat(currentValue.replace(/\./g, '').replace(',', '.'));

      if (previousValue !== null && operation !== null && !isNewNumber) {
        const prevNum = parseFloat(previousValue);
        let calculated = 0;

        switch (operation) {
          case '+':
            calculated = cleanFloat(prevNum + currentNum);
            break;
          case '-':
            calculated = cleanFloat(prevNum - currentNum);
            break;
          case '×':
            calculated = cleanFloat(prevNum * currentNum);
            break;
          case '÷':
            if (currentNum === 0) {
              setCurrentValue('Error');
              setPreviousValue(null);
              setOperation(null);
              setIsNewNumber(true);
              return;
            }
            calculated = cleanFloat(prevNum / currentNum);
            break;
          default:
            calculated = currentNum;
        }

        const calcStr = calculated.toString().replace('.', ',');
        setCurrentValue(calcStr);
        setPreviousValue(calculated.toString());
      } else {
        setPreviousValue(currentValue.replace(/\./g, '').replace(',', '.'));
      }

      setOperation(nextOp);
      setIsNewNumber(true);
    },
    [currentValue, previousValue, operation, isNewNumber]
  );

  // Calcular resultado (=)
  const handleEquals = useCallback(() => {
    if (previousValue === null || operation === null) {
      soundManager.playKeyClick();
      return;
    }

    soundManager.playEqualsChime();

    const prevNum = parseFloat(previousValue);
    const currentNum = parseFloat(currentValue.replace(/\./g, '').replace(',', '.'));
    let calculated = 0;

    switch (operation) {
      case '+':
        calculated = cleanFloat(prevNum + currentNum);
        break;
      case '-':
        calculated = cleanFloat(prevNum - currentNum);
        break;
      case '×':
        calculated = cleanFloat(prevNum * currentNum);
        break;
      case '÷':
        if (currentNum === 0) {
          soundManager.playClearSound();
          setCurrentValue('Error');
          setPreviousValue(null);
          setOperation(null);
          setIsNewNumber(true);
          return;
        }
        calculated = cleanFloat(prevNum / currentNum);
        break;
      default:
        calculated = currentNum;
    }

    const calcStr = calculated.toString().replace('.', ',');
    const formattedResult = formatThousands(calcStr);
    const formattedPrev = formatThousands(previousValue.replace('.', ','));
    const formattedCurr = formatThousands(currentValue);

    const newHistoryItem: HistoryItem = {
      id: Date.now().toString(),
      equation: `${formattedPrev} ${operation} ${formattedCurr}`,
      result: formattedResult,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setHistory((prev) => [newHistoryItem, ...prev.slice(0, 19)]);
    setLastAnswer(calcStr);
    setCurrentValue(calcStr);
    setPreviousValue(null);
    setOperation(null);
    setIsNewNumber(true);
  }, [previousValue, operation, currentValue]);

  // Limpiar todo (AC)
  const handleAllClear = useCallback(() => {
    soundManager.playClearSound();
    setCurrentValue('0');
    setPreviousValue(null);
    setOperation(null);
    setIsNewNumber(true);
  }, []);

  // Borrar último dígito (Backspace)
  const handleBackspace = useCallback(() => {
    soundManager.playKeyClick();
    if (isNewNumber) return;
    if (currentValue.length <= 1 || currentValue === 'Error') {
      setCurrentValue('0');
      setIsNewNumber(true);
    } else {
      setCurrentValue((prev) => prev.slice(0, -1));
    }
  }, [currentValue, isNewNumber]);

  // Invertir signo (+/-)
  const handleToggleSign = useCallback(() => {
    soundManager.playKeyClick();
    if (currentValue === '0' || currentValue === 'Error') return;
    if (currentValue.startsWith('-')) {
      setCurrentValue((prev) => prev.slice(1));
    } else {
      setCurrentValue((prev) => '-' + prev);
    }
  }, [currentValue]);

  // Porcentaje (%)
  const handlePercentage = useCallback(() => {
    soundManager.playOperatorClick();
    const num = parseFloat(currentValue.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return;
    const result = cleanFloat(num / 100);
    setCurrentValue(result.toString().replace('.', ','));
    setIsNewNumber(true);
  }, [currentValue]);

  // Cuadrado (x²)
  const handleSquare = useCallback(() => {
    soundManager.playOperatorClick();
    const num = parseFloat(currentValue.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return;
    const result = cleanFloat(num * num);
    setCurrentValue(result.toString().replace('.', ','));
    setIsNewNumber(true);
  }, [currentValue]);

  // Raíz cuadrada (√)
  const handleSquareRoot = useCallback(() => {
    soundManager.playOperatorClick();
    const num = parseFloat(currentValue.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num) || num < 0) {
      setCurrentValue('Error');
      return;
    }
    const result = cleanFloat(Math.sqrt(num));
    setCurrentValue(result.toString().replace('.', ','));
    setIsNewNumber(true);
  }, [currentValue]);

  // Inverso (1/x)
  const handleInverse = useCallback(() => {
    soundManager.playOperatorClick();
    const num = parseFloat(currentValue.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num) || num === 0) {
      setCurrentValue('Error');
      return;
    }
    const result = cleanFloat(1 / num);
    setCurrentValue(result.toString().replace('.', ','));
    setIsNewNumber(true);
  }, [currentValue]);

  // Pegar número procesado
  const handlePasteRaw = useCallback((rawText: string) => {
    const parsed = parsePastedInput(rawText);
    if (parsed !== null) {
      soundManager.playPasteSound();
      const localized = parsed.replace('.', ',');
      setCurrentValue(localized);
      setIsNewNumber(false);
      setPasteNotice(`Número pegado: ${formatThousands(localized)}`);
      setTimeout(() => setPasteNotice(null), 2500);
    } else {
      soundManager.playClearSound();
      setPasteNotice('Formato numérico no válido');
      setTimeout(() => setPasteNotice(null), 2500);
    }
  }, []);

  const handlePasteClick = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        handlePasteRaw(text);
      } else {
        const promptVal = window.prompt('Pega aquí el número que deseas operar:');
        if (promptVal) handlePasteRaw(promptVal);
      }
    } catch {
      const promptVal = window.prompt('Pega aquí el número que deseas operar:');
      if (promptVal) handlePasteRaw(promptVal);
    }
  }, [handlePasteRaw]);

  const handleCopy = useCallback(async () => {
    try {
      soundManager.playKeyClick();
      const cleanNum = currentValue.replace(/\./g, '');
      await navigator.clipboard.writeText(cleanNum);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignorar
    }
  }, [currentValue]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '.' || e.key === ',') {
        handleDigit(',');
      } else if (e.key === '+' || e.key === '-') {
        handleOperator(e.key);
      } else if (e.key === '*') {
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleAllClear();
      }
    };

    const handleWindowPaste = (e: ClipboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const pasted = e.clipboardData?.getData('text');
      if (pasted) {
        e.preventDefault();
        handlePasteRaw(pasted);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [handleDigit, handleOperator, handleEquals, handleBackspace, handleAllClear, handlePasteRaw]);

  const displayValue = formatThousands(currentValue);

  const getFontSize = () => {
    const len = displayValue.length;
    if (len > 16) return 'text-2xl';
    if (len > 12) return 'text-3xl';
    return 'text-4xl';
  };

  // Botones de la Calculadora organizados para GlassIcons (7 columnas x 5 filas)
  const glassItems = useMemo<GlassIconItem[]>(
    () => [
      // FILA 1
      {
        id: 'par-open',
        icon: <span className="font-mono text-base font-semibold text-neutral-200">(</span>,
        color: 'graphite',
        label: '(',
        onClick: () => handleDigit('('),
      },
      {
        id: 'par-close',
        icon: <span className="font-mono text-base font-semibold text-neutral-200">)</span>,
        color: 'graphite',
        label: ')',
        onClick: () => handleDigit(')'),
      },
      {
        id: 'pct',
        icon: <span className="font-mono text-base font-semibold text-teal-300">%</span>,
        color: 'teal',
        label: '%',
        onClick: handlePercentage,
      },
      {
        id: 'ac',
        icon: <span className="font-mono text-sm font-bold text-rose-300">AC</span>,
        color: 'red',
        label: 'AC',
        onClick: handleAllClear,
      },
      {
        id: 'backspace',
        icon: <Delete className="w-5 h-5 text-amber-300" />,
        color: 'orange',
        label: 'Borrar',
        onClick: handleBackspace,
      },
      {
        id: 'paste',
        icon: (
          <div className="flex flex-col items-center justify-center text-emerald-300">
            <ClipboardPaste className="w-4 h-4" />
            <span className="text-[9px] font-bold mt-0.5">Pegar</span>
          </div>
        ),
        color: 'green',
        label: 'Pegar (Ctrl+V)',
        onClick: handlePasteClick,
      },
      {
        id: 'divide',
        icon: <span className="font-mono text-xl font-bold text-sky-200">÷</span>,
        color: 'blue',
        label: '÷',
        onClick: () => handleOperator('÷'),
      },

      // FILA 2
      {
        id: 'square',
        icon: <span className="font-mono text-sm font-medium text-teal-200">x²</span>,
        color: 'teal',
        label: 'x²',
        onClick: handleSquare,
      },
      {
        id: 'sqrt',
        icon: <span className="font-mono text-sm font-medium text-teal-200">√x</span>,
        color: 'teal',
        label: '√x',
        onClick: handleSquareRoot,
      },
      {
        id: 'sign',
        icon: <span className="font-mono text-base font-medium text-neutral-300">±</span>,
        color: 'graphite',
        label: '±',
        onClick: handleToggleSign,
      },
      {
        id: 'num-7',
        icon: <span className="font-mono text-xl font-bold text-white">7</span>,
        color: 'graphite',
        label: '7',
        onClick: () => handleDigit('7'),
      },
      {
        id: 'num-8',
        icon: <span className="font-mono text-xl font-bold text-white">8</span>,
        color: 'graphite',
        label: '8',
        onClick: () => handleDigit('8'),
      },
      {
        id: 'num-9',
        icon: <span className="font-mono text-xl font-bold text-white">9</span>,
        color: 'graphite',
        label: '9',
        onClick: () => handleDigit('9'),
      },
      {
        id: 'multiply',
        icon: <span className="font-mono text-xl font-bold text-sky-200">×</span>,
        color: 'blue',
        label: '×',
        onClick: () => handleOperator('×'),
      },

      // FILA 3
      {
        id: 'inverse',
        icon: <span className="font-mono text-xs font-medium text-teal-200">1/x</span>,
        color: 'teal',
        label: '1/x',
        onClick: handleInverse,
      },
      {
        id: 'num-00',
        icon: <span className="font-mono text-sm font-semibold text-neutral-200">00</span>,
        color: 'graphite',
        label: '00',
        onClick: () => {
          if (currentValue !== '0' && !isNewNumber) {
            handleDigit('0');
            handleDigit('0');
          }
        },
      },
      {
        id: 'ans',
        icon: <span className="font-mono text-xs font-bold text-purple-300">Ans</span>,
        color: 'purple',
        label: 'Ans',
        onClick: () => {
          if (lastAnswer !== '0') {
            setCurrentValue(lastAnswer);
            setIsNewNumber(true);
          }
        },
      },
      {
        id: 'num-4',
        icon: <span className="font-mono text-xl font-bold text-white">4</span>,
        color: 'graphite',
        label: '4',
        onClick: () => handleDigit('4'),
      },
      {
        id: 'num-5',
        icon: <span className="font-mono text-xl font-bold text-white">5</span>,
        color: 'graphite',
        label: '5',
        onClick: () => handleDigit('5'),
      },
      {
        id: 'num-6',
        icon: <span className="font-mono text-xl font-bold text-white">6</span>,
        color: 'graphite',
        label: '6',
        onClick: () => handleDigit('6'),
      },
      {
        id: 'subtract',
        icon: <span className="font-mono text-xl font-bold text-sky-200">-</span>,
        color: 'blue',
        label: '-',
        onClick: () => handleOperator('-'),
      },

      // FILA 4
      {
        id: 'copy',
        icon: copied ? (
          <Check className="w-5 h-5 text-emerald-400" />
        ) : (
          <Copy className="w-5 h-5 text-indigo-300" />
        ),
        color: 'indigo',
        label: 'Copiar',
        onClick: handleCopy,
      },
      {
        id: 'history-toggle',
        icon: <History className="w-5 h-5 text-purple-300" />,
        color: 'purple',
        label: 'Historial',
        onClick: () => setShowHistory((h) => !h),
      },
      {
        id: 'sound-toggle',
        icon: soundEnabled ? (
          <Volume2 className="w-5 h-5 text-teal-300" />
        ) : (
          <VolumeX className="w-5 h-5 text-neutral-500" />
        ),
        color: 'teal',
        label: 'Sonido',
        onClick: toggleSound,
      },
      {
        id: 'num-1',
        icon: <span className="font-mono text-xl font-bold text-white">1</span>,
        color: 'graphite',
        label: '1',
        onClick: () => handleDigit('1'),
      },
      {
        id: 'num-2',
        icon: <span className="font-mono text-xl font-bold text-white">2</span>,
        color: 'graphite',
        label: '2',
        onClick: () => handleDigit('2'),
      },
      {
        id: 'num-3',
        icon: <span className="font-mono text-xl font-bold text-white">3</span>,
        color: 'graphite',
        label: '3',
        onClick: () => handleDigit('3'),
      },
      {
        id: 'add',
        icon: <span className="font-mono text-xl font-bold text-sky-200">+</span>,
        color: 'blue',
        label: '+',
        onClick: () => handleOperator('+'),
      },

      // FILA 5
      {
        id: 'pi',
        icon: <span className="font-serif text-lg text-purple-300">π</span>,
        color: 'purple',
        label: 'π',
        onClick: () => {
          soundManager.playKeyClick();
          setCurrentValue('3,14159265');
          setIsNewNumber(true);
        },
      },
      {
        id: 'euler',
        icon: <span className="font-serif text-lg text-purple-300">e</span>,
        color: 'purple',
        label: 'e',
        onClick: () => {
          soundManager.playKeyClick();
          setCurrentValue('2,71828182');
          setIsNewNumber(true);
        },
      },
      {
        id: 'num-000',
        icon: <span className="font-mono text-xs font-semibold text-neutral-200">000</span>,
        color: 'graphite',
        label: '000',
        onClick: () => {
          if (currentValue !== '0' && !isNewNumber) {
            handleDigit('0');
            handleDigit('0');
            handleDigit('0');
          }
        },
      },
      {
        id: 'num-0',
        icon: <span className="font-mono text-xl font-bold text-white">0</span>,
        color: 'graphite',
        label: '0',
        onClick: () => handleDigit('0'),
      },
      {
        id: 'comma',
        icon: <span className="font-mono text-2xl font-bold text-white">,</span>,
        color: 'graphite',
        label: ',',
        onClick: () => handleDigit(','),
      },
      {
        id: 'ce',
        icon: <span className="font-mono text-xs font-bold text-rose-300">CE</span>,
        color: 'red',
        label: 'CE',
        onClick: () => {
          soundManager.playClearSound();
          setCurrentValue('0');
          setIsNewNumber(true);
        },
      },
      {
        id: 'equals',
        icon: <span className="font-mono text-2xl font-extrabold text-white">=</span>,
        color: 'blue',
        label: '=',
        onClick: handleEquals,
      },
    ],
    [
      handleDigit,
      handlePercentage,
      handleAllClear,
      handleBackspace,
      handlePasteClick,
      handleOperator,
      handleSquare,
      handleSquareRoot,
      handleToggleSign,
      handleInverse,
      currentValue,
      isNewNumber,
      lastAnswer,
      copied,
      handleCopy,
      soundEnabled,
      toggleSound,
      handleEquals,
    ]
  );

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
      {/* Barra de cabecera sutil */}
      <div className="mb-3 flex items-center justify-between border-b border-neutral-800/80 pb-2 text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-2">
          <CalcIcon className="h-4 w-4 text-sky-400" />
          <span className="font-semibold text-neutral-200 tracking-wide">Calculadora</span>
          {pasteNotice && (
            <span className="text-[11px] text-sky-400 font-normal">
              — {pasteNotice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSound}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-sky-400" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-neutral-500" />
            )}
            <span className="text-[11px] hidden sm:inline">{soundEnabled ? 'Sonido' : 'Mudo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1 transition-colors ${
              showHistory ? 'text-sky-400' : 'hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span className="text-[11px]">Historial</span>
          </button>
        </div>
      </div>

      {/* Pantalla / Display horizontal */}
      <div className="relative mb-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
        {/* Línea de operación previa */}
        <div className="flex h-5 items-center justify-end text-xs font-mono text-neutral-500">
          {previousValue !== null && operation !== null && (
            <span className="flex items-center gap-1.5">
              <span>{formatThousands(previousValue.replace('.', ','))}</span>
              <span className="text-sky-400 font-bold">{operation}</span>
            </span>
          )}
        </div>

        {/* Número actual con punto de mil cada tres ceros */}
        <div className="flex items-baseline justify-end overflow-hidden py-1">
          <div className={`font-mono font-medium tracking-tight text-white ${getFontSize()}`}>
            {displayValue}
          </div>
        </div>
      </div>

      {/* Historial flotante compacto si está abierto */}
      {showHistory && (
        <div className="mb-3 max-h-36 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 font-mono text-xs">
          <div className="mb-1.5 flex items-center justify-between border-b border-neutral-800 pb-1 text-neutral-400 text-[11px]">
            <span>Historial reciente</span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Borrar</span>
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="py-2 text-center text-neutral-500 text-[11px]">No hay operaciones registradas.</p>
          ) : (
            <div className="space-y-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    soundManager.playKeyClick();
                    setCurrentValue(item.result);
                    setIsNewNumber(true);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded px-2 py-1 hover:bg-neutral-800/80 transition-colors"
                >
                  <span className="text-neutral-400">{item.equation}</span>
                  <span className="font-semibold text-white">= {item.result}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Teclado con efecto GlassIcons (React Bits): Refracción WebGL2 y placa interactiva */}
      <div className="relative flex justify-center py-1">
        <GlassIcons
          items={glassItems}
          size={64}
          gap={8}
          columns={7}
          roundness={0.46}
          refraction={0.95}
          bevel={0.6}
          dispersion={0}
          frost={1}
          shine={1}
          tint="#dfdfdf"
          tintOpacity={0}
          iconColor="#ffffff"
          plate="tilt"
          tilt={0}
          spread={0.5}
          hover="press"
          parallax={1}
          labels="none"
          intro={false}
          theme="dark"
        />
      </div>
    </div>
  );
}
