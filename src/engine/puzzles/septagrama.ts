import type { SeptagramaConfig, SeptagramaWordEntry } from '../../types/game';
import { deriveSeed, mulberry32, shuffle } from './prng';

interface SeptagramaTemplate {
  centerLetter: string;
  outerLetters: [string, string, string, string, string, string];
  secretWord: string;
  secretMeaning: string;
  words: Omit<SeptagramaWordEntry, 'id' | 'number'>[];
}

const SEPTAGRAMA_TEMPLATES: readonly SeptagramaTemplate[] = [
  {
    centerLetter: 'R',
    outerLetters: ['O', 'C', 'E', 'A', 'L', 'S'],
    secretWord: 'ESCOLAR',
    secretMeaning: 'Expediente antiguo del colegio del valle vinculado al móvil',
    words: [
      {
        answer: 'CASERO',
        clue: 'Elaborado dentro de la propia mansión de Villa Acebo',
        highlightIndex: 3, // E
      },
      {
        answer: 'ROSA',
        clue: 'Flor espinosa cultivada bajo la cúpula del invernadero',
        highlightIndex: 2, // S
      },
      {
        answer: 'CLARO',
        clue: 'Indicio nítido que no deja margen a la duda',
        highlightIndex: 0, // C
      },
      {
        answer: 'ORAL',
        clue: 'Testimonio prestado de viva voz ante la detective',
        highlightIndex: 0, // O
      },
      {
        answer: 'CORAL',
        clue: 'Tono rojizo intenso del lacre en los sobres de Valdemar',
        highlightIndex: 4, // L
      },
      {
        answer: 'ROSCA',
        clue: 'Mecanismo helicoidal que asegura un frasco o cerradura',
        highlightIndex: 4, // A
      },
      {
        answer: 'ESCOLAR',
        clue: 'Pangrama de 7 letras: relativo a la vieja escuela de Sierra Blanca',
        highlightIndex: 6, // R
      },
    ],
  },
  {
    centerLetter: 'A',
    outerLetters: ['C', 'L', 'D', 'E', 'R', 'S'],
    secretWord: 'CALDERA',
    secretMeaning: 'Instalación térmica del sótano donde se ocultaron pruebas',
    words: [
      {
        answer: 'CASA',
        clue: 'Residencia señorial aislada por la ventisca',
        highlightIndex: 0, // C
      },
      {
        answer: 'ARCA',
        clue: 'Cofre pesado donde se custodiaban pagarés y escrituras',
        highlightIndex: 0, // A
      },
      {
        answer: 'LACRE',
        clue: 'Pasta derretida para sellar documentos confidenciales',
        highlightIndex: 0, // L
      },
      {
        answer: 'DARSE',
        clue: 'Entregarse ante la evidencia irrefutable del sumario',
        highlightIndex: 0, // D
      },
      {
        answer: 'CELDA',
        clue: 'Cuarto pequeño cerrado con cerrojo por dentro',
        highlightIndex: 1, // E
      },
      {
        answer: 'LADERA',
        clue: 'Pendiente montañosa cubierta de nieve alrededor de la finca',
        highlightIndex: 4, // R
      },
      {
        answer: 'CALDERAS',
        clue: 'Pangrama: cuarto subterráneo de tuberías de vapor y carbón',
        highlightIndex: 6, // A
      },
    ],
  },
  {
    centerLetter: 'E',
    outerLetters: ['M', 'N', 'T', 'O', 'S', 'R'],
    secretWord: 'MORTERO',
    secretMeaning: 'Utensilio de botica empleado para machacar sustancias',
    words: [
      {
        answer: 'TEMOR',
        clue: 'Inquietud que domina a los 74 aislados en la mansión',
        highlightIndex: 2, // M
      },
      {
        answer: 'RETO',
        clue: 'Desafío deductivo planteado en las notas de Azlynn',
        highlightIndex: 3, // O
      },
      {
        answer: 'NORTE',
        clue: 'Dirección cardinal desde la que sopla la tormenta',
        highlightIndex: 2, // R
      },
      {
        answer: 'MONTE',
        clue: 'Elevación boscosa que incomunica el Paso de Sierra Blanca',
        highlightIndex: 3, // T
      },
      {
        answer: 'SERENO',
        clue: 'Vigilante nocturno encargado de las rondas y llaves',
        highlightIndex: 1, // E
      },
      {
        answer: 'MENTOR',
        clue: 'Antiguo consejero y albacea de la familia Valdemar',
        highlightIndex: 5, // R
      },
      {
        answer: 'TORMENTO',
        clue: 'Angustia prolongada de quien esconde un secreto culpable',
        highlightIndex: 7, // O
      },
    ],
  },
];

export function generateSeptagrama(seed: number, day = 1): SeptagramaConfig {
  const derived = deriveSeed(seed, day, 'septagrama');
  const rng = mulberry32(derived);
  const tpl =
    SEPTAGRAMA_TEMPLATES[
      (day + Math.floor(rng() * SEPTAGRAMA_TEMPLATES.length)) % SEPTAGRAMA_TEMPLATES.length
    ];

  const shuffledOuter = shuffle(rng, [...tpl.outerLetters]) as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  const words: SeptagramaWordEntry[] = tpl.words.map((w, idx) => ({
    id: `sep-${day}-${idx + 1}`,
    number: idx + 1,
    answer: w.answer,
    clue: w.clue,
    highlightIndex: w.highlightIndex,
  }));

  return {
    centerLetter: tpl.centerLetter,
    outerLetters: shuffledOuter,
    words,
    secretWord: tpl.secretWord,
    secretMeaning: tpl.secretMeaning,
  };
}

export function validateSeptagrama(
  config: SeptagramaConfig,
  userWords: Record<string, string>
): boolean {
  for (const w of config.words) {
    const typed = (userWords[w.id] ?? '').toUpperCase().trim();
    if (typed !== w.answer.toUpperCase()) return false;
  }
  return true;
}
