import type { Clue, SyllablesConfig, SyllablesWord } from '../../types/game';
import { hashClueTag, toAlphaOnlyPhrase } from './clueIntegration';
import { deriveSeed, mulberry32, pickOne, sampleN, shuffle } from './prng';

interface SyllableBankItem {
  syllables: string[];
  definition: string;
}

const LONG_WORDS_BANK: readonly SyllableBankItem[] = [
  { syllables: ['TES', 'TA', 'MEN', 'TO'], definition: 'Documento notarial con la última voluntad' },
  { syllables: ['IN', 'TER', 'RO', 'GA', 'TO', 'RIO'], definition: 'Serie de preguntas formales a un sospechoso' },
  { syllables: ['EN', 'VE', 'NE', 'NA', 'MIEN', 'TO'], definition: 'Homicidio cometido con sustancia tóxica' },
  { syllables: ['ES', 'TRAN', 'GU', 'LA', 'MIEN', 'TO'], definition: 'Asfixia mecánica cometida con un cordón o lazo' },
  { syllables: ['CON', 'TRA', 'BAN', 'DIS', 'TA'], definition: 'Persona dedicada al tráfico ilícito de mercancías' },
  { syllables: ['CO', 'RRES', 'PON', 'DEN', 'CIA'], definition: 'Conjunto de cartas interceptadas en el estudio' },
  { syllables: ['IN', 'VES', 'TI', 'GA', 'CIÓN'], definition: 'Pesquisa metódica dirigida por la detective Azlynn' },
  { syllables: ['CRO', 'NO', 'ME', 'TRA', 'JE'], definition: 'Medición exacta de los tiempos entre coartadas' },
  { syllables: ['AR', 'QUI', 'TEC', 'TU', 'RA'], definition: 'Diseño plano de los pasadizos de Villa Acebo' },
  { syllables: ['IN', 'VER', 'NA', 'DE', 'RO'], definition: 'Pabellón acristalado donde crecen plantas exóticas' },
  { syllables: ['DES', 'A', 'PA', 'RI', 'CIÓN'], definition: 'Ausencia inexplicable de un testigo clave' },
  { syllables: ['PRO', 'PIE', 'TA', 'RIO'], definition: 'Dueño legal de la hacienda y sus tierras' },
  { syllables: ['SO', 'BRE', 'SA', 'LIEN', 'TE'], definition: 'Elemento que destaca en la escena del crimen' },
  { syllables: ['CRI', 'MI', 'NA', 'LIS', 'TA'], definition: 'Especialista en rastros forenses y balística' },
  { syllables: ['SUB', 'TE', 'RRÁ', 'NE', 'O'], definition: 'Pasaje oculto bajo el nivel del suelo' },
  { syllables: ['FAL', 'SI', 'FI', 'CA', 'CIÓN'], definition: 'Alteración fraudulenta de una firma o documento' },
  { syllables: ['EX', 'PE', 'DIEN', 'TE'], definition: 'Carpeta oficial con actas e informes policiales' },
  { syllables: ['CA', 'MI', 'NE', 'RÍ', 'A'], definition: 'Conjunto de senderos cubiertos por la ventisca' },
  { syllables: ['DE', 'CLA', 'RA', 'CIO', 'NES'], definition: 'Testimonios recogidos tras el toque de queda' },
  { syllables: ['CON', 'FI', 'DEN', 'CIAL'], definition: 'Documento reservado bajo sello de lacre' },
  { syllables: ['IN', 'CRI', 'MI', 'NA', 'CIÓN'], definition: 'Acto de atribuir responsabilidad penal a alguien' },
  { syllables: ['PRE', 'ME', 'DI', 'TA', 'CIÓN'], definition: 'Planificación previa y deliberada de un delito' },
  { syllables: ['EN', 'CU', 'BRI', 'MIEN', 'TO'], definition: 'Ocultación deliberada de pruebas tras el crimen' },
  { syllables: ['CLAUS', 'TRO', 'FO', 'BI', 'A'], definition: 'Temor angustioso a permanecer encerrado' },
];

