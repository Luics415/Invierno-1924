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
import { generateActCrimeFiles } from './actCrimesGenerator';

export const TOTAL_DAYS = 30;
export const DAYS_PER_ACT = 6;

/**
 * Calendario de pasatiempos: 14 tipos de juegos repartidos en las 30 jornadas
 * (12 tipos × 2 apariciones + 2 tipos × 3 apariciones = 30), sin repeticiones
 * consecutivas ni intra-acto, y coherentes con la dimensión investigada cada día.
 */
export const PUZZLE_SCHEDULE: readonly PuzzleType[] = [
  // Acto I (Días 1–6)
  'wordsearch', 'codificados', 'septagrama', 'sudoku', 'encajados', 'crossword',
  // Acto II (Días 7–12)
  'syllables', 'cryptogram', 'nonogram', 'murdoku', 'connections', 'futoshiki',
  // Acto III (Días 13–18)
  'ecuaciones', 'minesweeper', 'septagrama', 'encajados', 'codificados', 'cryptogram',
  // Acto IV (Días 19–24)
  'ecuaciones', 'syllables', 'sudoku', 'crossword', 'futoshiki', 'wordsearch',
  // Acto V (Días 25–30)
  'connections', 'nonogram', 'murdoku', 'minesweeper', 'codificados', 'encajados',
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

/**
 * Genera de forma determinista por semilla un orden aleatorio de los 14 juegos
 * para los 30 días del caso, permutando los 5 bloques de acto y barajando los
 * 6 juegos dentro de cada acto sin romper la progresión deductiva (CLUE_SCHEDULE),
 * garantizando:
 * - 6 juegos distintos en cada acto de 6 días
 * - 2 a 3 apariciones de cada uno de los 14 juegos en los 30 días
 * - 0 repeticiones consecutivas entre días (incluidas fronteras de acto y 30->1)
 * - nonogram siempre en días de arma (W) o estancia (R)
 * - minesweeper incluyendo días de estancia (R)
 */
export function buildPuzzleScheduleForSeed(seed: number): PuzzleType[] {
  const rng = mulberry32(deriveSeed(seed, 0, 'puzzle-schedule'));
  const baseActRosters: PuzzleType[][] = [0, 1, 2, 3, 4].map(a =>
    PUZZLE_SCHEDULE.slice(a * DAYS_PER_ACT, (a + 1) * DAYS_PER_ACT)
  );

  for (let attempt = 0; attempt < 50; attempt++) {
    const actOrder = shuffle(rng, [0, 1, 2, 3, 4]);
    const schedule: PuzzleType[] = [];
    let ok = true;

    for (let actIdx = 0; actIdx < 5; actIdx++) {
      const actDims = CLUE_SCHEDULE.slice(actIdx * DAYS_PER_ACT, (actIdx + 1) * DAYS_PER_ACT);
      const games = shuffle(rng, [...baseActRosters[actOrder[actIdx]]]);

      // Asegurar que 'nonogram' caiga siempre en un día 'W' o 'R' de este acto
      const nonoPos = games.indexOf('nonogram');
      if (nonoPos !== -1 && actDims[nonoPos] === 'S') {
        const wrIndices = [0, 1, 2, 3, 4, 5].filter(i => actDims[i] === 'W' || actDims[i] === 'R');
        const targetPos = wrIndices[Math.floor(rng() * wrIndices.length)];
        [games[nonoPos], games[targetPos]] = [games[targetPos], games[nonoPos]];
      }

      // Asegurar que si este acto tiene 'minesweeper' y el slot 'R' no está ocupado por 'nonogram',
      // 'minesweeper' pueda ocupar 'R' para mantener coherencia espacial
      const minePos = games.indexOf('minesweeper');
      const rPos = actDims.indexOf('R');
      if (minePos !== -1 && rPos !== -1 && games[rPos] !== 'nonogram' && minePos !== rPos) {
        [games[minePos], games[rPos]] = [games[rPos], games[minePos]];
      }

      // Evitar repetición consecutiva en la frontera con el acto anterior
      if (schedule.length > 0 && games[0] === schedule[schedule.length - 1]) {
        const swapCandidates = [1, 2, 3, 4, 5].filter(i => {
          if (games[0] === 'nonogram' && actDims[i] === 'S') return false;
          if (games[i] === 'nonogram' && actDims[0] === 'S') return false;
          return games[i] !== schedule[schedule.length - 1];
        });
        if (swapCandidates.length === 0) {
          ok = false;
          break;
        }
        const pick = swapCandidates[0];
        [games[0], games[pick]] = [games[pick], games[0]];
      }

      schedule.push(...games);
    }

    if (!ok) continue;

    // Evitar que el Día 30 repita el mismo juego del Día 1
    if (schedule[29] === schedule[0]) {
      const act5Dims = CLUE_SCHEDULE.slice(24, 30);
      const swapCandidates = [24, 25, 26, 27, 28].filter(idx => {
        const localIdx = idx - 24;
        if (idx === 24 && schedule[29] === schedule[23]) return false;
        if (schedule[29] === 'nonogram' && act5Dims[localIdx] === 'S') return false;
        if (schedule[idx] === 'nonogram' && act5Dims[5] === 'S') return false;
        return schedule[idx] !== schedule[0];
      });
      if (swapCandidates.length === 0) continue;
      const pick = swapCandidates[0];
      [schedule[29], schedule[pick]] = [schedule[pick], schedule[29]];
    }

    // Verificar que al menos un 'minesweeper' caiga en día 'R'
    const hasMinesweeperOnRoom = schedule.some(
      (t, i) => t === 'minesweeper' && CLUE_SCHEDULE[i] === 'R'
    );
    if (!hasMinesweeperOnRoom) continue;

    return schedule;
  }

  return [...PUZZLE_SCHEDULE];
}

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
  /** Campo estructural de la dimensión actual para evitar redundancias tras confirmar con `eq`. */
  field?: string;
  /** Indica si confirma directamente el valor (`eq` / `weaponConcealable`). */
  isEq?: boolean;
  /** Solo se permite cuando quedan pocos candidatos (pistas casi definitivas). */
  minRemaining?: number;
  maxRemaining?: number;
  test: (item: T) => boolean;
}

