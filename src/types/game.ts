export type PuzzleType =
  | 'sudoku'
  | 'wordsearch'
  | 'murdoku'
  | 'syllables'
  | 'cryptogram'
  | 'crossword'
  | 'futoshiki'
  | 'connections'
  | 'nonogram'
  | 'minesweeper'
  | 'septagrama'
  | 'codificados'
  | 'ecuaciones'
  | 'encajados';

export interface WordSearchConfig {
  grid: string[][];
  words: { word: string; clue: string }[];
  leftoverMessage: string;
}

export interface SyllablesWord {
  id: string;
  definition: string;
  targetSyllables: string[];
  highlightIndex: number;
}

export interface SyllablesConfig {
  words: SyllablesWord[];
  secretWord: string;
  allSyllables: { id: string; text: string }[];
  distractorSyllableIds?: string[];
}

export interface CryptogramConfig {
  cipherText: string;
  cipherMap: Record<string, number>;
  initialRevealed?: string[];
}

export interface SudokuConfig {
  size: 9;
  initialGrid: (number | null)[][];
  solution: number[][];
  keyCells: { r: number; c: number; label?: string }[];
  secretCodeMeaning: string;
}

export interface MurdokuEntity {
  id: string;
  name: string;
  icon?: string;
}

export interface MurdokuConfig {
  groupA: { title: string; items: MurdokuEntity[] };
  groupB: { title: string; items: MurdokuEntity[] };
  clues: string[];
  targetMatches: { aId: string; bId: string }[];
  resetOnMistake?: boolean;
}

export interface CrosswordEntry {
  id: string;
  number: number;
  direction: 'across' | 'down';
  row: number;
  col: number;
  answer: string;
  clue: string;
}

export interface CrosswordConfig {
  rows: number;
  cols: number;
  grid: (string | null)[][];
  entries: CrosswordEntry[];
  secretHighlightCells?: { r: number; c: number }[];
  secretWord?: string;
  secretMeaning?: string;
}

export interface FutoshikiInequality {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  operator: '<' | '>';
}

export interface FutoshikiConfig {
  size: number;
  initialGrid: (number | null)[][];
  solution: number[][];
  inequalities: FutoshikiInequality[];
  keyCells?: { r: number; c: number }[];
  secretCodeMeaning?: string;
}

export interface ConnectionsGroup {
  id: string;
  category: string;
  difficulty: 1 | 2 | 3 | 4;
  items: [string, string, string, string];
}

export interface ConnectionsConfig {
  groups: [ConnectionsGroup, ConnectionsGroup, ConnectionsGroup, ConnectionsGroup];
  maxMistakes?: number;
  secretMeaning?: string;
}

export interface NonogramConfig {
  rows: number;
  cols: number;
  solution: boolean[][];
  rowClues: number[][];
  colClues: number[][];
  revealTitle: string;
  secretMeaning?: string;
}

export interface MinesweeperConfig {
  rows: number;
  cols: number;
  mines: { r: number; c: number }[];
  initialRevealed: { r: number; c: number }[];
  flaggedTargetCount?: number;
  secretMeaning?: string;
}

export interface SeptagramaWordEntry {
  id: string;
  number: number;
  answer: string;
  clue: string;
  highlightIndex: number;
}

export interface SeptagramaConfig {
  centerLetter: string;
  outerLetters: [string, string, string, string, string, string];
  words: SeptagramaWordEntry[];
  secretWord: string;
  secretMeaning: string;
}

export interface CodificadosClue {
  id: string;
  attempt: [number, number, number, number];
  exactCount: number;
  misplacedCount: number;
  text: string;
}

export interface CodificadosConfig {
  secretCode: [number, number, number, number];
  clues: CodificadosClue[];
  secretMeaning: string;
}

export interface EcuacionesSymbol {
  id: string;
  label: string;
  iconName: 'venom' | 'candle' | 'snowman' | 'ornament' | 'boot' | 'dagger' | 'key' | 'bell';
  value: number;
}

export interface EcuacionesRow {
  id: string;
  terms: { symbolId: string; op: '+' | '-' }[];
  result: number;
}

export interface EcuacionesConfig {
  symbols: EcuacionesSymbol[];
  equations: EcuacionesRow[];
  targetSymbols: [string, string, string, string];
  targetCode: [number, number, number, number];
  secretMeaning: string;
}

export interface EncajadosSlot {
  id: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  answer: string;
}

export interface EncajadosConfig {
  rows: number;
  cols: number;
  grid: (string | null)[][];
  slots: EncajadosSlot[];
  wordBank: string[];
  givenCells: { r: number; c: number; letter: string }[];
  keyCells: { r: number; c: number }[];
  secretWord: string;
  secretMeaning: string;
}

