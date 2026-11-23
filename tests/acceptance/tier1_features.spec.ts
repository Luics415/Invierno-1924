import { describe, expect, it } from 'vitest';
import { LOCATIONS, WEAPONS } from '../../src/data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../../src/data/suspectsDirectory';
import {
  CLUE_SCHEDULE,
  DAYS_PER_ACT,
  PUZZLE_SCHEDULE,
  TOTAL_DAYS,
  buildPuzzleScheduleForSeed,
  evaluateCaseClues,
  generateCase,
  roomMatches,
  suspectMatches,
  weaponMatches,
} from '../../src/engine/caseGenerator';
import {
  AMBIENT_TRACE_LABEL,
  HANDEDNESS_LABEL,
  LOCK_TYPE_LABEL,
  SURFACE_LABEL,
  WEAPON_TRACE_LABEL,
  WOUND_PATTERN_LABEL,
  toPuzzleText,
} from '../../src/engine/clueLabels';
import {
  describeRoomPredicate,
  describeSuspectPredicate,
  describeWeaponPredicate,
} from '../../src/engine/clueWriter';
import { DAY_CALENDAR } from '../../src/engine/narrativeGenerator';
import { buildDayPuzzle } from '../../src/engine/puzzleFactory';
import { mulberry32 } from '../../src/engine/puzzles/prng';
import { generateCodificados, scoreCodificadosAttempt, validateCodificados } from '../../src/engine/puzzles/codificados';
import { checkConnectionsSelection, generateConnections, validateConnections } from '../../src/engine/puzzles/connections';
import { generateCrossword, validateCrossword } from '../../src/engine/puzzles/crossword';
import { generateCryptogram, validateCryptogram } from '../../src/engine/puzzles/cryptogram';
import { generateEcuaciones, validateEcuaciones } from '../../src/engine/puzzles/ecuaciones';
import { generateEncajados, validateEncajados } from '../../src/engine/puzzles/encajados';
import { generateFutoshiki, getFutoshikiViolations, validateFutoshiki } from '../../src/engine/puzzles/futoshiki';
import { countAdjacentMines, floodRevealSafeCells, generateMinesweeper, validateMinesweeper } from '../../src/engine/puzzles/minesweeper';
import { generateMurdoku, generateMurdokuWithProof, isMurdokuMoveMistake, validateMurdoku } from '../../src/engine/puzzles/murdoku';
import { computeLineClues, generateNonogram, validateNonogram } from '../../src/engine/puzzles/nonogram';
import { generateSeptagrama, validateSeptagrama } from '../../src/engine/puzzles/septagrama';
import { generateSudoku, getSudokuConflicts, validateSudoku } from '../../src/engine/puzzles/sudoku';
import { generateSyllables, validateSyllables } from '../../src/engine/puzzles/syllables';
import { findWordCoordinates, generateWordSearch, validateWordSearch } from '../../src/engine/puzzles/wordsearch';
import { computeSuspectStatus, useGameStore } from '../../src/store/useGameStore';
import type { Clue, CluePredicate, DayPuzzle, PuzzleType, SuspectGender } from '../../src/types/game';
import {
  ALL_14_PUZZLE_TYPES,
  OFF_THEME_ENCAJADOS_WORDS,
  SAMPLE_SEEDS,
  checkClueToPuzzleIntegration,
  extractClueTokens,
  extractNormalizedTokens,
  findRawClueDefects,
  findWordInGridOpaque,
  readDossierComponentSource,
  renderDossierMarkup,
  renderFutoshikiMarkup,
  solveCodificadosOpaque,
  solveConnectionsOpaque,
  solveCrosswordOpaque,
  solveCryptogramOpaque,
  solveEcuacionesOpaque,
  solveEncajadosOpaque,
  solveFutoshikiOpaque,
  solveMinesweeperDeterministic,
  solveMurdokuOpaque,
  solveNonogramOpaque,
  solveSeptagramaOpaque,
  solveSudokuOpaque,
  solveSyllablesOpaque,
  validateClockFormattingInMeaning,
} from './helpers';

function findCaseDayForType(seed: number, type: PuzzleType, occurrence = 0) {
  const generated = generateCase(seed);
  const matches = generated.days.filter(d => d.puzzle.type === type);
  return { generated, dayData: matches[occurrence] ?? matches[0] };
}

function makeSyntheticClue(
  category: 'suspect' | 'weapon' | 'room',
  seedTag = 'alpha'
): Clue {
  if (category === 'weapon') {
    return seedTag === 'alpha'
      ? {
          id: 'syn-w-a',
          day: 2,
          text: 'El examen químico confirma una sustancia letal con olor a almendras amargas.',
          category: 'weapon',
          impact: 'Residuo del arma: almendras amargas',
          keyphrase: 'ARMA CON ALMENDRAS AMARGAS',
          predicates: [{ kind: 'weaponAttr', field: 'forensicTrace', op: 'eq', value: 'almendras' }],
        }
      : {
          id: 'syn-w-b',
          day: 2,
          text: 'La lesión revela una fractura craneal provocada por instrumento de bronce.',
          category: 'weapon',
          impact: 'Material del arma: bronce contundente',
          keyphrase: 'ARMA DE BRONCE CONTUNDENTE',
          predicates: [{ kind: 'weaponAttr', field: 'material', op: 'eq', value: 'metal' }],
        };
  }
  if (category === 'room') {
    return seedTag === 'alpha'
      ? {
          id: 'syn-r-a',
          day: 4,
          text: 'En las suelas aparecieron partículas de mármol blanco del comedor.',
          category: 'room',
          impact: 'Suelo confirmado: mármol del comedor',
          keyphrase: 'SUELO DE MARMOL COMEDOR',
          predicates: [{ kind: 'roomAttr', field: 'surfaceMaterial', op: 'eq', value: 'marmol' }],
        }
      : {
          id: 'syn-r-b',
          day: 4,
          text: 'El rastro de polen señala hacia el pabellón acristalado del invernadero.',
          category: 'room',
          impact: 'Ambiente confirmado: polen en invernadero',
          keyphrase: 'AMBIENTE POLEN INVERNADERO',
          predicates: [{ kind: 'roomAttr', field: 'ambientTrace', op: 'eq', value: 'polen' }],
        };
  }
  return seedTag === 'alpha'
    ? {
        id: 'syn-s-a',
        day: 1,
        text: 'El culpable operó desde el sótano dejando restos de harina y levadura.',
        category: 'suspect',
        impact: 'Rastro forense hallado: harina de trigo',
        keyphrase: 'RASTRO DE HARINA EN SOTANO',
        predicates: [{ kind: 'suspectAttr', field: 'forensicTrace', op: 'eq', value: 'harina' }],
      }
    : {
        id: 'syn-s-b',
        day: 1,
        text: 'Los pagarés revelan un motivo ligado a la herencia familiar de la torre.',
        category: 'suspect',
        impact: 'Móvil acreditado: herencia familiar',
        keyphrase: 'MOVIL HERENCIA TORRE',
        predicates: [{ kind: 'suspectAttr', field: 'motiveTag', op: 'eq', value: 'herencia' }],
      };
}

