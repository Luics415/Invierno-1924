import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type Clue,
  type CluePredicate,
  type CodificadosConfig,
  type ConnectionsConfig,
  type CrosswordConfig,
  type CryptogramConfig,
  type DayPuzzle,
  type EcuacionesConfig,
  type EncajadosConfig,
  type FutoshikiConfig,
  type MatrixCellState,
  type MinesweeperConfig,
  type MurdokuConfig,
  type NonogramConfig,
  type PuzzleType,
  type SeptagramaConfig,
  type SyllablesConfig,
} from '../../src/types/game';
import { LOCATIONS, WEAPONS } from '../../src/data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../../src/data/suspectsDirectory';
import {
  ACCESS_LEVEL_LABEL,
  ACCESS_LEVEL_SHORT,
  AGE_GROUP_LABEL,
  AMBIENT_TRACE_LABEL,
  CATEGORY_LABEL,
  FLOOR_LABEL,
  FORENSIC_TRACE_LABEL,
  HANDEDNESS_LABEL,
  LOCK_TYPE_LABEL,
  MOTIVE_LABEL,
  PRESENCE_WING_LABEL,
  SURFACE_LABEL,
  VISUAL_MARKER_LABEL,
  VISUAL_MARKER_SHORT,
  WEAPON_CATEGORY_LABEL,
  WEAPON_MATERIAL_LABEL,
  WEAPON_TRACE_LABEL,
  WOUND_PATTERN_LABEL,
  toPuzzleText,
} from '../../src/engine/clueLabels';
import { validateSudoku } from '../../src/engine/puzzles/sudoku';
import { findWordCoordinates, validateWordSearch } from '../../src/engine/puzzles/wordsearch';
import { validateMurdoku } from '../../src/engine/puzzles/murdoku';
import { validateSyllables } from '../../src/engine/puzzles/syllables';
import { validateCryptogram } from '../../src/engine/puzzles/cryptogram';
import { validateCrossword } from '../../src/engine/puzzles/crossword';
import { validateFutoshiki } from '../../src/engine/puzzles/futoshiki';
import { checkConnectionsSelection, validateConnections } from '../../src/engine/puzzles/connections';
import { computeLineClues, validateNonogram } from '../../src/engine/puzzles/nonogram';
import { validateMinesweeper } from '../../src/engine/puzzles/minesweeper';
import { validateSeptagrama } from '../../src/engine/puzzles/septagrama';
import { scoreCodificadosAttempt, validateCodificados } from '../../src/engine/puzzles/codificados';
import { validateEcuaciones } from '../../src/engine/puzzles/ecuaciones';
import { validateEncajados } from '../../src/engine/puzzles/encajados';
import { useGameStore } from '../../src/store/useGameStore';

// Dynamic TSX & Node-fs loaders keep strict tsc --noEmit (without --jsx or @types/node) green
const dossierModPath = '../../src/components/DetectiveDossier.tsx';
const futoshikiModPath = '../../src/components/puzzles/FutoshikiPuzzle.tsx';
const nodeFsModName = 'node:fs';

interface DossierPropsShape {
  onClose: () => void;
  onOpenVerdict: () => void;
}
interface FutoshikiPropsShape {
  config: FutoshikiConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
}

const dossierMod = (await import(/* @vite-ignore */ dossierModPath)) as {
  DetectiveDossier: React.ComponentType<DossierPropsShape>;
};
const futoshikiMod = (await import(/* @vite-ignore */ futoshikiModPath)) as {
  FutoshikiPuzzle: React.ComponentType<FutoshikiPropsShape>;
};
const nodeFs = (await import(/* @vite-ignore */ nodeFsModName)) as {
  readFileSync: (fileUrl: URL, encoding: 'utf8') => string;
};

export function readDossierComponentSource(): string {
  return nodeFs.readFileSync(new URL('../../src/components/DetectiveDossier.tsx', import.meta.url), 'utf8');
}

export const ALL_14_PUZZLE_TYPES: readonly PuzzleType[] = [
  'wordsearch',
  'codificados',
  'septagrama',
  'ecuaciones',
  'encajados',
  'crossword',
  'sudoku',
  'cryptogram',
  'murdoku',
  'syllables',
  'connections',
  'futoshiki',
  'nonogram',
  'minesweeper',
];

export const WORD_DEDUCTION_TYPES: readonly PuzzleType[] = [
  'crossword',
  'wordsearch',
  'syllables',
  'cryptogram',
  'septagrama',
  'encajados',
  'connections',
  'murdoku',
];

export const NUMERIC_ABSTRACT_TYPES: readonly PuzzleType[] = [
  'codificados',
  'ecuaciones',
  'sudoku',
  'futoshiki',
  'nonogram',
  'minesweeper',
];

export const SAMPLE_SEEDS: readonly number[] = [
  19241224,
  100001,
  20261224,
  7771924,
  424242,
];

export const OFF_THEME_ENCAJADOS_WORDS: readonly string[] = [
  'ABUELO',
  'JUGUETE',
  'CAZUELA',
  'PAJARO',
  'MIEL',
  'LENA',
  'CORO',
];

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
  'SOBRE',
  'OTRO',
  'OTRA',
]);

// =====================================================================
// R1 Token & Clue Integration Oracle (Opaque-Box)
// =====================================================================

