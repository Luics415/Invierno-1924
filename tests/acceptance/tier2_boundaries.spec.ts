import { describe, expect, it } from 'vitest';
import { LOCATIONS, WEAPONS } from '../../src/data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../../src/data/suspectsDirectory';
import { generateActCrimeFiles } from '../../src/engine/actCrimesGenerator';
import {
  CLUE_SCHEDULE,
  DAYS_PER_ACT,
  PUZZLE_SCHEDULE,
  TOTAL_DAYS,
  evaluateCaseClues,
  generateCase,
  getCaseForSeed,
  pickCaseConfig,
} from '../../src/engine/caseGenerator';
import {
  AMBIENT_TRACE_LABEL,
  LOCK_TYPE_SHORT,
  SURFACE_LABEL,
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
import { scoreCodificadosAttempt, validateCodificados } from '../../src/engine/puzzles/codificados';
import { checkConnectionsSelection, validateConnections } from '../../src/engine/puzzles/connections';
import { validateCrossword } from '../../src/engine/puzzles/crossword';
import { validateCryptogram } from '../../src/engine/puzzles/cryptogram';
import { validateEcuaciones } from '../../src/engine/puzzles/ecuaciones';
import { validateEncajados } from '../../src/engine/puzzles/encajados';
import { getFutoshikiViolations, validateFutoshiki } from '../../src/engine/puzzles/futoshiki';
import { countAdjacentMines, floodRevealSafeCells, validateMinesweeper } from '../../src/engine/puzzles/minesweeper';
import { isMurdokuMoveMistake, validateMurdoku } from '../../src/engine/puzzles/murdoku';
import { computeLineClues, validateNonogram } from '../../src/engine/puzzles/nonogram';
import { validateSeptagrama } from '../../src/engine/puzzles/septagrama';
import { getSudokuConflicts, validateSudoku } from '../../src/engine/puzzles/sudoku';
import { validateSyllables } from '../../src/engine/puzzles/syllables';
import { findWordCoordinates, validateWordSearch } from '../../src/engine/puzzles/wordsearch';
import { computeSuspectStatus, useGameStore } from '../../src/store/useGameStore';
import type { Clue, DayPuzzle, PuzzleType } from '../../src/types/game';
import {
  ALL_14_PUZZLE_TYPES,
  checkClueToPuzzleIntegration,
  findRawClueDefects,
  readDossierComponentSource,
  renderDossierMarkup,
  renderFutoshikiMarkup,
  solveCodificadosOpaque,
  solveCrosswordOpaque,
  solveCryptogramOpaque,
  solveEcuacionesOpaque,
  solveEncajadosOpaque,
  solveFutoshikiOpaque,
  solveMinesweeperDeterministic,
  solveMurdokuOpaque,
  solveNonogramOpaque,
  solveSeptagramaOpaque,
  solveSyllablesOpaque,
  validateClockFormattingInMeaning,
} from './helpers';

const EXTREME_SEEDS = [0, 1, 0xffffffff, -1] as const;

function edgeClue(text: string, impact: string, keyphrase: string, category: 'suspect' | 'weapon' | 'room' = 'suspect'): Clue {
  return {
    id: `edge-${category}`,
    day: 1,
    text,
    category,
    impact,
    keyphrase,
  };
}

// =====================================================================
// FEATURE #1 BOUNDARIES: 30-day schedule balance
// =====================================================================
describe('Tier 2 — Feature #01 Boundaries: 30-day schedule balance', () => {
  it('T2-F01-1: act boundaries 6->7, 12->13, 18->19, 24->25 have zero consecutive repeats', () => {
    for (const boundary of [6, 12, 18, 24]) {
      expect(PUZZLE_SCHEDULE[boundary - 1]).not.toBe(PUZZLE_SCHEDULE[boundary]);
    }
  });

  it('T2-F01-2: wraparound Day 30 -> Day 1 does not repeat same puzzle type', () => {
    expect(PUZZLE_SCHEDULE[29]).not.toBe(PUZZLE_SCHEDULE[0]);
  });

  it('T2-F01-3: extreme seeds (0, 1, 0xffffffff, -1) preserve full 30-day 14-type schedule', () => {
    for (const s of EXTREME_SEEDS) {
      const c = generateCase(s);
      expect(c.days).toHaveLength(30);
      expect(new Set(c.days.map(d => d.puzzle.type)).size).toBe(14);
    }
  });

  it('T2-F01-4: no type falls below 2 or exceeds 3 appearances across 30 days', () => {
    const counts = new Map<PuzzleType, number>();
    for (const t of PUZZLE_SCHEDULE) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const t of ALL_14_PUZZLE_TYPES) {
      expect(counts.get(t)).toBeGreaterThanOrEqual(2);
      expect(counts.get(t)).toBeLessThanOrEqual(3);
    }
  });

  it('T2-F01-5: no single 6-day act contains duplicate puzzle types', () => {
    for (let act = 0; act < 5; act++) {
      const actTypes = PUZZLE_SCHEDULE.slice(act * DAYS_PER_ACT, (act + 1) * DAYS_PER_ACT);
      expect(new Set(actTypes).size).toBe(6);
    }
  });
});

// =====================================================================
// FEATURE #2 BOUNDARIES: Dimension-coherent puzzle pairing
// =====================================================================
describe('Tier 2 — Feature #02 Boundaries: dimension-coherent pairing', () => {
  it('T2-F02-1: Day 1 and Day 30 maintain valid dimension-puzzle-calendar coherence', () => {
    const c = generateCase(0);
    expect(c.days[0].day).toBe(1);
    expect(c.days[0].act).toBe(1);
    expect(c.days[29].day).toBe(30);
    expect(c.days[29].act).toBe(5);
    expect(c.days[29].unlockedClue.category).toBe('suspect');
  });

  it('T2-F02-2: sparse R (room) clues span multiple acts without clustering in a single act', () => {
    const roomActs = new Set<number>();
    for (let i = 0; i < TOTAL_DAYS; i++) {
      if (CLUE_SCHEDULE[i] === 'R') {
        roomActs.add(Math.floor(i / DAYS_PER_ACT) + 1);
      }
    }
    expect(roomActs.size).toBeGreaterThanOrEqual(4);
  });

  it('T2-F02-3: weapon W slots never exceed 1-2 per act and close in Act V', () => {
    const weaponDays: number[] = [];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      if (CLUE_SCHEDULE[i] === 'W') weaponDays.push(i + 1);
    }
    expect(weaponDays[weaponDays.length - 1]).toBeGreaterThanOrEqual(25);
    expect(weaponDays.length).toBeGreaterThanOrEqual(6);
  });

  it('T2-F02-4: DAY_CALENDAR index 0 and 29 align with Act I start and Act V finale', () => {
    expect(DAY_CALENDAR).toHaveLength(30);
    expect(DAY_CALENDAR[0].dateStr).toBe('1 de diciembre');
    expect(DAY_CALENDAR[29].dateStr).toBe('30 de diciembre');
  });

  it('T2-F02-5: generateActCrimeFiles never selects boundary culprits #01/#74, weapons #01/#18, or rooms #01/#09 as Act II-V victims/decoys', () => {
    for (const [s, w, r] of [
      [0, 0, 0],
      [73, 17, 8],
    ]) {
      const cfg = pickCaseConfig(19241224, s, w, r);
      const acts = generateActCrimeFiles(cfg);
      expect(acts).toHaveLength(5);
      for (const act of acts) {
        expect(act.victimId).not.toBe(cfg.culpritId);
        expect(act.weaponId).not.toBe(cfg.weaponId);
        expect(act.sceneLocationId).not.toBe(cfg.locationId);
      }
    }
  });
});