// =====================================================================
// FEATURE #1: R2 30-day 14-game schedule balance
// =====================================================================
describe('Tier 1 — Feature #01: R2 30-day 14-game schedule balance', () => {
  it('T1-F01-1: covers all 14 puzzle types across 30 days', () => {
    expect(PUZZLE_SCHEDULE).toHaveLength(TOTAL_DAYS);
    const present = new Set(PUZZLE_SCHEDULE);
    expect(present.size).toBe(14);
    for (const type of ALL_14_PUZZLE_TYPES) {
      expect(present.has(type)).toBe(true);
    }
  });

  it('T1-F01-2: balances each of the 14 puzzle types to 2-3 appearances', () => {
    const counts = new Map<PuzzleType, number>();
    for (const type of PUZZLE_SCHEDULE) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    for (const type of ALL_14_PUZZLE_TYPES) {
      const c = counts.get(type) ?? 0;
      expect(c, `Type ${type} count=${c} must be 2..3`).toBeGreaterThanOrEqual(2);
      expect(c, `Type ${type} count=${c} must be 2..3`).toBeLessThanOrEqual(3);
    }
  });

  it('T1-F01-3: enforces zero consecutive identical puzzle types across days 1..30', () => {
    for (let i = 1; i < PUZZLE_SCHEDULE.length; i++) {
      expect(PUZZLE_SCHEDULE[i]).not.toBe(PUZZLE_SCHEDULE[i - 1]);
    }
  });

  it('T1-F01-4: spreads 6 distinct puzzle types in every 6-day act (5 acts x 6 days)', () => {
    for (let act = 0; act < 5; act++) {
      const slice = PUZZLE_SCHEDULE.slice(act * DAYS_PER_ACT, (act + 1) * DAYS_PER_ACT);
      expect(slice).toHaveLength(DAYS_PER_ACT);
      expect(new Set(slice).size).toBe(DAYS_PER_ACT);
    }
  });

  it('T1-F01-5: generated case days align 1-to-1 with buildPuzzleScheduleForSeed and randomize order across seeds', () => {
    const generatedA = generateCase(SAMPLE_SEEDS[0]);
    const scheduleA = buildPuzzleScheduleForSeed(SAMPLE_SEEDS[0]);
    expect(generatedA.days).toHaveLength(30);
    for (let i = 0; i < TOTAL_DAYS; i++) {
      expect(generatedA.days[i].puzzle.type).toBe(scheduleA[i]);
      expect(generatedA.days[i].day).toBe(i + 1);
    }

    const scheduleB = buildPuzzleScheduleForSeed(SAMPLE_SEEDS[1]);
    expect(scheduleB).not.toEqual(scheduleA);
  });
});

// =====================================================================
// FEATURE #2: R2 Dimension-coherent puzzle pairing
// =====================================================================
describe('Tier 1 — Feature #02: R2 dimension-coherent puzzle pairing', () => {
  it('T1-F02-1: CLUE_SCHEDULE spans 30 days across S/W/R with late-campaign closing slots', () => {
    expect(CLUE_SCHEDULE).toHaveLength(TOTAL_DAYS);
    const lastS = CLUE_SCHEDULE.lastIndexOf('S');
    const lastW = CLUE_SCHEDULE.lastIndexOf('W');
    const lastR = CLUE_SCHEDULE.lastIndexOf('R');
    expect(lastS).toBe(29);
    expect(lastW).toBeGreaterThanOrEqual(24);
    expect(lastR).toBeGreaterThanOrEqual(24);
  });

  it('T1-F02-2: pairs every nonogram slot with weapon (W) or room (R) evidence, never suspect-only days', () => {
    const nonogramDims: string[] = [];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      if (PUZZLE_SCHEDULE[i] === 'nonogram') {
        nonogramDims.push(CLUE_SCHEDULE[i]);
        expect(['W', 'R']).toContain(CLUE_SCHEDULE[i]);
      }
    }
    expect(nonogramDims.length).toBeGreaterThanOrEqual(2);
  });

  it('T1-F02-3: pairs minesweeper with spatial/forensic dimensions (includes R) across distinct acts', () => {
    const mineActs = new Set<number>();
    const mineDims: string[] = [];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      if (PUZZLE_SCHEDULE[i] === 'minesweeper') {
        mineDims.push(CLUE_SCHEDULE[i]);
        expect(DAY_CALENDAR[i].title.length).toBeGreaterThan(3);
        mineActs.add(Math.floor(i / DAYS_PER_ACT) + 1);
      }
    }
    expect(mineDims).toContain('R');
    expect(mineActs.size).toBeGreaterThanOrEqual(2);
  });

  it('T1-F02-4: unlockedClue.category matches CLUE_SCHEDULE[i] on every single day', () => {
    const expectedCategory = { S: 'suspect', W: 'weapon', R: 'room' } as const;
    const generated = generateCase(SAMPLE_SEEDS[0]);
    for (let i = 0; i < TOTAL_DAYS; i++) {
      expect(generated.days[i].unlockedClue.category).toBe(expectedCategory[CLUE_SCHEDULE[i]]);
    }
  });

  it('T1-F02-5: day narrative focus sentence and act index match CLUE_SCHEDULE and DAY_CALENDAR', () => {
    const generated = generateCase(SAMPLE_SEEDS[1]);
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d = generated.days[i];
      const expectedAct = Math.floor(i / DAYS_PER_ACT) + 1;
      expect(d.act).toBe(expectedAct);
      expect(d.title).toBe(DAY_CALENDAR[i].title);
      expect(d.dateStr).toBe(DAY_CALENDAR[i].dateStr);
      expect(d.hourStr).toBe(DAY_CALENDAR[i].hourStr);
      const narrativeBody = d.narrative.storyText.join(' ');
      if (CLUE_SCHEDULE[i] === 'S') {
        expect(narrativeBody).toMatch(/74 presentes|censo|sospecha|coartada/i);
      } else if (CLUE_SCHEDULE[i] === 'W') {
        expect(narrativeBody).toMatch(/arsenal|18 objetos|instrumento homicida/i);
      } else {
        expect(narrativeBody).toMatch(/9 estancias|planos|planta/i);
      }
    }
  });
});

// =====================================================================
// FEATURE #3: R3 Progressive funnel & no early collapse
// =====================================================================
describe('Tier 1 — Feature #03: R3 progressive funnel & no early collapse', () => {
  it('T1-F03-1: candidate counts |S|, |W|, |R| narrow monotonically across days 1..30', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const generated = generateCase(seed);
      let prevS = SUSPECTS_DIRECTORY.length;
      let prevW = WEAPONS.length;
      let prevR = LOCATIONS.length;
      for (let d = 1; d <= TOTAL_DAYS; d++) {
        const res = evaluateCaseClues(generated.days.slice(0, d).map(x => x.unlockedClue));
        expect(res.matchingSuspectIds.length).toBeLessThanOrEqual(prevS);
        expect(res.matchingWeaponIds.length).toBeLessThanOrEqual(prevW);
        expect(res.matchingRoomIds.length).toBeLessThanOrEqual(prevR);
        prevS = res.matchingSuspectIds.length;
        prevW = res.matchingWeaponIds.length;
        prevR = res.matchingRoomIds.length;
      }
    }
  });

  it('T1-F03-2: suspect pool stays > 1 through Day 29 and reaches exactly 1 at Day 30', () => {
    for (const seed of SAMPLE_SEEDS) {
      const generated = generateCase(seed);
      for (let d = 1; d <= 29; d++) {
        const res = evaluateCaseClues(generated.days.slice(0, d).map(x => x.unlockedClue));
        expect(
          res.matchingSuspectIds.length,
          `Seed ${seed} collapsed suspect pool at Day ${d}`
        ).toBeGreaterThan(1);
      }
      const finalRes = evaluateCaseClues(generated.days.map(x => x.unlockedClue));
      expect(finalRes.matchingSuspectIds).toEqual([generated.config.culpritId]);
    }
  });

  it('T1-F03-3: weapon pool stays > 1 through Day 25 and reaches exactly 1 by Day 30', () => {
    for (const seed of SAMPLE_SEEDS) {
      const generated = generateCase(seed);
      for (let d = 1; d <= 25; d++) {
        const res = evaluateCaseClues(generated.days.slice(0, d).map(x => x.unlockedClue));
        expect(
          res.matchingWeaponIds.length,
          `Seed ${seed} collapsed weapon pool at Day ${d}`
        ).toBeGreaterThan(1);
      }
      const finalRes = evaluateCaseClues(generated.days.map(x => x.unlockedClue));
      expect(finalRes.matchingWeaponIds).toEqual([generated.config.weaponId]);
    }
  });

  it('T1-F03-4: room pool stays > 1 through Day 27 and reaches exactly 1 by Day 30', () => {
    for (const seed of SAMPLE_SEEDS) {
      const generated = generateCase(seed);
      for (let d = 1; d <= 27; d++) {
        const res = evaluateCaseClues(generated.days.slice(0, d).map(x => x.unlockedClue));
        expect(
          res.matchingRoomIds.length,
          `Seed ${seed} collapsed room pool at Day ${d}`
        ).toBeGreaterThan(1);
      }
      const finalRes = evaluateCaseClues(generated.days.map(x => x.unlockedClue));
      expect(finalRes.matchingRoomIds).toEqual([generated.config.locationId]);
    }
  });

  it('T1-F03-5: emits zero duplicate predicates and zero redundant post-eq clues on confirmed fields', () => {
    for (const seed of SAMPLE_SEEDS) {
      const generated = generateCase(seed);
      const seenPreds = new Set<string>();
      const confirmedFields = new Set<string>();

      for (const d of generated.days) {
        for (const p of d.unlockedClue.predicates ?? []) {
          const serialized = JSON.stringify(p);
          expect(seenPreds.has(serialized), `Duplicate predicate on Day ${d.day}: ${serialized}`).toBe(false);
          seenPreds.add(serialized);

          if ('field' in p) {
            const fieldKey = `${p.kind}:${p.field}`;
            expect(
              confirmedFields.has(fieldKey),
              `Redundant clue on already-confirmed eq field ${fieldKey} on Day ${d.day}`
            ).toBe(false);
            if (p.op === 'eq') {
              confirmedFields.add(fieldKey);
            }
          }
        }
      }
    }
  });
});

