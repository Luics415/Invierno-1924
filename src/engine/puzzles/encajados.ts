import type { Clue, EncajadosConfig, EncajadosSlot } from '../../types/game';
import { buildClueMeaning, extractClueAlphaWords, hashClueTag } from './clueIntegration';
import { deriveSeed, mulberry32, shuffle } from './prng';

interface EncajadosPack {
  meaning: string;
  candidateSecrets: string[];
  words: string[];
}

const OFF_THEME_BLACKLIST = new Set<string>([
  'ABUELO',
  'JUGUETE',
  'CAZUELA',
  'PAJARO',
  'MIEL',
  'LENA',
  'CORO',
]);

const ENCAJADOS_PACKS: readonly EncajadosPack[] = [
  {
    meaning: 'Términos encajados del registro de inspección de Villa Acebo',
    candidateSecrets: ['JARDIN', 'COLINA', 'ADORNO', 'RASTRO'],
    words: [
      'SOSPECHA',
      'TELEFONO',
      'COARTADA',
      'TESTIGO',
      'DIARIO',
      'ADORNO',
      'COLINA',
      'VENENO',
      'JARDIN',
      'FISCAL',
      'RASTRO',
      'PUERTA',
      'CELDA',
      'ACTA',
    ],
  },
  {
    meaning: 'Evidencias cruzadas entre las estancias de la mansión',
    candidateSecrets: ['BODEGA', 'SALON', 'TORRE', 'LACRE'],
    words: [
      'TESTAMENTO',
      'BIBLIOTECA',
      'COARTADA',
      'ATIZADOR',
      'VENENO',
      'SOTANO',
      'BODEGA',
      'LACRE',
      'TORRE',
      'SALON',
      'PISTA',
      'LLAVE',
    ],
  },
  {
    meaning: 'Objetos y estancias bajo custodia de la detective Azlynn',
    candidateSecrets: ['CAPILLA', 'CENIZA', 'CARTA', 'RELOJ'],
    words: [
      'INVERNADERO',
      'NOCHEBUENA',
      'HERENCIA',
      'CAPILLA',
      'BISTURI',
      'CENIZA',
      'CARTA',
      'POLEN',
      'RELOJ',
      'CERA',
    ],
  },
];

function canPlaceEncajado(
  grid: (string | null)[][],
  rows: number,
  cols: number,
  word: string,
  r: number,
  c: number,
  direction: 'across' | 'down',
  requireIntersection: boolean
): number {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;

  if (r < 0 || c < 0 || r + dr * (word.length - 1) >= rows || c + dc * (word.length - 1) >= cols) {
    return -1;
  }

  const prevR = r - dr;
  const prevC = c - dc;
  if (prevR >= 0 && prevC >= 0 && grid[prevR][prevC] !== null) return -1;

  const afterR = r + dr * word.length;
  const afterC = c + dc * word.length;
  if (afterR < rows && afterC < cols && grid[afterR][afterC] !== null) return -1;

  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const nr = r + dr * i;
    const nc = c + dc * i;
    const existing = grid[nr][nc];

    if (existing !== null) {
      if (existing !== word[i]) return -1;
      intersections++;
    } else {
      const side1R = nr + dc;
      const side1C = nc + dr;
      const side2R = nr - dc;
      const side2C = nc - dr;
      if (side1R >= 0 && side1R < rows && side1C >= 0 && side1C < cols && grid[side1R][side1C] !== null) {
        return -1;
      }
      if (side2R >= 0 && side2R < rows && side2C >= 0 && side2C < cols && grid[side2R][side2C] !== null) {
        return -1;
      }
    }
  }

  if (requireIntersection && intersections === 0) return -1;
  return intersections;
}