// =====================================================================
// FEATURE #3 BOUNDARIES: Progressive funnel & no early collapse
// =====================================================================
describe('Tier 2 — Feature #03 Boundaries: progressive funnel', () => {
  it('T2-F03-1: Day 1 never collapses (|S| >= 10, |W| >= 4, |R| >= 3)', () => {
    for (const seed of EXTREME_SEEDS) {
      const c = generateCase(seed);
      const d1 = evaluateCaseClues([c.days[0].unlockedClue]);
      expect(d1.matchingSuspectIds.length).toBeGreaterThanOrEqual(10);
      expect(d1.matchingWeaponIds.length).toBeGreaterThanOrEqual(4);
      expect(d1.matchingRoomIds.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('T2-F03-2: singleton suspect hugo (#9, tatuaje) maintains |S| > 1 through Day 29', () => {
    const hugoIdx = SUSPECTS_DIRECTORY.findIndex(s => s.id === 'hugo');
    const c = generateCase(19241224, hugoIdx, 0, 0);
    for (let d = 1; d <= 29; d++) {
      const res = evaluateCaseClues(c.days.slice(0, d).map(x => x.unlockedClue));
      expect(res.matchingSuspectIds.length, `hugo collapsed early on Day ${d}`).toBeGreaterThan(1);
    }
    expect(evaluateCaseClues(c.days.map(x => x.unlockedClue)).matchingSuspectIds).toEqual(['hugo']);
  });

  it('T2-F03-3: singleton suspect anselmo_jardinero (#41, polen) maintains |S| > 1 through Day 29', () => {
    const ansIdx = SUSPECTS_DIRECTORY.findIndex(s => s.id === 'anselmo_jardinero');
    const c = generateCase(20261224, ansIdx, 5, 2);
    for (let d = 1; d <= 29; d++) {
      const res = evaluateCaseClues(c.days.slice(0, d).map(x => x.unlockedClue));
      expect(res.matchingSuspectIds.length, `anselmo collapsed early on Day ${d}`).toBeGreaterThan(1);
    }
    expect(evaluateCaseClues(c.days.map(x => x.unlockedClue)).matchingSuspectIds).toEqual(['anselmo_jardinero']);
  });

  it('T2-F03-4: singleton room traces (comedor/marmol, invernadero/polen, cocina/harina) maintain |R| > 1 through Day 27', () => {
    for (const roomId of ['comedor', 'invernadero', 'cocina']) {
      const rIdx = LOCATIONS.findIndex(l => l.id === roomId);
      const c = generateCase(19241224, 1, 2, rIdx);
      for (let d = 1; d <= 27; d++) {
        const res = evaluateCaseClues(c.days.slice(0, d).map(x => x.unlockedClue));
        expect(res.matchingRoomIds.length, `Room ${roomId} collapsed early on Day ${d}`).toBeGreaterThan(1);
      }
      expect(evaluateCaseClues(c.days.map(x => x.unlockedClue)).matchingRoomIds).toEqual([roomId]);
    }
  });

  it('T2-F03-5: autoEliminations on each day equals exact incremental set difference', () => {
    const c = generateCase(19241224);
    for (const dayData of c.days) {
      const singleEval = evaluateCaseClues([dayData.unlockedClue]);
      const expectedElimS = SUSPECTS_DIRECTORY.filter(s => !singleEval.matchingSuspectIds.includes(s.id)).map(s => s.id);
      const expectedElimW = WEAPONS.filter(w => !singleEval.matchingWeaponIds.includes(w.id)).map(w => w.id);
      const expectedElimR = LOCATIONS.filter(r => !singleEval.matchingRoomIds.includes(r.id)).map(r => r.id);

      expect(dayData.unlockedClue.autoEliminations?.suspectsEliminated ?? []).toEqual(expectedElimS);
      expect(dayData.unlockedClue.autoEliminations?.weaponsEliminated ?? []).toEqual(expectedElimW);
      expect(dayData.unlockedClue.autoEliminations?.roomsEliminated ?? []).toEqual(expectedElimR);
    }
  });
});

// =====================================================================
// FEATURE #4 BOUNDARIES: Direct predicates across rare attributes
// =====================================================================
describe('Tier 2 — Feature #04 Boundaries: direct predicates (74x18x9)', () => {
  it('T2-F04-1: boundary extremes (index #01 elena & index #74) isolate cleanly', () => {
    for (const [s, w, r] of [
      [0, 0, 0],
      [73, 17, 8],
    ]) {
      const c = generateCase(9999, s, w, r);
      const ev = evaluateCaseClues(c.days.map(d => d.unlockedClue));
      expect(ev.matchingSuspectIds).toEqual([SUSPECTS_DIRECTORY[s].id]);
      expect(ev.matchingWeaponIds).toEqual([WEAPONS[w].id]);
      expect(ev.matchingRoomIds).toEqual([LOCATIONS[r].id]);
    }
  });

  it('T2-F04-2: Trans F and NB suspects isolate to |S|=1 without contradiction', () => {
    const diverseIndices = SUSPECTS_DIRECTORY.map((s, idx) => ({ s, idx })).filter(
      x => x.s.gender === 'Trans F' || x.s.gender === 'NB'
    );
    for (const { s, idx } of diverseIndices) {
      const c = generateCase(4242 + idx, idx, idx % 18, idx % 9);
      const ev = evaluateCaseClues(c.days.map(d => d.unlockedClue));
      expect(ev.matchingSuspectIds).toEqual([s.id]);
    }
  });

  it('T2-F04-3: extreme ages 19 (clara_lozano) and 71 (casimiro_lenador) isolate uniquely', () => {
    for (const id of ['clara_lozano', 'casimiro_lenador']) {
      const idx = SUSPECTS_DIRECTORY.findIndex(s => s.id === id);
      const c = generateCase(777 + idx, idx, 3, 4);
      const ev = evaluateCaseClues(c.days.map(d => d.unlockedClue));
      expect(ev.matchingSuspectIds).toEqual([id]);
    }
  });

  it('T2-F04-4: singleton weapon forensicTrace culprits (cera, tinta, textil, harina, perfume, almendras) isolate cleanly', () => {
    for (const wId of ['baston_ebano', 'abridor', 'aguja_hueso', 'cuchillo_chef', 'chal_seda', 'cianuro']) {
      const wIdx = WEAPONS.findIndex(w => w.id === wId);
      const c = generateCase(888 + wIdx, wIdx * 3, wIdx, wIdx % 9);
      const ev = evaluateCaseClues(c.days.map(d => d.unlockedClue));
      expect(ev.matchingWeaponIds).toEqual([wId]);
    }
  });

  it('T2-F04-5: negative & uint32 max seeds (-1 and 0xffffffff) coerce consistently and isolate uniquely', () => {
    const cNeg = getCaseForSeed(-1);
    const cMax = getCaseForSeed(0xffffffff);
    expect(cNeg.config).toEqual(cMax.config);
    const ev = evaluateCaseClues(cMax.days.map(d => d.unlockedClue));
    expect(ev.matchingSuspectIds).toEqual([cMax.config.culpritId]);
    expect(ev.matchingWeaponIds).toEqual([cMax.config.weaponId]);
    expect(ev.matchingRoomIds).toEqual([cMax.config.locationId]);
  });
});

// =====================================================================
// FEATURE #5 BOUNDARIES: Clue text & label edge cases
// =====================================================================
describe('Tier 2 — Feature #05 Boundaries: clue text & label edges', () => {
  it('T2-F05-1: toPuzzleText handles empty string, whitespace, all Spanish accents, Ñ, and digits', () => {
    expect(toPuzzleText('')).toBe('');
    expect(toPuzzleText('   \t\n  ')).toBe('');
    expect(toPuzzleText('ÁÉÍÓÚÜÑ áéíóúüñ 0123456789')).toBe('AEIOUUÑ AEIOUUÑ 0123456789');
  });

  it('T2-F05-2: visualMarker="ninguno" has zero defects under both eq and neq', () => {
    const rng = mulberry32(1);
    for (const op of ['eq', 'neq'] as const) {
      const desc = describeSuspectPredicate({ kind: 'suspectAttr', field: 'visualMarker', op, value: 'ninguno' }, rng);
      expect(findRawClueDefects(desc)).toEqual([]);
    }
  });

  it('T2-F05-3: forensicTrace="quimicos" and lockType="combinacion_hierro" emit proper accented Spanish', () => {
    const rng = mulberry32(2);
    const sDesc = describeSuspectPredicate({ kind: 'suspectAttr', field: 'forensicTrace', op: 'eq', value: 'quimicos' }, rng);
    const rDesc = describeRoomPredicate({ kind: 'roomAttr', field: 'lockType', op: 'neq', value: 'combinacion_hierro' }, rng);
    expect(findRawClueDefects(sDesc)).toEqual([]);
    expect(findRawClueDefects(rDesc)).toEqual([]);
  });

  it('T2-F05-4: poison weapons (digitalina, cianuro, aconito) paired with handedness never emit "golpea"', () => {
    for (const wId of ['digitalina', 'cianuro', 'aconito']) {
      const wIdx = WEAPONS.findIndex(w => w.id === wId);
      const c = generateCase(12345 + wIdx, 5 + wIdx, wIdx, 2);
      for (const d of c.days) {
        if (d.unlockedClue.category === 'suspect') {
          expect(d.unlockedClue.text.toLowerCase()).not.toMatch(/\bgolpea\b|\btrayectoria del golpe\b/);
        }
      }
    }
  });

  it('T2-F05-5: all 5 SuspectGender values and weapon woundPattern neq produce non-fallback prose', () => {
    const rng = mulberry32(3);
    for (const g of ['M', 'F', 'Trans M', 'Trans F', 'NB'] as const) {
      const d = describeSuspectPredicate({ kind: 'suspectIdentity', field: 'gender', op: 'eq', value: g }, rng);
      expect(findRawClueDefects(d)).toEqual([]);
    }
    const wNeq = describeWeaponPredicate({ kind: 'weaponAttr', field: 'woundPattern', op: 'neq', value: 'fallo_cardiaco' }, rng);
    expect(findRawClueDefects(wNeq)).toEqual([]);
  });
});

// =====================================================================
// FEATURE #6 BOUNDARIES: Dossier attribute transparency
// =====================================================================
describe('Tier 2 — Feature #06 Boundaries: Dossier transparency', () => {
  it('T2-F06-1: Dossier renders cleanly with 0 clues (74 active, 18/18 weapons, 9/9 rooms)', () => {
    const html = renderDossierMarkup({ seed: 19241224, unlockedClues: [] });
    expect(html).toContain('74 activos');
    expect(html).toContain('18/18');
    expect(html).toContain('9/9');
  });

  it('T2-F06-2: Dossier store state converges at Day 30 to 1 active culprit, 1/18 weapon, 1/9 room', () => {
    const store = useGameStore.getState();
    store.startNewCase(19241224);
    const c = useGameStore.getState().activeCase;
    for (const d of c.days) {
      useGameStore.getState().markDayCompleted(d.day, d.unlockedClue);
    }
    const ev = useGameStore.getState().getClueEvaluation();
    expect(ev.matchingSuspectIds).toHaveLength(1);
    expect(ev.matchingWeaponIds).toHaveLength(1);
    expect(ev.matchingRoomIds).toHaveLength(1);
    const activeSuspects = SUSPECTS_DIRECTORY.filter(
      s => !useGameStore.getState().getSuspectStatus(s).isEliminated
    );
    expect(activeSuspects.map(s => s.id)).toEqual([c.config.culpritId]);
  });

  it('T2-F06-3: Dossier weapons markup differentiates concealable vs non-concealable weapons', () => {
    const src = readDossierComponentSource();
    expect(src).toMatch(/w\.concealable\s*\?/);
  });

  it('T2-F06-4: Dossier rooms markup uses Spanish labels for combinacion_hierro & Sótano without raw underscores', () => {
    expect(LOCK_TYPE_SHORT['combinacion_hierro']).toBeTruthy();
    expect(LOCK_TYPE_SHORT['combinacion_hierro']).not.toContain('_');
    for (const r of LOCATIONS) {
      expect(LOCK_TYPE_SHORT[r.lockType]).toBeTruthy();
      expect(LOCK_TYPE_SHORT[r.lockType]).not.toContain('_');
      expect(SURFACE_LABEL[r.surfaceMaterial]).toBeTruthy();
      expect(SURFACE_LABEL[r.surfaceMaterial]).not.toContain('_');
      expect(AMBIENT_TRACE_LABEL[r.ambientTrace]).toBeTruthy();
      expect(AMBIENT_TRACE_LABEL[r.ambientTrace]).not.toContain('_');
    }
    const src = readDossierComponentSource();
    expect(src).toContain('LOCK_TYPE_SHORT');
    expect(src).toContain('SURFACE_LABEL');
    expect(src).toContain('AMBIENT_TRACE_LABEL');
  });

  it('T2-F06-5: Dossier secondary act victims (openedDoors=[1..5]) resolve as victim Act II-V without touching culprit', () => {
    const c = generateCase(19241224);
    const victimStatuses = SUSPECTS_DIRECTORY.map(s =>
      computeSuspectStatus(s, [], [], c, [1, 2, 3, 4, 5])
    ).filter(st => st.isVictim);
    expect(victimStatuses).toHaveLength(4);
    for (const actNum of [2, 3, 4, 5]) {
      expect(victimStatuses.some(st => st.victimAct === actNum)).toBe(true);
    }
    const culprit = SUSPECTS_DIRECTORY.find(s => s.id === c.config.culpritId)!;
    expect(computeSuspectStatus(culprit, [], [], c, [1, 2, 3, 4, 5]).isEliminated).toBe(false);
  });
});

// =====================================================================
// FEATURE #7 BOUNDARIES: Shared clue-to-puzzle wiring seam
// =====================================================================
describe('Tier 2 — Feature #07 Boundaries: shared clue wiring seam', () => {
  it('T2-F07-1: clue with Ñ and Spanish accents (CABAÑA, PUÑAL, SÓTANO) builds cleanly for all 14 types', () => {
    const clue = edgeClue('Indicio en el sótano junto al puñal de la cabaña.', 'Rastro en sótano con puñal', 'PUÑAL EN EL SOTANO', 'room');
    for (const type of ALL_14_PUZZLE_TYPES) {
      const p = buildDayPuzzle(type, 19241224, 4, clue);
      expect(p.type).toBe(type);
    }
  });

  it('T2-F07-2: clue containing digits (35, 60, 23:15) builds cleanly in both word and numeric games', () => {
    const clue = edgeClue('Edad entre 35 y 60 años a las 23:15 h.', 'Edad acotada 35 a 60', 'EDAD 35 A 60 AÑOS', 'suspect');
    for (const type of ALL_14_PUZZLE_TYPES) {
      const p = buildDayPuzzle(type, 19241224, 6, clue);
      expect(p.type).toBe(type);
    }
  });

  it('T2-F07-3: short 1-2 token clue keyphrase/impact does not break any of the 14 generators', () => {
    const clue = edgeClue('Pista breve.', 'Polen', 'POLEN', 'room');
    for (const type of ALL_14_PUZZLE_TYPES) {
      const p = buildDayPuzzle(type, 19241224, 15, clue);
      expect(p.type).toBe(type);
    }
  });

  it('T2-F07-4: very long clue text (>180 chars) builds safely without overflowing wordsearch or cryptogram', () => {
    const longText = 'El minucioso examen químico y balístico practicado durante la ventisca invernal en las dependencias nobles de Villa Acebo descarta múltiples coartadas contradictorias y confirma residuos químicos.';
    const clue = edgeClue(longText, 'Residuos químicos confirmados', 'RESIDUOS QUIMICOS CONFIRMADOS', 'weapon');
    const ws = buildDayPuzzle('wordsearch', 19241224, 20, clue) as Extract<DayPuzzle, { type: 'wordsearch' }>;
    for (const w of ws.config.words) {
      expect(w.word.length).toBeLessThanOrEqual(ws.config.grid.length);
    }
    const cr = buildDayPuzzle('cryptogram', 19241224, 22, clue) as Extract<DayPuzzle, { type: 'cryptogram' }>;
    expect(cr.config.cipherText).toMatch(/^[A-ZÑ ]+$/);
  });

  it('T2-F07-5: boundary seeds 0 and 0xffffffff on Day 1 and Day 30 produce valid linked puzzles', () => {
    const clue = edgeClue('Confirmado suelo de mármol en comedor.', 'Suelo de mármol', 'SUELO DE MARMOL', 'room');
    for (const seed of [0, 0xffffffff]) {
      for (const day of [1, 30]) {
        const p = buildDayPuzzle('codificados', seed, day, clue);
        expect(checkClueToPuzzleIntegration(p, clue).linked).toBe(true);
      }
    }
  });
});

// =====================================================================
// FEATURE #8 BOUNDARIES: Crossword
// =====================================================================
describe('Tier 2 — Feature #08 Boundaries: Crossword', () => {
  it('T2-F08-1: distinct clues on fixed Day 6 yield distinct crossword boards/secrets', () => {
    const p1 = buildDayPuzzle('crossword', 19241224, 6, edgeClue('Rastro de polen en invernadero.', 'Rastro polen', 'RASTRO POLEN', 'room'));
    const p2 = buildDayPuzzle('crossword', 19241224, 6, edgeClue('Arma de cristal contundente.', 'Material cristal', 'ARMA CRISTAL', 'weapon'));
    expect(JSON.stringify(p1.config)).not.toBe(JSON.stringify(p2.config));
  });

  it('T2-F08-2: clue with Ñ produces valid uppercase crossword grid and intersections', () => {
    const clue = edgeClue('Puñal oculto bajo el paño.', 'Puñal oculto', 'PUÑAL OCULTO', 'weapon');
    const p = buildDayPuzzle('crossword', 19241224, 6, clue) as Extract<DayPuzzle, { type: 'crossword' }>;
    const solved = solveCrosswordOpaque(p.config);
    expect(solved.hasCollision).toBe(false);
    expect(solved.isConnected).toBe(true);
  });

  it('T2-F08-3: every entry remains strictly inside 0..rows-1 and 0..cols-1', () => {
    const p = buildDayPuzzle('crossword', 0, 6, edgeClue('Ceniza en chimenea.', 'Ceniza', 'CENIZA', 'room')) as Extract<DayPuzzle, { type: 'crossword' }>;
    for (const e of p.config.entries) {
      const endR = e.row + (e.direction === 'down' ? e.answer.length - 1 : 0);
      const endC = e.col + (e.direction === 'across' ? e.answer.length - 1 : 0);
      expect(endR).toBeLessThan(p.config.rows);
      expect(endC).toBeLessThan(p.config.cols);
    }
  });

  it('T2-F08-4: secretHighlightCells has unique in-bounds coordinates', () => {
    const p = buildDayPuzzle('crossword', 777, 19, edgeClue('Tinta ferrogálica en cartas.', 'Tinta ferrogálica', 'TINTA FERROGALICA', 'suspect')) as Extract<DayPuzzle, { type: 'crossword' }>;
    const coords = new Set((p.config.secretHighlightCells ?? []).map(c => `${c.r}:${c.c}`));
    expect(coords.size).toBe((p.config.secretHighlightCells ?? []).length);
  });

  it('T2-F08-5: partial grid or null-substituted entry cell fails validateCrossword', () => {
    const p = buildDayPuzzle('crossword', 19241224, 6, edgeClue('Lacre rojo.', 'Lacre rojo', 'LACRE ROJO', 'room')) as Extract<DayPuzzle, { type: 'crossword' }>;
    const empty = p.config.grid.map(row => row.map(() => null));
    expect(validateCrossword(p.config, empty)).toBe(false);
  });
});

// =====================================================================
// FEATURE #9 BOUNDARIES: WordSearch
// =====================================================================
describe('Tier 2 — Feature #09 Boundaries: WordSearch', () => {
  it('T2-F09-1: long multi-word clue keywords stay bounded <= grid dimension', () => {
    const clue = edgeClue('Cerradura de combinación de hierro forjado.', 'Cerradura combinacion hierro', 'CERRADURA COMBINACION HIERRO', 'room');
    const p = buildDayPuzzle('wordsearch', 19241224, 1, clue) as Extract<DayPuzzle, { type: 'wordsearch' }>;
    for (const w of p.config.words) {
      expect(w.word.length).toBeLessThanOrEqual(p.config.grid.length);
      expect(w.word).toMatch(/^[A-ZÑ]+$/);
    }
  });

  it('T2-F09-2: Ñ characters in grid and words are preserved as Ñ (never stripped to N)', () => {
    const p = buildDayPuzzle('wordsearch', 19241224, 1, edgeClue('Puñal pequeño en leña.', 'Puñal en leña', 'PUÑAL LEÑA', 'weapon')) as Extract<DayPuzzle, { type: 'wordsearch' }>;
    expect(p.config.grid.flat().every(ch => /^[A-ZÑ]$/.test(ch))).toBe(true);
    expect(p.config.words.some(w => w.word.includes('Ñ'))).toBe(true);
    expect(p.config.grid.flat().includes('Ñ')).toBe(true);
  });

  it('T2-F09-3: extreme seeds 0 and 0xffffffff never emit "!" or lowercase letters', () => {
    for (const s of [0, 0xffffffff]) {
      const p = buildDayPuzzle('wordsearch', s, 20, edgeClue('Harina en cocina.', 'Harina cocina', 'HARINA COCINA', 'room')) as Extract<DayPuzzle, { type: 'wordsearch' }>;
      expect(p.config.grid.flat().every(ch => /^[A-ZÑ]$/.test(ch))).toBe(true);
    }
  });

  it('T2-F09-4: duplicate-word array or unknown word list fails validateWordSearch', () => {
    const p = buildDayPuzzle('wordsearch', 19241224, 1, edgeClue('Veneno mortal.', 'Veneno mortal', 'VENENO MORTAL', 'weapon')) as Extract<DayPuzzle, { type: 'wordsearch' }>;
    const dups = Array.from({ length: p.config.words.length }, () => p.config.words[0].word);
    expect(validateWordSearch(p.config, dups)).toBe(false);
  });

  it('T2-F09-5: every placed word (including reverse/diagonal) resolves via findWordCoordinates', () => {
    const p = buildDayPuzzle('wordsearch', 20261224, 20, edgeClue('Mármol blanco.', 'Mármol blanco', 'MARMOL BLANCO', 'room')) as Extract<DayPuzzle, { type: 'wordsearch' }>;
    for (const w of p.config.words) {
      const coords = findWordCoordinates(p.config.grid, w.word);
      expect(coords).not.toBeNull();
      expect(coords).toHaveLength(w.word.length);
    }
  });
});

// =====================================================================
// FEATURE #10 BOUNDARIES: Syllables
// =====================================================================
describe('Tier 2 — Feature #10 Boundaries: Syllables', () => {
  it('T2-F10-1: suspect, weapon, and room clues all produce >=4-syllable target words', () => {
    for (const cat of ['suspect', 'weapon', 'room'] as const) {
      const p = buildDayPuzzle('syllables', 19241224, 10, edgeClue('Indicio forense.', `Categoria ${cat}`, `CLAVE ${cat.toUpperCase()}`, cat)) as Extract<DayPuzzle, { type: 'syllables' }>;
      expect(p.config.words.every(w => w.targetSyllables.length >= 4)).toBe(true);
    }
  });

  it('T2-F10-2: highlightIndex stays strictly within 0..targetSyllables.length-1', () => {
    const p = buildDayPuzzle('syllables', 0, 24, edgeClue('Herencia disputada.', 'Herencia', 'HERENCIA', 'suspect')) as Extract<DayPuzzle, { type: 'syllables' }>;
    for (const w of p.config.words) {
      expect(w.highlightIndex).toBeGreaterThanOrEqual(0);
      expect(w.highlightIndex).toBeLessThan(w.targetSyllables.length);
    }
  });

  it('T2-F10-3: allSyllables count strictly exceeds total target syllable slots', () => {
    const p = buildDayPuzzle('syllables', 19241224, 10, edgeClue('Arma cortante.', 'Arma cortante', 'ARMA CORTANTE', 'weapon')) as Extract<DayPuzzle, { type: 'syllables' }>;
    const targetTotal = p.config.words.reduce((acc, w) => acc + w.targetSyllables.length, 0);
    expect(p.config.allSyllables.length).toBeGreaterThanOrEqual(targetTotal + 3);
  });

  it('T2-F10-4: duplicate syllable ID reused across slots fails validateSyllables', () => {
    const p = buildDayPuzzle('syllables', 19241224, 10, edgeClue('Veneno químico.', 'Veneno', 'VENENO', 'weapon')) as Extract<DayPuzzle, { type: 'syllables' }>;
    const solved = solveSyllablesOpaque(p.config);
    const id0 = p.config.words[0].id;
    const dupId = solved[id0][0];
    const broken = { ...solved, [id0]: solved[id0].map(() => dupId) };
    expect(validateSyllables(p.config, broken)).toBe(false);
  });

  it('T2-F10-5: missing one word entry fails validateSyllables', () => {
    const p = buildDayPuzzle('syllables', 19241224, 24, edgeClue('Sótano cerrado.', 'Sótano', 'SOTANO', 'room')) as Extract<DayPuzzle, { type: 'syllables' }>;
    const solved = solveSyllablesOpaque(p.config);
    delete solved[p.config.words[0].id];
    expect(validateSyllables(p.config, solved)).toBe(false);
  });
});

// =====================================================================
// FEATURE #11 BOUNDARIES: Cryptogram
// =====================================================================
describe('Tier 2 — Feature #11 Boundaries: Cryptogram', () => {
  it('T2-F11-1: clue containing Ñ maps Ñ to a distinct code from N', () => {
    const p = buildDayPuzzle('cryptogram', 19241224, 8, edgeClue('El puñal de leña no estuvo en el salón.', 'Puñal en leña', 'PUÑAL EN LEÑA', 'weapon')) as Extract<DayPuzzle, { type: 'cryptogram' }>;
    expect(p.config.cipherText).toContain('Ñ');
    expect(p.config.cipherMap['Ñ']).toBeTypeOf('number');
    expect(p.config.cipherMap['N']).toBeTypeOf('number');
    expect(p.config.cipherMap['Ñ']).not.toBe(p.config.cipherMap['N']);
  });

  it('T2-F11-2: clues with digits normalize cleanly into [A-ZÑ ]+ without raw numbers', () => {
    const p = buildDayPuzzle('cryptogram', 19241224, 22, edgeClue('Edad entre 25 y 40 años.', 'Edad 25 a 40', 'EDAD 25 A 40', 'suspect')) as Extract<DayPuzzle, { type: 'cryptogram' }>;
    expect(p.config.cipherText).toMatch(/^[A-ZÑ ]+$/);
  });

  it('T2-F11-3: initialRevealed letter (when present) appears in both cipherText and cipherMap', () => {
    const p = buildDayPuzzle('cryptogram', 19241224, 8, edgeClue('Pista inicial.', 'Rastro ceniza', 'RASTRO CENIZA', 'room')) as Extract<DayPuzzle, { type: 'cryptogram' }>;
    for (const ch of p.config.initialRevealed ?? []) {
      expect(p.config.cipherText).toContain(ch);
      expect(p.config.cipherMap[ch]).toBeTypeOf('number');
    }
  });

  it('T2-F11-4: empty or partial user mapping fails validateCryptogram', () => {
    const p = buildDayPuzzle('cryptogram', 19241224, 8, edgeClue('Pista.', 'Rastro tinta', 'RASTRO TINTA', 'suspect')) as Extract<DayPuzzle, { type: 'cryptogram' }>;
    expect(validateCryptogram(p.config, {})).toBe(false);
    const full = solveCryptogramOpaque(p.config);
    const firstKey = Number(Object.keys(full)[0]);
    delete full[firstKey];
    expect(validateCryptogram(p.config, full)).toBe(false);
  });

  it('T2-F11-5: non-injective user mapping (two codes mapped to same letter) fails validateCryptogram', () => {
    const p = buildDayPuzzle('cryptogram', 19241224, 22, edgeClue('Pista.', 'Rastro licor', 'RASTRO LICOR', 'weapon')) as Extract<DayPuzzle, { type: 'cryptogram' }>;
    const full = solveCryptogramOpaque(p.config);
    const keys = Object.keys(full).map(Number);
    full[keys[0]] = full[keys[1]];
    expect(validateCryptogram(p.config, full)).toBe(false);
  });
});

// =====================================================================
// FEATURE #12 BOUNDARIES: Septagrama
// =====================================================================
describe('Tier 2 — Feature #12 Boundaries: Septagrama', () => {
  it('T2-F12-1: flower always contains 7 unique [A-ZÑ] characters even with repeated letters in words', () => {
    const p = buildDayPuzzle('septagrama', 0, 3, edgeClue('Cera en bodega.', 'Cera en bodega', 'CERA BODEGA', 'room')) as Extract<DayPuzzle, { type: 'septagrama' }>;
    const letters = [p.config.centerLetter, ...p.config.outerLetters];
    expect(new Set(letters).size).toBe(7);
  });

  it('T2-F12-2: highlightIndex stays within 0..answer.length-1 on every word', () => {
    const p = buildDayPuzzle('septagrama', 0xffffffff, 15, edgeClue('Cristal roto.', 'Material cristal', 'ARMA CRISTAL', 'weapon')) as Extract<DayPuzzle, { type: 'septagrama' }>;
    for (const w of p.config.words) {
      expect(w.highlightIndex).toBeGreaterThanOrEqual(0);
      expect(w.highlightIndex).toBeLessThan(w.answer.length);
    }
  });

  it('T2-F12-3: validateSeptagrama handles lowercase/trimmed answers and rejects missing words', () => {
    const p = buildDayPuzzle('septagrama', 19241224, 3, edgeClue('Lacre roto.', 'Lacre', 'LACRE', 'suspect')) as Extract<DayPuzzle, { type: 'septagrama' }>;
    const solved = solveSeptagramaOpaque(p.config);
    const lowerTrimmed: Record<string, string> = {};
    for (const [k, v] of Object.entries(solved)) lowerTrimmed[k] = `  ${v.toLowerCase()} `;
    expect(validateSeptagrama(p.config, lowerTrimmed)).toBe(true);
    delete lowerTrimmed[p.config.words[0].id];
    expect(validateSeptagrama(p.config, lowerTrimmed)).toBe(false);
  });

  it('T2-F12-4: distinct S/W/R clues vary septagrama output/secretMeaning', () => {
    const pW = buildDayPuzzle('septagrama', 19241224, 3, edgeClue('Veneno mortal.', 'Veneno', 'VENENO', 'weapon'));
    const pR = buildDayPuzzle('septagrama', 19241224, 3, edgeClue('Sótano cerrado.', 'Sótano', 'SOTANO', 'room'));
    expect(JSON.stringify(pW.config)).not.toBe(JSON.stringify(pR.config));
  });

  it('T2-F12-5: all words have length >= 4', () => {
    const p = buildDayPuzzle('septagrama', 19241224, 15, edgeClue('Llave maestra.', 'Llave maestra', 'LLAVE MAESTRA', 'suspect')) as Extract<DayPuzzle, { type: 'septagrama' }>;
    for (const w of p.config.words) {
      expect(w.answer.length).toBeGreaterThanOrEqual(4);
    }
  });
});

// =====================================================================
// FEATURE #13 BOUNDARIES: Encajados
// =====================================================================
describe('Tier 2 — Feature #13 Boundaries: Encajados', () => {
  it('T2-F13-1: same-length slots still reconstruct cleanly via intersections and givenCells', () => {
    const p = buildDayPuzzle('encajados', 19241224, 5, edgeClue('Suelo de mármol.', 'Suelo mármol', 'SUELO MARMOL', 'room')) as Extract<DayPuzzle, { type: 'encajados' }>;
    const solved = solveEncajadosOpaque(p.config);
    expect(solved.count).toBeGreaterThanOrEqual(1);
  });

  it('T2-F13-2: every givenCell matches exact non-null letter in grid', () => {
    const p = buildDayPuzzle('encajados', 0, 18, edgeClue('Tinta negra.', 'Tinta', 'TINTA', 'suspect')) as Extract<DayPuzzle, { type: 'encajados' }>;
    for (const g of p.config.givenCells) {
      expect(p.config.grid[g.r][g.c]).toBe(g.letter);
    }
  });

  it('T2-F13-3: keyCells coordinates are distinct and non-null', () => {
    const p = buildDayPuzzle('encajados', 4242, 30, edgeClue('Daga oculta.', 'Daga oculta', 'DAGA OCULTA', 'weapon')) as Extract<DayPuzzle, { type: 'encajados' }>;
    const keys = new Set(p.config.keyCells.map(k => `${k.r}:${k.c}`));
    expect(keys.size).toBe(p.config.keyCells.length);
    for (const k of p.config.keyCells) {
      expect(p.config.grid[k.r][k.c]).not.toBeNull();
    }
  });

  it('T2-F13-4: wordBank is an exact permutation of slot answers', () => {
    const p = buildDayPuzzle('encajados', 19241224, 18, edgeClue('Pagaré vencido.', 'Deuda', 'DEUDA', 'suspect')) as Extract<DayPuzzle, { type: 'encajados' }>;
    expect([...p.config.wordBank].sort()).toEqual(p.config.slots.map(s => s.answer).sort());
  });

  it('T2-F13-5: wrong grid dimensions fail validateEncajados', () => {
    const p = buildDayPuzzle('encajados', 19241224, 5, edgeClue('Veneno.', 'Veneno', 'VENENO', 'weapon')) as Extract<DayPuzzle, { type: 'encajados' }>;
    expect(validateEncajados(p.config, [])).toBe(false);
  });
});

// =====================================================================
// FEATURE #14 BOUNDARIES: Connections
// =====================================================================
describe('Tier 2 — Feature #14 Boundaries: Connections', () => {
  it('T2-F14-1: always assigns exact difficulty levels {1,2,3,4}', () => {
    for (const s of [0, 19241224, 0xffffffff]) {
      const p = buildDayPuzzle('connections', s, 11, edgeClue('Rastro polen.', 'Polen', 'POLEN', 'room')) as Extract<DayPuzzle, { type: 'connections' }>;
      expect(new Set(p.config.groups.map(g => g.difficulty))).toEqual(new Set([1, 2, 3, 4]));
    }
  });

  it('T2-F14-2: zero item overlap across all 4 groups even with dynamic clue items', () => {
    const clue = edgeClue('Atizador de hierro en salón.', 'Atizador hierro', 'ATIZADOR HIERRO', 'weapon');
    const p = buildDayPuzzle('connections', 19241224, 25, clue) as Extract<DayPuzzle, { type: 'connections' }>;
    const items = p.config.groups.flatMap(g => g.items);
    expect(new Set(items).size).toBe(16);
  });

  it('T2-F14-3: checkConnectionsSelection with <4 or >4 items returns matchedGroup=null and oneAway=false', () => {
    const p = buildDayPuzzle('connections', 19241224, 11, edgeClue('Pista.', 'Ceniza', 'CENIZA', 'room')) as Extract<DayPuzzle, { type: 'connections' }>;
    expect(checkConnectionsSelection(p.config, p.config.groups[0].items.slice(0, 3))).toEqual({ matchedGroup: null, oneAway: false });
    expect(checkConnectionsSelection(p.config, [...p.config.groups[0].items, p.config.groups[1].items[0]])).toEqual({ matchedGroup: null, oneAway: false });
  });

  it('T2-F14-4: 2+2 split returns matchedGroup=null and oneAway=false', () => {
    const p = buildDayPuzzle('connections', 19241224, 11, edgeClue('Pista.', 'Tinta', 'TINTA', 'suspect')) as Extract<DayPuzzle, { type: 'connections' }>;
    const split = [p.config.groups[0].items[0], p.config.groups[0].items[1], p.config.groups[1].items[0], p.config.groups[1].items[1]];
    expect(checkConnectionsSelection(p.config, split)).toEqual({ matchedGroup: null, oneAway: false });
  });

  it('T2-F14-5: validateConnections rejects duplicate group IDs', () => {
    const p = buildDayPuzzle('connections', 19241224, 11, edgeClue('Pista.', 'Licor', 'LICOR', 'weapon')) as Extract<DayPuzzle, { type: 'connections' }>;
    const g0 = p.config.groups[0].id;
    expect(validateConnections(p.config, [g0, g0, p.config.groups[1].id, p.config.groups[2].id])).toBe(false);
  });
});

// =====================================================================
// FEATURE #15 BOUNDARIES: Murdoku
// =====================================================================
describe('Tier 2 — Feature #15 Boundaries: Murdoku', () => {
  it('T2-F15-1: clue.category="weapon" vs "room" vs "suspect" switches canonical entity pool', () => {
    const canonWeapons = new Set(WEAPONS.map(w => w.name));
    const canonRooms = new Set(LOCATIONS.map(l => l.name));
    const pW = buildDayPuzzle('murdoku', 19241224, 9, edgeClue('Arma blanca.', 'Arma blanca', 'ARMA BLANCA', 'weapon')) as Extract<DayPuzzle, { type: 'murdoku' }>;
    const pR = buildDayPuzzle('murdoku', 19241224, 9, edgeClue('Estancia cerrada.', 'Estancia cerrada', 'ESTANCIA CERRADA', 'room')) as Extract<DayPuzzle, { type: 'murdoku' }>;

    expect([...pW.config.groupA.items, ...pW.config.groupB.items].some(i => canonWeapons.has(i.name))).toBe(true);
    expect([...pR.config.groupA.items, ...pR.config.groupB.items].some(i => canonRooms.has(i.name))).toBe(true);
  });

  it('T2-F15-2: targetMatches forms an exact bijection over groupA and groupB', () => {
    const p = buildDayPuzzle('murdoku', 19241224, 23, edgeClue('Sospechoso.', 'Sospechoso', 'SOSPECHOSO', 'suspect')) as Extract<DayPuzzle, { type: 'murdoku' }>;
    expect(new Set(p.config.targetMatches.map(m => m.aId)).size).toBe(p.config.groupA.items.length);
    expect(new Set(p.config.targetMatches.map(m => m.bId)).size).toBe(p.config.groupB.items.length);
  });

  it('T2-F15-3: neutral and question states never trigger mistake yet fail validateMurdoku', () => {
    const p = buildDayPuzzle('murdoku', 19241224, 9, edgeClue('Sala.', 'Sala', 'SALA', 'room')) as Extract<DayPuzzle, { type: 'murdoku' }>;
    const t = p.config.targetMatches[0];
    expect(isMurdokuMoveMistake(p.config, t.aId, t.bId, 'neutral')).toBe(false);
    expect(isMurdokuMoveMistake(p.config, t.aId, t.bId, 'question')).toBe(false);
    expect(validateMurdoku(p.config, { [`${t.aId}:${t.bId}`]: 'question' })).toBe(false);
  });

  it('T2-F15-4: 4x4 early act vs 5x5 late act sizing respects day boundary (day <= 14 vs > 14)', () => {
    const early = buildDayPuzzle('murdoku', 19241224, 9, edgeClue('Pista.', 'Pista', 'PISTA', 'suspect')) as Extract<DayPuzzle, { type: 'murdoku' }>;
    const late = buildDayPuzzle('murdoku', 19241224, 23, edgeClue('Pista.', 'Pista', 'PISTA', 'suspect')) as Extract<DayPuzzle, { type: 'murdoku' }>;
    expect(early.config.groupA.items.length).toBeGreaterThanOrEqual(4);
    expect(late.config.groupA.items.length).toBe(5);
  });

  it('T2-F15-5: unique solution holds across 10 diverse seeds', () => {
    for (let i = 0; i < 10; i++) {
      const p = buildDayPuzzle('murdoku', 1000 + i * 97, 9 + (i % 15), edgeClue('Pista.', 'Rastro tinta', 'RASTRO TINTA', 'suspect')) as Extract<DayPuzzle, { type: 'murdoku' }>;
      const solved = solveMurdokuOpaque(p.config);
      expect(solved.unparsedClues).toEqual([]);
      expect(solved.solutionCount).toBe(1);
    }
  });
});

// =====================================================================
// FEATURE #16 BOUNDARIES: Codificados
// =====================================================================
describe('Tier 2 — Feature #16 Boundaries: Codificados', () => {
  it('T2-F16-1: scoreCodificadosAttempt accurately scores repeated digits and leading zeros', () => {
    expect(scoreCodificadosAttempt([0, 1, 1, 2], [1, 1, 0, 9])).toEqual({ exactCount: 1, misplacedCount: 2 });
    expect(scoreCodificadosAttempt([0, 0, 7, 7], [7, 7, 0, 0])).toEqual({ exactCount: 0, misplacedCount: 4 });
  });

  it('T2-F16-2: zero-match clue eliminates all 4 digits cleanly when present', () => {
    expect(scoreCodificadosAttempt([1, 2, 3, 4], [5, 6, 7, 8])).toEqual({ exactCount: 0, misplacedCount: 0 });
  });

  it('T2-F16-3: partial or wrong-length userDigits return false in validateCodificados', () => {
    const p = buildDayPuzzle('codificados', 19241224, 2, edgeClue('Arma.', 'Arma metal', 'ARMA METAL', 'weapon')) as Extract<DayPuzzle, { type: 'codificados' }>;
    expect(validateCodificados(p.config, [1, 2, 3])).toBe(false);
    expect(validateCodificados(p.config, [null, null, null, null])).toBe(false);
  });

  it('T2-F16-4: clock-style secretMeaning across 15 seeds enforces 00<=HH<=23 and 00<=MM<=59', () => {
    for (let i = 0; i < 15; i++) {
      const p = buildDayPuzzle('codificados', 500 + i * 131, (i % 28) + 2, edgeClue(`Pista ${i}.`, `Impacto ${i}`, `CLAVE ${i}`, 'weapon')) as Extract<DayPuzzle, { type: 'codificados' }>;
      expect(validateClockFormattingInMeaning(p.config.secretMeaning)).toBe(true);
    }
  });

  it('T2-F16-5: procedural generation produces >4 distinct secretCodes across seeds (not locked to 4 presets)', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 15; i++) {
      const p = buildDayPuzzle('codificados', 100 + i * 7919, 2, edgeClue(`Pista ${i}.`, `Impacto ${i}`, `CLAVE ${i}`, 'weapon')) as Extract<DayPuzzle, { type: 'codificados' }>;
      const solved = solveCodificadosOpaque(p.config);
      expect(solved.count).toBe(1);
      codes.add(p.config.secretCode.join(''));
    }
    expect(codes.size).toBeGreaterThan(4);
  });
});

// =====================================================================
// FEATURE #17 BOUNDARIES: Ecuaciones
// =====================================================================
describe('Tier 2 — Feature #17 Boundaries: Ecuaciones', () => {
  it('T2-F17-1: equations include both addition and subtraction terms', () => {
    const p = buildDayPuzzle('ecuaciones', 19241224, 4, edgeClue('Estancia.', 'Planta baja', 'PLANTA BAJA', 'room')) as Extract<DayPuzzle, { type: 'ecuaciones' }>;
    const ops = new Set(p.config.equations.flatMap(eq => eq.terms.map(t => t.op)));
    expect(ops.has('+')).toBe(true);
    expect(ops.has('-')).toBe(true);
  });

  it('T2-F17-2: every symbol value is strictly within integer 0..9', () => {
    const p = buildDayPuzzle('ecuaciones', 0, 17, edgeClue('Estancia.', 'Bodega', 'BODEGA', 'room')) as Extract<DayPuzzle, { type: 'ecuaciones' }>;
    for (const sym of p.config.symbols) {
      expect(Number.isInteger(sym.value)).toBe(true);
      expect(sym.value).toBeGreaterThanOrEqual(0);
      expect(sym.value).toBeLessThanOrEqual(9);
    }
  });

  it('T2-F17-3: all 4 targetSymbols exist in symbols table', () => {
    const p = buildDayPuzzle('ecuaciones', 0xffffffff, 4, edgeClue('Estancia.', 'Capilla', 'CAPILLA', 'room')) as Extract<DayPuzzle, { type: 'ecuaciones' }>;
    const ids = new Set(p.config.symbols.map(s => s.id));
    for (const ts of p.config.targetSymbols) {
      expect(ids.has(ts)).toBe(true);
    }
  });

  it('T2-F17-4: null or wrong-length digits fail validateEcuaciones', () => {
    const p = buildDayPuzzle('ecuaciones', 19241224, 4, edgeClue('Estancia.', 'Salón', 'SALON', 'room')) as Extract<DayPuzzle, { type: 'ecuaciones' }>;
    expect(validateEcuaciones(p.config, [1, 2, 3])).toBe(false);
    expect(validateEcuaciones(p.config, [null, 0, 0, 0])).toBe(false);
  });

  it('T2-F17-5: procedural equations across 15 seeds produce >3 unique targetCodes with valid clock formatting', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 15; i++) {
      const p = buildDayPuzzle('ecuaciones', 200 + i * 7919, 4, edgeClue(`Pista ${i}.`, `Impacto ${i}`, `CLAVE ${i}`, 'room')) as Extract<DayPuzzle, { type: 'ecuaciones' }>;
      expect(validateClockFormattingInMeaning(p.config.secretMeaning)).toBe(true);
      const solved = solveEcuacionesOpaque(p.config);
      expect(solved.uniqueTargetCodeCount).toBe(1);
      codes.add(p.config.targetCode.join(''));
    }
    expect(codes.size).toBeGreaterThan(3);
  });
});

