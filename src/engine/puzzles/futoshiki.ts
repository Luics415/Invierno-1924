import type { FutoshikiConfig, FutoshikiInequality } from '../../types/game';
import { deriveSeed, mulberry32, pickOne, shuffle } from './prng';

const FUTOSHIKI_MEANINGS: readonly string[] = [
  'Orden cronológico exacto de las pisadas en el corredor',
  'Secuencia de presiones registradas en el cerrojo',
  'Jerarquía de horarios en el registro de servicio',
  'Clave numérica del pestillo de la galería norte',
];

function generateLatinSquare(size: number, rng: () => number): number[][] {
  const base: number[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ((r + c) % size) + 1)
  );

  const rowOrder = shuffle(rng, Array.from({ length: size }, (_, i) => i));
  const colOrder = shuffle(rng, Array.from({ length: size }, (_, i) => i));
  const digitMap = shuffle(rng, Array.from({ length: size }, (_, i) => i + 1));

  return rowOrder.map(r => colOrder.map(c => digitMap[base[r][c] - 1]));
}

export function countFutoshikiSolutions(
  size: number,
  grid: (number | null)[][],
  inequalities: FutoshikiInequality[],
  limit = 2
): number {
  const work: number[][] = grid.map(row => row.map(v => v ?? 0));
  const rowMask = new Int32Array(size);
  const colMask = new Int32Array(size);
  const empties: { r: number; c: number }[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = work[r][c];
      if (v > 0) {
        const bit = 1 << v;
        if ((rowMask[r] & bit) || (colMask[c] & bit)) return 0;
        rowMask[r] |= bit;
        colMask[c] |= bit;
      } else {
        empties.push({ r, c });
      }
    }
  }

  // Adjacency index for inequalities
  const adj: { r: number; c: number; op: '<' | '>' }[][][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [])
  );
  for (const ineq of inequalities) {
    adj[ineq.r1][ineq.c1].push({ r: ineq.r2, c: ineq.c2, op: ineq.operator });
    adj[ineq.r2][ineq.c2].push({
      r: ineq.r1,
      c: ineq.c1,
      op: ineq.operator === '<' ? '>' : '<',
    });
  }

  // Verify initial givens satisfy inequalities
  for (const ineq of inequalities) {
    const a = work[ineq.r1][ineq.c1];
    const b = work[ineq.r2][ineq.c2];
    if (a > 0 && b > 0) {
      if (ineq.operator === '<' && !(a < b)) return 0;
      if (ineq.operator === '>' && !(a > b)) return 0;
    }
  }

  let count = 0;
  const search = (idx: number) => {
    if (count >= limit) return;
    if (idx === empties.length) {
      count++;
      return;
    }

    const { r, c } = empties[idx];
    const used = rowMask[r] | colMask[c];

    for (let val = 1; val <= size; val++) {
      const bit = 1 << val;
      if (used & bit) continue;

      let ok = true;
      for (const rel of adj[r][c]) {
        const neighbor = work[rel.r][rel.c];
        if (neighbor === 0) continue;
        if (rel.op === '<' && !(val < neighbor)) {
          ok = false;
          break;
        }
        if (rel.op === '>' && !(val > neighbor)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      work[r][c] = val;
      rowMask[r] |= bit;
      colMask[c] |= bit;

      search(idx + 1);

      work[r][c] = 0;
      rowMask[r] &= ~bit;
      colMask[c] &= ~bit;
      if (count >= limit) break;
    }
  };

  search(0);
  return count;
}

export function generateFutoshiki(seed: number, day = 1): FutoshikiConfig {
  const derived = deriveSeed(seed, day, 'futoshiki');
  const rng = mulberry32(derived);
  const size = 5;
  const solution = generateLatinSquare(size, rng);

  // Collect all adjacent pairs and their true inequality operators
  const allPairs: FutoshikiInequality[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (c + 1 < size) {
        allPairs.push({
          r1: r,
          c1: c,
          r2: r,
          c2: c + 1,
          operator: solution[r][c] < solution[r][c + 1] ? '<' : '>',
        });
      }
      if (r + 1 < size) {
        allPairs.push({
          r1: r,
          c1: c,
          r2: r + 1,
          c2: c,
          operator: solution[r][c] < solution[r + 1][c] ? '<' : '>',
        });
      }
    }
  }

  // Start with ~8-10 inequalities and ~6-8 givens, then refine to guarantee unique solution
  const shuffledPairs = shuffle(rng, allPairs);
  const inequalities: FutoshikiInequality[] = shuffledPairs.slice(0, 9);

  const initialGrid: (number | null)[][] = Array.from({ length: size }, () =>
    Array<number | null>(size).fill(null)
  );
  const allCoords = shuffle(
    rng,
    Array.from({ length: size * size }, (_, idx) => ({ r: Math.floor(idx / size), c: idx % size }))
  );

  // Seed 4 initial givens
  for (let i = 0; i < 4; i++) {
    const { r, c } = allCoords[i];
    initialGrid[r][c] = solution[r][c];
  }

  let pairIdx = 9;
  let coordIdx = 4;

  // Add constraints/givens until solution is strictly unique
  while (countFutoshikiSolutions(size, initialGrid, inequalities, 2) > 1) {
    if (pairIdx < shuffledPairs.length && inequalities.length < 13) {
      inequalities.push(shuffledPairs[pairIdx++]);
    } else if (coordIdx < allCoords.length) {
      const { r, c } = allCoords[coordIdx++];
      initialGrid[r][c] = solution[r][c];
    } else {
      break;
    }
  }

  // Prune redundant inequalities to keep board clean & challenging while preserving uniqueness === 1
  for (let i = inequalities.length - 1; i >= 0; i--) {
    if (inequalities.length <= 6) break;
    const candidate = inequalities.filter((_, idx) => idx !== i);
    if (countFutoshikiSolutions(size, initialGrid, candidate, 2) === 1) {
      inequalities.splice(i, 1);
    }
  }

  const keyCells = allCoords
    .filter(({ r, c }) => initialGrid[r][c] === null)
    .slice(0, 4);

  return {
    size,
    initialGrid,
    solution,
    inequalities,
    keyCells,
    secretCodeMeaning: pickOne(rng, FUTOSHIKI_MEANINGS),
  };
}

