import type {
  CaseConfig,
  Clue,
  ClueCategory,
  ClueEvaluationResult,
  CluePredicate,
  DayData,
  DirectorySuspect,
  GameLocation,
  GeneratedCase,
  PuzzleType,
  SuspectAttributeKey,
  VerdictResult,
  Weapon,
} from '../types/game';
import { SUSPECTS_DIRECTORY } from '../data/suspectsDirectory';
import { LOCATIONS, WEAPONS } from '../data/narrativeBible';
import { deriveSeed, mulberry32, pickOne, shuffle, type Rng } from './puzzles/prng';
import {
  describeRoomPredicate,
  describeSuspectPredicate,
  describeWeaponPredicate,
  type ClueDescription,
} from './clueWriter';
import { buildDayNarrative, buildMurderNarrative, DAY_CALENDAR } from './narrativeGenerator';
import { buildDayPuzzle } from './puzzleFactory';

export const TOTAL_DAYS = 30;
export const DAYS_PER_ACT = 6;

/**
 * Calendario de pasatiempos: 10 tipos x 3 apariciones = 30 días.
 * Ningún tipo se repite en días consecutivos.
 */
export const PUZZLE_SCHEDULE: readonly PuzzleType[] = [
  // Acto I
  'wordsearch', 'sudoku', 'cryptogram', 'murdoku', 'syllables', 'connections',
  // Acto II
  'crossword', 'futoshiki', 'nonogram', 'minesweeper', 'wordsearch', 'sudoku',
  // Acto III
  'cryptogram', 'connections', 'murdoku', 'crossword', 'syllables', 'futoshiki',
  // Acto IV
  'nonogram', 'minesweeper', 'sudoku', 'wordsearch', 'cryptogram', 'murdoku',
  // Acto V
  'syllables', 'crossword', 'connections', 'futoshiki', 'nonogram', 'minesweeper',
];

/**
 * Dimensión que investiga cada día: S = sospechoso, W = arma, R = estancia.
 * 18 pistas de sospechoso, 7 de arma y 5 de estancia. La última pista de cada
 * dimensión es la que cierra el caso, de modo que el 100% de las pruebas es necesario.
 */
export const CLUE_SCHEDULE: readonly ('S' | 'W' | 'R')[] = [
  'S', 'W', 'S', 'R', 'S', 'S',
  'W', 'S', 'R', 'S', 'S', 'W',
  'S', 'S', 'W', 'R', 'S', 'S',
  'W', 'S', 'S', 'R', 'S', 'W',
  'S', 'W', 'S', 'R', 'S', 'S',
];

const SUSPECT_FIELDS: readonly SuspectAttributeKey[] = [
  'ageGroup',
  'handedness',
  'visualMarker',
  'presenceWing',
  'forensicTrace',
  'motiveTag',
  'accessLevel',
];

// =====================================================================
// Evaluación pura de predicados
// =====================================================================

function compare(actual: string, op: 'eq' | 'neq' | 'in', value: string | string[]): boolean {
  if (op === 'eq') return actual === value;
  if (op === 'neq') return actual !== value;
  return Array.isArray(value) ? value.includes(actual) : actual === value;
}

export function suspectMatches(pred: CluePredicate, s: DirectorySuspect): boolean {
  switch (pred.kind) {
    case 'suspectAttr':
      return compare(String(s.attributes[pred.field]), pred.op, pred.value);
    case 'suspectIdentity':
      return compare(String(s[pred.field]), pred.op, pred.value);
    case 'suspectAgeRange': {
      const inside = (pred.min === undefined || s.age >= pred.min) && (pred.max === undefined || s.age <= pred.max);
      return pred.negate ? !inside : inside;
    }
    default:
      return true;
  }
}

export function weaponMatches(pred: CluePredicate, w: Weapon): boolean {
  switch (pred.kind) {
    case 'weaponAttr':
      return compare(String(w[pred.field]), pred.op, pred.value);
    case 'weaponConcealable':
      return w.concealable === pred.value;
    default:
      return true;
  }
}