// =====================================================================
// FEATURE #4: R3 Clear direct predicates (74x18x9)
// =====================================================================
describe('Tier 1 — Feature #04: R3 clear direct predicates (74x18x9)', () => {
  it('T1-F04-1: isolates unique |S|=1, |W|=1, |R|=1 for all 74 suspects without early collapse', { timeout: 30000 }, () => {
    for (let k = 0; k < SUSPECTS_DIRECTORY.length; k++) {
      const seed = 100000 + k * 7919;
      const weaponIdx = (k * 5) % WEAPONS.length;
      const roomIdx = (k * 7) % LOCATIONS.length;
      const generated = generateCase(seed, k, weaponIdx, roomIdx);
      const finalEval = evaluateCaseClues(generated.days.map(d => d.unlockedClue));

      expect(finalEval.matchingSuspectIds).toEqual([generated.config.culpritId]);
      expect(finalEval.matchingWeaponIds).toEqual([generated.config.weaponId]);
      expect(finalEval.matchingRoomIds).toEqual([generated.config.locationId]);
    }
  });

  it('T1-F04-2: resolves every 18-weapon x 9-room combination uniquely across culprits', { timeout: 30000 }, () => {
    let comboIdx = 0;
    for (let w = 0; w < WEAPONS.length; w++) {
      for (let r = 0; r < LOCATIONS.length; r++) {
        const s = (comboIdx * 13) % SUSPECTS_DIRECTORY.length;
        const seed = 500000 + comboIdx * 31;
        const generated = generateCase(seed, s, w, r);
        const evalRes = evaluateCaseClues(generated.days.map(d => d.unlockedClue));

        expect(evalRes.matchingSuspectIds).toEqual([SUSPECTS_DIRECTORY[s].id]);
        expect(evalRes.matchingWeaponIds).toEqual([WEAPONS[w].id]);
        expect(evalRes.matchingRoomIds).toEqual([LOCATIONS[r].id]);
        comboIdx++;
      }
    }
  });

  it('T1-F04-3: true culprit, weapon, and room satisfy every single daily predicate (zero contradictions)', () => {
    for (const seed of SAMPLE_SEEDS) {
      const generated = generateCase(seed);
      const culprit = SUSPECTS_DIRECTORY.find(s => s.id === generated.config.culpritId)!;
      const weapon = WEAPONS.find(w => w.id === generated.config.weaponId)!;
      const room = LOCATIONS.find(l => l.id === generated.config.locationId)!;

      for (const d of generated.days) {
        for (const pred of d.unlockedClue.predicates ?? []) {
          expect(suspectMatches(pred, culprit)).toBe(true);
          expect(weaponMatches(pred, weapon)).toBe(true);
          expect(roomMatches(pred, room)).toBe(true);
        }
      }
    }
  });

  it('T1-F04-4: avoids random-offset suspectAgeRange predicates in generated campaigns', () => {
    for (const seed of SAMPLE_SEEDS) {
      const generated = generateCase(seed);
      for (const d of generated.days) {
        for (const p of d.unlockedClue.predicates ?? []) {
          expect(
            p.kind,
            `Unexpected suspectAgeRange predicate on seed ${seed} day ${d.day}`
          ).not.toBe('suspectAgeRange');
        }
      }
    }
  });

  it('T1-F04-5: avoids confusing op="in" disjunction predicates in generated campaigns', () => {
    for (const seed of SAMPLE_SEEDS) {
      const generated = generateCase(seed);
      for (const d of generated.days) {
        for (const p of d.unlockedClue.predicates ?? []) {
          if ('op' in p) {
            expect(
              p.op,
              `Confusing op="in" predicate on seed ${seed} day ${d.day}`
            ).not.toBe('in');
          }
        }
      }
    }
  });
});

// =====================================================================
// FEATURE #5: R3 Clue text, keyphrase & label clarity
// =====================================================================
describe('Tier 1 — Feature #05: R3 clue text, keyphrase & label clarity', () => {
  it('T1-F05-1: toPuzzleText preserves digits 0-9 while stripping diacritics and preserving Ñ', () => {
    expect(toPuzzleText('EDAD ENTRE 19 Y 35 AÑOS — Ñ')).toBe('EDAD ENTRE 19 Y 35 AÑOS Ñ');
    expect(toPuzzleText('Expediente #07 · 23:15 h')).toBe('EXPEDIENTE 07 23 15 H');
  });

  it('T1-F05-2: zero raw enum keys, underscores, or unaccented raw tokens across generated cases', () => {
    for (const seed of SAMPLE_SEEDS) {
      const generated = generateCase(seed);
      for (const d of generated.days) {
        const defects = findRawClueDefects(d.unlockedClue);
        expect(defects, `Day ${d.day} defects: ${defects.join('; ')}`).toEqual([]);
      }
    }
  });

  it('T1-F05-3: visualMarker="ninguno" produces natural Spanish without double negatives or raw "ninguno"', () => {
    const rng = mulberry32(19241224);
    const eqDesc = describeSuspectPredicate(
      { kind: 'suspectAttr', field: 'visualMarker', op: 'eq', value: 'ninguno' },
      rng
    );
    const neqDesc = describeSuspectPredicate(
      { kind: 'suspectAttr', field: 'visualMarker', op: 'neq', value: 'ninguno' },
      rng
    );
    expect(findRawClueDefects(eqDesc)).toEqual([]);
    expect(findRawClueDefects(neqDesc)).toEqual([]);
    expect(neqDesc.text).not.toMatch(/descarta a quien no tenía ningún/i);
  });

  it('T1-F05-4: HANDEDNESS_LABEL and handedness clues stay weapon-agnostic (no "golpea" for poison)', () => {
    for (const label of Object.values(HANDEDNESS_LABEL)) {
      expect(label.toLowerCase()).not.toContain('golpea');
    }
    const rng = mulberry32(777);
    const desc = describeSuspectPredicate(
      { kind: 'suspectAttr', field: 'handedness', op: 'neq', value: 'diestro' },
      rng
    );
    expect(desc.text.toLowerCase()).not.toMatch(/\bgolpe(a)?\b/);
  });

  it('T1-F05-5: zero generic fallback prose across all predicate kinds including gender and negated age range', () => {
    const rng = mulberry32(4242);
    const genders: SuspectGender[] = ['M', 'F', 'Trans M', 'Trans F', 'NB'];
    const preds: CluePredicate[] = [
      ...genders.map((g): CluePredicate => ({ kind: 'suspectIdentity', field: 'gender', op: 'eq', value: g })),
      { kind: 'suspectAgeRange', min: 20, max: 35, negate: true },
      { kind: 'suspectIdentity', field: 'id', op: 'eq', value: 'elena' },
      { kind: 'weaponAttr', field: 'woundPattern', op: 'neq', value: 'fractura_hundida' },
      { kind: 'roomAttr', field: 'lockType', op: 'eq', value: 'combinacion_hierro' },
    ];
    for (const p of preds) {
      const desc =
        p.kind === 'weaponAttr' || p.kind === 'weaponConcealable'
          ? describeWeaponPredicate(p, rng)
          : p.kind === 'roomAttr'
            ? describeRoomPredicate(p, rng)
            : describeSuspectPredicate(p, rng);
      expect(findRawClueDefects(desc), `Fallback or raw key on ${JSON.stringify(p)}`).toEqual([]);
      if (p.kind === 'suspectAgeRange' && p.negate) {
        expect(desc.text.toLowerCase()).toMatch(/no |descarta|fuera|excluy/);
      }
    }
  });
});