const DISTRACTOR_POOL: readonly string[] = [
  'CRÍ',
  'PUL',
  'MOR',
  'ZAR',
  'BRU',
  'FALS',
  'VEN',
  'TIN',
  'DOR',
  'TRAS',
  'GLOS',
  'VUL',
  'MAR',
  'SOL',
];

const SECRET_MOTIFS: readonly string[] = [
  'COARTADA ROTA',
  'LLAVE MAESTRA',
  'DOBLE FONDO',
  'SELLO CARMESI',
  'FIRMA FALSA',
];

export function generateSyllables(seed: number, day = 1, clue?: Clue): SyllablesConfig {
  const derived = deriveSeed(seed, day, `syllables:${hashClueTag(clue)}`);
  const rng = mulberry32(derived);

  const wordCount = day > 15 ? 5 : 4;
  const chosen = sampleN(rng, LONG_WORDS_BANK, wordCount);

  const words: SyllablesWord[] = chosen.map((item, idx) => {
    const highlightIndex = Math.floor(rng() * item.syllables.length);
    const definition =
      idx === 0 && clue
        ? `${item.definition} (${clue.impact})`
        : item.definition;
    return {
      id: `w${idx + 1}`,
      definition,
      targetSyllables: [...item.syllables],
      highlightIndex,
    };
  });

  const targetTexts = new Set<string>();
  const allSyllables: { id: string; text: string }[] = [];
  let seq = 1;

  for (const w of words) {
    for (const syl of w.targetSyllables) {
      targetTexts.add(syl);
      allSyllables.push({ id: `s${seq++}`, text: syl });
    }
  }

  const availableDistractors = DISTRACTOR_POOL.filter(d => !targetTexts.has(d));
  const chosenDistractors = sampleN(rng, availableDistractors, 4);
  const distractorSyllableIds: string[] = [];

  for (const dist of chosenDistractors) {
    const id = `d${seq++}`;
    distractorSyllableIds.push(id);
    allSyllables.push({ id, text: dist });
  }

  const clueSecret = clue
    ? toAlphaOnlyPhrase(clue.keyphrase || clue.impact)
    : '';
  const secretWord =
    clueSecret.length >= 4 ? clueSecret : pickOne(rng, SECRET_MOTIFS);

  return {
    words,
    secretWord,
    allSyllables: shuffle(rng, allSyllables),
    distractorSyllableIds,
  };
}

export function resolveSolvedSyllableSlots(config: SyllablesConfig): Record<string, string[]> {
  const distractorSet = new Set(config.distractorSyllableIds ?? []);
  const usedIds = new Set<string>();
  const result: Record<string, string[]> = {};

  for (const word of config.words) {
    const slots: string[] = [];
    for (const sylText of word.targetSyllables) {
      const match = config.allSyllables.find(
        s => !usedIds.has(s.id) && !distractorSet.has(s.id) && s.text === sylText
      ) ?? config.allSyllables.find(s => !usedIds.has(s.id) && s.text === sylText);
      if (match) {
        usedIds.add(match.id);
        slots.push(match.id);
      }
    }
    result[word.id] = slots;
  }

  return result;
}

export function validateSyllables(
  config: SyllablesConfig,
  wordSlots: Record<string, string[]>
): boolean {
  const distractorSet = new Set(config.distractorSyllableIds ?? []);
  const seenIds = new Set<string>();

  for (const word of config.words) {
    const slots = wordSlots[word.id] ?? [];
    if (slots.length !== word.targetSyllables.length) return false;

    const assembled: string[] = [];
    for (const id of slots) {
      if (seenIds.has(id) || distractorSet.has(id)) return false;
      seenIds.add(id);
      const syl = config.allSyllables.find(s => s.id === id);
      if (!syl) return false;
      assembled.push(syl.text);
    }

    if (assembled.join('').toUpperCase() !== word.targetSyllables.join('').toUpperCase()) {
      return false;
    }
  }

  return true;
}