type CandidateBuilder<T> = (
  remaining: T[],
  rng: Rng,
  confirmedFields: ReadonlySet<string>
) => CandidateClue<T>[];

function selectClues<T>(
  universe: readonly T[],
  slots: number,
  buildCandidates: CandidateBuilder<T>,
  rng: Rng
): CandidateClue<T>[] | null {
  let remaining = [...universe];
  const chosen: CandidateClue<T>[] = [];
  const confirmedFields = new Set<string>();
  const start = universe.length;

  for (let step = 0; step < slots; step++) {
    const isLast = step === slots - 1;
    const minNext = slots - step;
    const progress = (step + 1) / slots;
    const target = isLast
      ? 1
      : Math.max(minNext, Math.round(minNext + (start - minNext) * Math.pow(1 - progress, 2.2)));

    const candidates = buildCandidates(remaining, rng, confirmedFields).filter(c => {
      if (c.minRemaining !== undefined && remaining.length < c.minRemaining) return false;
      if (c.maxRemaining !== undefined && remaining.length > c.maxRemaining) return false;
      return true;
    });

    let best: { cand: CandidateClue<T>; next: T[]; score: number } | null = null;
    for (const cand of candidates) {
      const next = remaining.filter(cand.test);
      if (next.length === 0 || next.length >= remaining.length) continue;
      if (isLast ? next.length !== 1 : next.length < minNext) continue;

      const recentFamilies = chosen.slice(-2).map(c => c.family);
      const usedFamilyCount = chosen.filter(c => c.family === cand.family).length;
      let score = Math.abs(Math.log(next.length) - Math.log(target));
      if (recentFamilies.includes(cand.family)) score += 0.55;
      score += usedFamilyCount * 0.16;
      if (cand.isEq) score -= 0.7;
      if (cand.family === 'alibi' || cand.family === 'intact' || cand.family === 'sealed') {
        score += 0.4;
      }
      score += rng() * 0.25;
      if (!best || score < best.score) best = { cand, next, score };
    }
    if (!best) return null;
    chosen.push(best.cand);
    remaining = best.next;
    if (best.cand.isEq && best.cand.field) {
      confirmedFields.add(best.cand.field);
    }
  }

  return remaining.length === 1 && chosen.length === slots ? chosen : null;
}