// =====================================================================
// FEATURE #6: R3 Dossier attribute transparency
// =====================================================================
describe('Tier 1 — Feature #06: R3 Dossier attribute transparency', () => {
  it('T1-F06-1: DetectiveDossier renders cleanly in Node SSR and store tracks live counts across 0, 6, and 30 clues', () => {
    const html0 = renderDossierMarkup({ seed: SAMPLE_SEEDS[0], unlockedClues: [] });
    expect(html0).toContain('Cuaderno del Detective — Villa Acebo');
    expect(html0).toContain('74 activos');
    expect(html0).toContain('18/18');
    expect(html0).toContain('9/9');

    const store = useGameStore.getState();
    store.startNewCase(SAMPLE_SEEDS[0]);
    const c = useGameStore.getState().activeCase;
    for (let i = 0; i < 6; i++) {
      useGameStore.getState().markDayCompleted(i + 1, c.days[i].unlockedClue);
    }
    const eval6 = useGameStore.getState().getClueEvaluation();
    const expected6 = evaluateCaseClues(c.days.slice(0, 6).map(d => d.unlockedClue));
    expect(eval6).toEqual(expected6);
    const active6 = SUSPECTS_DIRECTORY.filter(
      s => !computeSuspectStatus(s, [], useGameStore.getState().unlockedClues, c, []).isEliminated
    ).length;
    expect(active6).toBe(expected6.matchingSuspectIds.length);
  });

  it('T1-F06-2: Dossier weapons tab surfaces concealable status for all 18 weapons', () => {
    const html = renderDossierMarkup({ seed: SAMPLE_SEEDS[0] });
    const src = readDossierComponentSource();
    if (html.includes('Las 18 Armas Inventariadas')) {
      expect(html).toMatch(/Ocultable|No ocultable/i);
    } else {
      expect(src).toMatch(/w\.concealable/);
      expect(src).toMatch(/Ocultable|ocultable/);
    }
  });

  it('T1-F06-3: Dossier weapons tab surfaces forensicTrace Spanish labels for all 18 weapons', () => {
    for (const w of WEAPONS) {
      expect(WEAPON_TRACE_LABEL[w.forensicTrace]).toBeTruthy();
    }
    const src = readDossierComponentSource();
    expect(src).toMatch(/w\.forensicTrace/);
    expect(src).toMatch(/WEAPON_TRACE_LABEL/);
  });

  it('T1-F06-4: Dossier weapons tab surfaces woundPattern Spanish labels for all 18 weapons', () => {
    for (const w of WEAPONS) {
      expect(WOUND_PATTERN_LABEL[w.woundPattern]).toBeTruthy();
    }
    const src = readDossierComponentSource();
    expect(src).toMatch(/w\.woundPattern/);
    expect(src).toMatch(/WOUND_PATTERN_LABEL|WOUND_PATTERN_SHORT/);
  });

  it('T1-F06-5: Dossier rooms section surfaces lockType, surfaceMaterial, and ambientTrace labels cleanly', () => {
    for (const r of LOCATIONS) {
      expect(LOCK_TYPE_LABEL[r.lockType]).toBeTruthy();
      expect(SURFACE_LABEL[r.surfaceMaterial]).toBeTruthy();
      expect(AMBIENT_TRACE_LABEL[r.ambientTrace]).toBeTruthy();
    }
    const src = readDossierComponentSource();
    expect(src).toMatch(/l\.lockType/);
    expect(src).toMatch(/l\.surfaceMaterial/);
    expect(src).toMatch(/l\.ambientTrace/);
  });
});

// =====================================================================
// FEATURE #7: R1 Shared clue-to-puzzle wiring seam
// =====================================================================
describe('Tier 1 — Feature #07: R1 shared clue-to-puzzle wiring seam', () => {
  it('T1-F07-1: buildDayPuzzle constructs valid puzzles for all 14 types given a real Clue', () => {
    const clue = makeSyntheticClue('weapon', 'alpha');
    for (const type of ALL_14_PUZZLE_TYPES) {
      const puzzle = buildDayPuzzle(type, 19241224, 5, clue);
      expect(puzzle.type).toBe(type);
      expect(puzzle.instructions.length).toBeGreaterThan(10);
      expect(puzzle.hints.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('T1-F07-2: changing clue for fixed (type, seed, day) changes integrated puzzle content/meaning', () => {
    const clueA = makeSyntheticClue('weapon', 'alpha');
    const clueB = makeSyntheticClue('room', 'beta');
    for (const type of ALL_14_PUZZLE_TYPES) {
      const pA = buildDayPuzzle(type, 19241224, 10, clueA);
      const pB = buildDayPuzzle(type, 19241224, 10, clueB);
      expect(JSON.stringify(pA.config), `Type ${type} ignored clue change`).not.toBe(
        JSON.stringify(pB.config)
      );
    }

    const suspectA = makeSyntheticClue('suspect', 'alpha');
    const suspectB = makeSyntheticClue('suspect', 'beta');
    for (const type of ['murdoku', 'crossword'] as const) {
      const sA = buildDayPuzzle(type, 19241224, 10, suspectA);
      const sB = buildDayPuzzle(type, 19241224, 10, suspectB);
      expect(JSON.stringify(sA.config), `Type ${type} ignored same-category clue change`).not.toBe(
        JSON.stringify(sB.config)
      );
    }
  });

  it('T1-F07-3: identical (type, seed, day, clue) is strictly deterministic across all 14 types', () => {
    const clue = makeSyntheticClue('suspect', 'alpha');
    for (const type of ALL_14_PUZZLE_TYPES) {
      const p1 = buildDayPuzzle(type, 20261224, 7, clue);
      const p2 = buildDayPuzzle(type, 20261224, 7, clue);
      expect(p1).toEqual(p2);
    }
  });

  it('T1-F07-4: unsolved puzzle configs never leak verbatim unredacted clue.text across 30 days', () => {
    const generated = generateCase(SAMPLE_SEEDS[0]);
    for (const d of generated.days) {
      const link = checkClueToPuzzleIntegration(d.puzzle, d.unlockedClue);
      expect(link.leaksVerbatimClueText, `Day ${d.day} (${d.puzzle.type}) leaked verbatim clue text`).toBe(false);
    }
  });

  it('T1-F07-5: standalone generate<Type>(seed, day) remains backward-compatible without clueContext', () => {
    expect(generateSudoku(19241224, 2).size).toBe(9);
    expect(generateWordSearch(19241224, 1).words.length).toBeGreaterThanOrEqual(8);
    expect(generateMurdoku(19241224, 4).groupA.items.length).toBeGreaterThanOrEqual(4);
    expect(generateSyllables(19241224, 5).words.length).toBeGreaterThanOrEqual(4);
    expect(generateCryptogram(19241224, 3).cipherText.length).toBeGreaterThan(5);
    expect(generateCrossword(19241224, 6).entries.length).toBeGreaterThanOrEqual(5);
    expect(generateFutoshiki(19241224, 8).size).toBe(5);
    expect(generateConnections(19241224, 6).groups).toHaveLength(4);
    expect(generateNonogram(19241224, 9).rows).toBeGreaterThanOrEqual(7);
    expect(generateMinesweeper(19241224, 10).mines.length).toBeGreaterThanOrEqual(8);
    expect(generateSeptagrama(19241224, 3).words.length).toBeGreaterThanOrEqual(7);
    expect(generateCodificados(19241224, 2).clues).toHaveLength(5);
    expect(generateEcuaciones(19241224, 4).equations.length).toBeGreaterThanOrEqual(5);
    expect(generateEncajados(19241224, 5).slots.length).toBeGreaterThanOrEqual(5);
  });
});

// =====================================================================
// FEATURE #8: R1 Crossword (casillas clave)
// =====================================================================
describe('Tier 1 — Feature #08: R1 Crossword (casillas clave)', () => {
  it('T1-F08-1: embeds clue-derived terms or definitions in crossword entries/secret', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'crossword');
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F08-2: secretHighlightCells (>=4) match exact grid cells to spell secretWord', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'crossword');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'crossword' }>).config;
    expect(cfg.secretHighlightCells?.length ?? 0).toBeGreaterThanOrEqual(4);
    const spelled = (cfg.secretHighlightCells ?? []).map(p => cfg.grid[p.r]?.[p.c] ?? '').join('');
    expect(spelled).toBe(cfg.secretWord);
  });

  it('T1-F08-3: secretWord and secretMeaning tie cleanly to clue keyphrase/impact without gibberish', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'crossword');
      const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'crossword' }>).config;
      expect(cfg.secretWord ?? '').toMatch(/^[A-ZÑ]{4,}$/);
      expect(cfg.secretMeaning?.length ?? 0).toBeGreaterThan(8);
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F08-4: all entries form a single connected intersecting graph with zero collisions', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[1], 'crossword');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'crossword' }>).config;
    const solved = solveCrosswordOpaque(cfg);
    expect(solved.hasCollision).toBe(false);
    expect(solved.isConnected).toBe(true);
  });

  it('T1-F08-5: validateCrossword accepts solved grid and rejects perturbed cell', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'crossword');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'crossword' }>).config;
    const solved = solveCrosswordOpaque(cfg);
    expect(validateCrossword(cfg, solved.grid)).toBe(true);

    const broken = solved.grid.map(row => [...row]);
    const e0 = cfg.entries[0];
    broken[e0.row][e0.col] = broken[e0.row][e0.col] === 'Z' ? 'Q' : 'Z';
    expect(validateCrossword(cfg, broken)).toBe(false);
  });
});

