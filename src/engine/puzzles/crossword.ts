import type { CrosswordConfig, CrosswordEntry } from '../../types/game';
import { deriveSeed, mulberry32 } from './prng';

// Motor limpio de colocación verificada: coloca palabras cruzándose en letras coincidentes
// y verifica que no se formen secuencias adyacentes inválidas.
interface ClueWord {
  word: string;
  clue: string;
}

const NOIR_CROSSWORD_SETS: readonly { meaning: string; words: ClueWord[] }[] = [
  {
    meaning: 'Claves cruzadas del expediente de Villa Acebo',
    words: [
      { word: 'TESTAMENTO', clue: 'Última voluntad notarial de Arturo Valdemar' },
      { word: 'COARTADA', clue: 'Declaración horaria que exculpa a un sospechoso' },
      { word: 'BIBLIOTECA', clue: 'Estancia de roble con caja fuerte empotrada' },
      { word: 'VENENO', clue: 'Sustancia tóxica disuelta en una bebida' },
      { word: 'ATIZADOR', clue: 'Barra de hierro usada junto a la chimenea' },
      { word: 'SOTANO', clue: 'Nivel inferior donde se ubican bodega y calderas' },
      { word: 'LACRE', clue: 'Cera carmesí que sella sobres confidenciales' },
      { word: 'TORRE', clue: 'Mirador elevado donde late el reloj de péndulo' },
      { word: 'PISTA', clue: 'Indicio forense verificado por Azlynn' },
      { word: 'LLAVE', clue: 'Objeto metálico que abre cerraduras maestras' },
    ],
  },
  {
    meaning: 'Rastros documentales de la noche del crimen',
    words: [
      { word: 'INVERNADERO', clue: 'Cúpula acristalada de orquídeas y tierra húmeda' },
      { word: 'NOCHEBUENA', clue: 'Velada del 23 al 24 de diciembre en la mansión' },
      { word: 'HERENCIA', clue: 'Fortuna disputada entre parientes y acreedores' },
      { word: 'CAPILLA', clue: 'Oratorio de piedra en la planta alta' },
      { word: 'BISTURI', clue: 'Hoja quirúrgica de filo limpio y preciso' },
      { word: 'CENIZA', clue: 'Polvo grisáceo procedente de las chimeneas' },
      { word: 'CARTA', clue: 'Misiva comprometida hallada en el secreter' },
      { word: 'POLEN', clue: 'Residuo botánico que delata paso por plantas' },
      { word: 'RELOJ', clue: 'Mecanismo que marca las campanadas de medianoche' },
      { word: 'BODEGA', clue: 'Cava subterránea donde reposan los vinos añejos' },
    ],
  },
  {
    meaning: 'Vocabulario forense del sumario judicial',
    words: [
      { word: 'INVESTIGACION', clue: 'Pesquisa metódica liderada por la detective Azlynn' },
      { word: 'SOSPECHOSO', clue: 'Persona presente en la finca bajo escrutinio' },
      { word: 'TELEGRAMA', clue: 'Despacho urgente enviado desde la estación' },
      { word: 'CRIMEN', clue: 'Delito perpetrado durante el apagón eléctrico' },
      { word: 'SALON', clue: 'Estancia presidida por el abeto navideño' },
      { word: 'TINTA', clue: 'Fluido ferrogálico hallado en dedos y manuscritos' },
      { word: 'BARRO', clue: 'Lodo oscuro arrastrado en las suelas de los zapatos' },
      { word: 'PERFIL', clue: 'Conjunto de rasgos forenses de un individuo' },
      { word: 'MOVIL', clue: 'Razón secreta que impulsa un homicidio' },
      { word: 'CERA', clue: 'Resto de vela hallado junto a documentos sellados' },
    ],
  },
];

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