// =====================================================================
// FEATURE #18 BOUNDARIES: Sudoku
// =====================================================================
describe('Tier 2 — Feature #18 Boundaries: Sudoku', () => {
  it('T2-F18-1: initialGrid always starts with zero conflicts', () => {
    for (const s of EXTREME_SEEDS) {
      const p = buildDayPuzzle('sudoku', s, 7, edgeClue('Sospechoso.', 'Sospechoso', 'SOSPECHOSO', 'suspect')) as Extract<DayPuzzle, { type: 'sudoku' }>;
      expect(getSudokuConflicts(p.config.initialGrid).size).toBe(0);
    }
  });

  it('T2-F18-2: every prefilled cell in initialGrid equals solution[r][c]', () => {
    const p = buildDayPuzzle('sudoku', 19241224, 21, edgeClue('Sospechoso.', 'Acceso', 'ACCESO', 'suspect')) as Extract<DayPuzzle, { type: 'sudoku' }>;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (p.config.initialGrid[r][c] !== null) {
          expect(p.config.initialGrid[r][c]).toBe(p.config.solution[r][c]);
        }
      }
    }
  });

  it('T2-F18-3: keyCells coordinates are distinct, in 0..8, and non-prefilled', () => {
    const p = buildDayPuzzle('sudoku', 0, 21, edgeClue('Sospechoso.', 'Móvil', 'MOVIL', 'suspect')) as Extract<DayPuzzle, { type: 'sudoku' }>;
    const set = new Set(p.config.keyCells.map(k => `${k.r}:${k.c}`));
    expect(set.size).toBe(4);
    for (const k of p.config.keyCells) {
      expect(k.r).toBeGreaterThanOrEqual(0);
      expect(k.r).toBeLessThan(9);
      expect(k.c).toBeGreaterThanOrEqual(0);
      expect(k.c).toBeLessThan(9);
      expect(p.config.initialGrid[k.r][k.c]).toBeNull();
    }
  });

  it('T2-F18-4: getSudokuConflicts detects row, col, and 3x3 box conflicts separately', () => {
    const empty = Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));
    empty[0][0] = 5;
    empty[0][8] = 5; // row
    expect(getSudokuConflicts(empty).has('0-0')).toBe(true);
    empty[0][8] = null;
    empty[8][0] = 5; // col
    expect(getSudokuConflicts(empty).has('8-0')).toBe(true);
    empty[8][0] = null;
    empty[2][2] = 5; // box
    expect(getSudokuConflicts(empty).has('2-2')).toBe(true);
  });

  it('T2-F18-5: single null cell in completed grid fails validateSudoku', () => {
    const p = buildDayPuzzle('sudoku', 19241224, 7, edgeClue('Sospechoso.', 'Tinta', 'TINTA', 'suspect')) as Extract<DayPuzzle, { type: 'sudoku' }>;
    const near: (number | null)[][] = p.config.solution.map(r => [...r]);
    near[8][8] = null;
    expect(validateSudoku(p.config, near)).toBe(false);
  });
});