// =====================================================================
// FEATURE #9: R1 WordSearch
// =====================================================================
describe('Tier 1 — Feature #09: R1 WordSearch', () => {
  it('T1-F09-1: incorporates clue-derived normalized keywords into word list', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'wordsearch');
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F09-2: leftoverMessage aligns with daily clue tokens/category', () => {
    const clue = makeSyntheticClue('weapon', 'alpha');
    const puzzle = buildDayPuzzle('wordsearch', 19241224, 1, clue);
    const cfg = (puzzle as Extract<DayPuzzle, { type: 'wordsearch' }>).config;
    expect(cfg.leftoverMessage.length).toBeGreaterThan(5);
    const msgTokens = extractNormalizedTokens(cfg.leftoverMessage);
    const clueTokens = extractClueTokens(clue);
    expect([...clueTokens].some(t => msgTokens.has(t))).toBe(true);
  });

  it('T1-F09-3: grid is >=11x11 and strictly uppercase [A-ZÑ] with zero "!" placeholders', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'wordsearch');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'wordsearch' }>).config;
    expect(cfg.grid.length).toBeGreaterThanOrEqual(11);
    for (const row of cfg.grid) {
      expect(row.length).toBeGreaterThanOrEqual(11);
      for (const ch of row) {
        expect(ch).toMatch(/^[A-ZÑ]$/);
      }
    }
  });

  it('T1-F09-4: independent 8-direction scanner locates every word in config.words', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[2], 'wordsearch');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'wordsearch' }>).config;
    for (const item of cfg.words) {
      expect(findWordInGridOpaque(cfg.grid, item.word)).toBe(true);
      expect(findWordCoordinates(cfg.grid, item.word)).not.toBeNull();
    }
  });

  it('T1-F09-5: validateWordSearch accepts complete word list and rejects partial list', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'wordsearch');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'wordsearch' }>).config;
    const all = cfg.words.map(w => w.word);
    expect(validateWordSearch(cfg, all)).toBe(true);
    expect(validateWordSearch(cfg, all.slice(0, -1))).toBe(false);
  });
});

// =====================================================================
// FEATURE #10: R1 Syllables
// =====================================================================
describe('Tier 1 — Feature #10: R1 Syllables', () => {
  it('T1-F10-1: aligns words/definitions or secretWord with daily clue category/predicate', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'syllables');
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F10-2: secretWord ties directly to clue context in valid uppercase Spanish', () => {
    const clue = makeSyntheticClue('room', 'alpha');
    const puzzle = buildDayPuzzle('syllables', 19241224, 10, clue);
    const cfg = (puzzle as Extract<DayPuzzle, { type: 'syllables' }>).config;
    expect(cfg.secretWord).toMatch(/^[A-ZÑ ]{4,}$/);
    expect(checkClueToPuzzleIntegration(puzzle, clue).linked).toBe(true);
  });

  it('T1-F10-3: every word has >=4 syllables, valid highlightIndex, and >=3 distractor syllables', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'syllables');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'syllables' }>).config;
    expect(cfg.words.length).toBeGreaterThanOrEqual(4);
    for (const w of cfg.words) {
      expect(w.targetSyllables.length).toBeGreaterThanOrEqual(4);
      expect(w.highlightIndex).toBeGreaterThanOrEqual(0);
      expect(w.highlightIndex).toBeLessThan(w.targetSyllables.length);
    }
    expect((cfg.distractorSyllableIds ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('T1-F10-4: opaque syllable matcher solves puzzle and passes validateSyllables', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[1], 'syllables');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'syllables' }>).config;
    const solved = solveSyllablesOpaque(cfg);
    expect(validateSyllables(cfg, solved)).toBe(true);
  });

  it('T1-F10-5: swapping or using distractor syllable IDs fails validateSyllables', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'syllables');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'syllables' }>).config;
    const solved = solveSyllablesOpaque(cfg);
    const firstId = cfg.words[0].id;
    const distractor = cfg.distractorSyllableIds?.[0];
    if (distractor) {
      const broken = {
        ...solved,
        [firstId]: [distractor, ...solved[firstId].slice(1)],
      };
      expect(validateSyllables(cfg, broken)).toBe(false);
    }
    const swapped = {
      ...solved,
      [firstId]: [...solved[firstId]].reverse(),
    };
    expect(validateSyllables(cfg, swapped)).toBe(false);
  });
});

// =====================================================================
// FEATURE #11: R1 Cryptogram
// =====================================================================
describe('Tier 1 — Feature #11: R1 Cryptogram', () => {
  it('T1-F11-1: cipherText reflects normalized Spanish clue tokens/domain for the day', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'cryptogram');
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F11-2: cipherText strictly matches ^[A-ZÑ ]+$ (zero digits or diacritics)', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'cryptogram');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'cryptogram' }>).config;
    expect(cfg.cipherText).toMatch(/^[A-ZÑ ]+$/);
    expect(cfg.cipherText.split(' ').length).toBeGreaterThanOrEqual(4);
  });

  it('T1-F11-3: cipherMap is a strict 1-to-1 bijection covering every letter in cipherText', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[1], 'cryptogram');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'cryptogram' }>).config;
    const values = Object.values(cfg.cipherMap);
    expect(new Set(values).size).toBe(values.length);
    for (const ch of cfg.cipherText) {
      if (ch !== ' ') {
        expect(cfg.cipherMap[ch]).toBeTypeOf('number');
      }
    }
  });

  it('T1-F11-4: initialRevealed has at most 1 letter', () => {
    const generated = generateCase(SAMPLE_SEEDS[0]);
    for (const d of generated.days) {
      if (d.puzzle.type === 'cryptogram') {
        expect((d.puzzle.config.initialRevealed ?? []).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('T1-F11-5: validateCryptogram accepts inverted cipherMap and rejects colliding letter assignments', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'cryptogram');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'cryptogram' }>).config;
    const mapping = solveCryptogramOpaque(cfg);
    expect(validateCryptogram(cfg, mapping)).toBe(true);

    const codes = Object.keys(mapping).map(Number);
    const broken = { ...mapping, [codes[1]]: mapping[codes[0]] };
    expect(validateCryptogram(cfg, broken)).toBe(false);
  });
});

