import type { Clue, DayPuzzle } from '../../types/game';
import { toPuzzleText } from '../clueLabels';

const STOPWORDS = new Set<string>([
  'DE',
  'DEL',
  'LA',
  'EL',
  'LOS',
  'LAS',
  'UN',
  'UNA',
  'UNOS',
  'UNAS',
  'EN',
  'CON',
  'SIN',
  'POR',
  'PARA',
  'NO',
  'ES',
  'FUE',
  'QUE',
  'AL',
  'LO',
  'SE',
  'SU',
  'SUS',
  'MAS',
  'COMO',
  'ENTRE',
  'SOBRE',
  'TODO',
  'TODA',
  'ESTA',
  'HASTA',
  'DESDE',
  'QUIEN',
  'CUAL',
  'BIEN',
  'PERO',
  'SOLO',
  'SON',
  'SER',
  'ERA',
  'HABIA',
  'PUDO',
  'TIENE',
  'TENIA',
  'OTRO',
  'OTRA',
]);

// Meta-palabras de estado o etiquetas genéricas que no deben inyectarse como sustantivos
// jugables en la Sopa de Letras, Crucigrama o Encajados.
const META_LABEL_WORDS = new Set<string>([
  'DESCARTADO',
  'DESCARTADA',
  'DESCARTA',
  'DESCARTAN',
  'CONFIRMADO',
  'CONFIRMADA',
  'CONFIRMA',
  'CONFIRMAN',
  'RASGO',
  'RASGOS',
  'RASTRO',
  'RASTROS',
  'HALLADO',
  'HALLADA',
  'HALLADOS',
  'ACREDITADO',
  'ACREDITADA',
  'ACOTADA',
  'ACOTADO',
  'NIVEL',
  'CATEGORIA',
  'MATERIAL',
  'PATRON',
  'RESIDUO',
  'RESIDUOS',
  'SUELO',
  'CIERRE',
  'AMBIENTE',
  'ACCESO',
  'MOVIL',
  'MANO',
  'DOMINANTE',
  'EDAD',
  'AÑOS',
  'ANOS',
  'VISIBLE',
  'DISTINTIVO',
  'DISTINTIVOS',
  'NINGUN',
  'NINGUNO',
  'NINGUNA',
  'PERSONA',
  'GENERO',
  'SECTOR',
  'PRESENCIA',
  'UBICACION',
  'LESION',
  'HERIDA',
  'FORENSE',
  'PERICIAL',
  'INDICIO',
  'INDICIOS',
  'SOSPECHOSO',
  'SOSPECHOSA',
  'CULPABLE',
  'ARMA',
  'ESTANCIA',
  'INSTRUMENTO',
  'OCULTABLE',
  'VOLUMINOSA',
  'PESADA',
]);

const DIGIT_WORDS: Record<number, string> = {
  0: 'CERO',
  1: 'UNO',
  2: 'DOS',
  3: 'TRES',
  4: 'CUATRO',
  5: 'CINCO',
  6: 'SEIS',
  7: 'SIETE',
  8: 'OCHO',
  9: 'NUEVE',
  10: 'DIEZ',
  11: 'ONCE',
  12: 'DOCE',
  13: 'TRECE',
  14: 'CATORCE',
  15: 'QUINCE',
  16: 'DIECISEIS',
  17: 'DIECISIETE',
  18: 'DIECIOCHO',
  19: 'DIECINUEVE',
  20: 'VEINTE',
  21: 'VEINTIUNO',
  22: 'VEINTIDOS',
  23: 'VEINTITRES',
  24: 'VEINTICUATRO',
  25: 'VEINTICINCO',
  26: 'VEINTISEIS',
  27: 'VEINTISIETE',
  28: 'VEINTIOCHO',
  29: 'VEINTINUEVE',
  30: 'TREINTA',
  35: 'TREINTA Y CINCO',
  40: 'CUARENTA',
  45: 'CUARENTA Y CINCO',
  50: 'CINCUENTA',
  55: 'CINCUENTA Y CINCO',
  60: 'SESENTA',
  65: 'SESENTA Y CINCO',
  70: 'SETENTA',
  71: 'SETENTA Y UNO',
  74: 'SETENTA Y CUATRO',
};

const TENS_WORDS: Record<number, string> = {
  30: 'TREINTA',
  40: 'CUARENTA',
  50: 'CINCUENTA',
  60: 'SESENTA',
  70: 'SETENTA',
  80: 'OCHENTA',
  90: 'NOVENTA',
};