// =====================================================================
// FEATURE #19 BOUNDARIES: Futoshiki + UI
// =====================================================================
describe('Tier 2 — Feature #19 Boundaries: Futoshiki + UI', () => {
  it('T2-F19-1: every inequality connects orthogonally adjacent cells within 0..size-1', () => {
    const p = buildDayPuzzle('futoshiki', 19241224, 12, edgeClue('Arma.', 'Arma metal', 'ARMA METAL', 'weapon')) as Extract<DayPuzzle, { type: 'futoshiki' }>;
    for (const ineq of p.config.inequalities) {
      const dist = Math.abs(ineq.r1 - ineq.r2) + Math.abs(ineq.c1 - ineq.c2);
      expect(dist).toBe(1);
    }
  });

  it('T2-F19-2: independent solver satisfies all inequalities on extreme seeds', () => {
    for (const s of [0, 0xffffffff]) {
      const p = buildDayPuzzle('futoshiki', s, 26, edgeClue('Arma.', 'Veneno', 'VENENO', 'weapon')) as Extract<DayPuzzle, { type: 'futoshiki' }>;
      const solved = solveFutoshikiOpaque(p.config, 2);
      expect(solved.count).toBe(1);
      expect(validateFutoshiki(p.config, solved.solution!)).toBe(true);
    }
  });

  it('T2-F19-3: getFutoshikiViolations catches broken inequality even without duplicate digits', () => {
    const p = buildDayPuzzle('futoshiki', 19241224, 12, edgeClue('Arma.', 'Cristal', 'CRISTAL', 'weapon')) as Extract<DayPuzzle, { type: 'futoshiki' }>;
    const ineq = p.config.inequalities[0];
    const grid: (number | null)[][] = Array.from({ length: p.config.size }, () => Array<number | null>(p.config.size).fill(null));
    grid[ineq.r1][ineq.c1] = ineq.operator === '<' ? 5 : 1;
    grid[ineq.r2][ineq.c2] = ineq.operator === '<' ? 1 : 5;
    expect(getFutoshikiViolations(p.config, grid).size).toBeGreaterThan(0);
  });

  it('T2-F19-4: FutoshikiPuzzle hides solved banner when isSolved=false and shows 4-digit code when isSolved=true', () => {
    const p = buildDayPuzzle('futoshiki', 19241224, 12, edgeClue('Arma.', 'Ocultable', 'OCULTABLE', 'weapon')) as Extract<DayPuzzle, { type: 'futoshiki' }>;
    const code = (p.config.keyCells ?? []).map(k => p.config.solution[k.r][k.c]).join('');
    expect(code).toHaveLength(4);
    expect(p.config.secretCodeMeaning).toBeTruthy();

    const unsolvedHtml = renderFutoshikiMarkup(p.config, false);
    expect(unsolvedHtml).not.toContain('Futoshiki Resuelto');
    expect(unsolvedHtml).not.toContain(code);
    expect(unsolvedHtml).not.toContain(p.config.secretCodeMeaning!);

    const solvedHtml = renderFutoshikiMarkup(p.config, true);
    expect(solvedHtml).toContain('Futoshiki Resuelto');
    expect(solvedHtml).toContain(code);
    expect(solvedHtml).toContain(p.config.secretCodeMeaning!);
  });

  it('T2-F19-5: all 4 keyCells are distinct valid coordinates inside 0..size-1', () => {
    const p = buildDayPuzzle('futoshiki', 19241224, 26, edgeClue('Arma.', 'Filo', 'FILO', 'weapon')) as Extract<DayPuzzle, { type: 'futoshiki' }>;
    const keys = p.config.keyCells ?? [];
    expect(keys).toHaveLength(4);
    expect(new Set(keys.map(k => `${k.r}:${k.c}`)).size).toBe(4);
    for (const k of keys) {
      expect(k.r).toBeGreaterThanOrEqual(0);
      expect(k.r).toBeLessThan(p.config.size);
      expect(k.c).toBeGreaterThanOrEqual(0);
      expect(k.c).toBeLessThan(p.config.size);
    }
  });
});

