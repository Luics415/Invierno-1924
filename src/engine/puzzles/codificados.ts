import type { CodificadosClue, CodificadosConfig } from '../../types/game';
import { deriveSeed, mulberry32 } from './prng';

interface CodificadosPreset {
  secretCode: [number, number, number, number];
  attempts: [number, number, number, number][];
  secretMeaning: string;
}

const CODIFICADOS_PRESETS: readonly CodificadosPreset[] = [
  {
    // Inspirado directamente en la página "CODIFICADOS" del libro:
    // Pista 1: 9078 (0,0) -> descarta 9,0,7,8
    // Pista 2: 2837 (1 exacta, 1 mal colocada)
    // Pista 3: 6758 (0 exactas, 1 mal colocada)
    // Pista 4: 8396 (1 exacta, 0 mal colocadas)
    // Pista 5: 3846 (1 exacta, 1 mal colocada)
    // Solución única con dígitos distintos: 5 2 3 4 o verifiquemos con el motor exacto:
    secretCode: [2, 4, 3, 5],
    attempts: [
      [9, 0, 7, 8],
      [2, 8, 1, 7],
      [6, 7, 5, 8],
      [8, 3, 9, 4],
      [1, 8, 3, 6],
    ],
    secretMeaning: 'Hora exacta registrada en el cronógrafo roto del despacho (24:35 / código 2435)',
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
    secretMeaning: 'Combinación del candado del archivo privado de Don Arturo (1924)',
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
    secretMeaning: 'Número de serie del expediente lacrado en la caja fuerte (3706)',
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
    secretMeaning: 'Código telegráfico de emergencia interceptado antes de la ventisca (4815)',
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

export function generateCodificados(seed: number, day = 1): CodificadosConfig {
  const derived = deriveSeed(seed, day, 'codificados');
  const rng = mulberry32(derived);
  const preset =
    CODIFICADOS_PRESETS[
      (day + Math.floor(rng() * CODIFICADOS_PRESETS.length)) % CODIFICADOS_PRESETS.length
    ];

  const clues: CodificadosClue[] = preset.attempts.map((attempt, idx) => {
    const { exactCount, misplacedCount } = scoreCodificadosAttempt(preset.secretCode, attempt);
    return {
      id: `pista-${idx + 1}`,
      attempt,
      exactCount,
      misplacedCount,
      text: formatCodificadosClueText(exactCount, misplacedCount),
    };
  });

  return {
    secretCode: [...preset.secretCode] as [number, number, number, number],
    clues,
    secretMeaning: preset.secretMeaning,
  };
}

export function validateCodificados(
  config: CodificadosConfig,
  userDigits: readonly (number | null)[]
): boolean {
  if (userDigits.length !== 4) return false;
  return config.secretCode.every((digit, idx) => userDigits[idx] === digit);
}