function dfsFallback<T>(
  universe: readonly T[],
  slots: number,
  buildCandidates: CandidateBuilder<T>,
  seed: number,
  maxNodes = 4000
): CandidateClue<T>[] {
  const rng = mulberry32(seed ^ 0x5bd1e995);
  let budget = maxNodes;

  function search(
    remaining: T[],
    step: number,
    chosen: CandidateClue<T>[],
    confirmedFields: ReadonlySet<string>
  ): CandidateClue<T>[] | null {
    if (step === slots) {
      return remaining.length === 1 ? chosen : null;
    }
    if (budget-- <= 0) return null;

    const isLast = step === slots - 1;
    const minNext = slots - step;

    const viable: { cand: CandidateClue<T>; next: T[] }[] = [];
    for (const cand of buildCandidates(remaining, rng, confirmedFields)) {
      if (cand.minRemaining !== undefined && remaining.length < cand.minRemaining) continue;
      if (cand.maxRemaining !== undefined && remaining.length > cand.maxRemaining) continue;
      const next = remaining.filter(cand.test);
      if (next.length === 0 || next.length >= remaining.length) continue;
      if (isLast ? next.length !== 1 : next.length < minNext) continue;
      viable.push({ cand, next });
    }

    viable.sort((a, b) => {
      if (b.next.length !== a.next.length) return b.next.length - a.next.length;
      return Number(Boolean(b.cand.isEq)) - Number(Boolean(a.cand.isEq));
    });

    for (const item of viable) {
      const nextConfirmed = new Set(confirmedFields);
      if (item.cand.isEq && item.cand.field) {
        nextConfirmed.add(item.cand.field);
      }
      const res = search(item.next, step + 1, [...chosen, item.cand], nextConfirmed);
      if (res) return res;
    }

    return null;
  }

  const found = search([...universe], 0, [], new Set<string>());
  if (!found) {
    throw new Error('No es posible aislar la solución en las jornadas asignadas');
  }
  return found;
}

function chooseClueSet<T>(
  universe: readonly T[],
  slots: number,
  build: CandidateBuilder<T>,
  seed: number
): CandidateClue<T>[] {
  for (let attempt = 0; attempt < 80; attempt++) {
    const rng = mulberry32(seed + attempt * 104729);
    const picked = selectClues(universe, slots, build, rng);
    if (picked && picked.length === slots) return picked;
  }
  return dfsFallback(universe, slots, build, seed);
}

// ---------------------------------------------------------------------
// Candidatos por dimensión
// ---------------------------------------------------------------------

function suspectCandidates(culprit: DirectorySuspect): CandidateBuilder<DirectorySuspect> {
  return (remaining, _rng, confirmedFields): CandidateClue<DirectorySuspect>[] => {
    const out: CandidateClue<DirectorySuspect>[] = [];
    for (const field of SUSPECT_FIELDS) {
      if (confirmedFields.has(field)) continue;
      const own = String(culprit.attributes[field]);
      const present = Array.from(new Set(remaining.map(s => String(s.attributes[field])))).filter(
        v => v !== own
      );
      const eq: CluePredicate = { kind: 'suspectAttr', field, op: 'eq', value: own };
      out.push({
        predicate: eq,
        family: field,
        field,
        isEq: true,
        test: s => suspectMatches(eq, s),
      });
      for (const v of present) {
        const neq: CluePredicate = { kind: 'suspectAttr', field, op: 'neq', value: v };
        out.push({
          predicate: neq,
          family: field,
          field,
          isEq: false,
          test: s => suspectMatches(neq, s),
        });
      }
    }

    if (!confirmedFields.has('category')) {
      const ownCat = culprit.category;
      const catEq: CluePredicate = { kind: 'suspectIdentity', field: 'category', op: 'eq', value: ownCat };
      out.push({
        predicate: catEq,
        family: 'category',
        field: 'category',
        isEq: true,
        test: s => suspectMatches(catEq, s),
      });
      for (const cat of new Set(remaining.map(s => s.category))) {
        if (cat === ownCat) continue;
        const catNeq: CluePredicate = { kind: 'suspectIdentity', field: 'category', op: 'neq', value: cat };
        out.push({
          predicate: catNeq,
          family: 'category',
          field: 'category',
          isEq: false,
          test: s => suspectMatches(catNeq, s),
        });
      }
    }

    if (!confirmedFields.has('gender')) {
      const genderEq: CluePredicate = {
        kind: 'suspectIdentity',
        field: 'gender',
        op: 'eq',
        value: culprit.gender,
      };
      out.push({
        predicate: genderEq,
        family: 'gender',
        field: 'gender',
        isEq: true,
        test: s => suspectMatches(genderEq, s),
      });
    }

    // Coartadas individuales verificadas (solo en la recta final del caso)
    for (const other of remaining) {
      if (other.id === culprit.id) continue;
      const idNeq: CluePredicate = { kind: 'suspectIdentity', field: 'id', op: 'neq', value: other.id };
      out.push({
        predicate: idNeq,
        family: 'alibi',
        maxRemaining: 5,
        isEq: false,
        test: s => suspectMatches(idNeq, s),
      });
    }
    return out;
  };
}

