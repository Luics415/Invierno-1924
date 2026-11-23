import { describe, expect, it } from 'vitest';
import { LOCATIONS, WEAPONS } from '../../src/data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../../src/data/suspectsDirectory';
import {
  TOTAL_DAYS,
  evaluateCaseClues,
  generateCase,
  getCaseForSeed,
  verifyCaseVerdict,
} from '../../src/engine/caseGenerator';
import { computeSuspectStatus, isActUnlocked, useGameStore } from '../../src/store/useGameStore';
import type { GeneratedCase } from '../../src/types/game';
import {
  checkClueToPuzzleIntegration,
  findRawClueDefects,
  renderDossierMarkup,
  renderFutoshikiMarkup,
  solveDayPuzzleOpaque,
  validateClockFormattingInMeaning,
} from './helpers';

function runFull30DayPlaythrough(generated: GeneratedCase, label: string) {
  expect(generated.days).toHaveLength(TOTAL_DAYS);
  expect(generated.acts).toHaveLength(5);

  const culprit = SUSPECTS_DIRECTORY.find(s => s.id === generated.config.culpritId)!;
  const weapon = WEAPONS.find(w => w.id === generated.config.weaponId)!;
  const room = LOCATIONS.find(l => l.id === generated.config.locationId)!;

  const unlockedClues = [];
  const completedDays: number[] = [];
  const openedDoors: number[] = [1];
  const seenPuzzleTypes = new Set<string>();

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const dayData = generated.days[i];
    expect(dayData.day).toBe(i + 1);
    const expectedAct = Math.floor(i / 6) + 1;
    expect(dayData.act).toBe(expectedAct);
    if (expectedAct >= 2 && dayData.day === (expectedAct - 1) * 6 + 1) {
      expect(isActUnlocked(expectedAct, completedDays)).toBe(true);
      openedDoors.push(expectedAct);
    }

    // 1. Independently solve the day's actual puzzle (all 14 types across 30 days)
    const solved = solveDayPuzzleOpaque(dayData.puzzle);
    expect(
      solved.valid,
      `[${label}] Day ${dayData.day} (${dayData.puzzle.type}) failed solve: ${solved.details}`
    ).toBe(true);
    if (dayData.puzzle.type !== 'encajados') {
      expect(
        solved.unique,
        `[${label}] Day ${dayData.day} (${dayData.puzzle.type}) non-unique/blind-guess: ${solved.details}`
      ).toBe(true);
    }
    seenPuzzleTypes.add(dayData.puzzle.type);

    if (dayData.puzzle.type === 'codificados' || dayData.puzzle.type === 'ecuaciones') {
      expect(validateClockFormattingInMeaning(dayData.puzzle.config.secretMeaning)).toBe(true);
    }

    // 2. Verify real R1 clue-to-puzzle linkage & no verbatim leakage
    const link = checkClueToPuzzleIntegration(dayData.puzzle, dayData.unlockedClue);
    expect(
      link.linked,
      `[${label}] Day ${dayData.day} (${dayData.puzzle.type}) lacks R1 clue link`
    ).toBe(true);
    expect(link.leaksVerbatimClueText).toBe(false);

    // 3. Verify R3 clue clarity
    const defects = findRawClueDefects(dayData.unlockedClue);
    expect(defects, `[${label}] Day ${dayData.day} clue defects: ${defects.join('; ')}`).toEqual([]);

    // 4. Accumulate clue & check progressive narrowing + zero contradiction
    unlockedClues.push(dayData.unlockedClue);
    completedDays.push(dayData.day);

    const ev = evaluateCaseClues(unlockedClues);
    expect(ev.matchingSuspectIds).toContain(culprit.id);
    expect(ev.matchingWeaponIds).toContain(weapon.id);
    expect(ev.matchingRoomIds).toContain(room.id);

    // Secondary act victims must never eliminate the true culprit
    const culpritStatus = computeSuspectStatus(culprit, [], unlockedClues, generated, openedDoors);
    expect(culpritStatus.isEliminated).toBe(false);

    if (dayData.day <= 29) {
      expect(
        ev.matchingSuspectIds.length,
        `[${label}] Suspect pool collapsed early at Day ${dayData.day}`
      ).toBeGreaterThan(1);
    }
    if (dayData.day <= 25) {
      expect(
        ev.matchingWeaponIds.length,
        `[${label}] Weapon pool collapsed early at Day ${dayData.day}`
      ).toBeGreaterThan(1);
    }
    if (dayData.day <= 27) {
      expect(
        ev.matchingRoomIds.length,
        `[${label}] Room pool collapsed early at Day ${dayData.day}`
      ).toBeGreaterThan(1);
    }
  }

  expect(seenPuzzleTypes.size).toBe(14);

  // 5. Final Day 30 deduction & verdict verification
  const finalEval = evaluateCaseClues(unlockedClues);
  expect(finalEval.matchingSuspectIds).toEqual([culprit.id]);
  expect(finalEval.matchingWeaponIds).toEqual([weapon.id]);
  expect(finalEval.matchingRoomIds).toEqual([room.id]);

  const win = verifyCaseVerdict(
    generated.config,
    finalEval.matchingSuspectIds[0],
    finalEval.matchingWeaponIds[0],
    finalEval.matchingRoomIds[0]
  );
  expect(win.isCorrect).toBe(true);
  expect(win.correctCount).toBe(3);

  const wrongSuspect = SUSPECTS_DIRECTORY.find(s => s.id !== culprit.id)!;
  const loss = verifyCaseVerdict(generated.config, wrongSuspect.id, weapon.id, room.id);
  expect(loss.isCorrect).toBe(false);
  expect(loss.correctCount).toBe(2);
}

