import type { Clue, WordSearchConfig } from '../../types/game';
import {
  buildSolidLeftoverPhrase,
  extractClueAlphaWords,
  hashClueTag,
} from './clueIntegration';
import { deriveSeed, mulberry32, pickOne, shuffle } from './prng';

interface WordPack {
  words: { word: string; clue: string }[];
  leftoverMessages: string[];
}

const WORD_PACKS: readonly WordPack[] = [
  {
    words: [
      { word: 'TESTAMENTO', clue: 'Documento notarial con la última voluntad de Arturo' },
      { word: 'CANDELABRO', clue: 'Pieza pesada de bronce hallada junto a la chimenea' },
      { word: 'BIBLIOTECA', clue: 'Estancia con estanterías de roble y puerta oculta' },
      { word: 'COARTADA', clue: 'Excusa horaria que debe verificarse con testigos' },
      { word: 'VENENO', clue: 'Sustancia letal disuelta en la copa de oporto' },
      { word: 'SECRETER', clue: 'Mueble con cajón secreto forzado a medianoche' },
      { word: 'ATIZADOR', clue: 'Hierro de chimenea con restos de hollín fresco' },
      { word: 'VENTISCA', clue: 'Tormenta de nieve que aisló Villa Acebo' },
      { word: 'TELEGRAMA', clue: 'Mensaje urgente recibido antes del apagón' },
      { word: 'LACRE', clue: 'Sello carmesí roto en el sobre confidencial' },
    ],
    leftoverMessages: [
      'LA PUERTA DEL SOTANO FUE CERRADA DESDE DENTRO',
      'REVISA EL RELOJ DETENIDO EN LA GALERIA NORTE',
    ],
  },
  {
    words: [
      { word: 'CHIMENEA', clue: 'Lugar donde ardieron cartas comprometedoras' },
      { word: 'INVERNADERO', clue: 'Recinto acristalado con orquídeas y barro fresco' },
      { word: 'BISTURI', clue: 'Hoja quirúrgica desaparecida del maletín médico' },
      { word: 'CAMPANADA', clue: 'Señal de medianoche durante la cena de Nochebuena' },
      { word: 'ESCALERA', clue: 'Tramo de servicio que conecta las dos plantas' },
      { word: 'PENUMBRA', clue: 'Falta de luz aprovechada tras el corte eléctrico' },
      { word: 'HUELLA', clue: 'Rastro marcado sobre la cera derramada' },
      { word: 'SOMBRA', clue: 'Silueta avistada tras los cortinajes del salón' },
      { word: 'BOTICA', clue: 'Armario de frascos y tinturas bajo llave' },
      { word: 'LLAVERO', clue: 'Juego metálico que faltaba en la recepción' },
    ],
    leftoverMessages: [
      'ALGUIEN COPIO LA LLAVE MAESTRA ANTES DE CENAR',
      'EL CULPABLE ESCONDIO LOS GUANTES EN LA CARBONERA',
    ],
  },
  {
    words: [
      { word: 'CENIZA', clue: 'Residuo gris hallado sobre la alfombra persa' },
      { word: 'PUÑAL', clue: 'Arma corta escondida en el forro de un abrigo' },
      { word: 'ESCRITORIO', clue: 'Mesa donde se redactó la denuncia anónima' },
      { word: 'PASADIZO', clue: 'Corredor estrecho detrás del tapiz medieval' },
      { word: 'SOBORNO', clue: 'Pago en metálico oculto en el libro de cuentas' },
      { word: 'SOSPECHA', clue: 'Duda fundada sobre una declaración contradictoria' },
      { word: 'RETRATO', clue: 'Cuadro torcido frente al umbral del estudio' },
      { word: 'CORBATA', clue: 'Prenda de seda usada en un forcejeo' },
      { word: 'HERENCIA', clue: 'Fortuna disputada entre parientes y acreedores' },
      { word: 'PERGAMINO', clue: 'Hoja antigua con anotaciones en tinta ferrogálica' },
    ],
    leftoverMessages: [
      'NADA EN EL TESTAMENTO FUE FIRMADO POR ARTURO',
      'BUSCA LA BOTELLA SIN ETIQUETA EN LA DESPENSA',
    ],
  },
  {
    words: [
      { word: 'OPORTO', clue: 'Vino generoso servido en copas de cristal tallado' },
      { word: 'BALCON', clue: 'Mirador helado con pisadas borradas por la nieve' },
      { word: 'ARCHIVO', clue: 'Carpeta judicial cerrada con doble broche' },
      { word: 'MISTERIO', clue: 'Enigma navideño que azota la mansión Valdemar' },
      { word: 'CULPABLE', clue: 'Autor material oculto entre los invitados' },
      { word: 'TESTIGO', clue: 'Persona que oyó pasos en la planta superior' },
      { word: 'CRISTAL', clue: 'Fragmento roto recogido junto al aparador' },
      { word: 'MALETA', clue: 'Equipaje preparado con antelación para huir' },
      { word: 'DISFRAZ', clue: 'Atuendo cambiado tras cometer el crimen' },
      { word: 'NOCHEBUENA', clue: 'Velada fatídica del veinticuatro de diciembre' },
    ],
    leftoverMessages: [
      'TODOS MIENTEN SOBRE LO QUE OCURRIO A LAS ONCE',
      'LA POLVORA EN EL PUÑO DELATA AL FALSIFICADOR',
    ],
  },
];

// Realistic Spanish letter frequency pool (strictly A-Z + Ñ, zero punctuation/!)
const SPANISH_FILLERS =
  'EEEEEEEEAAAAAAAOOOOOOSSSSSRRRRNNNNIIIIDDDLLLCCCTTUUMMPPBBGGVVYYQQHHFFZZJJÑ';

