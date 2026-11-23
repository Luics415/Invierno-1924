import type { CaseConfig, Clue, DayPuzzle, PuzzleType } from '../types/game';
import { generateSudoku } from './puzzles/sudoku';
import { generateWordSearch } from './puzzles/wordsearch';
import { generateMurdoku } from './puzzles/murdoku';
import { generateSyllables } from './puzzles/syllables';
import { generateCryptogram } from './puzzles/cryptogram';
import { generateCrossword } from './puzzles/crossword';
import { generateFutoshiki } from './puzzles/futoshiki';
import { generateConnections } from './puzzles/connections';
import { generateNonogram } from './puzzles/nonogram';
import { generateMinesweeper } from './puzzles/minesweeper';
import { generateSeptagrama } from './puzzles/septagrama';
import { generateCodificados } from './puzzles/codificados';
import { generateEcuaciones } from './puzzles/ecuaciones';
import { generateEncajados } from './puzzles/encajados';

export function buildDayPuzzle(
  type: PuzzleType,
  seed: number,
  day: number,
  clue: Clue,
  caseConfig?: CaseConfig
): DayPuzzle {
  const focusHint = `Objetivo forense del día ${day}: ${clue.impact}.`;

  switch (type) {
    case 'sudoku': {
      const config = generateSudoku(seed, day, clue);
      return {
        type: 'sudoku',
        config,
        solution: config.solution,
        instructions:
          'Completa la cuadrícula Sudoku 9×9 (bloques 3×3) del 1 al 9 sin repetir números por fila, columna o subcuadro.',
        hints: [
          'Comienza por las filas, columnas o bloques 3×3 con más dígitos ya revelados.',
          'Usa el modo Lápiz para anotar candidatos antes de confirmar con Tinta.',
          focusHint,
        ],
      };
    }

    case 'wordsearch': {
      const config = generateWordSearch(seed, day, clue);
      return {
        type: 'wordsearch',
        config,
        solution: config.words.map(w => w.word),
        instructions:
          `Localiza las ${config.words.length} palabras ocultas en la sopa de letras ampliada (horizontal, vertical o diagonal, en ambos sentidos).`,
        hints: [
          `Busca primero las palabras más largas, como «${config.words[0]?.word ?? ''}».`,
          'Arrastra desde la primera hasta la última letra o pulsa inicio y fin.',
          focusHint,
        ],
      };
    }

    case 'murdoku': {
      const config = generateMurdoku(seed, day, clue, caseConfig);
      return {
        type: 'murdoku',
        config,
        solution: config.targetMatches,
        instructions:
          'Deduce las parejas exactas en la matriz lógica. Atención: cualquier marca incorrecta (confirmación o descarte erróneo) reinicia el tablero al instante.',
        hints: [
          'Lee todas las premisas antes de marcar; un solo error borra el tablero completo.',
          'Utiliza las marcas de duda (?) sin penalización mientras cruzas exclusiones.',
          focusHint,
        ],
      };
    }

    case 'syllables': {
      const config = generateSyllables(seed, day, clue);
      return {
        type: 'syllables',
        config,
        solution: config.secretWord,
        instructions:
          'Reconstruye las palabras clave largas combinando las sílabas correctas. Hay sílabas distractoras que deben quedar sin usar.',
        hints: [
          'Descarta las sílabas sueltas que no encajen en ninguna definición forense.',
          `La primera definición requiere ${config.words[0]?.targetSyllables.length ?? 4} sílabas.`,
          focusHint,
        ],
      };
    }

    case 'cryptogram': {
      const config = generateCryptogram(seed, day, clue);
      return {
        type: 'cryptogram',
        config,
        solution: config.cipherText,
        instructions:
          'Descifra el mensaje por sustitución numérica estricta (biyección 1 a 1: cada letra corresponde a un único número y no puede repetirse).',
        hints: [
          'Identifica palabras cortas de 2 o 3 letras (LA, EL, DE, NO, EN, UN) y vocales más frecuentes.',
          'No existen letras repetidas bajo dos números distintos.',
          focusHint,
        ],
      };
    }

    case 'crossword': {
      const config = generateCrossword(seed, day, clue);
      return {
        type: 'crossword',
        config,
        solution: config.grid,
        instructions:
          'Completa el crucigrama forense cruzando horizontales y verticales con términos exactos del sumario de Villa Acebo.',
        hints: [
          'Empieza por las definiciones más directas para desbloquear letras en los cruces.',
          'Pulsa sobre cualquier pista para saltar directamente a su casilla inicial.',
          focusHint,
        ],
      };
    }

    case 'futoshiki': {
      const config = generateFutoshiki(seed, day, clue);
      return {
        type: 'futoshiki',
        config,
        solution: config.solution,
        instructions:
          `Rellena la cuadrícula Futoshiki ${config.size}×${config.size} con números del 1 al ${config.size} sin repetir por fila o columna, respetando cada signo < y >.`,
        hints: [
          'Las cadenas consecutivas de desigualdades (< < o > >) fijan rápidamente los extremos 1 y 5.',
          'Ningún número puede repetirse en la misma fila ni en la misma columna.',
          focusHint,
        ],
      };
    }

    case 'connections': {
      const config = generateConnections(seed, day, clue);
      return {
        type: 'connections',
        config,
        solution: config.groups,
        instructions:
          'Agrupa las 16 evidencias en 4 categorías secretas de 4 elementos cada una sin superar el límite de errores.',
        hints: [
          `Una de las categorías agrupa: «${config.groups[0].category}».`,
          'Si el sistema avisa que estás a 1 elemento de acertar, intercambia solo una ficha.',
          focusHint,
        ],
      };
    }

    case 'nonogram': {
      const config = generateNonogram(seed, day, clue);
      return {
        type: 'nonogram',
        config,
        solution: config.solution,
        instructions:
          'Revela la silueta de la prueba oculta pintando celdas según las pistas numéricas de cada fila y columna. Marca con X las celdas vacías.',
        hints: [
          'Empieza por filas o columnas cuya suma de bloques sea mayor (como 7 o 5).',
          `La figura oculta corresponde a: ${config.revealTitle}.`,
          focusHint,
        ],
      };
    }

    case 'minesweeper': {
      const config = generateMinesweeper(seed, day, clue);
      return {
        type: 'minesweeper',
        config,
        solution: config.mines,
        instructions:
          `Inspecciona todas las casillas seguras sin detonar ninguna de las ${config.mines.length} trampas ocultas. Usa el modo Bandera (o clic derecho) para señalizar peligros.`,
        hints: [
          'Cada número indica cuántas trampas rodean a esa casilla en sus 8 vecinas.',
          'Marca primero las esquinas evidentes alrededor de los números 1 y 2.',
          focusHint,
        ],
      };
    }

    case 'septagrama': {
      const config = generateSeptagrama(seed, day, clue);
      return {
        type: 'septagrama',
        config,
        solution: config.words.map(w => w.answer),
        instructions:
          `Forma las ${config.words.length} palabras usando únicamente las 7 letras del Septagrama (incluyendo siempre la letra central «${config.centerLetter}») para descubrir la palabra de las casillas sombreadas.`,
        hints: [
          `Todas las palabras incluyen la letra central «${config.centerLetter}».`,
          'Las letras colocadas en las casillas sombreadas revelan una palabra clave en la barra inferior.',
          focusHint,
        ],
      };
    }

    case 'codificados': {
      const config = generateCodificados(seed, day, clue);
      return {
        type: 'codificados',
        config,
        solution: config.secretCode,
        instructions:
          'Deduce el código de 4 cifras analizando las 5 pistas lógicas sobre cifras bien o mal colocadas.',
        hints: [
          'Empieza por la pista donde ninguna cifra pertenece al código para tachar esos dígitos.',
          'Cruza las pistas con cifras bien colocadas para fijar su posición exacta.',
          focusHint,
        ],
      };
    }

    case 'ecuaciones': {
      const config = generateEcuaciones(seed, day, clue);
      return {
        type: 'ecuaciones',
        config,
        solution: config.targetCode,
        instructions:
          'Deduce el valor numérico (0–9) de cada símbolo forense resolviendo las 6 ecuaciones y coloca las 4 cifras en el marcador superior.',
        hints: [
          'Empieza por la primera ecuación con símbolos repetidos o resta directa.',
          'Sustituye los valores obtenidos en las siguientes filas hasta despejar los 4 iconos del marcador.',
          focusHint,
        ],
      };
    }

    case 'encajados': {
      const config = generateEncajados(seed, day, clue);
      return {
        type: 'encajados',
        config,
        solution: config.grid,
        instructions:
          'Encaja todas las palabras del banco inferior en la cuadrícula apoyándote en su longitud y en las letras iniciales para descubrir la palabra de las casillas sombreadas.',
        hints: [
          'Selecciona primero los huecos de longitud única o los que ya tienen una letra inicial colocada.',
          'Toca cualquier palabra del banco inferior para encajarla directamente en el hueco activo.',
          focusHint,
        ],
      };
    }
  }
}