export function roomMatches(pred: CluePredicate, r: GameLocation): boolean {
  if (pred.kind !== 'roomAttr') return true;
  return compare(String(r[pred.field]), pred.op, pred.value);
}

export function isSuspectPredicate(p: CluePredicate): boolean {
  return p.kind === 'suspectAttr' || p.kind === 'suspectIdentity' || p.kind === 'suspectAgeRange';
}

export function isWeaponPredicate(p: CluePredicate): boolean {
  return p.kind === 'weaponAttr' || p.kind === 'weaponConcealable';
}

export function evaluateCaseClues(clues: Pick<Clue, 'predicates'>[]): ClueEvaluationResult {
  const preds = clues.flatMap(c => c.predicates ?? []);
  return {
    matchingSuspectIds: SUSPECTS_DIRECTORY.filter(s => preds.every(p => suspectMatches(p, s))).map(s => s.id),
    matchingWeaponIds: WEAPONS.filter(w => preds.every(p => weaponMatches(p, w))).map(w => w.id),
    matchingRoomIds: LOCATIONS.filter(r => preds.every(p => roomMatches(p, r))).map(r => r.id),
  };
}

// =====================================================================
// Selección de pistas con curva de dificultad
// =====================================================================

interface CandidateClue<T> {
  predicate: CluePredicate;
  /** Clave de familia para evitar repetir el mismo tipo de indicio seguido. */
  family: string;
  /** Solo se permite cuando quedan pocos candidatos (pistas casi definitivas). */
  minRemaining?: number;
  maxRemaining?: number;
  test: (item: T) => boolean;
}

function selectClues<T>(
  universe: readonly T[],
  slots: number,
  buildCandidates: (remaining: T[], rng: Rng) => CandidateClue<T>[],
  rng: Rng
): CandidateClue<T>[] | null {
  let remaining = [...universe];
  const chosen: CandidateClue<T>[] = [];
  const start = universe.length;

  for (let step = 0; step < slots; step++) {
    if (remaining.length <= 1) break;
    const target = Math.max(1, Math.round(Math.pow(start, 1 - (step + 1) / slots)));
    const candidates = buildCandidates(remaining, rng).filter(c => {
      if (c.minRemaining !== undefined && remaining.length < c.minRemaining) return false;
      if (c.maxRemaining !== undefined && remaining.length > c.maxRemaining) return false;
      return true;
    });

    let best: { cand: CandidateClue<T>; next: T[]; score: number } | null = null;
    for (const cand of candidates) {
      const next = remaining.filter(cand.test);
      if (next.length === 0 || next.length >= remaining.length) continue;
      const recentFamilies = chosen.slice(-2).map(c => c.family);
      const usedFamilyCount = chosen.filter(c => c.family === cand.family).length;
      let score = Math.abs(Math.log(next.length) - Math.log(target));
      if (recentFamilies.includes(cand.family)) score += 0.45;
      score += usedFamilyCount * 0.12;
      score += rng() * 0.25;
      if (!best || score < best.score) best = { cand, next, score };
    }
    if (!best) break;
    chosen.push(best.cand);
    remaining = best.next;
  }

  return remaining.length === 1 ? chosen : null;
}

function greedyClues<T>(
  universe: readonly T[],
  buildCandidates: (remaining: T[], rng: Rng) => CandidateClue<T>[],
  rng: Rng
): CandidateClue<T>[] {
  let remaining = [...universe];
  const chosen: CandidateClue<T>[] = [];
  while (remaining.length > 1) {
    let best: { cand: CandidateClue<T>; next: T[] } | null = null;
    for (const cand of buildCandidates(remaining, rng)) {
      const next = remaining.filter(cand.test);
      if (next.length === 0 || next.length >= remaining.length) continue;
      if (!best || next.length < best.next.length) best = { cand, next };
    }
    if (!best) throw new Error('No es posible aislar la solución con los indicios disponibles');
    chosen.push(best.cand);
    remaining = best.next;
  }
  return chosen;
}