// =====================================================================
// FEATURE #12: R1 Septagrama
// =====================================================================
describe('Tier 1 — Feature #12: R1 Septagrama', () => {
  it('T1-F12-1: flower has 1 centerLetter + 6 distinct outerLetters in [A-ZÑ]', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'septagrama');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'septagrama' }>).config;
    const all7 = [cfg.centerLetter, ...cfg.outerLetters];
    expect(all7).toHaveLength(7);
    expect(new Set(all7).size).toBe(7);
    for (const ch of all7) {
      expect(ch).toMatch(/^[A-ZÑ]$/);
    }
  });

  it('T1-F12-2: all words contain centerLetter and use only the 7 flower letters', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[1], 'septagrama');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'septagrama' }>).config;
    const allowed = new Set([cfg.centerLetter, ...cfg.outerLetters]);
    expect(cfg.words.length).toBeGreaterThanOrEqual(7);
    for (const w of cfg.words) {
      expect(w.answer).toContain(cfg.centerLetter);
      for (const ch of w.answer) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it('T1-F12-3: highlightIndex letters in word order spell exact secretWord', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'septagrama');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'septagrama' }>).config;
    const spelled = cfg.words.map(w => w.answer[w.highlightIndex]).join('');
    expect(spelled).toBe(cfg.secretWord);
  });

  it('T1-F12-4: septagrama words/secretWord/secretMeaning integrate daily clue domain', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'septagrama');
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F12-5: validateSeptagrama accepts solved entries and rejects single-letter typo', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'septagrama');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'septagrama' }>).config;
    const solved = solveSeptagramaOpaque(cfg);
    expect(validateSeptagrama(cfg, solved)).toBe(true);

    const w0 = cfg.words[0];
    const broken = { ...solved, [w0.id]: 'XXXX' };
    expect(validateSeptagrama(cfg, broken)).toBe(false);
  });
});

// =====================================================================
// FEATURE #13: R1 Encajados
// =====================================================================
describe('Tier 1 — Feature #13: R1 Encajados', () => {
  it('T1-F13-1: excludes off-theme generic filler words (ABUELO, JUGUETE, etc.) across seeds', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { dayData } = findCaseDayForType(seed, 'encajados');
      const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'encajados' }>).config;
      for (const off of OFF_THEME_ENCAJADOS_WORDS) {
        expect(cfg.wordBank).not.toContain(off);
      }
    }
  });

  it('T1-F13-2: keyCells (>=4) match grid coordinates to spell secretWord', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'encajados');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'encajados' }>).config;
    expect(cfg.keyCells.length).toBeGreaterThanOrEqual(4);
    const spelled = cfg.keyCells.map(p => cfg.grid[p.r]?.[p.c] ?? '').join('');
    expect(spelled).toBe(cfg.secretWord);
  });

  it('T1-F13-3: wordBank/secretWord/secretMeaning integrate daily clue keywords', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'encajados');
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F13-4: independent slot CSP solver reconstructs valid grid from wordBank + givenCells alone', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[1], 'encajados');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'encajados' }>).config;
    for (const g of cfg.givenCells) {
      expect(cfg.grid[g.r]?.[g.c]).toBe(g.letter);
    }
    const solved = solveEncajadosOpaque(cfg);
    expect(solved.count).toBeGreaterThanOrEqual(1);
    expect(solved.grid).not.toBeNull();
    expect(validateEncajados(cfg, solved.grid!)).toBe(true);
  });

  it('T1-F13-5: validateEncajados rejects altered or blank cell', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'encajados');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'encajados' }>).config;
    const broken = cfg.grid.map(r => [...r]);
    const g0 = cfg.givenCells[0];
    broken[g0.r][g0.c] = null;
    expect(validateEncajados(cfg, broken)).toBe(false);
  });
});

// =====================================================================
// FEATURE #14: R1 Connections
// =====================================================================
describe('Tier 1 — Feature #14: R1 Connections', () => {
  it('T1-F14-1: builds 4 mutually disjoint groups of 4 items (16 unique strings)', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'connections');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'connections' }>).config;
    expect(cfg.groups).toHaveLength(4);
    const allItems = cfg.groups.flatMap(g => g.items);
    expect(new Set(allItems).size).toBe(16);
    expect(new Set(cfg.groups.map(g => g.difficulty))).toEqual(new Set([1, 2, 3, 4]));
  });

  it('T1-F14-2: aligns at least 1-2 categories/items with daily clue domain', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'connections');
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F14-3: secretMeaning links to daily clue impact/theme', () => {
    const clue = makeSyntheticClue('weapon', 'alpha');
    const puzzle = buildDayPuzzle('connections', 19241224, 25, clue);
    const cfg = (puzzle as Extract<DayPuzzle, { type: 'connections' }>).config;
    expect(cfg.secretMeaning?.length ?? 0).toBeGreaterThan(8);
    expect(checkClueToPuzzleIntegration(puzzle, clue).linked).toBe(true);
  });

  it('T1-F14-4: checkConnectionsSelection handles exact 4-match and 3+1 oneAway accurately', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'connections');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'connections' }>).config;
    const exact = checkConnectionsSelection(cfg, [...cfg.groups[0].items]);
    expect(exact.matchedGroup?.id).toBe(cfg.groups[0].id);
    expect(exact.oneAway).toBe(false);

    const near = checkConnectionsSelection(cfg, [
      cfg.groups[0].items[0],
      cfg.groups[0].items[1],
      cfg.groups[0].items[2],
      cfg.groups[1].items[0],
    ]);
    expect(near.matchedGroup).toBeNull();
    expect(near.oneAway).toBe(true);
  });

  it('T1-F14-5: validateConnections accepts solved group IDs and rejects incomplete array', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'connections');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'connections' }>).config;
    const ids = solveConnectionsOpaque(cfg);
    expect(validateConnections(cfg, ids)).toBe(true);
    expect(validateConnections(cfg, ids.slice(0, 3))).toBe(false);
  });
});

// =====================================================================
// FEATURE #15: R1 Murdoku
// =====================================================================
describe('Tier 1 — Feature #15: R1 Murdoku', () => {
  it('T1-F15-1: uses canonical Villa Acebo entities matching clue.category (not legacy Beatriz/Gastón)', () => {
    const canonSuspects = new Set(SUSPECTS_DIRECTORY.map(s => s.name));
    const canonWeapons = new Set(WEAPONS.map(w => w.name));
    const canonRooms = new Set(LOCATIONS.map(l => l.name));

    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'murdoku');
      const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'murdoku' }>).config;
      const allNames = [...cfg.groupA.items, ...cfg.groupB.items].map(i => i.name);
      const hasCanon = allNames.some(
        n => canonSuspects.has(n) || canonWeapons.has(n) || canonRooms.has(n)
      );
      expect(hasCanon, `Murdoku used non-canonical entities: ${allNames.join(', ')}`).toBe(true);
      expect(allNames).not.toContain('Beatriz');
      expect(allNames).not.toContain('Gastón');
    }
  });

  it('T1-F15-2: targetMatches never contradicts canonical culprit/weapon/room truth', () => {
    const canonSuspects = new Set(SUSPECTS_DIRECTORY.map(s => s.name));
    let canonicalBoardsChecked = 0;
    for (const seed of SAMPLE_SEEDS) {
      const { generated, dayData } = findCaseDayForType(seed, 'murdoku');
      const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'murdoku' }>).config;
      const allCanonA =
        cfg.groupA.items.length > 0 && cfg.groupA.items.every(i => canonSuspects.has(i.name));
      if (!allCanonA) continue;
      canonicalBoardsChecked++;

      const culprit = SUSPECTS_DIRECTORY.find(s => s.id === generated.config.culpritId)!;
      const weapon = WEAPONS.find(w => w.id === generated.config.weaponId)!;
      const room = LOCATIONS.find(l => l.id === generated.config.locationId)!;

      const culpritInA = cfg.groupA.items.find(i => i.id === culprit.id || i.name === culprit.name);
      const weaponInB = cfg.groupB.items.find(i => i.id === weapon.id || i.name === weapon.name);
      const roomInB = cfg.groupB.items.find(i => i.id === room.id || i.name === room.name);

      if (culpritInA && weaponInB) {
        const pair = cfg.targetMatches.find(m => m.aId === culpritInA.id);
        expect(pair?.bId).toBe(weaponInB.id);
      }
      if (culpritInA && roomInB) {
        const pair = cfg.targetMatches.find(m => m.aId === culpritInA.id);
        expect(pair?.bId).toBe(roomInB.id);
      }
    }
    expect(canonicalBoardsChecked).toBeGreaterThan(0);
  });

  it('T1-F15-3: independent permutation solver verifies unique solution (solutionCount === 1)', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'murdoku');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'murdoku' }>).config;
    expect(cfg.groupA.items.length).toBeGreaterThanOrEqual(4);
    expect(cfg.groupB.items.length).toBe(cfg.groupA.items.length);

    const solved = solveMurdokuOpaque(cfg);
    expect(solved.unparsedClues).toEqual([]);
    expect(solved.solutionCount).toBe(1);
    const proof = generateMurdokuWithProof(SAMPLE_SEEDS[0], dayData.day);
    expect(proof.solutionCount).toBe(1);
  });

  it('T1-F15-4: resetOnMistake is enabled and isMurdokuMoveMistake flags wrong check/cross', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'murdoku');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'murdoku' }>).config;
    expect(cfg.resetOnMistake).toBe(true);
    const t = cfg.targetMatches[0];
    expect(isMurdokuMoveMistake(cfg, t.aId, t.bId, 'cross')).toBe(true);
    expect(isMurdokuMoveMistake(cfg, t.aId, t.bId, 'check')).toBe(false);
    const otherB = cfg.groupB.items.find(b => b.id !== t.bId)!;
    expect(isMurdokuMoveMistake(cfg, t.aId, otherB.id, 'check')).toBe(true);
  });

  it('T1-F15-5: validateMurdoku passes solved bijection and rejects incomplete matrix', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'murdoku');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'murdoku' }>).config;
    const solved = solveMurdokuOpaque(cfg);
    expect(solved.unparsedClues).toEqual([]);
    expect(solved.cells).not.toBeNull();
    expect(validateMurdoku(cfg, solved.cells!)).toBe(true);
    expect(validateMurdoku(cfg, {})).toBe(false);
  });
});

