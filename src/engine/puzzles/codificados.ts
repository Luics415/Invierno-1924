import type { Clue, CodificadosClue, CodificadosConfig } from '../../types/game';
import { buildClueMeaning, hashClueTag } from './clueIntegration';
import { deriveSeed, mulberry32, shuffle } from './prng';

interface CodificadosBasePattern {
  secretCode: [number, number, number, number];
  attempts: [number, number, number, number][];
  meaningTemplate: string;
}

// Patrones base verificados con solución única en {0..9}^4.
// Al aplicar cualquier permutación biyectiva de los dígitos 0..9,
// la unicidad de la solución se conserva exactamente y genera miles de códigos distintos.
const BASE_PATTERNS: readonly CodificadosBasePattern[] = [
  {
    secretCode: [2, 4, 3, 5],
    attempts: [
      [9, 0, 7, 8],
      [2, 8, 1, 7],
      [6, 7, 5, 8],
      [8, 3, 9, 4],
      [1, 8, 3, 6],
    ],
    meaningTemplate: 'Registro del cronógrafo pericial del despacho',
  },
  {
    secretCode: [1, 9, 2, 4],
    attempts: [
      [5, 6, 7, 8],
      [1, 5, 6, 2],
      [7, 2, 8, 4],
      [9, 6, 1, 7],
      [5, 9, 3, 4],
    ],
    meaningTemplate: 'Combinación del candado del archivo privado de Don Arturo',
  },
  {
    secretCode: [3, 7, 0, 6],
    attempts: [
      [1, 2, 4, 5],
      [3, 1, 7, 2],
      [4, 7, 8, 0],
      [9, 5, 0, 1],
      [8, 2, 6, 3],
    ],
    meaningTemplate: 'Número de serie del expediente lacrado en la caja fuerte',
  },
  {
    secretCode: [4, 8, 1, 5],
    attempts: [
      [2, 3, 6, 9],
      [4, 2, 8, 3],
      [6, 8, 7, 1],
      [9, 1, 5, 3],
      [7, 3, 1, 5],
    ],
    meaningTemplate: 'Código telegráfico de emergencia interceptado antes de la ventisca',
  },
];

export function scoreCodificadosAttempt(
  secret: readonly [number, number, number, number],
  attempt: readonly [number, number, number, number]
): { exactCount: number; misplacedCount: number } {
  let exactCount = 0;
  const secretUsed = [false, false, false, false];
  const attemptUsed = [false, false, false, false];

  for (let i = 0; i < 4; i++) {
    if (attempt[i] === secret[i]) {
      exactCount++;
      secretUsed[i] = true;
      attemptUsed[i] = true;
    }
  }

  let misplacedCount = 0;
  for (let i = 0; i < 4; i++) {
    if (attemptUsed[i]) continue;
    for (let j = 0; j < 4; j++) {
      if (!secretUsed[j] && attempt[i] === secret[j]) {
        misplacedCount++;
        secretUsed[j] = true;
        break;
      }
    }
  }

  return { exactCount, misplacedCount };
}

export function formatCodificadosClueText(exactCount: number, misplacedCount: number): string {
  const total = exactCount + misplacedCount;
  if (total === 0) {
    return 'Ninguna cifra pertenece al código.';
  }
  if (total === 1) {
    return exactCount === 1
      ? 'Una cifra es correcta y está bien colocada. Las demás no pertenecen.'
      : 'Una cifra es correcta, pero está mal colocada. Las demás no pertenecen.';
  }
  if (total === 2) {
    if (exactCount === 2) {
      return 'Dos cifras son correctas y están bien colocadas. Las demás no pertenecen.';
    }
    if (exactCount === 1) {
      return 'Dos cifras son correctas: una está bien colocada y la otra no. Las demás no pertenecen.';
    }
    return 'Dos cifras son correctas, pero están mal colocadas. Las demás no pertenecen.';
  }
  if (total === 3) {
    if (exactCount === 3) {
      return 'Tres cifras son correctas y están bien colocadas. La otra no pertenece.';
    }
    if (exactCount === 2) {
      return 'Tres cifras son correctas: dos están bien colocadas y una no.';
    }
    if (exactCount === 1) {
      return 'Tres cifras son correctas: una está bien colocada y dos están mal colocadas.';
    }
    return 'Tres cifras son correctas, pero están mal colocadas.';
  }
  return `${total} cifras pertenecen al código (${exactCount} bien colocadas, ${misplacedCount} mal colocadas).`;
}

export function generateCodificados(seed: number, day = 1, clue?: Clue): CodificadosConfig {
  const derived = deriveSeed(seed, day, `codificados:${hashClueTag(clue)}`);
  const rng = mulberry32(derived);
  const pattern =
    BASE_PATTERNS[(day + Math.floor(rng() * BASE_PATTERNS.length)) % BASE_PATTERNS.length];

  // Permutación biyectiva de 0..9 para variedad procedural preservando solución única
  const digitMap = shuffle(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const mapQuad = (q: readonly [number, number, number, number]): [number, number, number, number] => [
    digitMap[q[0]],
    digitMap[q[1]],
    digitMap[q[2]],
    digitMap[q[3]],
  ];

  const secretCode = mapQuad(pattern.secretCode);
  const clues: CodificadosClue[] = pattern.attempts.map((rawAttempt, idx) => {
    const attempt = mapQuad(rawAttempt);
    const { exactCount, misplacedCount } = scoreCodificadosAttempt(secretCode, attempt);
    return {
      id: `pista-${idx + 1}`,
      attempt,
      exactCount,
      misplacedCount,
      text: formatCodificadosClueText(exactCount, misplacedCount),
    };
  });

  const hh = String((secretCode[0] * 10 + secretCode[1]) % 24).padStart(2, '0');
  const mm = String((secretCode[2] * 10 + secretCode[3]) % 60).padStart(2, '0');
  const baseMeaning = `${pattern.meaningTemplate} (código ${secretCode.join('')} · ${hh}:${mm} h)`;

  return {
    secretCode,
    clues,
    secretMeaning: buildClueMeaning(baseMeaning, clue),
  };
}

export function validateCodificados(
  config: CodificadosConfig,
  userDigits: readonly (number | null)[]
): boolean {
  if (userDigits.length !== 4) return false;
  return config.secretCode.every((digit, idx) => userDigits[idx] === digit);
}