export type PuzzleConfig =
  | SudokuConfig
  | WordSearchConfig
  | MurdokuConfig
  | SyllablesConfig
  | CryptogramConfig
  | CrosswordConfig
  | FutoshikiConfig
  | ConnectionsConfig
  | NonogramConfig
  | MinesweeperConfig
  | SeptagramaConfig
  | CodificadosConfig
  | EcuacionesConfig
  | EncajadosConfig;

export type PuzzlePayload =
  | { type: 'sudoku'; config: SudokuConfig; solution?: number[][] | null }
  | { type: 'wordsearch'; config: WordSearchConfig; solution?: string[] | null }
  | { type: 'murdoku'; config: MurdokuConfig; solution?: { aId: string; bId: string }[] | null }
  | { type: 'syllables'; config: SyllablesConfig; solution?: string | null }
  | { type: 'cryptogram'; config: CryptogramConfig; solution?: string | null }
  | { type: 'crossword'; config: CrosswordConfig; solution?: (string | null)[][] | null }
  | { type: 'futoshiki'; config: FutoshikiConfig; solution?: number[][] | null }
  | { type: 'connections'; config: ConnectionsConfig; solution?: ConnectionsGroup[] | null }
  | { type: 'nonogram'; config: NonogramConfig; solution?: boolean[][] | null }
  | { type: 'minesweeper'; config: MinesweeperConfig; solution?: { r: number; c: number }[] | null }
  | { type: 'septagrama'; config: SeptagramaConfig; solution?: string[] | null }
  | { type: 'codificados'; config: CodificadosConfig; solution?: [number, number, number, number] | null }
  | { type: 'ecuaciones'; config: EcuacionesConfig; solution?: [number, number, number, number] | null }
  | { type: 'encajados'; config: EncajadosConfig; solution?: (string | null)[][] | null };

export type DayPuzzle = PuzzlePayload & {
  instructions: string;
  hints: string[];
};

export interface PuzzleComponentProps<TConfig extends PuzzleConfig = PuzzleConfig> {
  config: TConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
  onAttempt?: () => void;
}

export interface VictimProfile {
  name: string;
  age: number;
  title: string;
  description: string;
  timeOfDeath: string;
  estate: string;
}

export type SuspectGender = 'M' | 'F' | 'Trans M' | 'Trans F' | 'NB';

export const GENDER_LABELS: Record<SuspectGender, string> = {
  M: 'Masculino',
  F: 'Femenino',
  'Trans M': 'Hombre trans',
  'Trans F': 'Mujer trans',
  NB: 'No binario',
};

export type SuspectCategory =
  | 'Familia Valdemar'
  | 'Invitados de Gala'
  | 'Servicio de la Mansión'
  | 'Habitantes del Valle';

export type AgeGroup = 'joven' | 'adulto' | 'maduro' | 'veterano';
export type Handedness = 'diestro' | 'zurdo' | 'ambidiestro';
export type VisualMarker =
  | 'lentes'
  | 'cicatriz'
  | 'joya'
  | 'guantes'
  | 'tatuaje'
  | 'vello_facial'
  | 'tocado'
  | 'ninguno';
export type PresenceWing =
  | 'ala_este'
  | 'ala_oeste'
  | 'planta_baja'
  | 'sotano'
  | 'torre';
export type ForensicTrace =
  | 'tinta'
  | 'tabaco'
  | 'ceniza'
  | 'polen'
  | 'licor'
  | 'metal'
  | 'perfume'
  | 'grasa'
  | 'harina'
  | 'cera'
  | 'quimicos'
  | 'textil';
export type MotiveTag =
  | 'herencia'
  | 'deuda'
  | 'chantaje'
  | 'venganza'
  | 'secreto'
  | 'despido'
  | 'manuscrito'
  | 'encubrimiento';
export type AccessLevel =
  | 'llave_maestra'
  | 'anfitrion'
  | 'servicio_interior'
  | 'invitado_libre'
  | 'paso_restringido';

export interface SuspectAttributes {
  ageGroup: AgeGroup;
  handedness: Handedness;
  visualMarker: VisualMarker;
  presenceWing: PresenceWing;
  forensicTrace: ForensicTrace;
  motiveTag: MotiveTag;
  accessLevel: AccessLevel;
  alibiHole: string;
}

export interface DirectorySuspect {
  id: string;
  number: number;
  name: string;
  age: number;
  gender: SuspectGender;
  category: SuspectCategory;
  role: string;
  relation: string;
  trait: string;
  alibiQuote: string;
  backstory: string;
  motiveSummary: string;
  avatarIcon: string;
  portraitGif: string;
  attributes: SuspectAttributes;
}

export type WeaponCategory =
  | 'contundente'
  | 'punzante'
  | 'cortante'
  | 'estrangulamiento'
  | 'veneno';

export type WeaponMaterial = 'metal' | 'cristal' | 'madera' | 'fibra' | 'quimico';