function canPlaceWord(
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

  // Cell immediately before start and after end must be empty
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
      // Must not touch perpendicular letters unless intersecting at this cell
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

function buildCrosswordLayout(words: ClueWord[], rng: () => number): { grid: (string | null)[][]; placed: PlacedWord[] } {
  const SIZE = 15;
  const grid: (string | null)[][] = Array.from({ length: SIZE }, () => Array<string | null>(SIZE).fill(null));
  const placed: PlacedWord[] = [];

  // Place first (longest) word horizontally across middle
  const ordered = [...words].sort((a, b) => b.word.length - a.word.length);
  const first = ordered[0];
  const startR = Math.floor(SIZE / 2);
  const startC = Math.max(0, Math.floor((SIZE - first.word.length) / 2));

  for (let i = 0; i < first.word.length; i++) {
    grid[startR][startC + i] = first.word[i];
  }
  placed.push({ ...first, row: startR, col: startC, direction: 'across' });

  for (let wIdx = 1; wIdx < ordered.length && placed.length < 7; wIdx++) {
    const candidateWord = ordered[wIdx];
    const placements: { r: number; c: number; dir: 'across' | 'down'; score: number }[] = [];

    for (const dir of ['down', 'across'] as const) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const hits = canPlaceWord(grid, SIZE, SIZE, candidateWord.word, r, c, dir, true);
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
    for (let i = 0; i < candidateWord.word.length; i++) {
      grid[best.r + dr * i][best.c + dc * i] = candidateWord.word[i];
    }
    placed.push({ ...candidateWord, row: best.r, col: best.c, direction: best.dir });
  }

  // Trim bounding box tightly
  let minR = SIZE;
  let maxR = 0;
  let minC = SIZE;
  let maxC = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] !== null) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  const trimmedRows = maxR - minR + 1;
  const trimmedCols = maxC - minC + 1;
  const trimmedGrid: (string | null)[][] = Array.from({ length: trimmedRows }, (_, r) =>
    Array.from({ length: trimmedCols }, (_, c) => grid[minR + r][minC + c])
  );

  const shiftedPlaced: PlacedWord[] = placed.map(p => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC,
  }));

  return { grid: trimmedGrid, placed: shiftedPlaced };
}

export function generateCrossword(seed: number, day = 1): CrosswordConfig {
  const derived = deriveSeed(seed, day, 'crossword');
  const rng = mulberry32(derived);
  const pack = NOIR_CROSSWORD_SETS[(day + Math.floor(rng() * NOIR_CROSSWORD_SETS.length)) % NOIR_CROSSWORD_SETS.length];

  const { grid, placed } = buildCrosswordLayout(pack.words, rng);

  // Number cells in standard top-to-bottom, left-to-right reading order
  const startPositions = Array.from(
    new Set(placed.map(p => `${p.row}:${p.col}`))
  )
    .map(key => {
      const [r, c] = key.split(':').map(Number);
      return { r, c };
    })
    .sort((a, b) => (a.r !== b.r ? a.r - b.r : a.c - b.c));

  const posToNumber = new Map<string, number>();
  startPositions.forEach((pos, idx) => {
    posToNumber.set(`${pos.r}:${pos.c}`, idx + 1);
  });

  const entries: CrosswordEntry[] = placed
    .map(p => {
      const num = posToNumber.get(`${p.row}:${p.col}`) ?? 1;
      return {
        id: `${num}-${p.direction}`,
        number: num,
        direction: p.direction,
        row: p.row,
        col: p.col,
        answer: p.word,
        clue: p.clue,
      };
    })
    .sort((a, b) => (a.direction !== b.direction ? (a.direction === 'across' ? -1 : 1) : a.number - b.number));

  const secretHighlightCells = entries.slice(0, 4).map(e => ({ r: e.row, c: e.col }));

  return {
    rows: grid.length,
    cols: grid[0]?.length ?? 0,
    grid,
    entries,
    secretHighlightCells,
    secretMeaning: pack.meaning,
  };
}

export function validateCrossword(config: CrosswordConfig, userGrid: (string | null)[][]): boolean {
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