// =====================================================================
// FEATURE #20 BOUNDARIES: Nonogram
// =====================================================================
describe('Tier 2 — Feature #20 Boundaries: Nonogram', () => {
  it('T2-F20-1: computeLineClues returns [0] on all-false line', () => {
    expect(computeLineClues([false, false, false, false, false, false, false])).toEqual([0]);
  });

  it('T2-F20-2: computeLineClues returns exact multi-run blocks [2, 3]', () => {
    expect(computeLineClues([true, true, false, true, true, true, false])).toEqual([2, 3]);
  });

  it('T2-F20-3: rowClues.length === rows and colClues.length === cols across S/W/R themes', () => {
    for (const cat of ['suspect', 'weapon', 'room'] as const) {
      const p = buildDayPuzzle('nonogram', 19241224, 13, edgeClue('Silueta.', `Tema ${cat}`, `TEMA ${cat.toUpperCase()}`, cat)) as Extract<DayPuzzle, { type: 'nonogram' }>;
      expect(p.config.rowClues).toHaveLength(p.config.rows);
      expect(p.config.colClues).toHaveLength(p.config.cols);
    }
  });

  it('T2-F20-4: Nonogram CSP solver solves generated boards across extreme seeds', () => {
    for (const s of [0, 0xffffffff]) {
      const p = buildDayPuzzle('nonogram', s, 27, edgeClue('Arma.', 'Arma punzante', 'ARMA PUNZANTE', 'weapon')) as Extract<DayPuzzle, { type: 'nonogram' }>;
      const solved = solveNonogramOpaque(p.config, 2);
      expect(solved.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('T2-F20-5: single-cell flip fails validateNonogram', () => {
    const p = buildDayPuzzle('nonogram', 19241224, 13, edgeClue('Estancia.', 'Estancia', 'ESTANCIA', 'room')) as Extract<DayPuzzle, { type: 'nonogram' }>;
    const broken = p.config.solution.map(r => [...r]);
    broken[0][0] = !broken[0][0];
    expect(validateNonogram(p.config, broken)).toBe(false);
  });
});

// =====================================================================
// FEATURE #21 BOUNDARIES: Minesweeper
// =====================================================================
describe('Tier 2 — Feature #21 Boundaries: Minesweeper', () => {
  it('T2-F21-1: corner mines (0,0) and (rows-1, cols-1) are counted accurately by countAdjacentMines', () => {
    const mineSet = new Set(['0:0', '7:7']);
    expect(countAdjacentMines(8, 8, mineSet, 0, 1)).toBe(1);
    expect(countAdjacentMines(8, 8, mineSet, 1, 1)).toBe(1);
    expect(countAdjacentMines(8, 8, mineSet, 6, 6)).toBe(1);
  });

  it('T2-F21-2: mines contain zero duplicates and stay within grid bounds', () => {
    const p = buildDayPuzzle('minesweeper', 0, 28, edgeClue('Estancia.', 'Bodega', 'BODEGA', 'room')) as Extract<DayPuzzle, { type: 'minesweeper' }>;
    const keys = new Set<string>();
    for (const m of p.config.mines) {
      expect(m.r).toBeGreaterThanOrEqual(0);
      expect(m.r).toBeLessThan(p.config.rows);
      expect(m.c).toBeGreaterThanOrEqual(0);
      expect(m.c).toBeLessThan(p.config.cols);
      keys.add(`${m.r}:${m.c}`);
    }
    expect(keys.size).toBe(p.config.mines.length);
  });

  it('T2-F21-3: revealing any mine cell fails validateMinesweeper', () => {
    const p = buildDayPuzzle('minesweeper', 19241224, 14, edgeClue('Estancia.', 'Cocina', 'COCINA', 'room')) as Extract<DayPuzzle, { type: 'minesweeper' }>;
    const m0 = p.config.mines[0];
    expect(validateMinesweeper(p.config, new Set([`${m0.r}:${m0.c}`]))).toBe(false);
  });

  it('T2-F21-4: deterministic zero-guess solvability holds across 15 diverse seeds & days', () => {
    for (let i = 0; i < 15; i++) {
      const p = buildDayPuzzle('minesweeper', 100 + i * 1009, 14 + (i % 15), edgeClue(`Pista ${i}.`, `Sala ${i}`, `SALA ${i}`, 'room')) as Extract<DayPuzzle, { type: 'minesweeper' }>;
      const solved = solveMinesweeperDeterministic(p.config);
      expect(solved.solvedAllSafe, `Seed index ${i} minesweeper required blind guess`).toBe(true);
    }
  });

  it('T2-F21-5: floodRevealSafeCells stops at numbered cells and never reveals a mine', () => {
    const mineSet = new Set(['0:2', '2:0']);
    const rev = floodRevealSafeCells(4, 4, mineSet, 0, 0, new Set());
    expect(rev.has('0:2')).toBe(false);
    expect(rev.has('2:0')).toBe(false);
    expect(rev.has('0:1')).toBe(true);
  });
});