function chooseClueSet<T>(
  universe: readonly T[],
  slots: number,
  build: (remaining: T[], rng: Rng) => CandidateClue<T>[],
  seed: number
): CandidateClue<T>[] {
  for (let attempt = 0; attempt < 40; attempt++) {
    const rng = mulberry32(seed + attempt * 104729);
    const picked = selectClues(universe, slots, build, rng);
    if (picked && picked.length === slots) return picked;
  }
  for (let attempt = 0; attempt < 40; attempt++) {
    const rng = mulberry32(seed + attempt * 7919 + 13);
    const picked = selectClues(universe, slots, build, rng);
    if (picked) return picked;
  }
  return greedyClues(universe, build, mulberry32(seed ^ 0x5bd1e995));
}

// ---------------------------------------------------------------------
// Candidatos por dimensión
// ---------------------------------------------------------------------

function suspectCandidates(culprit: DirectorySuspect) {
  return (remaining: DirectorySuspect[], rng: Rng): CandidateClue<DirectorySuspect>[] => {
    const out: CandidateClue<DirectorySuspect>[] = [];
    for (const field of SUSPECT_FIELDS) {
      const own = String(culprit.attributes[field]);
      const present = Array.from(new Set(remaining.map(s => String(s.attributes[field])))).filter(v => v !== own);
      const eq: CluePredicate = { kind: 'suspectAttr', field, op: 'eq', value: own };
      out.push({ predicate: eq, family: field, test: s => suspectMatches(eq, s) });
      for (const v of present) {
        const neq: CluePredicate = { kind: 'suspectAttr', field, op: 'neq', value: v };
        out.push({ predicate: neq, family: field, test: s => suspectMatches(neq, s) });
        const pair = rng() < 0.5 ? [own, v] : [v, own];
        const inn: CluePredicate = { kind: 'suspectAttr', field, op: 'in', value: pair };
        out.push({ predicate: inn, family: field, test: s => suspectMatches(inn, s) });
      }
    }

    const ownCat = culprit.category;
    const catEq: CluePredicate = { kind: 'suspectIdentity', field: 'category', op: 'eq', value: ownCat };
    out.push({ predicate: catEq, family: 'category', test: s => suspectMatches(catEq, s) });
    for (const cat of new Set(remaining.map(s => s.category))) {
      if (cat === ownCat) continue;
      const catNeq: CluePredicate = { kind: 'suspectIdentity', field: 'category', op: 'neq', value: cat };
      out.push({ predicate: catNeq, family: 'category', test: s => suspectMatches(catNeq, s) });
    }

    for (const width of [8, 12, 18, 26]) {
      const offset = Math.floor(rng() * (width + 1));
      const min = Math.max(16, culprit.age - offset);
      const max = min + width;
      const range: CluePredicate = { kind: 'suspectAgeRange', min, max };
      out.push({ predicate: range, family: 'age', test: s => suspectMatches(range, s) });
    }

    // Coartadas individuales verificadas (solo en la recta final del caso)
    for (const other of remaining) {
      if (other.id === culprit.id) continue;
      const idNeq: CluePredicate = { kind: 'suspectIdentity', field: 'id', op: 'neq', value: other.id };
      out.push({ predicate: idNeq, family: `alibi`, maxRemaining: 4, test: s => suspectMatches(idNeq, s) });
    }
    return out;
  };
}