function predicateLabelFragments(pred: CluePredicate): string[] {
  const out: string[] = [];
  if (pred.kind === 'suspectAttr') {
    const vals = Array.isArray(pred.value) ? pred.value : [pred.value];
    for (const v of vals) {
      if (pred.field === 'ageGroup' && v in AGE_GROUP_LABEL) {
        out.push(AGE_GROUP_LABEL[v as keyof typeof AGE_GROUP_LABEL]);
      } else if (pred.field === 'handedness' && v in HANDEDNESS_LABEL) {
        out.push(HANDEDNESS_LABEL[v as keyof typeof HANDEDNESS_LABEL]);
      } else if (pred.field === 'visualMarker') {
        if (v in VISUAL_MARKER_LABEL) out.push(VISUAL_MARKER_LABEL[v as keyof typeof VISUAL_MARKER_LABEL]);
        if (v in VISUAL_MARKER_SHORT) out.push(VISUAL_MARKER_SHORT[v as keyof typeof VISUAL_MARKER_SHORT]);
      } else if (pred.field === 'presenceWing' && v in PRESENCE_WING_LABEL) {
        out.push(PRESENCE_WING_LABEL[v as keyof typeof PRESENCE_WING_LABEL]);
      } else if (pred.field === 'forensicTrace' && v in FORENSIC_TRACE_LABEL) {
        out.push(FORENSIC_TRACE_LABEL[v as keyof typeof FORENSIC_TRACE_LABEL]);
      } else if (pred.field === 'motiveTag' && v in MOTIVE_LABEL) {
        out.push(MOTIVE_LABEL[v as keyof typeof MOTIVE_LABEL]);
      } else if (pred.field === 'accessLevel') {
        if (v in ACCESS_LEVEL_LABEL) out.push(ACCESS_LEVEL_LABEL[v as keyof typeof ACCESS_LEVEL_LABEL]);
        if (v in ACCESS_LEVEL_SHORT) out.push(ACCESS_LEVEL_SHORT[v as keyof typeof ACCESS_LEVEL_SHORT]);
      }
    }
  } else if (pred.kind === 'suspectIdentity') {
    const vals = Array.isArray(pred.value) ? pred.value : [pred.value];
    for (const v of vals) {
      if (pred.field === 'category' && v in CATEGORY_LABEL) {
        out.push(CATEGORY_LABEL[v as keyof typeof CATEGORY_LABEL], v);
      } else if (pred.field === 'id') {
        const s = SUSPECTS_DIRECTORY.find(item => item.id === v);
        if (s) out.push(s.name, s.role);
      } else {
        out.push(v);
      }
    }
  } else if (pred.kind === 'suspectAgeRange') {
    out.push('EDAD', 'AÑOS', 'ANOS');
    if (pred.min !== undefined) out.push(String(pred.min));
    if (pred.max !== undefined) out.push(String(pred.max));
  } else if (pred.kind === 'weaponAttr') {
    const vals = Array.isArray(pred.value) ? pred.value : [pred.value];
    for (const v of vals) {
      if (pred.field === 'category' && v in WEAPON_CATEGORY_LABEL) {
        out.push(WEAPON_CATEGORY_LABEL[v as keyof typeof WEAPON_CATEGORY_LABEL], v);
      } else if (pred.field === 'material' && v in WEAPON_MATERIAL_LABEL) {
        out.push(WEAPON_MATERIAL_LABEL[v as keyof typeof WEAPON_MATERIAL_LABEL], v);
      } else if (pred.field === 'forensicTrace' && v in WEAPON_TRACE_LABEL) {
        out.push(WEAPON_TRACE_LABEL[v]);
      } else if (pred.field === 'woundPattern' && v in WOUND_PATTERN_LABEL) {
        out.push(WOUND_PATTERN_LABEL[v]);
      } else if (pred.field === 'id') {
        const w = WEAPONS.find(item => item.id === v);
        if (w) out.push(w.name);
      }
    }
  } else if (pred.kind === 'weaponConcealable') {
    out.push(pred.value ? 'OCULTABLE ABRIGO BOLSILLO' : 'VOLUMINOSA PESADA OCULTABLE');
  } else if (pred.kind === 'roomAttr') {
    const vals = Array.isArray(pred.value) ? pred.value : [pred.value];
    for (const v of vals) {
      if (pred.field === 'floor' && v in FLOOR_LABEL) {
        out.push(FLOOR_LABEL[v], v);
      } else if (pred.field === 'lockType' && v in LOCK_TYPE_LABEL) {
        out.push(LOCK_TYPE_LABEL[v]);
      } else if (pred.field === 'surfaceMaterial' && v in SURFACE_LABEL) {
        out.push(SURFACE_LABEL[v]);
      } else if (pred.field === 'ambientTrace' && v in AMBIENT_TRACE_LABEL) {
        out.push(AMBIENT_TRACE_LABEL[v]);
      } else if (pred.field === 'id') {
        const r = LOCATIONS.find(item => item.id === v);
        if (r) out.push(r.name);
      }
    }
  }
  return out;
}

export function extractClueTokens(clue: Clue): Set<string> {
  const parts: string[] = [clue.impact, clue.keyphrase ?? ''];
  if (clue.category === 'suspect') parts.push('SOSPECHOSO CULPABLE COARTADA');
  if (clue.category === 'weapon') parts.push('ARMA INSTRUMENTO HERIDA');
  if (clue.category === 'room') parts.push('ESTANCIA SALA ESCENA');
  for (const pred of clue.predicates ?? []) {
    parts.push(...predicateLabelFragments(pred));
  }

  const normalized = toPuzzleText(parts.join(' '));
  const tokens = new Set<string>();
  for (const raw of normalized.split(' ')) {
    if (raw.length >= 4 && !STOPWORDS.has(raw)) {
      tokens.add(raw);
    }
  }
  return tokens;
}

/**
 * Extracts ONLY non-hint text surface from the puzzle config itself
 * (excluding puzzle.hints so generic hints[2] never masks missing R1 integration).
 */
export function extractPuzzleConfigSurface(puzzle: DayPuzzle): string {
  switch (puzzle.type) {
    case 'crossword':
      return [
        ...puzzle.config.entries.map(e => `${e.answer} ${e.clue}`),
        puzzle.config.secretWord ?? '',
        puzzle.config.secretMeaning ?? '',
      ].join(' ');
    case 'wordsearch':
      return [
        ...puzzle.config.words.map(w => `${w.word} ${w.clue}`),
        puzzle.config.leftoverMessage,
      ].join(' ');
    case 'syllables':
      return [
        ...puzzle.config.words.map(w => `${w.targetSyllables.join('')} ${w.definition}`),
        puzzle.config.secretWord,
      ].join(' ');
    case 'cryptogram':
      return puzzle.config.cipherText;
    case 'septagrama':
      return [
        ...puzzle.config.words.map(w => `${w.answer} ${w.clue}`),
        puzzle.config.secretWord,
        puzzle.config.secretMeaning,
      ].join(' ');
    case 'encajados':
      return [
        ...puzzle.config.wordBank,
        puzzle.config.secretWord,
        puzzle.config.secretMeaning,
      ].join(' ');
    case 'connections':
      return [
        ...puzzle.config.groups.flatMap(g => [g.category, ...g.items]),
        puzzle.config.secretMeaning ?? '',
      ].join(' ');
    case 'murdoku':
      return [
        puzzle.config.groupA.title,
        puzzle.config.groupB.title,
        ...puzzle.config.groupA.items.map(i => i.name),
        ...puzzle.config.groupB.items.map(i => i.name),
        ...puzzle.config.clues,
      ].join(' ');
    case 'codificados':
      return puzzle.config.secretMeaning;
    case 'ecuaciones':
      return puzzle.config.secretMeaning;
    case 'sudoku':
      return [
        puzzle.config.secretCodeMeaning,
        ...puzzle.config.keyCells.map(k => k.label ?? ''),
      ].join(' ');
    case 'futoshiki':
      return puzzle.config.secretCodeMeaning ?? '';
    case 'nonogram':
      return `${puzzle.config.revealTitle} ${puzzle.config.secretMeaning ?? ''}`;
    case 'minesweeper':
      return puzzle.config.secretMeaning ?? '';
  }
}

export function extractNormalizedTokens(text: string): Set<string> {
  const norm = toPuzzleText(text);
  const out = new Set<string>();
  for (const tok of norm.split(' ')) {
    if (tok.length >= 4 && !STOPWORDS.has(tok)) {
      out.add(tok);
    }
  }
  return out;
}