export function getFutoshikiViolations(
  config: FutoshikiConfig,
  grid: (number | null)[][]
): Set<string> {
  const violations = new Set<string>();
  const { size, inequalities } = config;

  // Duplicate in row
  for (let r = 0; r < size; r++) {
    const map = new Map<number, number[]>();
    for (let c = 0; c < size; c++) {
      const v = grid[r][c];
      if (v !== null) {
        const list = map.get(v) ?? [];
        list.push(c);
        map.set(v, list);
      }
    }
    for (const cols of map.values()) {
      if (cols.length > 1) {
        for (const c of cols) violations.add(`${r}-${c}`);
      }
    }
  }

  // Duplicate in col
  for (let c = 0; c < size; c++) {
    const map = new Map<number, number[]>();
    for (let r = 0; r < size; r++) {
      const v = grid[r][c];
      if (v !== null) {
        const list = map.get(v) ?? [];
        list.push(r);
        map.set(v, list);
      }
    }
    for (const rows of map.values()) {
      if (rows.length > 1) {
        for (const r of rows) violations.add(`${r}-${c}`);
      }
    }
  }

  // Inequality violations
  for (const ineq of inequalities) {
    const a = grid[ineq.r1]?.[ineq.c1] ?? null;
    const b = grid[ineq.r2]?.[ineq.c2] ?? null;
    if (a !== null && b !== null) {
      const broken = ineq.operator === '<' ? !(a < b) : !(a > b);
      if (broken) {
        violations.add(`${ineq.r1}-${ineq.c1}`);
        violations.add(`${ineq.r2}-${ineq.c2}`);
      }
    }
  }

  return violations;
}

export function validateFutoshiki(
  config: FutoshikiConfig,
  userGrid: (number | null)[][]
): boolean {
  if (userGrid.length !== config.size) return false;
  for (let r = 0; r < config.size; r++) {
    if ((userGrid[r]?.length ?? 0) !== config.size) return false;
    for (let c = 0; c < config.size; c++) {
      const v = userGrid[r][c];
      if (v === null || v < 1 || v > config.size) return false;
      if (config.initialGrid[r][c] !== null && config.initialGrid[r][c] !== v) return false;
    }
  }
  return getFutoshikiViolations(config, userGrid).size === 0;
}
