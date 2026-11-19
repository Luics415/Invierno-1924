import { describe, expect, it } from 'vitest';
import { SUSPECTS_DIRECTORY } from '../src/data/suspectsDirectory';
import { LOCATIONS, WEAPONS } from '../src/data/narrativeBible';
import {
  PUZZLE_SCHEDULE,
  TOTAL_DAYS,
  evaluateCaseClues,
  generateCase,
  pickCaseConfig,
  verifyCaseVerdict,
} from '../src/engine/caseGenerator';
import type { PuzzleType } from '../src/types/game';

const EXPECTED_PUZZLE_TYPES: PuzzleType[] = [
  'sudoku',
  'wordsearch',
  'murdoku',
  'syllables',
  'cryptogram',
  'crossword',
  'futoshiki',
  'connections',
  'nonogram',
  'minesweeper',
];

describe('M2 Case Engine — 74 Unique Cases, Uniformity & 30-Day Campaign', () => {
  it('proves all 74 killer configurations resolve uniquely at 100% clues (|S|=1, |W|=1, |R|=1, 0 ties)', () => {
    const headlines = new Set<string>();
    const summaries = new Set<string>();

    for (let k = 0; k < SUSPECTS_DIRECTORY.length; k++) {
      const seed = 100000 + k * 7919;
      const weaponIdx = (k * 5) % WEAPONS.length;
      const roomIdx = (k * 7) % LOCATIONS.length;

      const generated = generateCase(seed, k, weaponIdx, roomIdx);
      expect(generated.days).toHaveLength(TOTAL_DAYS);
      expect(generated.config.totalDays).toBe(30);
      expect(generated.config.culpritId).toBe(SUSPECTS_DIRECTORY[k].id);
      expect(generated.config.weaponId).toBe(WEAPONS[weaponIdx].id);
      expect(generated.config.locationId).toBe(LOCATIONS[roomIdx].id);

      const allClues = generated.days.map(d => d.unlockedClue);
      const evaluation = evaluateCaseClues(allClues);

      expect(
        evaluation.matchingSuspectIds,
        `Suspect #${k + 1} (${SUSPECTS_DIRECTORY[k].name}) failed unique suspect isolation`
      ).toEqual([generated.config.culpritId]);

      expect(
        evaluation.matchingWeaponIds,
        `Suspect #${k + 1} failed unique weapon isolation`
      ).toEqual([generated.config.weaponId]);

      expect(
        evaluation.matchingRoomIds,
        `Suspect #${k + 1} failed unique room isolation`
      ).toEqual([generated.config.locationId]);

      // Coherent differentiated murder narrative
      const culprit = SUSPECTS_DIRECTORY[k];
      const weapon = WEAPONS[weaponIdx];
      const room = LOCATIONS[roomIdx];
      expect(generated.murderNarrative.summary).toContain(culprit.name);
      expect(generated.murderNarrative.summary).toContain(weapon.name);
      expect(generated.murderNarrative.summary).toContain(room.name);
      expect(generated.murderNarrative.epilogue).toContain(culprit.name);
      expect(generated.murderNarrative.reconstruction.length).toBeGreaterThanOrEqual(4);
      headlines.add(generated.murderNarrative.headline);
      summaries.add(generated.murderNarrative.summary);

      // Verdict check
      const rightVerdict = verifyCaseVerdict(
        generated.config,
        generated.config.culpritId,
        generated.config.weaponId,
        generated.config.locationId
      );
      expect(rightVerdict.isCorrect).toBe(true);
      expect(rightVerdict.correctCount).toBe(3);

      const wrongSuspectId = SUSPECTS_DIRECTORY[(k + 1) % 74].id;
      const wrongVerdict = verifyCaseVerdict(
        generated.config,
        wrongSuspectId,
        generated.config.weaponId,
        generated.config.locationId
      );
      expect(wrongVerdict.isCorrect).toBe(false);
      expect(wrongVerdict.correctCount).toBe(2);
    }

    // All 74 summaries are distinct
    expect(summaries.size).toBe(74);
    expect(headlines.size).toBeGreaterThanOrEqual(70);
  });

  it('samples culprits, weapons, and rooms uniformly across 7,400 seeded runs (~1/74 each)', () => {
    const culpritCounts = new Map<string, number>();
    const weaponCounts = new Map<string, number>();
    const roomCounts = new Map<string, number>();

    const RUNS = 7400;
    for (let i = 1; i <= RUNS; i++) {
      const cfg = pickCaseConfig(i * 2654435761);
      culpritCounts.set(cfg.culpritId, (culpritCounts.get(cfg.culpritId) ?? 0) + 1);
      weaponCounts.set(cfg.weaponId, (weaponCounts.get(cfg.weaponId) ?? 0) + 1);
      roomCounts.set(cfg.locationId, (roomCounts.get(cfg.locationId) ?? 0) + 1);
    }

    // Every single one of the 74 suspects, 18 weapons, and 9 rooms is selected
    expect(culpritCounts.size).toBe(74);
    expect(weaponCounts.size).toBe(18);
    expect(roomCounts.size).toBe(9);

    // Expected mean is 100 per suspect; verify reasonable uniformity (chi-square style bounds: 50..160)
    for (const [id, count] of culpritCounts.entries()) {
      expect(count, `Suspect ${id} count ${count} outside uniform band`).toBeGreaterThanOrEqual(50);
      expect(count, `Suspect ${id} count ${count} outside uniform band`).toBeLessThanOrEqual(160);
    }
  });

  it('schedules all 10 exclusive R4 puzzle types evenly (3x each = 30 days) with no consecutive repeats', () => {
    expect(PUZZLE_SCHEDULE).toHaveLength(30);
    const counts = new Map<PuzzleType, number>();
    for (let i = 0; i < PUZZLE_SCHEDULE.length; i++) {
      const t = PUZZLE_SCHEDULE[i];
      expect(EXPECTED_PUZZLE_TYPES).toContain(t);
      counts.set(t, (counts.get(t) ?? 0) + 1);
      if (i > 0) {
        expect(PUZZLE_SCHEDULE[i]).not.toBe(PUZZLE_SCHEDULE[i - 1]);
      }
    }
    expect(counts.size).toBe(10);
    for (const t of EXPECTED_PUZZLE_TYPES) {
      expect(counts.get(t)).toBe(3);
    }
  });

  it('is strictly deterministic for a given seed and contains zero emojis or legacy Justo Segura text', () => {
    const a = generateCase(19241224);
    const b = generateCase(19241224);
    expect(a.config).toEqual(b.config);
    expect(a.days.map(d => d.unlockedClue.text)).toEqual(b.days.map(d => d.unlockedClue.text));

    const serialized = JSON.stringify(a);
    expect(serialized).not.toMatch(/justo\s+segura/i);
    expect(/\p{Extended_Pictographic}/u.test(serialized)).toBe(false);
  });
});