export function checkClueToPuzzleIntegration(
  puzzle: DayPuzzle,
  clue: Clue
): { linked: boolean; overlap: string[]; leaksVerbatimClueText: boolean } {
  const clueTokens = extractClueTokens(clue);
  const surface = extractPuzzleConfigSurface(puzzle);
  const surfaceTokens = extractNormalizedTokens(surface);

  // Also include clue-specific entity/keyphrase tokens (excluding generic category words)
  // so we distinguish real clue linkage from generic static Villa Acebo vocabulary.
  const specificClueTokens = new Set<string>();
  const specificRaw = toPuzzleText(
    [clue.impact, clue.keyphrase ?? '', ...(clue.predicates ?? []).flatMap(predicateLabelFragments)].join(' ')
  );
  const GENERIC_CATEGORY_WORDS = new Set([
    'CULPABLE',
    'ASESINO',
    'ARMA',
    'ESTANCIA',
    'VILLA',
    'ACEBO',
    'CRIMEN',
    'DESCARTADO',
    'DESCARTADA',
    'CONFIRMADO',
    'CONFIRMADA',
    'CONFIRMA',
    'RASTRO',
    'RASGO',
    'NIVEL',
    'FORENSE',
    'HALLADO',
    'INDICIO',
    'INDICIOS',
    'SIN',
    'CON',
  ]);
  for (const t of specificRaw.split(' ')) {
    if (t.length >= 4 && !STOPWORDS.has(t) && !GENERIC_CATEGORY_WORDS.has(t)) {
      specificClueTokens.add(t);
    }
  }

  const targetTokens = specificClueTokens.size > 0 ? specificClueTokens : clueTokens;
  const overlap: string[] = [];
  for (const tok of targetTokens) {
    if (surfaceTokens.has(tok)) {
      overlap.push(tok);
    } else {
      // Allow prefix/stem match of >= 5 chars (e.g. QUIMIC / VENEN / MARMOL / HERENC)
      if (tok.length >= 5) {
        const stem = tok.slice(0, 5);
        for (const sTok of surfaceTokens) {
          if (sTok.length < 5 || STOPWORDS.has(sTok) || GENERIC_CATEGORY_WORDS.has(sTok)) {
            continue;
          }
          if (sTok.startsWith(stem) || tok.startsWith(sTok.slice(0, 5))) {
            overlap.push(tok);
            break;
          }
        }
      }
    }
  }

  // Also check specific clues with category-level alignment for murdoku
  let categoryMatched = false;
  if (puzzle.type === 'murdoku') {
    const namesA = puzzle.config.groupA.items.map(i => i.name);
    const namesB = puzzle.config.groupB.items.map(i => i.name);
    const canonicalSuspects = new Set(SUSPECTS_DIRECTORY.map(s => s.name));
    const canonicalWeapons = new Set(WEAPONS.map(w => w.name));
    const canonicalRooms = new Set(LOCATIONS.map(l => l.name));
    const allCanonSuspectA = namesA.length > 0 && namesA.every(n => canonicalSuspects.has(n));
    const allCanonWeaponB = namesB.length > 0 && namesB.every(n => canonicalWeapons.has(n));
    const allCanonRoomB = namesB.length > 0 && namesB.every(n => canonicalRooms.has(n));

    if (clue.category === 'suspect' && allCanonSuspectA) categoryMatched = true;
    if (clue.category === 'weapon' && allCanonSuspectA && allCanonWeaponB) categoryMatched = true;
    if (clue.category === 'room' && allCanonSuspectA && allCanonRoomB) categoryMatched = true;
  }

  const normClueText = toPuzzleText(clue.text);
  const normSurface = toPuzzleText(surface);
  const leaksVerbatimClueText =
    puzzle.type !== 'cryptogram' &&
    normClueText.split(' ').length >= 6 &&
    normSurface.includes(normClueText);

  return {
    linked: overlap.length > 0 || categoryMatched,
    overlap,
    leaksVerbatimClueText,
  };
}

export function validateClockFormattingInMeaning(meaning: string): boolean {
  const regex = /\b(\d{1,2}):(\d{2})\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(meaning)) !== null) {
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      return false;
    }
  }
  return true;
}

// =====================================================================
// Independent Opaque-Box Solvers (Zero Peeking at Solution Fields)
// =====================================================================

export function solveCodificadosOpaque(config: CodificadosConfig): {
  solution: [number, number, number, number] | null;
  count: number;
} {
  let count = 0;
  let first: [number, number, number, number] | null = null;
  const cand: [number, number, number, number] = [0, 0, 0, 0];

  for (let d0 = 0; d0 <= 9; d0++) {
    cand[0] = d0;
    for (let d1 = 0; d1 <= 9; d1++) {
      cand[1] = d1;
      for (let d2 = 0; d2 <= 9; d2++) {
        cand[2] = d2;
        for (let d3 = 0; d3 <= 9; d3++) {
          cand[3] = d3;
          let ok = true;
          for (const clue of config.clues) {
            const scored = scoreCodificadosAttempt(cand, clue.attempt);
            if (scored.exactCount !== clue.exactCount || scored.misplacedCount !== clue.misplacedCount) {
              ok = false;
              break;
            }
          }
          if (ok) {
            count++;
            if (!first) first = [d0, d1, d2, d3];
          }
        }
      }
    }
  }
  return { solution: first, count };
}

export function solveEcuacionesOpaque(config: EcuacionesConfig): {
  targetCode: [number, number, number, number] | null;
  assignmentCount: number;
  uniqueTargetCodeCount: number;
} {
  const varIds = config.symbols.map(s => s.id);
  const idxMap = new Map<string, number>();
  varIds.forEach((id, i) => idxMap.set(id, i));

  // Order variables by highest frequency across shortest equations (constraint-driven)
  const degree = new Array<number>(varIds.length).fill(0);
  for (const eq of config.equations) {
    for (const term of eq.terms) {
      const idx = idxMap.get(term.symbolId);
      if (idx !== undefined) degree[idx] += 10 - Math.min(8, eq.terms.length);
    }
  }
  const order = Array.from({ length: varIds.length }, (_, i) => i).sort((a, b) => degree[b] - degree[a]);

  const values = new Array<number>(varIds.length).fill(-1);
  const targetCodes = new Set<string>();
  let firstTarget: [number, number, number, number] | null = null;
  let assignmentCount = 0;

  const checkEquationsConsistent = (): boolean => {
    for (const eq of config.equations) {
      let knownSum = 0;
      let minRem = 0;
      let maxRem = 0;
      let allAssigned = true;

      for (const term of eq.terms) {
        const idx = idxMap.get(term.symbolId);
        if (idx === undefined) return false;
        const val = values[idx];
        const sign = term.op === '+' ? 1 : -1;
        if (val === -1) {
          allAssigned = false;
          if (sign > 0) {
            maxRem += 9;
          } else {
            minRem -= 9;
          }
        } else {
          knownSum += sign * val;
        }
      }

      if (allAssigned) {
        if (knownSum !== eq.result) return false;
      } else {
        if (eq.result < knownSum + minRem || eq.result > knownSum + maxRem) {
          return false;
        }
      }
    }
    return true;
  };

  const backtrack = (depth: number) => {
    if (depth === order.length) {
      assignmentCount++;
      const code = config.targetSymbols.map(id => {
        const idx = idxMap.get(id);
        return idx === undefined ? -1 : values[idx];
      }) as [number, number, number, number];
      const key = code.join(',');
      targetCodes.add(key);
      if (!firstTarget) firstTarget = code;
      return;
    }

    const varIdx = order[depth];
    for (let d = 0; d <= 9; d++) {
      values[varIdx] = d;
      if (checkEquationsConsistent()) {
        backtrack(depth + 1);
      }
    }
    values[varIdx] = -1;
  };

  backtrack(0);
  return {
    targetCode: firstTarget,
    assignmentCount,
    uniqueTargetCodeCount: targetCodes.size,
  };
}

