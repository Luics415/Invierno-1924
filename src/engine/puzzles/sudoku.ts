import type { Clue, SudokuConfig } from '../../types/game';
import { buildClueMeaning, hashClueTag } from './clueIntegration';
import { deriveSeed, mulberry32, pickOne, shuffle } from './prng';

const SECRET_MEANINGS: readonly string[] = [
  'Combinación de la caja fuerte del despacho de Arturo',
  'Código de acceso al archivo privado de Villa Acebo',
  'Hora exacta registrada en el reloj detenido de la galería',
  'Cifra grabada en la cerradura de la bodega sellada',
  'Número de serie del telegrama encriptado de medianoche',
];

function createBaseSolvedBoard(): number[][] {
  const board: number[][] = [];
  for (let r = 0; r < 9; r++) {
    const row: number[] = [];
    for (let c = 0; c < 9; c++) {
      row.push(((Math.floor(r / 3) + (r % 3) * 3 + c) % 9) + 1);
    }
    board.push(row);
  }
  return board;
}

function generateSolvedSudoku(seed: number): number[][] {
  const rng = mulberry32(seed);
  let board = createBaseSolvedBoard();

  // Relabel digits 1..9
  const digits = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  board = board.map(row => row.map(v => digits[v - 1]));

  // Permute rows within each band and permute bands
  const bandOrder = shuffle(rng, [0, 1, 2]);
  const permutedRows: number[][] = [];
  for (const band of bandOrder) {
    const innerRows = shuffle(rng, [0, 1, 2]);
    for (const offset of innerRows) {
      permutedRows.push([...board[band * 3 + offset]]);
    }
  }
  board = permutedRows;

  // Permute cols within each stack and permute stacks
  const stackOrder = shuffle(rng, [0, 1, 2]);
  const colMap: number[] = [];
  for (const stack of stackOrder) {
    const innerCols = shuffle(rng, [0, 1, 2]);
    for (const offset of innerCols) {
      colMap.push(stack * 3 + offset);
    }
  }
  board = board.map(row => colMap.map(cIdx => row[cIdx]));

  // Optional transpose
  if (rng() < 0.5) {
    const transposed: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        transposed[c][r] = board[r][c];
      }
    }
    board = transposed;
  }

  return board;
}

export function countSudokuSolutions(grid: (number | null)[][], limit = 2): number {
  if (grid.length !== 9 || grid.some(r => r.length !== 9)) {
    return 0;
  }

  const rowMask = new Int32Array(9);
  const colMask = new Int32Array(9);
  const boxMask = new Int32Array(9);
  const empties: { r: number; c: number; box: number }[] = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (val !== null) {
        if (val < 1 || val > 9 || !Number.isInteger(val)) return 0;
        const bit = 1 << val;
        if ((rowMask[r] & bit) || (colMask[c] & bit) || (boxMask[box] & bit)) {
          return 0;
        }
        rowMask[r] |= bit;
        colMask[c] |= bit;
        boxMask[box] |= bit;
      } else {
        empties.push({ r, c, box });
      }
    }
  }

  let count = 0;
  const ALL_MASK = 0b1111111110; // bits 1..9

  const search = (remainingIdx: number) => {
    if (count >= limit) return;
    if (remainingIdx === empties.length) {
      count++;
      return;
    }

    // MRV: pick remaining empty cell with fewest candidates
    let bestPos = remainingIdx;
    let bestCandidates = 0;
    let bestCount = 10;

    for (let i = remainingIdx; i < empties.length; i++) {
      const cell = empties[i];
      const used = rowMask[cell.r] | colMask[cell.c] | boxMask[cell.box];
      const avail = ALL_MASK & ~used;
      // popcount for bits 1..9
      let bits = avail;
      let cCount = 0;
      while (bits) {
        bits &= bits - 1;
        cCount++;
      }
      if (cCount === 0) return;
      if (cCount < bestCount) {
        bestCount = cCount;
        bestPos = i;
        bestCandidates = avail;
        if (cCount === 1) break;
      }
    }

    if (bestPos !== remainingIdx) {
      const tmp = empties[remainingIdx];
      empties[remainingIdx] = empties[bestPos];
      empties[bestPos] = tmp;
    }

    const cell = empties[remainingIdx];
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      if ((bestCandidates & bit) === 0) continue;
      rowMask[cell.r] |= bit;
      colMask[cell.c] |= bit;
      boxMask[cell.box] |= bit;

      search(remainingIdx + 1);

      rowMask[cell.r] &= ~bit;
      colMask[cell.c] &= ~bit;
      boxMask[cell.box] &= ~bit;

      if (count >= limit) break;
    }

    if (bestPos !== remainingIdx) {
      const tmp = empties[remainingIdx];
      empties[remainingIdx] = empties[bestPos];
      empties[bestPos] = tmp;
    }
  };

  search(0);
  return count;
}

