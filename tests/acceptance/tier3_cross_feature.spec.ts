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
  getCaseForSeed,
  verifyCaseVerdict,
} from '../../src/engine/caseGenerator';
import { toPuzzleText } from '../../src/engine/clueLabels';
import {
  describeRoomPredicate,
  describeSuspectPredicate,
  describeWeaponPredicate,
} from '../../src/engine/clueWriter';
import { DAY_CALENDAR } from '../../src/engine/narrativeGenerator';
import { buildDayPuzzle } from '../../src/engine/puzzleFactory';
import { mulberry32 } from '../../src/engine/puzzles/prng';
import { computeSuspectStatus, isActUnlocked, isDayUnlockedByDoors, useGameStore } from '../../src/store/useGameStore';
import type { Clue, CluePredicate, DayPuzzle } from '../../src/types/game';
import {
  ALL_14_PUZZLE_TYPES,
  NUMERIC_ABSTRACT_TYPES,
  SAMPLE_SEEDS,
  WORD_DEDUCTION_TYPES,
  checkClueToPuzzleIntegration,
  findRawClueDefects,
  renderDossierMarkup,
  renderFutoshikiMarkup,
  solveDayPuzzleOpaque,
  validateClockFormattingInMeaning,
} from './helpers';

function makeCategoryClue(category: 'suspect' | 'weapon' | 'room', day: number): Clue {
  if (category === 'weapon') {
    return {
      id: `cf-w-${day}`,
      day,
      text: 'El dictamen identifica residuos químicos sobre el filo cortante.',
      category: 'weapon',
      impact: 'Residuo del arma: residuos químicos',
      keyphrase: 'ARMA CON RESIDUOS QUIMICOS',
      predicates: [{ kind: 'weaponAttr', field: 'forensicTrace', op: 'eq', value: 'quimicos' }],
    };
  }
  if (category === 'room') {
    return {
      id: `cf-r-${day}`,
      day,
      text: 'En las suelas aparecieron partículas de mármol blanco y polen.',
      category: 'room',
      impact: 'Suelo confirmado: mármol del comedor',
      keyphrase: 'SUELO DE MARMOL COMEDOR',
      predicates: [{ kind: 'roomAttr', field: 'surfaceMaterial', op: 'eq', value: 'marmol' }],
    };
  }
  return {
    id: `cf-s-${day}`,
    day,
    text: 'El análisis microscópico recogió restos de tinta ferrogálica.',
    category: 'suspect',
    impact: 'Rastro forense hallado: tinta ferrogálica',
    keyphrase: 'RASTRO DE TINTA FERROGALICA',
    predicates: [{ kind: 'suspectAttr', field: 'forensicTrace', op: 'eq', value: 'tinta' }],
  };
}