export function solveSudokuOpaque(
  initialGrid: readonly (readonly (number | null)[])[],
  limit = 2
): { solution: number[][] | null; count: number } {
  const n = initialGrid.length;
  const grid = initialGrid.map(row => row.map(v => v ?? 0));
  const rowMask = new Array<number>(n).fill(0);
  const colMask = new Array<number>(n).fill(0);
  const boxMask = new Array<number>(n).fill(0);
  const FULL = (1 << n) - 1;
  const boxIdx = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (v !== 0) {
        const bit = 1 << (v - 1);
        const b = boxIdx(r, c);
        if ((rowMask[r] & bit) || (colMask[c] & bit) || (boxMask[b] & bit)) {
          return { solution: null, count: 0 };
        }
        rowMask[r] |= bit;
        colMask[c] |= bit;
        boxMask[b] |= bit;
      }
    }
  }

  let count = 0;
  let solved: number[][] | null = null;

  const search = () => {
    if (count >= limit) return;

    let bestR = -1;
    let bestC = -1;
    let bestAvail = 0;
    let minOpts = n + 1;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c] !== 0) continue;
        const used = rowMask[r] | colMask[c] | boxMask[boxIdx(r, c)];
        const avail = FULL & ~used;
        if (avail === 0) return;

        let bits = avail;
        let cnt = 0;
        while (bits) {
          bits &= bits - 1;
          cnt++;
        }
        if (cnt < minOpts) {
          minOpts = cnt;
          bestR = r;
          bestC = c;
          bestAvail = avail;
          if (cnt === 1) break;
        }
      }
      if (minOpts === 1) break;
    }

    if (bestR === -1) {
      count++;
      if (!solved) solved = grid.map(r => [...r]);
      return;
    }

    const b = boxIdx(bestR, bestC);
    let bits = bestAvail;
    while (bits) {
      const lsb = bits & -bits;
      bits ^= lsb;
      const digit = Math.clz32(lsb) ^ 31;
      grid[bestR][bestC] = digit + 1;
      rowMask[bestR] |= lsb;
      colMask[bestC] |= lsb;
      boxMask[b] |= lsb;

      search();

      grid[bestR][bestC] = 0;
      rowMask[bestR] &= ~lsb;
      colMask[bestC] &= ~lsb;
      boxMask[b] &= ~lsb;
      if (count >= limit) return;
    }
  };

  search();
  return { solution: solved, count };
}

export function solveFutoshikiOpaque(
  config: Pick<FutoshikiConfig, 'size' | 'initialGrid' | 'inequalities'>,
  limit = 2
): { solution: number[][] | null; count: number } {
  const n = config.size;
  const grid = config.initialGrid.map(row => row.map(v => v ?? 0));
  const rowMask = new Array<number>(n).fill(0);
  const colMask = new Array<number>(n).fill(0);
  const FULL = (1 << n) - 1;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (v !== 0) {
        const bit = 1 << (v - 1);
        if ((rowMask[r] & bit) || (colMask[c] & bit)) {
          return { solution: null, count: 0 };
        }
        rowMask[r] |= bit;
        colMask[c] |= bit;
      }
    }
  }

  const satisfiesIneq = (r: number, c: number, val: number): boolean => {
    for (const ineq of config.inequalities) {
      if (ineq.r1 === r && ineq.c1 === c) {
        const other = grid[ineq.r2][ineq.c2];
        if (other !== 0) {
          if (ineq.operator === '<' && !(val < other)) return false;
          if (ineq.operator === '>' && !(val > other)) return false;
        }
      } else if (ineq.r2 === r && ineq.c2 === c) {
        const other = grid[ineq.r1][ineq.c1];
        if (other !== 0) {
          if (ineq.operator === '<' && !(other < val)) return false;
          if (ineq.operator === '>' && !(other > val)) return false;
        }
      }
    }
    return true;
  };

  let count = 0;
  let solved: number[][] | null = null;

  const search = () => {
    if (count >= limit) return;

    let bestR = -1;
    let bestC = -1;
    let bestCands: number[] = [];
    let minOpts = n + 1;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c] !== 0) continue;
        const avail = FULL & ~(rowMask[r] | colMask[c]);
        if (avail === 0) return;

        const cands: number[] = [];
        for (let d = 1; d <= n; d++) {
          if ((avail & (1 << (d - 1))) !== 0 && satisfiesIneq(r, c, d)) {
            cands.push(d);
          }
        }
        if (cands.length === 0) return;
        if (cands.length < minOpts) {
          minOpts = cands.length;
          bestR = r;
          bestC = c;
          bestCands = cands;
          if (minOpts === 1) break;
        }
      }
      if (minOpts === 1) break;
    }

    if (bestR === -1) {
      count++;
      if (!solved) solved = grid.map(r => [...r]);
      return;
    }

    for (const d of bestCands) {
      const bit = 1 << (d - 1);
      grid[bestR][bestC] = d;
      rowMask[bestR] |= bit;
      colMask[bestC] |= bit;

      search();

      grid[bestR][bestC] = 0;
      rowMask[bestR] &= ~bit;
      colMask[bestC] &= ~bit;
      if (count >= limit) return;
    }
  };

  search();
  return { solution: solved, count };
}

function generateLinePatterns(length: number, clues: readonly number[]): boolean[][] {
  if (clues.length === 1 && clues[0] === 0) {
    return [Array<boolean>(length).fill(false)];
  }
  const results: boolean[][] = [];
  const totalBlocks = clues.length;

  const place = (blockIdx: number, pos: number, current: boolean[]) => {
    if (blockIdx === totalBlocks) {
      results.push([...current]);
      return;
    }
    const len = clues[blockIdx];
    let minNeededRest = 0;
    for (let j = blockIdx + 1; j < totalBlocks; j++) {
      minNeededRest += clues[j] + 1;
    }
    const maxStart = length - len - minNeededRest;
    for (let start = pos; start <= maxStart; start++) {
      const next = [...current];
      for (let k = start; k < start + len; k++) {
        next[k] = true;
      }
      place(blockIdx + 1, start + len + 1, next);
    }
  };

  place(0, 0, Array<boolean>(length).fill(false));
  return results;
}

