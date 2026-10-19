// Utilidades para formateo de miles con punto y parsing inteligente de portapapeles

/**
 * Formatea una cadena numérica para mostrar separador de miles con punto (.)
 * y separador decimal con coma (,).
 * Ejemplo: "1250000" -> "1.250.000"
 * Ejemplo: "1250000.75" -> "1.250.000,75"
 */
export function formatThousands(valueStr: string): string {
  if (!valueStr || valueStr === 'Error' || valueStr === 'NaN' || valueStr === 'Infinity') {
    return valueStr || '0';
  }

  const isNegative = valueStr.startsWith('-');
  const raw = isNegative ? valueStr.slice(1) : valueStr;

  // Separar parte entera y decimal (usamos '.' o ',' internamente)
  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  const separator = hasComma ? ',' : hasDot ? '.' : null;

  let integerPart = raw;
  let decimalPart: string | null = null;

  if (separator) {
    const parts = raw.split(separator);
    integerPart = parts[0] || '0';
    decimalPart = parts.slice(1).join('');
  }

  // Quitar cualquier formateo previo que hubiera
  const cleanInt = integerPart.replace(/\D/g, '') || '0';

  // Aplicar punto cada 3 dígitos
  const formattedInt = cleanInt.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  let result = (isNegative ? '-' : '') + formattedInt;

  if (separator !== null) {
    // Si el usuario acaba de escribir el separador pero aún no hay decimales
    result += ',' + (decimalPart ?? '');
  }

  return result;
}

/**
 * Limpia y normaliza cualquier texto pegado (ej: "$ 1.250.000,50", "1500000.5", "  45.000 ")
 * Retorna un string numérico puro listo para operar (ej: "1250000.5") o null si no es un número.
 */
export function parsePastedInput(input: string): string | null {
  if (!input) return null;

  // Quitar signos de moneda, letras, espacios y caracteres extra
  let clean = input.trim().replace(/[$\s€£¥COPUSD]/gi, '');

  if (!clean) return null;

  // Manejar signo negativo
  const isNegative = clean.startsWith('-');
  if (isNegative) clean = clean.slice(1);

  // Si contiene ambos: '.' y ','
  const lastDot = clean.lastIndexOf('.');
  const lastComma = clean.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // Formato Europeo/Latino: 1.250.000,50
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato Anglosajón: 1,250,000.50
      clean = clean.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Solo contiene coma: "12,50" o "1,000,000"
    const afterComma = clean.slice(lastComma + 1);
    if (afterComma.length === 3 && (clean.match(/,/g) || []).length > 1) {
      // Miles con comas: 1,000,000
      clean = clean.replace(/,/g, '');
    } else {
      // Coma como decimal: 12,5
      clean = clean.replace(',', '.');
    }
  } else if (lastDot !== -1) {
    // Solo contiene puntos: "1.000.000" o "1.000" o "3.14"
    const dotCount = (clean.match(/\./g) || []).length;
    const afterDot = clean.slice(lastDot + 1);

    if (dotCount > 1 || (dotCount === 1 && afterDot.length === 3 && !clean.includes('e'))) {
      // Son puntos de miles: 1.000 o 1.000.000
      clean = clean.replace(/\./g, '');
    } else {
      // Es punto decimal: 3.14 o 0.5
      // Dejar el punto tal cual
    }
  }

  // Validar si es un número válido
  const num = parseFloat(clean);
  if (isNaN(num)) return null;

  // Retornar en representación limpia
  return (isNegative ? '-' : '') + clean;
}

/**
 * Corrige imprecisiones de coma flotante de JS (ej: 0.1 + 0.2 = 0.30000000000000004 -> 0.3)
 */
export function cleanFloat(num: number): number {
  return parseFloat(num.toPrecision(12));
}