describe('Tier 4 — Real-World Full 30-Day Detective Playthrough Scenarios', () => {
  it('T4-S1: Standard canonical seed (19241224) full 30-day playthrough solving all 14 games', { timeout: 30000 }, () => {
    const generated = getCaseForSeed(19241224);
    runFull30DayPlaythrough(generated, 'T4-S1:19241224');
  });

  it('T4-S2: Rare-attribute culprit (NB + visualMarker=ninguno) + poison weapon + Sotano room', { timeout: 30000 }, () => {
    const nbIdx = SUSPECTS_DIRECTORY.findIndex(s => s.gender === 'NB' && s.attributes.visualMarker === 'ninguno');
    const fallbackIdx = SUSPECTS_DIRECTORY.findIndex(s => s.gender === 'NB');
    const culpritIdx = nbIdx >= 0 ? nbIdx : fallbackIdx;
    const poisonIdx = WEAPONS.findIndex(w => w.category === 'veneno');
    const sotanoIdx = LOCATIONS.findIndex(l => l.floor === 'Sótano');

    const generated = generateCase(20251224, culpritIdx, poisonIdx, sotanoIdx);
    for (const d of generated.days) {
      if (d.unlockedClue.category === 'suspect') {
        expect(d.unlockedClue.text.toLowerCase()).not.toMatch(/\bgolpea\b/);
      }
    }
    runFull30DayPlaythrough(generated, 'T4-S2:NB+Veneno+Sotano');
  });

  it('T4-S3: Culprit #01 (elena) + quimicos weapon + combinacion_hierro room + Dossier UI check', { timeout: 30000 }, () => {
    const quimWeaponIdx = WEAPONS.findIndex(w => w.forensicTrace === 'quimicos');
    const ironRoomIdx = LOCATIONS.findIndex(l => l.lockType === 'combinacion_hierro');
    const generated = generateCase(100001, 0, quimWeaponIdx, ironRoomIdx);
    runFull30DayPlaythrough(generated, 'T4-S3:Elena+Quimicos+Hierro');

    const htmlAct5 = renderDossierMarkup({
      seed: 100001,
      unlockedClues: generated.days.map(d => d.unlockedClue),
      completedDays: Array.from({ length: 30 }, (_, i) => i + 1),
      openedDoors: [1, 2, 3, 4, 5],
    });
    expect(htmlAct5).toContain('Cuaderno del Detective — Villa Acebo');
    expect(useGameStore.getState().unlockedClues).toHaveLength(30);
    expect(useGameStore.getState().completedDays).toHaveLength(30);
  });

  it('T4-S4: Culprit #74 + non-concealable heavy weapon + Planta Alta room + Futoshiki UI check', { timeout: 30000 }, () => {
    const heavyIdx = WEAPONS.findIndex(w => !w.concealable);
    const upperIdx = LOCATIONS.findIndex(l => l.floor === 'Planta Alta');
    const generated = generateCase(888888, 73, heavyIdx, upperIdx);
    runFull30DayPlaythrough(generated, 'T4-S4:Culprit74+Heavy+Upper');

    const fDay = generated.days.find(d => d.puzzle.type === 'futoshiki')!;
    if (fDay.puzzle.type === 'futoshiki') {
      const fCfg = fDay.puzzle.config;
      const code = (fCfg.keyCells ?? []).map(k => fCfg.solution[k.r][k.c]).join('');
      const fHtml = renderFutoshikiMarkup(fCfg, true);
      expect(fHtml).toContain('Futoshiki Resuelto');
      expect(fHtml).toContain(code);
    }
  });

  it('T4-S5: Unforced multi-seed playthrough (20261224 -> 7771924) via useGameStore with reset isolation', { timeout: 30000 }, () => {
    const store = useGameStore.getState();
    store.startNewCase(20261224);
    const caseA = useGameStore.getState().activeCase;
    runFull30DayPlaythrough(caseA, 'T4-S5:20261224');

    store.startNewCase(7771924);
    const stateB = useGameStore.getState();
    expect(stateB.completedDays).toEqual([]);
    expect(stateB.unlockedClues).toEqual([]);
    runFull30DayPlaythrough(stateB.activeCase, 'T4-S5:7771924');
  });

  it('T4-S6: Hamming-distance-2 suspect pair discrimination across full 30-day playthrough', { timeout: 30000 }, () => {
    // Find an actual Hamming=2 pair in SUSPECTS_DIRECTORY
    let pairA = 0;
    let pairB = 1;
    let found = false;
    for (let i = 0; i < SUSPECTS_DIRECTORY.length && !found; i++) {
      for (let j = i + 1; j < SUSPECTS_DIRECTORY.length; j++) {
        const a = SUSPECTS_DIRECTORY[i].attributes;
        const b = SUSPECTS_DIRECTORY[j].attributes;
        const keys = ['ageGroup', 'handedness', 'visualMarker', 'presenceWing', 'forensicTrace', 'motiveTag', 'accessLevel'] as const;
        const diff = keys.filter(k => a[k] !== b[k]).length;
        if (diff === 2) {
          pairA = i;
          pairB = j;
          found = true;
          break;
        }
      }
    }
    expect(found).toBe(true);

    const generated = generateCase(5551924, pairA, 4, 3);
    runFull30DayPlaythrough(generated, `T4-S6:Hamming2(${SUSPECTS_DIRECTORY[pairA].id} vs ${SUSPECTS_DIRECTORY[pairB].id})`);

    const neighborId = SUSPECTS_DIRECTORY[pairB].id;
    const day1Eval = evaluateCaseClues([generated.days[0].unlockedClue]);
    const finalEval = evaluateCaseClues(generated.days.map(d => d.unlockedClue));
    expect(finalEval.matchingSuspectIds).not.toContain(neighborId);
    expect(day1Eval.matchingSuspectIds.length).toBeGreaterThan(1);
  });
});