export function numberToSpanishWords(n: number): string {
  if (n in DIGIT_WORDS) return DIGIT_WORDS[n];
  if (n > 30 && n < 100) {
    const tens = Math.floor(n / 10) * 10;
    const ones = n % 10;
    const tensWord = TENS_WORDS[tens] ?? '';
    const onesWord = DIGIT_WORDS[ones] ?? '';
    if (tensWord && onesWord) return `${tensWord} Y ${onesWord}`;
  }
  return String(n)
    .split('')
    .map(d => DIGIT_WORDS[Number(d)] ?? 'CERO')
    .join(' ');
}

export function replaceDigitsWithSpanishWords(text: string): string {
  return text.replace(/\d+/g, match => numberToSpanishWords(Number(match)));
}

export function toAlphaOnlyPhrase(text: string): string {
  const withWords = replaceDigitsWithSpanishWords(text);
  const norm = toPuzzleText(withWords);
  return norm
    .replace(/[^A-ZÑ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hashClueTag(clue?: Clue): string {
  if (!clue) return 'standalone';
  return `${clue.category}:${clue.id}:${clue.keyphrase ?? ''}:${clue.impact}`;
}

export function buildClueMeaning(baseMeaning: string, clue?: Clue): string {
  if (!clue) return baseMeaning;
  const kp = clue.keyphrase ? ` [${clue.keyphrase}]` : '';
  return `${baseMeaning} — ${clue.impact}${kp}`;
}

/**
 * Construye una frase clave sobrante concisa, sólida y sin redundancias
 * para la Sopa de Letras (ej. "SIN CICATRIZ", "SUELO DE MARMOL", "RASTRO DE HARINA").
 */
export function buildSolidLeftoverPhrase(clue?: Clue, fallback = 'COARTADA ROTA EN VILLA ACEBO'): string {
  if (!clue) return fallback;
  const base = toAlphaOnlyPhrase(clue.keyphrase || clue.impact);
  if (base.length >= 6) {
    return base;
  }
  const expanded = toAlphaOnlyPhrase(`${clue.keyphrase ?? ''} ${clue.impact}`);
  if (expanded.length >= 6) {
    // Deduplicar palabras repetidas consecutivas o idénticas manteniendo el orden
    const seen = new Set<string>();
    const uniqueWords: string[] = [];
    for (const w of expanded.split(' ')) {
      if (w && !seen.has(w)) {
        seen.add(w);
        uniqueWords.push(w);
      }
    }
    const joined = uniqueWords.join(' ');
    return joined.length >= 6 ? joined : `INDICIO ${base || fallback}`;
  }
  return `INDICIO ${base || fallback}`;
}

export function extractClueAlphaWords(
  clue?: Clue,
  minLen = 4,
  maxLen = 12
): string[] {
  if (!clue) return [];
  const primaryNorm = toPuzzleText(`${clue.keyphrase ?? ''} ${clue.impact}`);
  const secondaryNorm = toPuzzleText(clue.text);

  const isSolidWord = (t: string) =>
    /^[A-ZÑ]+$/.test(t) &&
    t.length >= minLen &&
    t.length <= maxLen &&
    !STOPWORDS.has(t) &&
    !META_LABEL_WORDS.has(t);

  const primaryTokens = primaryNorm.split(' ').filter(isSolidWord);
  const secondaryTokens = secondaryNorm.split(' ').filter(isSolidWord);

  const all = [...primaryTokens, ...secondaryTokens];
  const withEnye = all.filter(t => t.includes('Ñ'));
  const withoutEnye = all.filter(t => !t.includes('Ñ'));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of [...withEnye, ...withoutEnye]) {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

export interface ManualVerificationSpec {
  promptLabel: string;
  formatHint: string;
  expectedDisplay: string;
  acceptedAnswers: string[];
}

function normalizeManualInput(raw: string): string {
  return toPuzzleText(raw).replace(/\s+/g, ' ').trim();
}

const NONOGRAM_VISUAL_SYNONYMS: Record<string, readonly string[]> = {
  'LLAVE MAESTRA': ['LLAVE', 'LLAVERO', 'LLAVE ANTIGUA'],
  'FRASCO DE VENENO': [
    'BOTELLA',
    'BOTELLA DE VENENO',
    'BOTELLIN',
    'AMPOLLA',
    'AMPOLLETA',
    'POCION',
    'POMO',
  ],
  'DAGA DE PLATA': ['PUÑAL', 'PUNAL', 'CUCHILLO', 'ESPADA', 'ESTILETE', 'NAVAJA'],
  'RELOJ DE ARENA': ['RELOJ', 'CLEPSIDRA', 'TEMPORIZADOR'],
  'CALIZ DE OPORTO': ['COPA', 'COPA DE OPORTO', 'COPA DE VINO', 'VASO', 'TROFEO'],
  'SOBRE LACRADO': ['CARTA', 'SOBRE DE CARTA', 'MISIVA', 'CORRESPONDENCIA'],
};

/**
 * Determina para cada uno de los 14 tipos de juegos cuál es el resultado concreto
 * que el jugador descubre visualmente en el tablero y que debe transcribir en el Modo Manual.
 */
export function getPuzzleManualVerificationSpec(
  puzzle: DayPuzzle,
  clue: Clue
): ManualVerificationSpec {
  const clueKey = normalizeManualInput(clue.keyphrase || clue.impact);
  const clueNouns = extractClueAlphaWords(clue, 4, 14);

  switch (puzzle.type) {
    case 'wordsearch': {
      const msg = normalizeManualInput(puzzle.config.leftoverMessage);
      return {
        promptLabel:
          'Lee en orden las casillas doradas numeradas que quedaron libres en la cuadrícula y transcribe la clave descubierta:',
        formatHint: 'Palabra o frase de las casillas doradas',
        expectedDisplay: msg,
        acceptedAnswers: [msg, msg.replace(/\s+/g, ''), ...clueNouns, clueKey].filter(Boolean),
      };
    }

    case 'crossword': {
      const secret = normalizeManualInput(puzzle.config.secretWord ?? '');
      return {
        promptLabel:
          'Lee en orden las casillas clave doradas (numeradas) del crucigrama y escribe la palabra secreta formada:',
        formatHint: 'Palabra de las casillas clave doradas',
        expectedDisplay: secret,
        acceptedAnswers: [secret, clueKey, ...clueNouns].filter(Boolean),
      };
    }

    case 'septagrama': {
      const secret = normalizeManualInput(puzzle.config.secretWord);
      return {
        promptLabel:
          'Escribe la palabra secreta formada verticalmente por las casillas sombreadas del Septagrama:',
        formatHint: 'Palabra de las casillas sombreadas',
        expectedDisplay: secret,
        acceptedAnswers: [secret, clueKey].filter(Boolean),
      };
    }

    case 'encajados': {
      const secret = normalizeManualInput(puzzle.config.secretWord);
      return {
        promptLabel:
          'Lee en orden las casillas sombreadas de Encajados y escribe la palabra clave resultante:',
        formatHint: 'Palabra de las casillas sombreadas',
        expectedDisplay: secret,
        acceptedAnswers: [secret, clueKey, ...clueNouns].filter(Boolean),
      };
    }

    case 'syllables': {
      const secret = normalizeManualInput(puzzle.config.secretWord);
      const highlighted = puzzle.config.words
        .map(w => normalizeManualInput(w.targetSyllables[w.highlightIndex] ?? ''))
        .join('');
      return {
        promptLabel:
          'Lee en orden las sílabas destacadas en dorado de las palabras ensambladas y transcribe la clave resultante:',
        formatHint: 'Secuencia de sílabas doradas',
        expectedDisplay: secret,
        acceptedAnswers: [secret, secret.replace(/\s+/g, ''), highlighted, ...clueNouns].filter(Boolean),
      };
    }

    case 'cryptogram': {
      const full = normalizeManualInput(puzzle.config.cipherText);
      const firstWords = full.split(' ').slice(0, 3).join(' ');
      return {
        promptLabel:
          'Escribe las primeras palabras o la frase completa que acabas de descifrar en el criptograma:',
        formatHint: 'Texto descifrado del criptograma',
        expectedDisplay: firstWords,
        acceptedAnswers: [firstWords, full, clueKey, ...clueNouns].filter(Boolean),
      };
    }

    case 'codificados': {
      const code = puzzle.config.secretCode.join('');
      return {
        promptLabel:
          'Confirma escribiendo el código numérico deducido en el marcador superior:',
        formatHint: 'Código numérico del marcador',
        expectedDisplay: code,
        acceptedAnswers: [code],
      };
    }

    case 'ecuaciones': {
      const code = puzzle.config.targetCode.join('');
      return {
        promptLabel:
          'Confirma escribiendo las cifras obtenidas para los símbolos del marcador superior:',
        formatHint: 'Código numérico del marcador',
        expectedDisplay: code,
        acceptedAnswers: [code],
      };
    }

    case 'sudoku': {
      const code = puzzle.config.keyCells
        .map(k => puzzle.config.solution[k.r]?.[k.c] ?? '')
        .join('');
      return {
        promptLabel:
          'Lee en orden las casillas clave doradas (marcadas con llave 1 a 4) del Sudoku y escribe el código resultante:',
        formatHint: 'Código numérico de las casillas con llave',
        expectedDisplay: code,
        acceptedAnswers: [code],
      };
    }

    case 'futoshiki': {
      const code = (puzzle.config.keyCells ?? [])
        .map(k => puzzle.config.solution[k.r]?.[k.c] ?? '')
        .join('');
      return {
        promptLabel:
          'Lee en orden las casillas clave doradas (marcadas con llave 1 a 4) del Futoshiki y escribe el código resultante:',
        formatHint: 'Código numérico de las casillas con llave',
        expectedDisplay: code,
        acceptedAnswers: [code],
      };
    }

    case 'nonogram': {
      const title = normalizeManualInput(puzzle.config.revealTitle);
      return {
        promptLabel:
          'Escribe el nombre del objeto o silueta revelada en el lienzo del Nonograma:',
        formatHint: 'Nombre de la figura revelada',
        expectedDisplay: title,
        acceptedAnswers: [
          title,
          ...title.split(' ').filter(w => w.length >= 4),
          ...(NONOGRAM_VISUAL_SYNONYMS[title] ?? []),
          clueKey,
          ...clueNouns,
        ].filter(Boolean),
      };
    }

    case 'connections': {
      const display = clueKey || normalizeManualInput(puzzle.config.groups[0].category);
      return {
        promptLabel:
          'Escribe el nombre de cualquiera de las categorías agrupadas en el tablero (o el hallazgo vinculado):',
        formatHint: 'Categoría o hallazgo del tablero',
        expectedDisplay: display,
        acceptedAnswers: [
          display,
          normalizeManualInput(clue.impact),
          normalizeManualInput(puzzle.config.groups[0]?.category.split('·')[0] ?? ''),
          ...clueNouns,
          ...puzzle.config.groups.map(g => normalizeManualInput(g.category)),
        ].filter(Boolean),
      };
    }

    case 'murdoku': {
      const firstA = puzzle.config.groupA.items[0];
      const matchPair = puzzle.config.targetMatches.find(m => m.aId === firstA?.id);
      const matchedB = puzzle.config.groupB.items.find(b => b.id === matchPair?.bId);
      const matchedName = normalizeManualInput(matchedB?.name ?? clueKey);
      const groupBFirstWord = puzzle.config.groupB.title.split(' ')[0].toLowerCase();
      const groupBSingular =
        groupBFirstWord === 'armas'
          ? 'arma'
          : groupBFirstWord === 'estancias'
            ? 'estancia'
            : groupBFirstWord === 'sospechosos'
              ? 'sospechoso'
              : groupBFirstWord;
      return {
        promptLabel: firstA
          ? `Según tu matriz completada, escribe qué ${groupBSingular} corresponde a «${firstA.name}»:`
          : 'Escribe la asignación deducida en la matriz:',
        formatHint: matchedB ? `Asignación de ${firstA?.name}` : 'Término deducido',
        expectedDisplay: matchedB?.name ?? displayFallback(clueKey),
        acceptedAnswers: [
          matchedName,
          ...matchedName.split(' ').filter(w => w.length >= 4),
          clueKey,
          ...clueNouns,
        ].filter(Boolean),
      };
    }

    case 'minesweeper': {
      const safeCount =
        puzzle.config.rows * puzzle.config.cols - puzzle.config.mines.length;
      const code = `${safeCount}${puzzle.config.mines.length < 10 ? `0${puzzle.config.mines.length}` : puzzle.config.mines.length}`;
      return {
        promptLabel:
          'Escribe el código formado por el total de casillas seguras seguido del número de minas (en dos dígitos):',
        formatHint: 'Código numérico (seguras + minas en dos dígitos)',
        expectedDisplay: code,
        acceptedAnswers: [code, String(safeCount), clueKey, ...clueNouns].filter(Boolean),
      };
    }
  }
}

function displayFallback(s: string): string {
  return s || 'CONFIRMADO';
}

export function verifyManualPuzzleInput(
  puzzle: DayPuzzle,
  clue: Clue,
  userInput: string
): boolean {
  const norm = normalizeManualInput(userInput);
  if (!norm || norm.length < 2) return false;
  const spec = getPuzzleManualVerificationSpec(puzzle, clue);
  const compactNorm = norm.replace(/\s+/g, '');

  for (const ans of spec.acceptedAnswers) {
    const normAns = normalizeManualInput(ans);
    if (!normAns) continue;
    if (norm === normAns || compactNorm === normAns.replace(/\s+/g, '')) {
      return true;
    }
  }
  return false;
}
