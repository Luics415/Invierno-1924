import type { Clue, MinesweeperConfig } from '../../types/game';
import { buildClueMeaning, hashClueTag } from './clueIntegration';
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

/**
 * Simula el solver determinista sin adivinanzas (reglas de celda única, diferencia/subconjunto de 2 celdas y conteo global)
 * y devuelve el conjunto de casillas seguras alcanzables desde `seedRevealed`.
 */
function runZeroGuessDeduction(
  rows: number,
  cols: number,
  mineSet: Set<string>,
  seedRevealed: Set<string>
): Set<string> {
  const revealed = new Set(seedRevealed);
  const flagged = new Set<string>();
  const totalSafe = rows * cols - mineSet.size;

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

  const revealSafe = (sr: number, sc: number) => {
    const q: [number, number][] = [[sr, sc]];
    while (q.length > 0) {
      const [r, c] = q.shift()!;
      const k = `${r}:${c}`;
      if (revealed.has(k) || flagged.has(k) || mineSet.has(k)) continue;
      revealed.add(k);
      if (countAdjacentMines(rows, cols, mineSet, r, c) === 0) {
        for (const [nr, nc] of neighborsOf(r, c)) {
          const nk = `${nr}:${nc}`;
          if (!revealed.has(nk) && !flagged.has(nk)) q.push([nr, nc]);
        }
      }
    }
  };

  for (const k of Array.from(revealed)) {
    const [r, c] = k.split(':').map(Number);
    if (countAdjacentMines(rows, cols, mineSet, r, c) === 0) {
      for (const [nr, nc] of neighborsOf(r, c)) {
        if (!revealed.has(`${nr}:${nc}`)) revealSafe(nr, nc);
      }
    }
  }

  let progress = true;
  while (progress && revealed.size < totalSafe) {
    progress = false;
    const frontier: { unrevealed: Set<string>; remaining: number }[] = [];

    for (const k of revealed) {
      const [r, c] = k.split(':').map(Number);
      const num = countAdjacentMines(rows, cols, mineSet, r, c);
      let flaggedCount = 0;
      const unrev = new Set<string>();
      for (const [nr, nc] of neighborsOf(r, c)) {
        const nk = `${nr}:${nc}`;
        if (flagged.has(nk)) flaggedCount++;
        else if (!revealed.has(nk)) unrev.add(nk);
      }
      if (unrev.size > 0) {
        const remaining = num - flaggedCount;
        if (remaining === 0) {
          for (const uk of unrev) {
            const [ur, uc] = uk.split(':').map(Number);
            revealSafe(ur, uc);
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

        if (b.remaining - a.remaining === bMinusA.length) {
          for (const mk of bMinusA) flagged.add(mk);
          for (const sk of aMinusB) {
            const [sr, sc] = sk.split(':').map(Number);
            revealSafe(sr, sc);
          }
          progress = true;
        } else if (aMinusB.length === 0 && b.remaining === a.remaining) {
          for (const sk of bMinusA) {
            const [sr, sc] = sk.split(':').map(Number);
            revealSafe(sr, sc);
          }
          progress = true;
        }
      }
    }

    if (progress) continue;

    const remMines = mineSet.size - flagged.size;
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
          revealSafe(sr, sc);
        }
        progress = true;
      } else if (remMines === allUnrev.length) {
        for (const mk of allUnrev) flagged.add(mk);
        progress = true;
      }
    }
  }

  return revealed;
}

export function generateMinesweeper(seed: number, day = 1, clue?: Clue): MinesweeperConfig {
  const derived = deriveSeed(seed, day, `minesweeper:${hashClueTag(clue)}`);
  const rows = 8;
  const cols = 8;
  const mineCount = day > 20 ? 11 : day > 12 ? 10 : 9;
  const totalSafe = rows * cols - mineCount;

  for (let attempt = 0; attempt < 25; attempt++) {
    const rng = mulberry32(derived + attempt * 7919);

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
    let reached = runZeroGuessDeduction(rows, cols, mineSet, initialSet);

    if (reached.size === totalSafe || attempt === 24) {
      // Si en el último intento aún quedara alguna esquina ambigua, añadimos las casillas seguras necesarias a initialSet
      while (reached.size < totalSafe) {
        let added = false;
        for (let r = 0; r < rows && !added; r++) {
          for (let c = 0; c < cols && !added; c++) {
            const k = `${r}:${c}`;
            if (!mineSet.has(k) && !reached.has(k)) {
              initialSet.add(k);
              added = true;
            }
          }
        }
        if (!added) break;
        reached = runZeroGuessDeduction(rows, cols, mineSet, initialSet);
      }

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
        secretMeaning: buildClueMeaning(pickOne(rng, MINESWEEPER_MEANINGS), clue),
      };
    }
  }

  throw new Error('Failed to generate deterministic Minesweeper');
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