export interface Weapon {
  id: string;
  name: string;
  category: WeaponCategory;
  material: WeaponMaterial;
  concealable: boolean;
  woundPattern: string;
  forensicTrace: string;
  description: string;
  icon: string;
}

export type RoomFloor = 'Planta Baja' | 'Planta Alta' | 'Sótano';

export interface GameLocation {
  id: string;
  name: string;
  floor: RoomFloor;
  lockType: string;
  surfaceMaterial: string;
  ambientTrace: string;
  description: string;
  icon: string;
}

export type ClueCategory = 'suspect' | 'weapon' | 'room' | 'timeline';

export type SuspectAttributeKey = keyof Omit<SuspectAttributes, 'alibiHole'>;

export type CluePredicate =
  | {
      kind: 'suspectAttr';
      field: SuspectAttributeKey;
      op: 'eq' | 'neq' | 'in';
      value: string | string[];
    }
  | {
      kind: 'suspectIdentity';
      field: 'gender' | 'category' | 'id';
      op: 'eq' | 'neq' | 'in';
      value: string | string[];
    }
  | {
      kind: 'suspectAgeRange';
      min?: number;
      max?: number;
      negate?: boolean;
    }
  | {
      kind: 'weaponAttr';
      field: 'category' | 'material' | 'woundPattern' | 'forensicTrace' | 'id';
      op: 'eq' | 'neq' | 'in';
      value: string | string[];
    }
  | {
      kind: 'weaponConcealable';
      value: boolean;
    }
  | {
      kind: 'roomAttr';
      field: 'floor' | 'lockType' | 'surfaceMaterial' | 'ambientTrace' | 'id';
      op: 'eq' | 'neq' | 'in';
      value: string | string[];
    };

export interface Clue {
  id: string;
  day: number;
  text: string;
  category: ClueCategory;
  impact: string;
  predicates?: CluePredicate[];
  /** Frase breve en mayúsculas que los pasatiempos esconden y revelan al resolverse. */
  keyphrase?: string;
}

export interface DayData {
  day: number;
  act: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  dateStr: string;
  hourStr: string;
  narrative: {
    storyText: string[];
    evidenceType: 'letter' | 'newspaper' | 'telegram' | 'autopsy' | 'diary' | 'map' | 'photo';
    evidenceTitle: string;
    evidenceContent: string;
    characterQuote?: {
      author: string;
      quote: string;
    };
  };
  puzzle: DayPuzzle;
  unlockedClue: Clue & {
    autoEliminations?: {
      suspectsEliminated?: string[];
      weaponsEliminated?: string[];
      roomsEliminated?: string[];
      confirmedMatches?: Array<{ suspect?: string; weapon?: string; room?: string }>;
    };
  };
}

export interface CaseConfig {
  seed: number;
  culpritId: string;
  weaponId: string;
  locationId: string;
  totalDays: number;
}

export interface ActCrimeFile {
  act: 1 | 2 | 3 | 4 | 5;
  doorNumber: 1 | 2 | 3 | 4 | 5;
  doorRoman: 'I' | 'II' | 'III' | 'IV' | 'V';
  doorTitle: string;
  dayStart: number;
  dayEnd: number;
  dateStr: string;
  timeDiscovered: string;
  victimId: string;
  victimNumber?: number;
  victimName: string;
  victimAge: number;
  victimRole: string;
  victimPortrait: string;
  sceneLocationId: string;
  sceneLocationName: string;
  sceneFloor: RoomFloor;
  sceneImage: string;
  weaponId: string;
  weaponName: string;
  weaponImage: string;
  headline: string;
  situationBrief: string[];
  detectiveNote: string;
  pendingItems: string[];
}

export interface GeneratedCase {
  config: CaseConfig;
  murderNarrative: {
    headline: string;
    summary: string;
    motiveDetail: string;
    epilogue: string;
    /** Reconstrucción cronológica revelada solo al emitir el veredicto. */
    reconstruction: string[];
    /** Relato del hallazgo del cadáver, visible desde el prólogo (no revela solución). */
    discovery: string[];
  };
  /** Las 5 puertas (5 actos) con su víctima y crónica forense progresiva. */
  acts: ActCrimeFile[];
  days: DayData[];
}

export interface ClueEvaluationResult {
  matchingSuspectIds: string[];
  matchingWeaponIds: string[];
  matchingRoomIds: string[];
}

export interface VerdictResult {
  isCorrect: boolean;
  suspectMatch: boolean;
  weaponMatch: boolean;
  locationMatch: boolean;
  correctCount: 0 | 1 | 2 | 3;
  actualCulpritId: string;
  actualWeaponId: string;
  actualLocationId: string;
}

export type MatrixCellState = 'neutral' | 'cross' | 'check' | 'question';

export interface DeductionMatrixState {
  cells: Record<string, MatrixCellState>;
}