export function generateSudoku(seed: number, day = 1, clue?: Clue): SudokuConfig {
  const derived = deriveSeed(seed, day, `sudoku:${hashClueTag(clue)}`);
  const rng = mulberry32(derived);
  const solution = generateSolvedSudoku(derived ^ 0x9e3779b9);

  const initialGrid: (number | null)[][] = solution.map(row => [...row]);
  const coords = shuffle(
    rng,
    Array.from({ length: 81 }, (_, idx) => ({ r: Math.floor(idx / 9), c: idx % 9 }))
  );

  // Target 30-36 givens depending on day difficulty
  const targetGivens = day > 18 ? 30 : day > 9 ? 33 : 36;
  let givens = 81;

  for (const { r, c } of coords) {
    if (givens <= targetGivens) break;
    const backup = initialGrid[r][c];
    initialGrid[r][c] = null;
    if (countSudokuSolutions(initialGrid, 2) !== 1) {
      initialGrid[r][c] = backup;
    } else {
      givens--;
    }
  }

  // Pick 4 keyCells from non-given cells (spread across distinct rows/blocks when possible)
  const emptyCells: { r: number; c: number }[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (initialGrid[r][c] === null) {
        emptyCells.push({ r, c });
      }
    }
  }
  const shuffledEmpty = shuffle(rng, emptyCells);
  const chosen: { r: number; c: number; label?: string }[] = [];
  const usedBoxes = new Set<number>();
  for (const cell of shuffledEmpty) {
    const box = Math.floor(cell.r / 3) * 3 + Math.floor(cell.c / 3);
    if (!usedBoxes.has(box)) {
      usedBoxes.add(box);
      chosen.push(cell);
      if (chosen.length === 4) break;
    }
  }
  for (const cell of shuffledEmpty) {
    if (chosen.length >= 4) break;
    if (!chosen.some(x => x.r === cell.r && x.c === cell.c)) {
      chosen.push(cell);
    }
  }

  return {
    size: 9,
    initialGrid,
    solution,
    keyCells: chosen,
    secretCodeMeaning: buildClueMeaning(pickOne(rng, SECRET_MEANINGS), clue),
  };
}

export function getSudokuConflicts(grid: (number | null)[][]): Set<string> {
  const conflicts = new Set<string>();
  const n = grid.length;
  const blockRows = n === 6 ? 2 : 3;
  const blockCols = 3;

  // Row conflicts
  for (let r = 0; r < n; r++) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (v !== null) {
        const cols = seen.get(v) ?? [];
        cols.push(c);
        seen.set(v, cols);
      }
    }
    for (const cols of seen.values()) {
      if (cols.length > 1) {
        for (const c of cols) conflicts.add(`${r}-${c}`);
      }
    }
  }

  // Column conflicts
  for (let c = 0; c < n; c++) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < n; r++) {
      const v = grid[r][c];
      if (v !== null) {
        const rows = seen.get(v) ?? [];
        rows.push(r);
        seen.set(v, rows);
      }
    }
    for (const rows of seen.values()) {
      if (rows.length > 1) {
        for (const r of rows) conflicts.add(`${r}-${c}`);
      }
    }
  }

  // Block conflicts
  for (let br = 0; br < n; br += blockRows) {
    for (let bc = 0; bc < n; bc += blockCols) {
      const seen = new Map<number, { r: number; c: number }[]>();
      for (let dr = 0; dr < blockRows; dr++) {
        for (let dc = 0; dc < blockCols; dc++) {
          const r = br + dr;
          const c = bc + dc;
          const v = grid[r]?.[c] ?? null;
          if (v !== null) {
            const list = seen.get(v) ?? [];
            list.push({ r, c });
            seen.set(v, list);
          }
        }
      }
      for (const cells of seen.values()) {
        if (cells.length > 1) {
          for (const cell of cells) conflicts.add(`${cell.r}-${cell.c}`);
        }
      }
    }
  }

  return conflicts;
}

export function validateSudoku(config: SudokuConfig, userGrid: (number | null)[][]): boolean {
  if (config.size !== 9 || userGrid.length !== 9) return false;
  for (let r = 0; r < 9; r++) {
    if (userGrid[r].length !== 9) return false;
    for (let c = 0; c < 9; c++) {
      const v = userGrid[r][c];
      if (v === null || v < 1 || v > 9) return false;
      if (config.initialGrid[r][c] !== null && config.initialGrid[r][c] !== v) return false;
    }
  }
  return getSudokuConflicts(userGrid).size === 0;
}