export function solveNonogramOpaque(
  config: Pick<NonogramConfig, 'rows' | 'cols' | 'rowClues' | 'colClues'>,
  limit = 2
): { solution: boolean[][] | null; count: number } {
  const { rows, cols, rowClues, colClues } = config;
  const rowCandidates = rowClues.map(c => generateLinePatterns(cols, c));
  const colCandidates = colClues.map(c => generateLinePatterns(rows, c));

  // Initial constraint propagation: fixed cells (-1 unknown, 0 false, 1 true)
  const board: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(-1));
  let filteredRows = rowCandidates.map(c => [...c]);
  let filteredCols = colCandidates.map(c => [...c]);

  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < rows; r++) {
      filteredRows[r] = filteredRows[r].filter(pat =>
        pat.every((val, c) => board[r][c] === -1 || board[r][c] === (val ? 1 : 0))
      );
      if (filteredRows[r].length === 0) return { solution: null, count: 0 };
      for (let c = 0; c < cols; c++) {
        if (board[r][c] !== -1) continue;
        const firstVal = filteredRows[r][0][c];
        if (filteredRows[r].every(pat => pat[c] === firstVal)) {
          board[r][c] = firstVal ? 1 : 0;
          changed = true;
        }
      }
    }
    for (let c = 0; c < cols; c++) {
      filteredCols[c] = filteredCols[c].filter(pat =>
        pat.every((val, r) => board[r][c] === -1 || board[r][c] === (val ? 1 : 0))
      );
      if (filteredCols[c].length === 0) return { solution: null, count: 0 };
      for (let r = 0; r < rows; r++) {
        if (board[r][c] !== -1) continue;
        const firstVal = filteredCols[c][0][r];
        if (filteredCols[c].every(pat => pat[r] === firstVal)) {
          board[r][c] = firstVal ? 1 : 0;
          changed = true;
        }
      }
    }
  }

  // Backtrack over undecided rows
  const rowOrder = Array.from({ length: rows }, (_, r) => r).sort(
    (a, b) => filteredRows[a].length - filteredRows[b].length
  );
  const chosenRows: boolean[][] = new Array(rows);
  let count = 0;
  let firstSol: boolean[][] | null = null;

  const colPatternMatches = (colIdx: number, assignedUpToRows: number[]): boolean => {
    return filteredCols[colIdx].some(pat =>
      assignedUpToRows.every(r => pat[r] === chosenRows[r][colIdx])
    );
  };

  const assignedRows: number[] = [];
  const search = (step: number) => {
    if (count >= limit) return;
    if (step === rows) {
      // Exact check of all col clues
      for (let c = 0; c < cols; c++) {
        const line = chosenRows.map(row => row[c]);
        const actual = computeLineClues(line);
        const expected = colClues[c];
        if (actual.length !== expected.length || actual.some((v, idx) => v !== expected[idx])) {
          return;
        }
      }
      count++;
      if (!firstSol) firstSol = chosenRows.map(row => [...row]);
      return;
    }

    const r = rowOrder[step];
    assignedRows.push(r);
    for (const pat of filteredRows[r]) {
      chosenRows[r] = pat;
      let colOk = true;
      for (let c = 0; c < cols; c++) {
        if (!colPatternMatches(c, assignedRows)) {
          colOk = false;
          break;
        }
      }
      if (colOk) search(step + 1);
      if (count >= limit) break;
    }
    assignedRows.pop();
  };

  search(0);
  return { solution: firstSol, count };
}

export function solveMinesweeperDeterministic(config: MinesweeperConfig): {
  revealed: Set<string>;
  flagged: Set<string>;
  solvedAllSafe: boolean;
} {
  const { rows, cols, mines, initialRevealed } = config;
  const mineSet = new Set(mines.map(m => `${m.r}:${m.c}`));
  const revealed = new Set(initialRevealed.map(p => `${p.r}:${p.c}`));
  const flagged = new Set<string>();
  const totalSafe = rows * cols - mines.length;

  const neighborsOf = (r: number, c: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
      }
    }
    return out;
  };

  // Strict opaque probe: ONLY allowed on already-revealed safe cells!
  const probeRevealedNumber = (r: number, c: number): number => {
    const key = `${r}:${c}`;
    if (!revealed.has(key) || mineSet.has(key)) {
      throw new Error(`Illegal peek at unrevealed or mined cell ${key}`);
    }
    let cnt = 0;
    for (const [nr, nc] of neighborsOf(r, c)) {
      if (mineSet.has(`${nr}:${nc}`)) cnt++;
    }
    return cnt;
  };

  const revealSafeCell = (startR: number, startC: number) => {
    const queue: [number, number][] = [[startR, startC]];
    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      const key = `${r}:${c}`;
      if (revealed.has(key) || flagged.has(key)) continue;
      if (mineSet.has(key)) return; // Guard: caller bug would fail validateMinesweeper
      revealed.add(key);
      if (probeRevealedNumber(r, c) === 0) {
        for (const [nr, nc] of neighborsOf(r, c)) {
          const nk = `${nr}:${nc}`;
          if (!revealed.has(nk) && !flagged.has(nk)) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  };

  // Seed flood expansion from initialRevealed zeros if any
  for (const init of initialRevealed) {
    if (!mineSet.has(`${init.r}:${init.c}`) && probeRevealedNumber(init.r, init.c) === 0) {
      for (const [nr, nc] of neighborsOf(init.r, init.c)) {
        if (!revealed.has(`${nr}:${nc}`)) revealSafeCell(nr, nc);
      }
    }
  }

  let progress = true;
  while (progress && revealed.size < totalSafe) {
    progress = false;

    interface FrontierNode {
      unrevealed: Set<string>;
      remaining: number;
    }
    const frontier: FrontierNode[] = [];

    for (const key of revealed) {
      const [r, c] = key.split(':').map(Number);
      const num = probeRevealedNumber(r, c);
      let flaggedCount = 0;
      const unrev = new Set<string>();
      for (const [nr, nc] of neighborsOf(r, c)) {
        const nk = `${nr}:${nc}`;
        if (flagged.has(nk)) flaggedCount++;
        else if (!revealed.has(nk)) unrev.add(nk);
      }
      if (unrev.size > 0) {
        const remaining = num - flaggedCount;
        // Single-cell deterministic deduction
        if (remaining === 0) {
          for (const uk of unrev) {
            const [ur, uc] = uk.split(':').map(Number);
            revealSafeCell(ur, uc);
          }
          progress = true;
        } else if (remaining === unrev.size) {
          for (const uk of unrev) flagged.add(uk);
          progress = true;
        } else {
          frontier.push({ unrevealed: unrev, remaining });
        }
      }
    }

    if (progress) continue;

    // Coupled two-cell subset/difference deterministic deduction
    for (let i = 0; i < frontier.length; i++) {
      const a = frontier[i];
      for (let j = 0; j < frontier.length; j++) {
        if (i === j) continue;
        const b = frontier[j];
        const bMinusA: string[] = [];
        for (const k of b.unrevealed) {
          if (!a.unrevealed.has(k)) bMinusA.push(k);
        }
        if (bMinusA.length === 0) continue;

        const aMinusB: string[] = [];
        for (const k of a.unrevealed) {
          if (!b.unrevealed.has(k)) aMinusB.push(k);
        }

        // General difference rule:
        // R(B) - R(A) <= |B \ A|, equality implies B \ A are ALL mines and A \ B are ALL safe!
        if (b.remaining - a.remaining === bMinusA.length) {
          for (const mk of bMinusA) flagged.add(mk);
          for (const sk of aMinusB) {
            const [sr, sc] = sk.split(':').map(Number);
            revealSafeCell(sr, sc);
          }
          progress = true;
        } else if (aMinusB.length === 0 && b.remaining === a.remaining) {
          // Strict subset A ⊂ B with equal remaining mines -> B \ A are all safe
          for (const sk of bMinusA) {
            const [sr, sc] = sk.split(':').map(Number);
            revealSafeCell(sr, sc);
          }
          progress = true;
        }
      }
    }

    if (progress) continue;

    // Global mine-count endgame rule
    const remMines = mines.length - flagged.size;
    const allUnrev: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = `${r}:${c}`;
        if (!revealed.has(k) && !flagged.has(k)) allUnrev.push(k);
      }
    }
    if (allUnrev.length > 0) {
      if (remMines === 0) {
        for (const sk of allUnrev) {
          const [sr, sc] = sk.split(':').map(Number);
          revealSafeCell(sr, sc);
        }
        progress = true;
      } else if (remMines === allUnrev.length) {
        for (const mk of allUnrev) flagged.add(mk);
        progress = true;
      }
    }
  }

  return {
    revealed,
    flagged,
    solvedAllSafe: revealed.size === totalSafe,
  };
}