export function generateEncajados(seed: number, day = 1, clue?: Clue): EncajadosConfig {
  const derived = deriveSeed(seed, day, `encajados:${hashClueTag(clue)}`);
  const rng = mulberry32(derived);
  const pack =
    ENCAJADOS_PACKS[(day + Math.floor(rng() * ENCAJADOS_PACKS.length)) % ENCAJADOS_PACKS.length];

  const clueWords = extractClueAlphaWords(clue, 4, 10).filter(w => !OFF_THEME_BLACKLIST.has(w));
  const mergedWords: string[] = [];
  const seenWords = new Set<string>();
  for (const w of [...clueWords.slice(0, 2), ...pack.words]) {
    if (!seenWords.has(w) && !OFF_THEME_BLACKLIST.has(w)) {
      seenWords.add(w);
      mergedWords.push(w);
    }
  }

  const SIZE = 15;
  const rawGrid: (string | null)[][] = Array.from({ length: SIZE }, () =>
    Array<string | null>(SIZE).fill(null)
  );
  const placed: { word: string; row: number; col: number; direction: 'across' | 'down' }[] = [];

  const ordered = [...mergedWords].sort((a, b) => b.length - a.length);
  const first = ordered[0];
  const startR = Math.floor(SIZE / 2);
  const startC = Math.max(0, Math.floor((SIZE - first.length) / 2));

  for (let i = 0; i < first.length; i++) {
    rawGrid[startR][startC + i] = first[i];
  }
  placed.push({ word: first, row: startR, col: startC, direction: 'across' });

  for (let wIdx = 1; wIdx < ordered.length && placed.length < 8; wIdx++) {
    const candidateWord = ordered[wIdx];
    const placements: { r: number; c: number; dir: 'across' | 'down'; score: number }[] = [];

    for (const dir of ['down', 'across'] as const) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const hits = canPlaceEncajado(rawGrid, SIZE, SIZE, candidateWord, r, c, dir, true);
          if (hits > 0) {
            placements.push({ r, c, dir, score: hits * 10 + rng() });
          }
        }
      }
    }

    if (placements.length === 0) continue;
    placements.sort((a, b) => b.score - a.score);
    const best = placements[0];
    const dr = best.dir === 'down' ? 1 : 0;
    const dc = best.dir === 'across' ? 1 : 0;
    for (let i = 0; i < candidateWord.length; i++) {
      rawGrid[best.r + dr * i][best.c + dc * i] = candidateWord[i];
    }
    placed.push({ word: candidateWord, row: best.r, col: best.c, direction: best.dir });
  }

  let minR = SIZE;
  let maxR = 0;
  let minC = SIZE;
  let maxC = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (rawGrid[r][c] !== null) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const grid: (string | null)[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => rawGrid[minR + r][minC + c])
  );

  const slots: EncajadosSlot[] = placed.map((p, idx) => ({
    id: `slot-${idx + 1}`,
    row: p.row - minR,
    col: p.col - minC,
    direction: p.direction,
    answer: p.word,
  }));

  // Anchor givenCells: reveal 1 distinguishing cell per slot of duplicate length (plus at least 2 total)
  // so that same-length words can never be ambiguously swapped by an opaque solver.
  const givenCells: { r: number; c: number; letter: string }[] = [];
  const givenSet = new Set<string>();
  const addGiven = (r: number, c: number) => {
    const k = `${r}:${c}`;
    if (!givenSet.has(k) && grid[r]?.[c]) {
      givenSet.add(k);
      givenCells.push({ r, c, letter: grid[r][c]! });
    }
  };

  const byLen = new Map<number, EncajadosSlot[]>();
  for (const s of slots) {
    const list = byLen.get(s.answer.length) ?? [];
    list.push(s);
    byLen.set(s.answer.length, list);
  }

  for (const group of byLen.values()) {
    if (group.length > 1) {
      for (const s of group) {
        // Pick an index i where s.answer[i] differs from at least one other slot of same length
        let chosenIdx = 0;
        for (let i = 0; i < s.answer.length; i++) {
          if (group.some(other => other.id !== s.id && other.answer[i] !== s.answer[i])) {
            chosenIdx = i;
            break;
          }
        }
        const dr = s.direction === 'down' ? 1 : 0;
        const dc = s.direction === 'across' ? 1 : 0;
        addGiven(s.row + dr * chosenIdx, s.col + dc * chosenIdx);
      }
    }
  }

  if (givenCells.length < 2 && slots.length > 0) {
    const s0 = slots[0];
    const r0 = s0.row + (s0.direction === 'down' ? s0.answer.length - 1 : 0);
    const c0 = s0.col + (s0.direction === 'across' ? s0.answer.length - 1 : 0);
    addGiven(r0, c0);
  }
  if (givenCells.length < 2 && slots.length > 1) {
    const s1 = slots[slots.length - 1];
    addGiven(s1.row, s1.col);
  }

  // Seleccionar casillas clave sombreadas que formen la palabra secreta inferior
  const letterCells = new Map<string, { r: number; c: number }[]>();
  const allOccupiedCells: { r: number; c: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      if (ch) {
        allOccupiedCells.push({ r, c });
        const list = letterCells.get(ch) ?? [];
        list.push({ r, c });
        letterCells.set(ch, list);
      }
    }
  }

  let secretWord = '';
  let keyCells: { r: number; c: number }[] = [];
  const candidateSecrets = [
    ...clueWords.filter(w => w.length >= 4 && w.length <= 8),
    ...pack.candidateSecrets,
  ];
  for (const cand of candidateSecrets) {
    const used = new Set<string>();
    const coords: { r: number; c: number }[] = [];
    let ok = true;
    for (const ch of cand) {
      const avail = (letterCells.get(ch) ?? []).find(pos => !used.has(`${pos.r}:${pos.c}`));
      if (!avail) {
        ok = false;
        break;
      }
      used.add(`${avail.r}:${avail.c}`);
      coords.push(avail);
    }
    if (ok) {
      secretWord = cand;
      keyCells = coords;
      break;
    }
  }

  if (!secretWord) {
    keyCells = allOccupiedCells.slice(0, Math.min(6, allOccupiedCells.length));
    secretWord = keyCells.map(pos => grid[pos.r][pos.c] ?? '').join('');
  }

  const wordBank = shuffle(
    rng,
    slots.map(s => s.answer)
  );

  return {
    rows,
    cols,
    grid,
    slots,
    wordBank,
    givenCells,
    keyCells,
    secretWord,
    secretMeaning: buildClueMeaning(pack.meaning, clue),
  };
}

export function validateEncajados(
  config: EncajadosConfig,
  userGrid: (string | null)[][]
): boolean {
  if (userGrid.length !== config.rows) return false;
  for (let r = 0; r < config.rows; r++) {
    if ((userGrid[r]?.length ?? 0) !== config.cols) return false;
    for (let c = 0; c < config.cols; c++) {
      const expected = config.grid[r][c];
      if (expected === null) continue;
      const actual = userGrid[r][c]?.toUpperCase().trim() ?? '';
      if (actual !== expected.toUpperCase()) return false;
    }
  }
  return true;
}