const DIRECTIONS: readonly { dr: number; dc: number }[] = [
  { dr: 0, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: -1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: -1, dc: -1 },
];

export function findWordCoordinates(
  grid: string[][],
  word: string
): { r: number; c: number }[] | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const target = word.toUpperCase();
  if (target.length === 0 || rows === 0 || cols === 0) return null;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== target[0]) continue;
      for (const { dr, dc } of DIRECTIONS) {
        const endR = r + dr * (target.length - 1);
        const endC = c + dc * (target.length - 1);
        if (endR < 0 || endR >= rows || endC < 0 || endC >= cols) continue;

        let match = true;
        const coords: { r: number; c: number }[] = [];
        for (let i = 0; i < target.length; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (grid[nr][nc] !== target[i]) {
            match = false;
            break;
          }
          coords.push({ r: nr, c: nc });
        }
        if (match) return coords;
      }
    }
  }
  return null;
}

export function generateWordSearch(seed: number, day = 1, clue?: Clue): WordSearchConfig {
  const baseSeed = deriveSeed(seed, day, `wordsearch:${hashClueTag(clue)}`);
  const size = day > 12 ? 12 : 11;
  const clueAlphaWords = extractClueAlphaWords(clue, 4, size);

  for (let attempt = 0; attempt < 25; attempt++) {
    const rng = mulberry32(baseSeed + attempt * 7919);
    const pack = WORD_PACKS[(Math.floor(rng() * WORD_PACKS.length) + attempt) % WORD_PACKS.length];
    const wordCount = size === 12 ? 9 : 8;

    const combinedPool: { word: string; clue: string }[] = [];
    const seenWords = new Set<string>();

    for (const cw of clueAlphaWords.slice(0, 3)) {
      if (!seenWords.has(cw) && cw.length <= size) {
        seenWords.add(cw);
        combinedPool.push({
          word: cw,
          clue: clue ? `Evidencia verificada del día ${day}: ${clue.impact}` : 'Indicio pericial del día',
        });
      }
    }

    for (const pw of shuffle(rng, pack.words)) {
      if (!seenWords.has(pw.word) && pw.word.length <= size) {
        seenWords.add(pw.word);
        combinedPool.push(pw);
      }
    }

    const chosenWords = combinedPool
      .slice(0, wordCount)
      .sort((a, b) => b.word.length - a.word.length);

    const grid: (string | null)[][] = Array.from({ length: size }, () =>
      Array<string | null>(size).fill(null)
    );

    let allPlaced = true;
    for (const item of chosenWords) {
      const letters = item.word.toUpperCase();
      const candidates: { r: number; c: number; dr: number; dc: number; overlaps: number }[] = [];

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          for (const { dr, dc } of DIRECTIONS) {
            const endR = r + dr * (letters.length - 1);
            const endC = c + dc * (letters.length - 1);
            if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

            let ok = true;
            let overlaps = 0;
            for (let i = 0; i < letters.length; i++) {
              const nr = r + dr * i;
              const nc = c + dc * i;
              const existing = grid[nr][nc];
              if (existing !== null && existing !== letters[i]) {
                ok = false;
                break;
              }
              if (existing === letters[i]) overlaps++;
            }
            if (ok) {
              candidates.push({ r, c, dr, dc, overlaps });
            }
          }
        }
      }

      if (candidates.length === 0) {
        allPlaced = false;
        break;
      }

      // Prefer placements with intersections to create a cohesive board
      const shuffledCandidates = shuffle(rng, candidates);
      shuffledCandidates.sort((a, b) => b.overlaps - a.overlaps);
      const topSlice = shuffledCandidates.slice(0, Math.min(6, shuffledCandidates.length));
      const pick = pickOne(rng, topSlice);

      for (let i = 0; i < letters.length; i++) {
        grid[pick.r + pick.dr * i][pick.c + pick.dc * i] = letters[i];
      }
    }

    if (!allPlaced) continue;

    const baseLeftover = pickOne(rng, pack.leftoverMessages);
    const leftoverMessage = buildSolidLeftoverPhrase(clue, baseLeftover);
    const messageChars = leftoverMessage.replace(/[^A-ZÑ]/gi, '').toUpperCase().split('');
    let msgIdx = 0;

    const finalGrid: string[][] = Array.from({ length: size }, () => Array<string>(size).fill('A'));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== null) {
          finalGrid[r][c] = grid[r][c]!;
        } else if (msgIdx < messageChars.length) {
          finalGrid[r][c] = messageChars[msgIdx++];
        } else {
          finalGrid[r][c] = SPANISH_FILLERS[Math.floor(rng() * SPANISH_FILLERS.length)];
        }
      }
    }

    return {
      grid: finalGrid,
      words: chosenWords,
      leftoverMessage,
    };
  }

  throw new Error('Failed to generate valid WordSearch grid');
}

export function validateWordSearch(config: WordSearchConfig, foundWords: string[]): boolean {
  if (config.grid.length < 11 || (config.grid[0]?.length ?? 0) < 11) return false;
  if (config.words.length < 8) return false;

  for (const row of config.grid) {
    for (const cell of row) {
      if (!/^[A-ZÑ]$/.test(cell)) return false;
    }
  }

  const foundSet = new Set(foundWords.map(w => w.toUpperCase()));
  return config.words.every(
    w => foundSet.has(w.word.toUpperCase()) && findWordCoordinates(config.grid, w.word) !== null
  );
}