function weaponCandidates(weapon: Weapon) {
  return (remaining: Weapon[]): CandidateClue<Weapon>[] => {
    const out: CandidateClue<Weapon>[] = [];
    const fields: ('category' | 'material' | 'forensicTrace')[] = ['category', 'material', 'forensicTrace'];
    for (const field of fields) {
      const own = String(weapon[field]);
      const eq: CluePredicate = { kind: 'weaponAttr', field, op: 'eq', value: own };
      out.push({ predicate: eq, family: field, test: w => weaponMatches(eq, w) });
      for (const v of new Set(remaining.map(w => String(w[field])))) {
        if (v === own) continue;
        const neq: CluePredicate = { kind: 'weaponAttr', field, op: 'neq', value: v };
        out.push({ predicate: neq, family: field, test: w => weaponMatches(neq, w) });
      }
    }
    const conceal: CluePredicate = { kind: 'weaponConcealable', value: weapon.concealable };
    out.push({ predicate: conceal, family: 'concealable', test: w => weaponMatches(conceal, w) });
    for (const other of remaining) {
      if (other.id === weapon.id) continue;
      const idNeq: CluePredicate = { kind: 'weaponAttr', field: 'id', op: 'neq', value: other.id };
      out.push({ predicate: idNeq, family: 'intact', test: w => weaponMatches(idNeq, w) });
    }
    const wound: CluePredicate = { kind: 'weaponAttr', field: 'woundPattern', op: 'eq', value: weapon.woundPattern };
    out.push({ predicate: wound, family: 'wound', maxRemaining: 3, test: w => weaponMatches(wound, w) });
    return out;
  };
}

function roomCandidates(room: GameLocation) {
  return (remaining: GameLocation[]): CandidateClue<GameLocation>[] => {
    const out: CandidateClue<GameLocation>[] = [];
    const fields: ('floor' | 'lockType' | 'surfaceMaterial' | 'ambientTrace')[] = [
      'floor',
      'lockType',
      'surfaceMaterial',
      'ambientTrace',
    ];
    for (const field of fields) {
      const own = String(room[field]);
      const eq: CluePredicate = { kind: 'roomAttr', field, op: 'eq', value: own };
      out.push({ predicate: eq, family: field, test: r => roomMatches(eq, r) });
      for (const v of new Set(remaining.map(r => String(r[field])))) {
        if (v === own) continue;
        const neq: CluePredicate = { kind: 'roomAttr', field, op: 'neq', value: v };
        out.push({ predicate: neq, family: field, test: r => roomMatches(neq, r) });
      }
    }
    for (const other of remaining) {
      if (other.id === room.id) continue;
      const idNeq: CluePredicate = { kind: 'roomAttr', field: 'id', op: 'neq', value: other.id };
      out.push({ predicate: idNeq, family: 'sealed', test: r => roomMatches(idNeq, r) });
    }
    return out;
  };
}

// =====================================================================
// Semilla y elección equiprobable del caso
// =====================================================================

export function createRandomSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/** Elige culpable (1/74), arma (1/18) y estancia (1/9) de forma uniforme a partir de la semilla. */
export function pickCaseConfig(
  seed: number,
  forcedCulpritIndex?: number,
  forcedWeaponIndex?: number,
  forcedRoomIndex?: number
): CaseConfig {
  const rng = mulberry32(deriveSeed(seed, 0, 'case-config'));
  const culpritIdx = forcedCulpritIndex ?? Math.floor(rng() * SUSPECTS_DIRECTORY.length);
  const weaponIdx = forcedWeaponIndex ?? Math.floor(rng() * WEAPONS.length);
  const roomIdx = forcedRoomIndex ?? Math.floor(rng() * LOCATIONS.length);
  return {
    seed: seed >>> 0,
    culpritId: SUSPECTS_DIRECTORY[culpritIdx].id,
    weaponId: WEAPONS[weaponIdx].id,
    locationId: LOCATIONS[roomIdx].id,
    totalDays: TOTAL_DAYS,
  };
}

// =====================================================================
// Generación del caso completo de 30 días
// =====================================================================

const DIMENSION_CATEGORY: Record<'S' | 'W' | 'R', ClueCategory> = {
  S: 'suspect',
  W: 'weapon',
  R: 'room',
};