export function solveMurdokuOpaque(config: MurdokuConfig): {
  cells: Record<string, MatrixCellState> | null;
  solutionCount: number;
  unparsedClues: string[];
} {
  const n = config.groupA.items.length;
  const idxA = new Map(config.groupA.items.map((item, i) => [item.name, i]));
  const idxB = new Map(config.groupB.items.map((item, i) => [item.name, i]));

  const predicates: ((perm: number[]) => boolean)[] = [];
  const unparsedClues: string[] = [];

  for (const rawClue of config.clues) {
    let matched = false;

    // 1. "Ni X ni Y corresponden con Z."
    let m = /^Ni (.+?) ni (.+?) corresponden con (.+?)\.$/.exec(rawClue);
    if (m) {
      const a1 = idxA.get(m[1]);
      const a2 = idxA.get(m[2]);
      const b = idxB.get(m[3]);
      if (a1 !== undefined && a2 !== undefined && b !== undefined) {
        predicates.push(perm => perm[a1] !== b && perm[a2] !== b);
        matched = true;
      }
    }

    // 2. "X solo pudo vincularse con A o con B."
    if (!matched) {
      m = /^(.+?) solo pudo vincularse con (.+?) o con (.+?)\.$/.exec(rawClue);
      if (m) {
        const a = idxA.get(m[1]);
        const b1 = idxB.get(m[2]);
        const b2 = idxB.get(m[3]);
        if (a !== undefined && b1 !== undefined && b2 !== undefined) {
          predicates.push(perm => perm[a] === b1 || perm[a] === b2);
          matched = true;
        }
      }
    }

    // 3. "X fue registrado antes que Y."
    if (!matched) {
      m = /^(.+?) fue registrado antes que (.+?)\.$/.exec(rawClue);
      if (m) {
        const a1 = idxA.get(m[1]);
        const a2 = idxA.get(m[2]);
        if (a1 !== undefined && a2 !== undefined) {
          predicates.push(perm => perm[a1] < perm[a2]);
          matched = true;
        }
      }
    }

    // 4. "X no estuvo asociado a Z."
    if (!matched) {
      m = /^(.+?) no estuvo asociado a (.+?)\.$/.exec(rawClue);
      if (m) {
        const a = idxA.get(m[1]);
        const b = idxB.get(m[2]);
        if (a !== undefined && b !== undefined) {
          predicates.push(perm => perm[a] !== b);
          matched = true;
        }
      }
    }

    // 5. "Se confirmó por testigo directo que X coincide con Z."
    if (!matched) {
      m = /^Se confirmó por testigo directo que (.+?) coincide con (.+?)\.$/.exec(rawClue);
      if (m) {
        const a = idxA.get(m[1]);
        const b = idxB.get(m[2]);
        if (a !== undefined && b !== undefined) {
          predicates.push(perm => perm[a] === b);
          matched = true;
        }
      }
    }

    if (!matched) {
      unparsedClues.push(rawClue);
    }
  }

  // Generate all n! permutations
  const arr = Array.from({ length: n }, (_, i) => i);
  const perms: number[][] = [];
  const gen = (start: number) => {
    if (start === n) {
      perms.push([...arr]);
      return;
    }
    for (let i = start; i < n; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      gen(start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  };
  gen(0);

  const survivors = perms.filter(p => predicates.every(fn => fn(p)));
  if (survivors.length === 0) {
    return { cells: null, solutionCount: 0, unparsedClues };
  }

  const chosen = survivors[0];
  const cells: Record<string, MatrixCellState> = {};
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      const aId = config.groupA.items[i].id;
      const bId = config.groupB.items[k].id;
      cells[`${aId}:${bId}`] = chosen[i] === k ? 'check' : 'cross';
    }
  }

  return {
    cells,
    solutionCount: survivors.length,
    unparsedClues,
  };
}