function weaponCandidates(weapon: Weapon): CandidateBuilder<Weapon> {
  return (remaining, _rng, confirmedFields): CandidateClue<Weapon>[] => {
    const out: CandidateClue<Weapon>[] = [];
    const fields: ('category' | 'material' | 'forensicTrace')[] = ['category', 'material', 'forensicTrace'];
    for (const field of fields) {
      if (confirmedFields.has(field)) continue;
      const own = String(weapon[field]);
      const eq: CluePredicate = { kind: 'weaponAttr', field, op: 'eq', value: own };
      out.push({
        predicate: eq,
        family: field,
        field,
        isEq: true,
        test: w => weaponMatches(eq, w),
      });
      for (const v of new Set(remaining.map(w => String(w[field])))) {
        if (v === own) continue;
        const neq: CluePredicate = { kind: 'weaponAttr', field, op: 'neq', value: v };
        out.push({
          predicate: neq,
          family: field,
          field,
          isEq: false,
          test: w => weaponMatches(neq, w),
        });
      }
    }
    if (!confirmedFields.has('concealable')) {
      const conceal: CluePredicate = { kind: 'weaponConcealable', value: weapon.concealable };
      out.push({
        predicate: conceal,
        family: 'concealable',
        field: 'concealable',
        isEq: true,
        test: w => weaponMatches(conceal, w),
      });
    }
    for (const other of remaining) {
      if (other.id === weapon.id) continue;
      const idNeq: CluePredicate = { kind: 'weaponAttr', field: 'id', op: 'neq', value: other.id };
      out.push({
        predicate: idNeq,
        family: 'intact',
        maxRemaining: 4,
        isEq: false,
        test: w => weaponMatches(idNeq, w),
      });
    }
    if (!confirmedFields.has('woundPattern')) {
      const wound: CluePredicate = { kind: 'weaponAttr', field: 'woundPattern', op: 'eq', value: weapon.woundPattern };
      out.push({
        predicate: wound,
        family: 'wound',
        field: 'woundPattern',
        isEq: true,
        maxRemaining: 4,
        test: w => weaponMatches(wound, w),
      });
    }
    return out;
  };
}

function roomCandidates(room: GameLocation): CandidateBuilder<GameLocation> {
  return (remaining, _rng, confirmedFields): CandidateClue<GameLocation>[] => {
    const out: CandidateClue<GameLocation>[] = [];
    const fields: ('floor' | 'lockType' | 'surfaceMaterial' | 'ambientTrace')[] = [
      'floor',
      'lockType',
      'surfaceMaterial',
      'ambientTrace',
    ];
    for (const field of fields) {
      if (confirmedFields.has(field)) continue;
      const own = String(room[field]);
      const eq: CluePredicate = { kind: 'roomAttr', field, op: 'eq', value: own };
      out.push({
        predicate: eq,
        family: field,
        field,
        isEq: true,
        test: r => roomMatches(eq, r),
      });
      for (const v of new Set(remaining.map(r => String(r[field])))) {
        if (v === own) continue;
        const neq: CluePredicate = { kind: 'roomAttr', field, op: 'neq', value: v };
        out.push({
          predicate: neq,
          family: field,
          field,
          isEq: false,
          test: r => roomMatches(neq, r),
        });
      }
    }
    for (const other of remaining) {
      if (other.id === room.id) continue;
      const idNeq: CluePredicate = { kind: 'roomAttr', field: 'id', op: 'neq', value: other.id };
      out.push({
        predicate: idNeq,
        family: 'sealed',
        maxRemaining: 3,
        isEq: false,
        test: r => roomMatches(idNeq, r),
      });
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

  const queues = {
    S: suspectPicks.map(c => c.predicate),
    W: weaponPicks.map(c => c.predicate),
    R: roomPicks.map(c => c.predicate),
  };

  const textRng = mulberry32(deriveSeed(config.seed, 0, 'clue-text'));
  const counters = { S: 0, W: 0, R: 0 };
  const murderNarrative = buildMurderNarrative(config.seed, culprit, weapon, room);

  const days: DayData[] = [];
  const puzzleSchedule = buildPuzzleScheduleForSeed(config.seed);
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

    const puzzleType = puzzleSchedule[i];
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
      puzzle: buildDayPuzzle(puzzleType, config.seed, day, clue, config),
      unlockedClue: { ...clue, autoEliminations },
    });
  }

  const acts = generateActCrimeFiles(config);

  return { config, murderNarrative, acts, days };
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