export function generateCase(
  seed: number,
  forcedCulpritIndex?: number,
  forcedWeaponIndex?: number,
  forcedRoomIndex?: number
): GeneratedCase {
  const config = pickCaseConfig(seed, forcedCulpritIndex, forcedWeaponIndex, forcedRoomIndex);
  const culprit = SUSPECTS_DIRECTORY.find(s => s.id === config.culpritId)!;
  const weapon = WEAPONS.find(w => w.id === config.weaponId)!;
  const room = LOCATIONS.find(l => l.id === config.locationId)!;

  const suspectSlots = CLUE_SCHEDULE.filter(d => d === 'S').length;
  const weaponSlots = CLUE_SCHEDULE.filter(d => d === 'W').length;
  const roomSlots = CLUE_SCHEDULE.filter(d => d === 'R').length;

  const suspectPicks = chooseClueSet(
    SUSPECTS_DIRECTORY,
    suspectSlots,
    suspectCandidates(culprit),
    deriveSeed(config.seed, 0, `S:${culprit.id}`)
  );
  const weaponPicks = chooseClueSet(WEAPONS, weaponSlots, weaponCandidates(weapon), deriveSeed(config.seed, 0, `W:${weapon.id}`));
  const roomPicks = chooseClueSet(LOCATIONS, roomSlots, roomCandidates(room), deriveSeed(config.seed, 0, `R:${room.id}`));

  // Si alguna dimensión cerró antes de agotar sus días, se completan con
  // indicios de corroboración (verdaderos, coherentes, sin efecto deductivo nuevo).
  const queues = {
    S: padWithCorroboration(suspectPicks.map(c => c.predicate), suspectSlots, () => corroborateSuspect(culprit)),
    W: padWithCorroboration(weaponPicks.map(c => c.predicate), weaponSlots, () => corroborateWeapon(weapon)),
    R: padWithCorroboration(roomPicks.map(c => c.predicate), roomSlots, () => corroborateRoom(room)),
  };

  const textRng = mulberry32(deriveSeed(config.seed, 0, 'clue-text'));
  const counters = { S: 0, W: 0, R: 0 };
  const murderNarrative = buildMurderNarrative(config.seed, culprit, weapon, room);

  const days: DayData[] = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const day = i + 1;
    const dim = CLUE_SCHEDULE[i];
    const predicate = queues[dim][counters[dim]++];
    const description: ClueDescription =
      dim === 'S'
        ? describeSuspectPredicate(predicate, textRng)
        : dim === 'W'
          ? describeWeaponPredicate(predicate, textRng)
          : describeRoomPredicate(predicate, textRng);

    const clue: Clue = {
      id: `c${config.seed}-d${day}`,
      day,
      text: description.text,
      category: DIMENSION_CATEGORY[dim],
      impact: description.impact,
      predicates: [predicate],
      keyphrase: description.keyphrase,
    };

    const autoEliminations = {
      suspectsEliminated: isSuspectPredicate(predicate)
        ? SUSPECTS_DIRECTORY.filter(s => !suspectMatches(predicate, s)).map(s => s.id)
        : [],
      weaponsEliminated: isWeaponPredicate(predicate)
        ? WEAPONS.filter(w => !weaponMatches(predicate, w)).map(w => w.id)
        : [],
      roomsEliminated: predicate.kind === 'roomAttr'
        ? LOCATIONS.filter(r => !roomMatches(predicate, r)).map(r => r.id)
        : [],
    };

    const puzzleType = PUZZLE_SCHEDULE[i];
    const narrative = buildDayNarrative({
      seed: config.seed,
      day,
      clue,
      description,
      culprit,
      weapon,
      room,
    });

    days.push({
      day,
      act: (Math.floor(i / DAYS_PER_ACT) + 1) as DayData['act'],
      title: DAY_CALENDAR[i].title,
      subtitle: DAY_CALENDAR[i].subtitle,
      dateStr: DAY_CALENDAR[i].dateStr,
      hourStr: DAY_CALENDAR[i].hourStr,
      narrative,
      puzzle: buildDayPuzzle(puzzleType, config.seed, day, clue),
      unlockedClue: { ...clue, autoEliminations },
    });
  }

  return { config, murderNarrative, days };
}