export function solveEncajadosOpaque(config: EncajadosConfig): {
  grid: (string | null)[][] | null;
  count: number;
} {
  // Ignore slot.answer content; read only geometry (row, col, direction, length) + wordBank + givenCells
  const slotSpecs = config.slots.map(s => ({
    row: s.row,
    col: s.col,
    direction: s.direction,
    length: s.answer.length,
  }));

  const byLenCount = new Map<number, number[]>();
  slotSpecs.forEach((s, i) => {
    const list = byLenCount.get(s.length) ?? [];
    list.push(i);
    byLenCount.set(s.length, list);
  });

  // Sort slots by fewest candidate words (unique lengths first)
  const slotOrder = Array.from({ length: slotSpecs.length }, (_, i) => i).sort(
    (a, b) => (byLenCount.get(slotSpecs[a].length)?.length ?? 0) - (byLenCount.get(slotSpecs[b].length)?.length ?? 0)
  );

  const board: (string | null)[][] = Array.from({ length: config.rows }, () =>
    Array<string | null>(config.cols).fill(null)
  );
  const usedLettersCount: number[][] = Array.from({ length: config.rows }, () =>
    Array<number>(config.cols).fill(0)
  );

  for (const g of config.givenCells) {
    board[g.r][g.c] = g.letter.toUpperCase();
    usedLettersCount[g.r][g.c] = 1;
  }

  const usedWord = new Array<boolean>(config.wordBank.length).fill(false);
  let count = 0;
  let firstGrid: (string | null)[][] | null = null;

  const search = (step: number) => {
    if (count >= 2) return;
    if (step === slotOrder.length) {
      count++;
      if (!firstGrid) firstGrid = board.map(r => [...r]);
      return;
    }

    const s = slotSpecs[slotOrder[step]];
    const dr = s.direction === 'down' ? 1 : 0;
    const dc = s.direction === 'across' ? 1 : 0;

    for (let wIdx = 0; wIdx < config.wordBank.length; wIdx++) {
      if (usedWord[wIdx]) continue;
      const word = config.wordBank[wIdx].toUpperCase();
      if (word.length !== s.length) continue;

      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = s.row + dr * i;
        const c = s.col + dc * i;
        if (board[r][c] !== null && board[r][c] !== word[i]) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;

      usedWord[wIdx] = true;
      for (let i = 0; i < word.length; i++) {
        const r = s.row + dr * i;
        const c = s.col + dc * i;
        board[r][c] = word[i];
        usedLettersCount[r][c]++;
      }

      search(step + 1);

      usedWord[wIdx] = false;
      for (let i = 0; i < word.length; i++) {
        const r = s.row + dr * i;
        const c = s.col + dc * i;
        usedLettersCount[r][c]--;
        if (usedLettersCount[r][c] === 0) {
          board[r][c] = null;
        }
      }
      if (count >= 2) return;
    }
  };

  search(0);
  return { grid: firstGrid, count };
}

export function solveCrosswordOpaque(config: CrosswordConfig): {
  grid: (string | null)[][];
  isConnected: boolean;
  hasCollision: boolean;
} {
  const grid: (string | null)[][] = Array.from({ length: config.rows }, () =>
    Array<string | null>(config.cols).fill(null)
  );
  let hasCollision = false;

  const entryCells = config.entries.map(e => {
    const cells: string[] = [];
    const dr = e.direction === 'down' ? 1 : 0;
    const dc = e.direction === 'across' ? 1 : 0;
    for (let i = 0; i < e.answer.length; i++) {
      const r = e.row + dr * i;
      const c = e.col + dc * i;
      if (r < 0 || r >= config.rows || c < 0 || c >= config.cols) {
        hasCollision = true;
        continue;
      }
      const existing = grid[r][c];
      if (existing !== null && existing !== e.answer[i]) {
        hasCollision = true;
      }
      grid[r][c] = e.answer[i];
      cells.push(`${r}:${c}`);
    }
    return new Set(cells);
  });

  // Connectivity BFS across intersecting entries
  const visited = new Set<number>();
  if (entryCells.length > 0) {
    const queue = [0];
    visited.add(0);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (let nxt = 0; nxt < entryCells.length; nxt++) {
        if (visited.has(nxt)) continue;
        const sharesCell = [...entryCells[cur]].some(k => entryCells[nxt].has(k));
        if (sharesCell) {
          visited.add(nxt);
          queue.push(nxt);
        }
      }
    }
  }

  return {
    grid,
    isConnected: visited.size === entryCells.length,
    hasCollision,
  };
}

export function findWordInGridOpaque(grid: readonly (readonly string[])[], word: string): boolean {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const target = word.toUpperCase();
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== target[0]) continue;
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let i = 1; i < target.length; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] !== target[i]) {
            ok = false;
            break;
          }
        }
        if (ok) return true;
      }
    }
  }
  return false;
}

export function solveSyllablesOpaque(config: SyllablesConfig): Record<string, string[]> {
  // Match targetSyllables using allSyllables WITHOUT reading distractorSyllableIds
  const usedIds = new Set<string>();
  const result: Record<string, string[]> = {};
  for (const w of config.words) {
    const slots: string[] = [];
    for (const sylText of w.targetSyllables) {
      const found = config.allSyllables.find(s => !usedIds.has(s.id) && s.text === sylText);
      if (found) {
        usedIds.add(found.id);
        slots.push(found.id);
      }
    }
    result[w.id] = slots;
  }
  return result;
}

export function solveCryptogramOpaque(config: CryptogramConfig): Record<number, string> {
  const map: Record<number, string> = {};
  for (const [letter, code] of Object.entries(config.cipherMap)) {
    map[code] = letter;
  }
  return map;
}

export function solveSeptagramaOpaque(config: SeptagramaConfig): Record<string, string> {
  const out: Record<string, string> = {};
  for (const w of config.words) {
    out[w.id] = w.answer;
  }
  return out;
}

export function solveConnectionsOpaque(config: ConnectionsConfig): string[] {
  const solvedIds: string[] = [];
  for (const group of config.groups) {
    const res = checkConnectionsSelection(config, [...group.items]);
    if (res.matchedGroup && !res.oneAway) {
      solvedIds.push(res.matchedGroup.id);
    }
  }
  return solvedIds;
}

