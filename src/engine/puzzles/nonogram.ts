import type { NonogramConfig } from '../../types/game';
import { deriveSeed, mulberry32 } from './prng';

interface NonogramTemplate {
  revealTitle: string;
  secretMeaning: string;
  pattern: string[]; // '#' = filled, '.' = empty
}

const NONOGRAM_TEMPLATES: readonly NonogramTemplate[] = [
  {
    revealTitle: 'Llave Maestra',
    secretMeaning: 'Silueta de la llave maestra perdida en el vestíbulo',
    pattern: [
      '..###..',
      '.#...#.',
      '..###..',
      '...#...',
      '...#...',
      '...###.',
      '...#...',
    ],
  },
  {
    revealTitle: 'Frasco de Veneno',
    secretMeaning: 'Perfil de la ampolla química hallada en la botica',
    pattern: [
      '..###..',
      '...#...',
      '..###..',
      '.#...#.',
      '.#####.',
      '.#####.',
      '..###..',
    ],
  },
  {
    revealTitle: 'Daga de Plata',
    secretMeaning: 'Forma del arma punzante descrita en el protocolo',
    pattern: [
      '...#...',
      '...#...',
      '...#...',
      '...#...',
      '.#####.',
      '...#...',
      '..###..',
    ],
  },
  {
    revealTitle: 'Reloj de Arena',
    secretMeaning: 'Símbolo grabado en el reloj detenido a las 23:15 h',
    pattern: [
      '#######',
      '.#####.',
      '..###..',
      '...#...',
      '..###..',
      '.#####.',
      '#######',
    ],
  },
  {
    revealTitle: 'Cáliz de Oporto',
    secretMeaning: 'Silueta de la copa analizada en el comedor de gala',
    pattern: [
      '.#####.',
      '.#####.',
      '..###..',
      '...#...',
      '...#...',
      '...#...',
      '.#####.',
    ],
  },
  {
    revealTitle: 'Sobre Lacrado',
    secretMeaning: 'Emblema del testamento sellado con cera carmesí',
    pattern: [
      '#######',
      '##...##',
      '#.#.#.#',
      '#..#..#',
      '#.....#',
      '#.....#',
      '#######',
    ],
  },
];

export function computeLineClues(line: boolean[]): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const cell of line) {
    if (cell) {
      run++;
    } else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  if (run > 0) clues.push(run);
  return clues.length > 0 ? clues : [0];
}

export function generateNonogram(seed: number, day = 1): NonogramConfig {
  const derived = deriveSeed(seed, day, 'nonogram');
  const rng = mulberry32(derived);
  const template = NONOGRAM_TEMPLATES[(day + Math.floor(rng() * NONOGRAM_TEMPLATES.length)) % NONOGRAM_TEMPLATES.length];

  const rows = template.pattern.length;
  const cols = template.pattern[0].length;
  const solution: boolean[][] = template.pattern.map(rowStr =>
    rowStr.split('').map(ch => ch === '#')
  );

  const rowClues = solution.map(row => computeLineClues(row));
  const colClues = Array.from({ length: cols }, (_, c) =>
    computeLineClues(solution.map(row => row[c]))
  );

  return {
    rows,
    cols,
    solution,
    rowClues,
    colClues,
    revealTitle: template.revealTitle,
    secretMeaning: template.secretMeaning,
  };
}

export function validateNonogram(config: NonogramConfig, userGrid: boolean[][]): boolean {
  if (userGrid.length !== config.rows) return false;
  for (let r = 0; r < config.rows; r++) {
    if ((userGrid[r]?.length ?? 0) !== config.cols) return false;
  }

  // Validate by exact clue satisfaction (allows any valid solution matching row & col clues)
  for (let r = 0; r < config.rows; r++) {
    const actual = computeLineClues(userGrid[r]);
    const expected = config.rowClues[r];
    if (actual.length !== expected.length || actual.some((v, idx) => v !== expected[idx])) {
      return false;
    }
  }
  for (let c = 0; c < config.cols; c++) {
    const actual = computeLineClues(userGrid.map(row => row[c]));
    const expected = config.colClues[c];
    if (actual.length !== expected.length || actual.some((v, idx) => v !== expected[idx])) {
      return false;
    }
  }
  return true;
}
