import type { EncajadosConfig, EncajadosSlot } from '../../types/game';
import { deriveSeed, mulberry32, shuffle } from './prng';

interface EncajadosPack {
  meaning: string;
  candidateSecrets: string[];
  words: string[];
}

const ENCAJADOS_PACKS: readonly EncajadosPack[] = [
  {
    // Inspirado directamente en la página "ENCAJADOS" de la imagen de referencia
    meaning: 'Términos encajados del registro de inspección de Villa Acebo',
    candidateSecrets: ['JARDIN', 'COLINA', 'ADORNO', 'RASTRO'],
    words: [
      'SOSPECHA',
      'TELEFONO',
      'CAZUELA',
      'JUGUETE',
      'DIARIO',
      'ADORNO',
      'COLINA',
      'ABUELO',
      'JARDIN',
      'PAJARO',
      'RASTRO',
      'CORO',
      'MIEL',
      'LENA',
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

export function generateEncajados(seed: number, day = 1): EncajadosConfig {
  const derived = deriveSeed(seed, day, 'encajados');
  const rng = mulberry32(derived);
  const pack =
    ENCAJADOS_PACKS[(day + Math.floor(rng() * ENCAJADOS_PACKS.length)) % ENCAJADOS_PACKS.length];

  const SIZE = 15;
  const rawGrid: (string | null)[][] = Array.from({ length: SIZE }, () =>
    Array<string | null>(SIZE).fill(null)
  );
  const placed: { word: string; row: number; col: number; direction: 'across' | 'down' }[] = [];

  const ordered = [...pack.words].sort((a, b) => b.length - a.length);
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

  // 2 letras iniciales ancla reveladas en el tablero (como las dos 'O' de la imagen de referencia)
  const givenCells: { r: number; c: number; letter: string }[] = [];
  if (slots.length > 0) {
    const s0 = slots[0];
    const r0 = s0.row + (s0.direction === 'down' ? s0.answer.length - 1 : 0);
    const c0 = s0.col + (s0.direction === 'across' ? s0.answer.length - 1 : 0);
    givenCells.push({ r: r0, c: c0, letter: grid[r0][c0] ?? s0.answer[0] });
  }
  if (slots.length > 1) {
    const s1 = slots[slots.length - 1];
    const r1 = s1.row;
    const c1 = s1.col;
    if (!givenCells.some(g => g.r === r1 && g.c === c1)) {
      givenCells.push({ r: r1, c: c1, letter: grid[r1][c1] ?? s1.answer[0] });
    }
  }

  // Seleccionar casillas clave sombreadas que formen la palabra secreta inferior
  const letterCells = new Map<string, { r: number; c: number }[]>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      if (ch) {
        const list = letterCells.get(ch) ?? [];
        list.push({ r, c });
        letterCells.set(ch, list);
      }
    }
  }

  let secretWord = '';
  let keyCells: { r: number; c: number }[] = [];
  for (const cand of pack.candidateSecrets) {
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
    keyCells = slots.slice(0, 6).map(s => ({ r: s.row, c: s.col }));
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
    secretMeaning: pack.meaning,
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