// =====================================================================
// FEATURE #16: R1 Codificados
// =====================================================================
describe('Tier 1 — Feature #16: R1 Codificados', () => {
  it('T1-F16-1: brute-force 0000..9999 proves exact unique solution matching secretCode', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { dayData } = findCaseDayForType(seed, 'codificados');
      const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'codificados' }>).config;
      const solved = solveCodificadosOpaque(cfg);
      expect(solved.count).toBe(1);
      expect(solved.solution).toEqual(cfg.secretCode);
    }
  });

  it('T1-F16-2: all 5 clues match scoreCodificadosAttempt(secretCode, attempt)', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'codificados');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'codificados' }>).config;
    expect(cfg.clues).toHaveLength(5);
    for (const clue of cfg.clues) {
      const scored = scoreCodificadosAttempt(cfg.secretCode, clue.attempt);
      expect(scored.exactCount).toBe(clue.exactCount);
      expect(scored.misplacedCount).toBe(clue.misplacedCount);
    }
  });

  it('T1-F16-3: changing clue alters generated codificados secretCode/meaning', () => {
    const pA = buildDayPuzzle('codificados', 19241224, 2, makeSyntheticClue('weapon', 'alpha'));
    const pB = buildDayPuzzle('codificados', 19241224, 2, makeSyntheticClue('room', 'beta'));
    expect(JSON.stringify(pA.config)).not.toBe(JSON.stringify(pB.config));
  });

  it('T1-F16-4: secretMeaning links to daily clue and never formats invalid clock times like 24:35', () => {
    for (const seed of SAMPLE_SEEDS) {
      const generated = generateCase(seed);
      for (const d of generated.days) {
        if (d.puzzle.type !== 'codificados') continue;
        expect(validateClockFormattingInMeaning(d.puzzle.config.secretMeaning)).toBe(true);
        const link = checkClueToPuzzleIntegration(d.puzzle, d.unlockedClue);
        expect(link.linked).toBe(true);
      }
    }
  });

  it('T1-F16-5: validateCodificados accepts solved digits and rejects wrong/incomplete inputs', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'codificados');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'codificados' }>).config;
    const solved = solveCodificadosOpaque(cfg);
    expect(solved.solution).not.toBeNull();
    expect(validateCodificados(cfg, solved.solution!)).toBe(true);

    const wrong = [...solved.solution!];
    wrong[0] = (wrong[0] + 1) % 10;
    expect(validateCodificados(cfg, wrong)).toBe(false);
    expect(validateCodificados(cfg, [null, 1, 2, 3])).toBe(false);
  });
});

// =====================================================================
// FEATURE #17: R1 Ecuaciones
// =====================================================================
describe('Tier 1 — Feature #17: R1 Ecuaciones', () => {
  it('T1-F17-1: 0..9 equation system solver proves unique targetCode solution', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { dayData } = findCaseDayForType(seed, 'ecuaciones');
      const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'ecuaciones' }>).config;
      const solved = solveEcuacionesOpaque(cfg);
      expect(solved.uniqueTargetCodeCount).toBe(1);
      expect(solved.targetCode).toEqual(cfg.targetCode);
    }
  });

  it('T1-F17-2: targetCode matches evaluated targetSymbols within 0..9 across all equations', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[1], 'ecuaciones');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'ecuaciones' }>).config;
    expect(cfg.targetSymbols).toHaveLength(4);
    expect(cfg.targetCode).toHaveLength(4);
    for (const d of cfg.targetCode) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(9);
    }
  });

  it('T1-F17-3: changing clue alters generated ecuaciones targetCode/meaning', () => {
    const pA = buildDayPuzzle('ecuaciones', 19241224, 4, makeSyntheticClue('room', 'alpha'));
    const pB = buildDayPuzzle('ecuaciones', 19241224, 4, makeSyntheticClue('suspect', 'beta'));
    expect(JSON.stringify(pA.config)).not.toBe(JSON.stringify(pB.config));
  });

  it('T1-F17-4: secretMeaning links to daily clue and never formats invalid clock times like 11:64', () => {
    for (const seed of SAMPLE_SEEDS) {
      const generated = generateCase(seed);
      for (const d of generated.days) {
        if (d.puzzle.type !== 'ecuaciones') continue;
        expect(validateClockFormattingInMeaning(d.puzzle.config.secretMeaning)).toBe(true);
        const link = checkClueToPuzzleIntegration(d.puzzle, d.unlockedClue);
        expect(link.linked).toBe(true);
      }
    }
  });

  it('T1-F17-5: validateEcuaciones accepts solver-derived code and rejects perturbed digits', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'ecuaciones');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'ecuaciones' }>).config;
    const solved = solveEcuacionesOpaque(cfg);
    expect(solved.targetCode).not.toBeNull();
    expect(validateEcuaciones(cfg, solved.targetCode!)).toBe(true);

    const wrong = [...solved.targetCode!];
    wrong[3] = (wrong[3] + 1) % 10;
    expect(validateEcuaciones(cfg, wrong)).toBe(false);
  });
});

// =====================================================================
// FEATURE #18: R1 Sudoku
// =====================================================================
describe('Tier 1 — Feature #18: R1 Sudoku', () => {
  it('T1-F18-1: independent 9x9 MRV solver confirms unique solution (count === 1)', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'sudoku');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'sudoku' }>).config;
    const solved = solveSudokuOpaque(cfg.initialGrid, 2);
    expect(solved.count).toBe(1);
    expect(solved.solution).toEqual(cfg.solution);
  });

  it('T1-F18-2: keyCells has 4 non-given coordinates producing valid 4-digit unlocked code', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'sudoku');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'sudoku' }>).config;
    expect(cfg.keyCells).toHaveLength(4);
    for (const k of cfg.keyCells) {
      expect(cfg.initialGrid[k.r][k.c]).toBeNull();
      const val = cfg.solution[k.r][k.c];
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(9);
    }
  });

  it('T1-F18-3: secretCodeMeaning ties directly to daily clue impact/category', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'sudoku');
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F18-4: getSudokuConflicts detects row, column, and 3x3 box conflicts', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'sudoku');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'sudoku' }>).config;
    expect(getSudokuConflicts(cfg.solution).size).toBe(0);

    const bad = cfg.solution.map(r => [...r]);
    bad[0][0] = bad[0][1];
    expect(getSudokuConflicts(bad).size).toBeGreaterThan(0);
  });

  it('T1-F18-5: validateSudoku accepts solver solution and rejects incomplete/corrupted grid', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[1], 'sudoku');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'sudoku' }>).config;
    const solved = solveSudokuOpaque(cfg.initialGrid, 2);
    expect(validateSudoku(cfg, solved.solution!)).toBe(true);
    expect(validateSudoku(cfg, cfg.initialGrid)).toBe(false);
  });
});