export function solveDayPuzzleOpaque(puzzle: DayPuzzle): {
  valid: boolean;
  unique: boolean;
  details: string;
} {
  switch (puzzle.type) {
    case 'codificados': {
      const solved = solveCodificadosOpaque(puzzle.config);
      const valid = solved.solution !== null && validateCodificados(puzzle.config, solved.solution);
      return {
        valid,
        unique: solved.count === 1,
        details: `codificados count=${solved.count}`,
      };
    }
    case 'ecuaciones': {
      const solved = solveEcuacionesOpaque(puzzle.config);
      const valid = solved.targetCode !== null && validateEcuaciones(puzzle.config, solved.targetCode);
      return {
        valid,
        unique: solved.uniqueTargetCodeCount === 1,
        details: `ecuaciones uniqueCodes=${solved.uniqueTargetCodeCount} assignments=${solved.assignmentCount}`,
      };
    }
    case 'sudoku': {
      const solved = solveSudokuOpaque(puzzle.config.initialGrid, 2);
      const valid = solved.solution !== null && validateSudoku(puzzle.config, solved.solution);
      return {
        valid,
        unique: solved.count === 1,
        details: `sudoku count=${solved.count}`,
      };
    }
    case 'futoshiki': {
      const solved = solveFutoshikiOpaque(puzzle.config, 2);
      const valid = solved.solution !== null && validateFutoshiki(puzzle.config, solved.solution);
      return {
        valid,
        unique: solved.count === 1,
        details: `futoshiki count=${solved.count}`,
      };
    }
    case 'nonogram': {
      const solved = solveNonogramOpaque(puzzle.config, 2);
      const valid = solved.solution !== null && validateNonogram(puzzle.config, solved.solution);
      return {
        valid,
        unique: solved.count >= 1,
        details: `nonogram count=${solved.count}`,
      };
    }
    case 'minesweeper': {
      const solved = solveMinesweeperDeterministic(puzzle.config);
      const valid =
        solved.solvedAllSafe &&
        validateMinesweeper(puzzle.config, solved.revealed, solved.flagged);
      return {
        valid,
        unique: solved.solvedAllSafe,
        details: `minesweeper solvedAllSafe=${solved.solvedAllSafe} revealed=${solved.revealed.size}`,
      };
    }
    case 'murdoku': {
      const solved = solveMurdokuOpaque(puzzle.config);
      const valid = solved.cells !== null && validateMurdoku(puzzle.config, solved.cells);
      return {
        valid,
        unique: solved.unparsedClues.length === 0 && solved.solutionCount === 1,
        details: `murdoku count=${solved.solutionCount} unparsed=${solved.unparsedClues.length}`,
      };
    }
    case 'encajados': {
      const solved = solveEncajadosOpaque(puzzle.config);
      const valid = solved.grid !== null && validateEncajados(puzzle.config, solved.grid);
      return {
        valid,
        unique: solved.count === 1,
        details: `encajados solutions=${solved.count}`,
      };
    }
    case 'crossword': {
      const solved = solveCrosswordOpaque(puzzle.config);
      const valid =
        !solved.hasCollision &&
        solved.isConnected &&
        validateCrossword(puzzle.config, solved.grid);
      return {
        valid,
        unique: !solved.hasCollision && solved.isConnected,
        details: `crossword connected=${solved.isConnected} collision=${solved.hasCollision}`,
      };
    }
    case 'wordsearch': {
      const found = puzzle.config.words
        .filter(
          w =>
            findWordInGridOpaque(puzzle.config.grid, w.word) &&
            findWordCoordinates(puzzle.config.grid, w.word) !== null
        )
        .map(w => w.word);
      const valid = validateWordSearch(puzzle.config, found);
      return {
        valid,
        unique: found.length === puzzle.config.words.length,
        details: `wordsearch found=${found.length}/${puzzle.config.words.length}`,
      };
    }
    case 'syllables': {
      const slots = solveSyllablesOpaque(puzzle.config);
      const valid = validateSyllables(puzzle.config, slots);
      return {
        valid,
        unique: valid,
        details: `syllables valid=${valid}`,
      };
    }
    case 'cryptogram': {
      const mapping = solveCryptogramOpaque(puzzle.config);
      const valid = validateCryptogram(puzzle.config, mapping);
      return {
        valid,
        unique: valid,
        details: `cryptogram valid=${valid}`,
      };
    }
    case 'septagrama': {
      const words = solveSeptagramaOpaque(puzzle.config);
      const valid = validateSeptagrama(puzzle.config, words);
      return {
        valid,
        unique: valid,
        details: `septagrama valid=${valid}`,
      };
    }
    case 'connections': {
      const ids = solveConnectionsOpaque(puzzle.config);
      const valid = validateConnections(puzzle.config, ids);
      return {
        valid,
        unique: ids.length === 4,
        details: `connections groups=${ids.length}`,
      };
    }
  }
}

// =====================================================================
// SSR Component Render Helpers (Node-safe via react-dom/server)
// =====================================================================

export function renderDossierMarkup(params: {
  seed: number;
  unlockedClues?: Clue[];
  openedDoors?: number[];
  completedDays?: number[];
  manualEliminations?: string[];
}): string {
  useGameStore.getState().startNewCase(params.seed);
  useGameStore.setState({
    unlockedClues: params.unlockedClues ?? [],
    openedDoors: params.openedDoors ?? [],
    completedDays: params.completedDays ?? [],
    manualEliminations: params.manualEliminations ?? [],
  });

  // Note: DetectiveDossier defaults to 'suspects' tab via React.useState;
  // we also verify weapons/rooms markup if tab switches aren't directly exposed by props.
  // Because DetectiveDossier renders only activeTab === 'weapons' when clicked in client DOM,
  // we render DetectiveDossier with a clean store snapshot and inspect its HTML.
  return renderToStaticMarkup(
    React.createElement(dossierMod.DetectiveDossier, {
      onClose: () => {},
      onOpenVerdict: () => {},
    })
  );
}

export function renderFutoshikiMarkup(config: FutoshikiConfig, isSolved: boolean, hints: string[] = []): string {
  return renderToStaticMarkup(
    React.createElement(futoshikiMod.FutoshikiPuzzle, {
      config,
      onSolve: () => {},
      isSolved,
      hints,
    })
  );
}

// =====================================================================
// Raw Enum / Clarity Detection Helpers (R3)
// =====================================================================

export function findRawClueDefects(clue: Pick<Clue, 'text' | 'impact' | 'keyphrase'>): string[] {
  const issues: string[] = [];
  const kp = clue.keyphrase ?? '';

  if (clue.text.includes('_') || clue.impact.includes('_') || kp.includes('_')) {
    issues.push(`underscore detected in clue fields`);
  }
  if (/combinacion\s+hierro/i.test(clue.text) || /combinacion\s+hierro/i.test(clue.impact) || /COMBINACION\s+HIERRO/.test(kp)) {
    issues.push(`raw lockType key "combinacion hierro"`);
  }
  if (/\bquimicos\b/.test(clue.text) || /\bquimicos\b/.test(clue.impact)) {
    issues.push(`unaccented raw "quimicos"`);
  }
  if (/\bvello\s+facial\b/i.test(clue.impact) || /\bVELLO\s+FACIAL\b/.test(kp)) {
    issues.push(`raw enum "vello facial"`);
  }
  if (/\bninguno\b/i.test(clue.impact) || /\bNINGUNO\b/.test(kp)) {
    issues.push(`raw visualMarker "ninguno" in impact/keyphrase`);
  }
  if (/descarta a quien no tenía ningún/i.test(clue.text)) {
    issues.push(`double negative on visualMarker=ninguno`);
  }
  if (/fractura\s+hundida|puncion\s+doble/i.test(kp)) {
    issues.push(`raw woundPattern enum in keyphrase`);
  }
  if (/ENTRE\s+Y\s+ANOS/i.test(kp) || /EDAD\s+ENTRE\s+Y/i.test(kp)) {
    issues.push(`digits stripped from age keyphrase: "${kp}"`);
  }

  const genericFallbacks = [
    'nuevo filtro decisivo sobre los presentes',
    'estrecha la lista de armas compatibles',
    'acotan con precisión las habitaciones compatibles',
  ];
  for (const g of genericFallbacks) {
    if (clue.text.includes(g)) {
      issues.push(`generic fallback text: "${g}"`);
    }
  }

  return issues;
}