function padWithCorroboration(
  preds: CluePredicate[],
  slots: number,
  corroborate: () => CluePredicate[]
): CluePredicate[] {
  const out = [...preds];
  const extra = corroborate().filter(p => !out.some(q => JSON.stringify(q) === JSON.stringify(p)));
  let k = 0;
  while (out.length < slots) {
    // Los indicios de corroboración se intercalan al principio para que la
    // pista que cierra cada dimensión siga llegando en los últimos días.
    out.unshift(extra[k % Math.max(1, extra.length)] ?? preds[0]);
    k++;
  }
  return out;
}

function corroborateSuspect(s: DirectorySuspect): CluePredicate[] {
  return SUSPECT_FIELDS.map(field => ({
    kind: 'suspectAttr' as const,
    field,
    op: 'eq' as const,
    value: String(s.attributes[field]),
  }));
}

function corroborateWeapon(w: Weapon): CluePredicate[] {
  return [
    { kind: 'weaponAttr', field: 'category', op: 'eq', value: w.category },
    { kind: 'weaponAttr', field: 'material', op: 'eq', value: w.material },
    { kind: 'weaponConcealable', value: w.concealable },
    { kind: 'weaponAttr', field: 'forensicTrace', op: 'eq', value: w.forensicTrace },
  ];
}

function corroborateRoom(r: GameLocation): CluePredicate[] {
  return [
    { kind: 'roomAttr', field: 'floor', op: 'eq', value: r.floor },
    { kind: 'roomAttr', field: 'lockType', op: 'eq', value: r.lockType },
    { kind: 'roomAttr', field: 'surfaceMaterial', op: 'eq', value: r.surfaceMaterial },
    { kind: 'roomAttr', field: 'ambientTrace', op: 'eq', value: r.ambientTrace },
  ];
}

// =====================================================================
// Veredicto
// =====================================================================

export function verifyCaseVerdict(
  config: CaseConfig,
  suspectId: string,
  weaponId: string,
  locationId: string
): VerdictResult {
  const suspectMatch = suspectId === config.culpritId;
  const weaponMatch = weaponId === config.weaponId;
  const locationMatch = locationId === config.locationId;
  const correctCount = (Number(suspectMatch) + Number(weaponMatch) + Number(locationMatch)) as 0 | 1 | 2 | 3;
  return {
    isCorrect: suspectMatch && weaponMatch && locationMatch,
    suspectMatch,
    weaponMatch,
    locationMatch,
    correctCount,
    actualCulpritId: config.culpritId,
    actualWeaponId: config.weaponId,
    actualLocationId: config.locationId,
  };
}

// Caché por semilla: el caso se reconstruye de forma determinista y no se persiste.
const caseCache = new Map<number, GeneratedCase>();

export function getCaseForSeed(seed: number): GeneratedCase {
  const key = seed >>> 0;
  let cached = caseCache.get(key);
  if (!cached) {
    cached = generateCase(key);
    if (caseCache.size > 8) caseCache.clear();
    caseCache.set(key, cached);
  }
  return cached;
}

/** Utilidad para pruebas y depuración: devuelve un testigo aleatorio del directorio. */
export function pickWitness(seed: number, day: number, excludeIds: string[] = []): DirectorySuspect {
  const rng = mulberry32(deriveSeed(seed, day, 'witness'));
  const pool = SUSPECTS_DIRECTORY.filter(s => !excludeIds.includes(s.id));
  return pickOne(rng, shuffle(rng, pool));
}