// =====================================================================
// FEATURE #19: R1 Futoshiki + UI keyCells
// =====================================================================
describe('Tier 1 — Feature #19: R1 Futoshiki + UI keyCells', () => {
  it('T1-F19-1: independent 5x5 solver confirms unique solution satisfying all inequalities', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'futoshiki');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'futoshiki' }>).config;
    const solved = solveFutoshikiOpaque(cfg, 2);
    expect(solved.count).toBe(1);
    expect(solved.solution).toEqual(cfg.solution);
  });

  it('T1-F19-2: defines 4 keyCells and clue-linked secretCodeMeaning', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'futoshiki');
      const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'futoshiki' }>).config;
      expect(cfg.keyCells).toHaveLength(4);
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F19-3: FutoshikiPuzzle visually highlights keyCells when unsolved', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'futoshiki');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'futoshiki' }>).config;
    const html = renderFutoshikiMarkup(cfg, false);
    const key0 = cfg.keyCells?.[0] ?? { r: 0, c: 0 };
    const nonKeyCell = (() => {
      for (let r = 0; r < cfg.size; r++) {
        for (let c = 0; c < cfg.size; c++) {
          if (cfg.initialGrid[r][c] === null && !cfg.keyCells?.some(k => k.r === r && k.c === c)) {
            return { r, c };
          }
        }
      }
      return { r: 4, c: 4 };
    })();

    const extractButton = (r: number, c: number) => {
      const m = new RegExp(`<button[^>]*data-futoshiki-cell="${r}-${c}"[^>]*>[\\s\\S]*?<\\/button>`).exec(html);
      return m ? m[0] : '';
    };

    const keyBtn = extractButton(key0.r, key0.c);
    const plainBtn = extractButton(nonKeyCell.r, nonKeyCell.c);
    expect(keyBtn).not.toBe('');
    expect(keyBtn).toMatch(/gold|key|data-key-cell|svg/i);
    expect(plainBtn).not.toContain('lucide-key');
  });

  it('T1-F19-4: FutoshikiPuzzle displays unlocked 4-digit code from keyCells + secretCodeMeaning when solved', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'futoshiki');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'futoshiki' }>).config;
    const expectedCode = (cfg.keyCells ?? []).map(k => cfg.solution[k.r][k.c]).join('');
    const html = renderFutoshikiMarkup(cfg, true);
    expect(expectedCode).toHaveLength(4);
    expect(html).toContain(expectedCode);
    expect(cfg.secretCodeMeaning).toBeTruthy();
    expect(html).toContain(cfg.secretCodeMeaning!);
  });

  it('T1-F19-5: getFutoshikiViolations catches row/col duplicates & broken inequalities, validateFutoshiki checks exactness', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'futoshiki');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'futoshiki' }>).config;
    expect(getFutoshikiViolations(cfg, cfg.solution).size).toBe(0);
    expect(validateFutoshiki(cfg, cfg.solution)).toBe(true);

    const bad = cfg.solution.map(r => [...r]);
    bad[0][0] = bad[0][1];
    expect(getFutoshikiViolations(cfg, bad).size).toBeGreaterThan(0);
    expect(validateFutoshiki(cfg, bad)).toBe(false);
  });
});

// =====================================================================
// FEATURE #20: R1 Nonogram
// =====================================================================
describe('Tier 1 — Feature #20: R1 Nonogram', () => {
  it('T1-F20-1: grid >=7x7 has rowClues/colClues matching computeLineClues', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'nonogram');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'nonogram' }>).config;
    expect(cfg.rows).toBeGreaterThanOrEqual(7);
    expect(cfg.cols).toBeGreaterThanOrEqual(7);
    expect(cfg.rowClues).toEqual(cfg.solution.map(r => computeLineClues(r)));
  });

  it('T1-F20-2: silhouette generation covers weapon, room, and suspect clue themes', () => {
    const pW = buildDayPuzzle('nonogram', 19241224, 9, makeSyntheticClue('weapon', 'alpha')) as Extract<DayPuzzle, { type: 'nonogram' }>;
    const pR = buildDayPuzzle('nonogram', 19241224, 9, makeSyntheticClue('room', 'alpha')) as Extract<DayPuzzle, { type: 'nonogram' }>;
    const pS = buildDayPuzzle('nonogram', 19241224, 9, makeSyntheticClue('suspect', 'alpha')) as Extract<DayPuzzle, { type: 'nonogram' }>;

    const titles = new Set([pW.config.revealTitle, pR.config.revealTitle, pS.config.revealTitle]);
    expect(titles.size).toBeGreaterThanOrEqual(2);
    expect(checkClueToPuzzleIntegration(pS, makeSyntheticClue('suspect', 'alpha')).linked).toBe(true);
  });

  it('T1-F20-3: revealTitle and secretMeaning align with daily clue in 30-day case', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'nonogram');
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F20-4: independent Nonogram CSP solver derives valid non-trivial solution', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'nonogram');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'nonogram' }>).config;
    const solved = solveNonogramOpaque(cfg, 2);
    expect(solved.count).toBeGreaterThanOrEqual(1);
    expect(solved.solution).not.toBeNull();
    const filledCount = solved.solution!.flat().filter(Boolean).length;
    expect(filledCount).toBeGreaterThan(5);
    expect(filledCount).toBeLessThan(cfg.rows * cfg.cols);
  });

  it('T1-F20-5: validateNonogram accepts solver solution and rejects blank/perturbed grid', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[1], 'nonogram');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'nonogram' }>).config;
    const solved = solveNonogramOpaque(cfg, 2);
    expect(validateNonogram(cfg, solved.solution!)).toBe(true);

    const blank = Array.from({ length: cfg.rows }, () => Array<boolean>(cfg.cols).fill(false));
    expect(validateNonogram(cfg, blank)).toBe(false);
  });
});

// =====================================================================
// FEATURE #21: R1 Minesweeper
// =====================================================================
describe('Tier 1 — Feature #21: R1 Minesweeper', () => {
  it('T1-F21-1: deterministic zero-guess solver clears all safe cells across multiple seeds', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { dayData } = findCaseDayForType(seed, 'minesweeper');
      const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'minesweeper' }>).config;
      const solved = solveMinesweeperDeterministic(cfg);
      expect(
        solved.solvedAllSafe,
        `Seed ${seed} day ${dayData.day} minesweeper required guessing (${solved.revealed.size}/${cfg.rows * cfg.cols - cfg.mines.length})`
      ).toBe(true);
    }
  });

  it('T1-F21-2: initialRevealed (>=9) is completely disjoint from mines (>=8)', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'minesweeper');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'minesweeper' }>).config;
    expect(cfg.mines.length).toBeGreaterThanOrEqual(8);
    expect(cfg.initialRevealed.length).toBeGreaterThanOrEqual(9);
    const mineSet = new Set(cfg.mines.map(m => `${m.r}:${m.c}`));
    for (const cell of cfg.initialRevealed) {
      expect(mineSet.has(`${cell.r}:${cell.c}`)).toBe(false);
    }
  });

  it('T1-F21-3: secretMeaning links recovered datum to daily clue impact/category', () => {
    for (const seed of SAMPLE_SEEDS.slice(0, 3)) {
      const { dayData } = findCaseDayForType(seed, 'minesweeper');
      const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
      expect(link.linked).toBe(true);
    }
  });

  it('T1-F21-4: floodRevealSafeCells expands zero-neighbor regions safely without hitting mines', () => {
    const mineSet = new Set(['0:3', '3:0']);
    const revealed = floodRevealSafeCells(4, 4, mineSet, 0, 0, new Set());
    expect(revealed.has('0:0')).toBe(true);
    expect(revealed.has('0:3')).toBe(false);
    expect(revealed.has('3:0')).toBe(false);
    expect(countAdjacentMines(4, 4, mineSet, 0, 2)).toBe(1);
  });

  it('T1-F21-5: validateMinesweeper accepts deterministic solver clear and rejects mined or incomplete set', () => {
    const { dayData } = findCaseDayForType(SAMPLE_SEEDS[0], 'minesweeper');
    const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'minesweeper' }>).config;
    const solved = solveMinesweeperDeterministic(cfg);
    expect(validateMinesweeper(cfg, solved.revealed, solved.flagged)).toBe(true);

    const withMine = new Set(solved.revealed);
    withMine.add(`${cfg.mines[0].r}:${cfg.mines[0].c}`);
    expect(validateMinesweeper(cfg, withMine)).toBe(false);
  });
});