describe('Tier 3 — Cross-Feature Pairwise Combinations', () => {
  it('T3-01: PUZZLE_SCHEDULE x CLUE_SCHEDULE x DAY_CALENDAR full 30-day coherence across 5 seeds', { timeout: 30000 }, () => {
    expect(PUZZLE_SCHEDULE).toHaveLength(TOTAL_DAYS);
    for (const seed of SAMPLE_SEEDS) {
      const c = generateCase(seed);
      const seedSchedule = buildPuzzleScheduleForSeed(seed);
      for (let i = 0; i < TOTAL_DAYS; i++) {
        const d = c.days[i];
        expect(d.puzzle.type).toBe(seedSchedule[i]);
        expect(d.title).toBe(DAY_CALENDAR[i].title);
        expect(d.act).toBe(Math.floor(i / DAYS_PER_ACT) + 1);
        const dimMap = { S: 'suspect', W: 'weapon', R: 'room' } as const;
        expect(d.unlockedClue.category).toBe(dimMap[CLUE_SCHEDULE[i]]);

        const solved = solveDayPuzzleOpaque(d.puzzle);
        expect(solved.valid, `Seed ${seed} day ${d.day} (${d.puzzle.type}) failed solve: ${solved.details}`).toBe(true);
        const link = checkClueToPuzzleIntegration(d.puzzle, d.unlockedClue);
        expect(link.linked, `Seed ${seed} day ${d.day} (${d.puzzle.type}) lacked clue link`).toBe(true);
        expect(link.leaksVerbatimClueText).toBe(false);
      }
    }
  });

  it('T3-02: Act progression (5 acts x 6 days) x progressive funnel x actCrimesGenerator x isActUnlocked', () => {
    const c = generateCase(SAMPLE_SEEDS[0]);
    const completed: number[] = [];

    for (let act = 1; act <= 5; act++) {
      expect(isActUnlocked(act, completed)).toBe(true);
      if (act < 5) {
        expect(isActUnlocked(act + 1, completed)).toBe(false);
        expect(isDayUnlockedByDoors(act * 6 + 1, completed)).toBe(false);
      }

      const startDay = (act - 1) * 6 + 1;
      const endDay = act * 6;
      for (let day = startDay; day <= endDay; day++) {
        completed.push(day);
      }

      const evalAtBoundary = evaluateCaseClues(c.days.slice(0, endDay).map(d => d.unlockedClue));
      if (act < 5) {
        expect(evalAtBoundary.matchingSuspectIds.length).toBeGreaterThan(1);
      } else {
        expect(evalAtBoundary.matchingSuspectIds).toEqual([c.config.culpritId]);
        expect(evalAtBoundary.matchingWeaponIds).toEqual([c.config.weaponId]);
        expect(evalAtBoundary.matchingRoomIds).toEqual([c.config.locationId]);
      }

      const actFile = c.acts[act - 1];
      expect(actFile.victimId).not.toBe(c.config.culpritId);
      expect(actFile.weaponId).not.toBe(c.config.weaponId);
      expect(actFile.sceneLocationId).not.toBe(c.config.locationId);
    }
  });

  it('T3-03: toPuzzleText x clueWriter x puzzleFactory across all 14 types with problematic predicates', () => {
    const rng = mulberry32(19241224);
    const preds: { category: 'suspect' | 'weapon' | 'room'; pred: CluePredicate }[] = [
      { category: 'suspect', pred: { kind: 'suspectAttr', field: 'visualMarker', op: 'eq', value: 'ninguno' } },
      { category: 'suspect', pred: { kind: 'suspectAttr', field: 'forensicTrace', op: 'eq', value: 'quimicos' } },
      { category: 'room', pred: { kind: 'roomAttr', field: 'lockType', op: 'eq', value: 'combinacion_hierro' } },
      { category: 'weapon', pred: { kind: 'weaponAttr', field: 'forensicTrace', op: 'eq', value: 'almendras' } },
    ];

    for (const item of preds) {
      const desc =
        item.category === 'suspect'
          ? describeSuspectPredicate(item.pred, rng)
          : item.category === 'weapon'
            ? describeWeaponPredicate(item.pred, rng)
            : describeRoomPredicate(item.pred, rng);
      expect(findRawClueDefects(desc)).toEqual([]);
      const normalizedKey = toPuzzleText(desc.keyphrase);
      expect(normalizedKey).not.toMatch(/_/);

      const clue: Clue = {
        id: `t3-${item.category}`,
        day: 8,
        text: desc.text,
        category: item.category,
        impact: desc.impact,
        keyphrase: desc.keyphrase,
        predicates: [item.pred],
      };

      for (const type of ALL_14_PUZZLE_TYPES) {
        const puzzle = buildDayPuzzle(type, 19241224, 8, clue);
        const solved = solveDayPuzzleOpaque(puzzle);
        expect(solved.valid, `Failed ${type} on ${item.pred.kind}: ${solved.details}`).toBe(true);
        expect(checkClueToPuzzleIntegration(puzzle, clue).linked).toBe(true);
      }
    }
  });

  it('T3-04: all 8 word/deduction puzzle types x all 3 clue categories (S, W, R)', () => {
    for (const type of WORD_DEDUCTION_TYPES) {
      for (const cat of ['suspect', 'weapon', 'room'] as const) {
        const clue = makeCategoryClue(cat, 10);
        const puzzle = buildDayPuzzle(type, 20261224, 10, clue);
        const solved = solveDayPuzzleOpaque(puzzle);
        expect(solved.valid, `${type} x ${cat} invalid: ${solved.details}`).toBe(true);
        if (type !== 'encajados') {
          expect(solved.unique, `${type} x ${cat} non-unique: ${solved.details}`).toBe(true);
        }
        expect(checkClueToPuzzleIntegration(puzzle, clue).linked, `${type} x ${cat} unlinked`).toBe(true);
      }
    }
  });

  it('T3-05: all 6 numeric/abstract puzzle types x all 3 clue categories (S, W, R)', () => {
    for (const type of NUMERIC_ABSTRACT_TYPES) {
      for (const cat of ['suspect', 'weapon', 'room'] as const) {
        const clue = makeCategoryClue(cat, 16);
        const puzzle = buildDayPuzzle(type, 20261224, 16, clue);
        const solved = solveDayPuzzleOpaque(puzzle);
        expect(solved.valid, `${type} x ${cat} invalid: ${solved.details}`).toBe(true);
        if (type !== 'encajados') {
          expect(solved.unique, `${type} x ${cat} non-unique: ${solved.details}`).toBe(true);
        }
        expect(checkClueToPuzzleIntegration(puzzle, clue).linked, `${type} x ${cat} unlinked`).toBe(true);
        if (puzzle.type === 'codificados' || puzzle.type === 'ecuaciones') {
          expect(validateClockFormattingInMeaning(puzzle.config.secretMeaning)).toBe(true);
        }
      }
    }
  });

  it('T3-06: evaluateCaseClues x DetectiveDossier store x verifyCaseVerdict across 0, 6, 12, 18, 24, 30 days', () => {
    const html0 = renderDossierMarkup({ seed: SAMPLE_SEEDS[0] });
    expect(html0).toContain('Cuaderno del Detective — Villa Acebo');

    const store = useGameStore.getState();
    store.startNewCase(SAMPLE_SEEDS[0]);
    const c = useGameStore.getState().activeCase;

    for (const count of [0, 6, 12, 18, 24, 30]) {
      const clues = c.days.slice(0, count).map(d => d.unlockedClue);
      const ev = evaluateCaseClues(clues);
      const activeCount = SUSPECTS_DIRECTORY.filter(
        s => !computeSuspectStatus(s, [], clues, c, []).isEliminated
      ).length;
      expect(activeCount).toBe(ev.matchingSuspectIds.length);
      expect(ev.matchingWeaponIds.length).toBeLessThanOrEqual(WEAPONS.length);
      expect(ev.matchingRoomIds.length).toBeLessThanOrEqual(LOCATIONS.length);

      if (count === 30) {
        const verdict = verifyCaseVerdict(
          c.config,
          ev.matchingSuspectIds[0],
          ev.matchingWeaponIds[0],
          ev.matchingRoomIds[0]
        );
        expect(verdict.isCorrect).toBe(true);
        expect(verdict.correctCount).toBe(3);
      }
    }
  });

  it('T3-07: getCaseForSeed cache eviction (>8 distinct seeds) preserves exact generateCase parity', () => {
    const seeds = Array.from({ length: 12 }, (_, i) => 7000 + i * 101);
    const baselines = seeds.map(s => generateCase(s));
    const cachedPass1 = seeds.map(s => getCaseForSeed(s));
    const cachedPass2 = [...seeds].reverse().map(s => getCaseForSeed(s)).reverse();

    for (let i = 0; i < seeds.length; i++) {
      expect(cachedPass1[i].config).toEqual(baselines[i].config);
      expect(cachedPass2[i].config).toEqual(baselines[i].config);
      expect(cachedPass2[i].days.map(d => d.unlockedClue.id)).toEqual(
        baselines[i].days.map(d => d.unlockedClue.id)
      );
    }
  });

  it('T3-08: FutoshikiPuzzle SSR x generateCase clue linkage on real Futoshiki campaign days', () => {
    const c = generateCase(SAMPLE_SEEDS[0]);
    const futoshikiDays = c.days.filter(d => d.puzzle.type === 'futoshiki');
    expect(futoshikiDays.length).toBeGreaterThanOrEqual(2);
    for (const dayData of futoshikiDays) {
      const cfg = (dayData.puzzle as Extract<DayPuzzle, { type: 'futoshiki' }>).config;
      const code = (cfg.keyCells ?? []).map(k => cfg.solution[k.r][k.c]).join('');
      const solvedHtml = renderFutoshikiMarkup(cfg, true);
      expect(solvedHtml).toContain(code);
      expect(cfg.secretCodeMeaning).toBeTruthy();
      expect(solvedHtml).toContain(cfg.secretCodeMeaning!);
      expect(checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue).linked).toBe(true);
    }
  });

  it('T3-09: buildMurderNarrative x evaluateCaseClues consistency across 5 seeds', () => {
    for (const seed of SAMPLE_SEEDS) {
      const c = generateCase(seed);
      const ev = evaluateCaseClues(c.days.map(d => d.unlockedClue));
      const culprit = SUSPECTS_DIRECTORY.find(s => s.id === ev.matchingSuspectIds[0])!;
      const weapon = WEAPONS.find(w => w.id === ev.matchingWeaponIds[0])!;
      const room = LOCATIONS.find(r => r.id === ev.matchingRoomIds[0])!;

      expect(c.murderNarrative.summary).toContain(culprit.name);
      expect(c.murderNarrative.summary).toContain(weapon.name);
      expect(c.murderNarrative.summary).toContain(room.name);
      expect(c.murderNarrative.epilogue).toContain(culprit.name);
    }
  });

  it('T3-10: poison weapons x handedness clues x puzzleFactory never leak "golpea" into puzzles', () => {
    const poisonIdx = WEAPONS.findIndex(w => w.id === 'cianuro');
    const c = generateCase(314159, 4, poisonIdx, 1);
    for (const d of c.days) {
      if (d.unlockedClue.category === 'suspect') {
        expect(d.unlockedClue.text.toLowerCase()).not.toMatch(/\bgolpea\b/);
      }
      expect(findRawClueDefects(d.unlockedClue)).toEqual([]);
      expect(checkClueToPuzzleIntegration(d.puzzle, d.unlockedClue).linked).toBe(true);
    }
  });

  it('T3-11: Murdoku x generateCase non-contradiction across all Murdoku days in 5 seeds', () => {
    const canonSuspects = new Set(SUSPECTS_DIRECTORY.map(s => s.name));
    let canonicalBoardsChecked = 0;
    for (const seed of SAMPLE_SEEDS) {
      const c = generateCase(seed);
      const culprit = SUSPECTS_DIRECTORY.find(s => s.id === c.config.culpritId)!;
      const weapon = WEAPONS.find(w => w.id === c.config.weaponId)!;
      const room = LOCATIONS.find(r => r.id === c.config.locationId)!;

      for (const d of c.days) {
        if (d.puzzle.type !== 'murdoku') continue;
        const cfg = d.puzzle.config;
        const allCanonA =
          cfg.groupA.items.length > 0 && cfg.groupA.items.every(i => canonSuspects.has(i.name));
        if (!allCanonA) continue;
        canonicalBoardsChecked++;

        const cMatch = cfg.groupA.items.find(i => i.id === culprit.id || i.name === culprit.name);
        const wMatch = cfg.groupB.items.find(i => i.id === weapon.id || i.name === weapon.name);
        const rMatch = cfg.groupB.items.find(i => i.id === room.id || i.name === room.name);
        if (cMatch && wMatch) {
          expect(cfg.targetMatches.find(m => m.aId === cMatch.id)?.bId).toBe(wMatch.id);
        }
        if (cMatch && rMatch) {
          expect(cfg.targetMatches.find(m => m.aId === cMatch.id)?.bId).toBe(rMatch.id);
        }
      }
    }
    expect(canonicalBoardsChecked).toBeGreaterThan(0);
  });

  it('T3-12: useGameStore full progression x startNewCase reset isolation', () => {
    const store = useGameStore.getState();
    store.startNewCase(19241224);
    const c1 = useGameStore.getState().activeCase;
    for (let i = 0; i < 6; i++) {
      useGameStore.getState().markDayCompleted(i + 1, c1.days[i].unlockedClue);
    }
    expect(useGameStore.getState().completedDays).toHaveLength(6);
    expect(useGameStore.getState().unlockedClues).toHaveLength(6);

    store.startNewCase(20261224);
    const state2 = useGameStore.getState();
    expect(state2.caseSeed).toBe(20261224);
    expect(state2.completedDays).toEqual([]);
    expect(state2.unlockedClues).toEqual([]);
    expect(state2.openedDoors).toEqual([]);
    expect(state2.activeCase.config).not.toEqual(c1.config);
  });
});
