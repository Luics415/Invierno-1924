import type { MinesweeperConfig } from '../../types/game';
import { deriveSeed, mulberry32, pickOne, shuffle } from './prng';

const MINESWEEPER_MEANINGS: readonly string[] = [
  'Despeje seguro de trampas y rastros alterados en el suelo',
  'Mapeo perimetral de cristales rotos sin contaminar la escena',
  'Rastreo de placas falsas en la tarima de Villa Acebo',
  'Inspección segura del umbral bloqueado durante el apagón',
];

export function countAdjacentMines(
  rows: number,
  cols: number,
  mineSet: Set<string>,
  r: number,
  c: number
): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && mineSet.has(`${nr}:${nc}`)) {
        count++;
      }
    }
  }
  return count;
}

export function floodRevealSafeCells(
  rows: number,
  cols: number,
  mineSet: Set<string>,
  startR: number,
  startC: number,
  alreadyRevealed: Set<string>
): Set<string> {
  const revealed = new Set(alreadyRevealed);
  const queue: [number, number][] = [[startR, startC]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r}:${c}`;
    if (revealed.has(key) || mineSet.has(key)) continue;
    revealed.add(key);

    if (countAdjacentMines(rows, cols, mineSet, r, c) === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const nKey = `${nr}:${nc}`;
            if (!revealed.has(nKey) && !mineSet.has(nKey)) {
              queue.push([nr, nc]);
            }
          }
        }
      }
    }
  }

  return revealed;
}

export function generateMinesweeper(seed: number, day = 1): MinesweeperConfig {
  const derived = deriveSeed(seed, day, 'minesweeper');
  const rng = mulberry32(derived);

  const rows = 8;
  const cols = 8;
  const mineCount = day > 20 ? 11 : day > 12 ? 10 : 9;

  // Guaranteed safe opening center zone (3x3 around start) so initial click always floods cleanly
  const startR = 1 + Math.floor(rng() * (rows - 2));
  const startC = 1 + Math.floor(rng() * (cols - 2));
  const safeZone = new Set<string>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      safeZone.add(`${startR + dr}:${startC + dc}`);
    }
  }

  const candidateCells: { r: number; c: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!safeZone.has(`${r}:${c}`)) {
        candidateCells.push({ r, c });
      }
    }
  }

  const mines = shuffle(rng, candidateCells).slice(0, mineCount);
  const mineSet = new Set(mines.map(m => `${m.r}:${m.c}`));

  const initialSet = floodRevealSafeCells(rows, cols, mineSet, startR, startC, new Set<string>());
  const initialRevealed = Array.from(initialSet).map(key => {
    const [r, c] = key.split(':').map(Number);
    return { r, c };
  });

  return {
    rows,
    cols,
    mines,
    initialRevealed,
    flaggedTargetCount: mines.length,
    secretMeaning: pickOne(rng, MINESWEEPER_MEANINGS),
  };
}

export function validateMinesweeper(
  config: MinesweeperConfig,
  revealedSet: Set<string>,
  flaggedSet?: Set<string>
): boolean {
  const mineSet = new Set(config.mines.map(m => `${m.r}:${m.c}`));
  const totalSafe = config.rows * config.cols - config.mines.length;

  // No mine may be revealed
  for (const key of revealedSet) {
    if (mineSet.has(key)) return false;
  }

  // Victory if all safe cells are revealed
  if (revealedSet.size === totalSafe) {
    return true;
  }

  // Or if every mine is flagged and no safe cell is flagged
  if (flaggedSet && flaggedSet.size === mineSet.size) {
    let allMinesFlagged = true;
    for (const key of mineSet) {
      if (!flaggedSet.has(key)) {
        allMinesFlagged = false;
        break;
      }
    }
    if (allMinesFlagged) return true;
  }

  return false;
}
