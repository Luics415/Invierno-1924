import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCATIONS, WEAPONS } from '../src/data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../src/data/suspectsDirectory';
import { generateCase } from '../src/engine/caseGenerator';
import {
  computeRoomStatus,
  computeSuspectStatus,
  computeWeaponStatus,
  useGameStore,
} from '../src/store/useGameStore';
import type { GameMode, PuzzleComponentProps, SudokuConfig } from '../src/types/game';
import { sound } from '../src/utils/soundEffects';

const TEST_SEED = 19241224;

function resetSingletonStore(seed = TEST_SEED): void {
  useGameStore.getState().resetGame();
  useGameStore.setState({
    gameMode: 'auto',
    hasSelectedGameMode: false,
    manualEliminations: [],
    manualWeaponEliminations: [],
    manualRoomEliminations: [],
  });
  useGameStore.getState().startNewCase(seed);
  useGameStore.setState({
    gameMode: 'auto',
    hasSelectedGameMode: false,
  });
}

describe('M1 — Manual Mode Store, Status Isolation, Victims & Mode Lock', () => {
  beforeEach(() => {
    resetSingletonStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetSingletonStore();
  });

  describe('Pure status helpers', () => {
    it('computeSuspectStatus gates clue auto-eliminations on gameMode and defaults 5-arg calls to auto', () => {
      const generated = generateCase(TEST_SEED);
      const day1 = generated.days[0];
      const autoEliminatedId = day1.unlockedClue.autoEliminations?.suspectsEliminated?.[0];
      expect(autoEliminatedId).toBeTruthy();

      const targetSuspect = SUSPECTS_DIRECTORY.find(s => s.id === autoEliminatedId)!;
      expect(targetSuspect).toBeDefined();

      // 5-arg legacy call defaults to 'auto'
      const legacyStatus = computeSuspectStatus(targetSuspect, [], [day1.unlockedClue], generated, []);
      expect(legacyStatus.isEliminated).toBe(true);
      expect(legacyStatus.isManual).toBe(false);
      expect(legacyStatus.dayEliminated).toBe(day1.day);

      // Explicit 'auto'
      const autoStatus = computeSuspectStatus(
        targetSuspect,
        [],
        [day1.unlockedClue],
        generated,
        [],
        'auto'
      );
      expect(autoStatus).toEqual(legacyStatus);

      // Explicit 'manual' ignores clue auto-eliminations
      const manualNoCross = computeSuspectStatus(
        targetSuspect,
        [],
        [day1.unlockedClue],
        generated,
        [],
        'manual'
      );
      expect(manualNoCross.isEliminated).toBe(false);
      expect(manualNoCross.isManual).toBe(false);

      // Explicit 'manual' honors manualEliminations
      const manualCrossed = computeSuspectStatus(
        targetSuspect,
        [targetSuspect.id],
        [day1.unlockedClue],
        generated,
        [],
        'manual'
      );
      expect(manualCrossed.isEliminated).toBe(true);
      expect(manualCrossed.isManual).toBe(true);
    });

    it('computeSuspectStatus auto-eliminates opened Doors 2-5 victims in both auto and manual modes', () => {
      const generated = generateCase(TEST_SEED);
      const act2 = generated.acts.find(a => a.act === 2)!;
      const victim = SUSPECTS_DIRECTORY.find(s => s.id === act2.victimId)!;
      const culprit = SUSPECTS_DIRECTORY.find(s => s.id === generated.config.culpritId)!;

      // Unopened door does not eliminate as victim
      expect(computeSuspectStatus(victim, [], [], generated, [1], 'manual').isEliminated).toBe(false);
      expect(computeSuspectStatus(victim, [], [], generated, [1], 'auto').isEliminated).toBe(false);

      // Opened Doors 2..5 eliminate victims in both modes, even if previously manually crossed off
      for (const actNum of [2, 3, 4, 5] as const) {
        const actFile = generated.acts.find(a => a.act === actNum)!;
        const actVictim = SUSPECTS_DIRECTORY.find(s => s.id === actFile.victimId)!;

        for (const mode of ['auto', 'manual'] as const) {
          const status = computeSuspectStatus(
            actVictim,
            [actVictim.id],
            [],
            generated,
            [1, 2, 3, 4, 5],
            mode
          );
          expect(status.isEliminated).toBe(true);
          expect(status.isVictim).toBe(true);
          expect(status.victimAct).toBe(actNum);
          expect(status.isManual).toBe(false);
        }
      }

      // Culprit is never eliminated by Doors 2..5
      expect(computeSuspectStatus(culprit, [], [], generated, [1, 2, 3, 4, 5], 'manual').isEliminated).toBe(false);
      expect(computeSuspectStatus(culprit, [], [], generated, [1, 2, 3, 4, 5], 'auto').isEliminated).toBe(false);
    });

    it('computeWeaponStatus evaluates clues only in auto mode and manual eliminations in both modes', () => {
      const generated = generateCase(TEST_SEED);
      const allClues = generated.days.map(d => d.unlockedClue);
      const targetWeaponId = generated.config.weaponId;
      const otherWeapon = WEAPONS.find(w => w.id !== targetWeaponId)!;

      // Empty clues -> not eliminated in either mode
      expect(computeWeaponStatus(otherWeapon.id, [], [], 'auto')).toEqual({
        isEliminated: false,
        isManual: false,
        isAutoEliminated: false,
      });
      expect(computeWeaponStatus(otherWeapon.id, [], [], 'manual')).toEqual({
        isEliminated: false,
        isManual: false,
        isAutoEliminated: false,
      });

      // With all clues in 'auto' (and default 3-arg call): non-target eliminated, target remains
      expect(computeWeaponStatus(otherWeapon.id, [], allClues)).toEqual({
        isEliminated: true,
        isManual: false,
        isAutoEliminated: true,
      });
      expect(computeWeaponStatus(targetWeaponId, [], allClues, 'auto')).toEqual({
        isEliminated: false,
        isManual: false,
        isAutoEliminated: false,
      });

      // With all clues in 'manual': zero auto-eliminations
      expect(computeWeaponStatus(otherWeapon.id, [], allClues, 'manual')).toEqual({
        isEliminated: false,
        isManual: false,
        isAutoEliminated: false,
      });

      // Manual toggle works in manual mode and combines with auto in auto mode
      expect(computeWeaponStatus(otherWeapon.id, [otherWeapon.id], allClues, 'manual')).toEqual({
        isEliminated: true,
        isManual: true,
        isAutoEliminated: false,
      });
      expect(computeWeaponStatus(otherWeapon.id, [otherWeapon.id], allClues, 'auto')).toEqual({
        isEliminated: true,
        isManual: true,
        isAutoEliminated: true,
      });

      // Unknown weapon ID
      expect(computeWeaponStatus('arma-inexistente', [], allClues, 'auto')).toEqual({
        isEliminated: false,
        isManual: false,
        isAutoEliminated: false,
      });
      expect(computeWeaponStatus('arma-inexistente', ['arma-inexistente'], allClues, 'manual')).toEqual({
        isEliminated: true,
        isManual: true,
        isAutoEliminated: false,
      });
    });

    it('computeRoomStatus evaluates clues only in auto mode and manual eliminations in both modes', () => {
      const generated = generateCase(TEST_SEED);
      const allClues = generated.days.map(d => d.unlockedClue);
      const targetRoomId = generated.config.locationId;
      const otherRoom = LOCATIONS.find(r => r.id !== targetRoomId)!;

      // Empty clues
      expect(computeRoomStatus(otherRoom.id, [], [], 'auto')).toEqual({
        isEliminated: false,
        isManual: false,
        isAutoEliminated: false,
      });

      // All clues in 'auto' (and default 3-arg call)
      expect(computeRoomStatus(otherRoom.id, [], allClues)).toEqual({
        isEliminated: true,
        isManual: false,
        isAutoEliminated: true,
      });
      expect(computeRoomStatus(targetRoomId, [], allClues, 'auto')).toEqual({
        isEliminated: false,
        isManual: false,
        isAutoEliminated: false,
      });

      // All clues in 'manual'
      expect(computeRoomStatus(otherRoom.id, [], allClues, 'manual')).toEqual({
        isEliminated: false,
        isManual: false,
        isAutoEliminated: false,
      });
      expect(computeRoomStatus(otherRoom.id, [otherRoom.id], allClues, 'manual')).toEqual({
        isEliminated: true,
        isManual: true,
        isAutoEliminated: false,
      });

      // Unknown room ID
      expect(computeRoomStatus('estancia-inexistente', [], allClues, 'auto')).toEqual({
        isEliminated: false,
        isManual: false,
        isAutoEliminated: false,
      });
    });
  });

  describe('Store clue & matrix isolation in Manual Mode vs Auto Mode', () => {
    it('markDayCompleted in manual mode unlocks clues without auto-eliminating suspects/weapons/rooms or filling matrixCells', () => {
      const store = useGameStore.getState();
      store.setGameMode('manual');

      const activeCase = useGameStore.getState().activeCase;
      for (const dayData of activeCase.days) {
        useGameStore.getState().markDayCompleted(dayData.day, dayData.unlockedClue, {
          suspectsEliminated: dayData.unlockedClue.autoEliminations?.suspectsEliminated,
          weaponsEliminated: dayData.unlockedClue.autoEliminations?.weaponsEliminated,
          roomsEliminated: dayData.unlockedClue.autoEliminations?.roomsEliminated,
          confirmedMatches: [
            {
              suspect: activeCase.config.culpritId,
              weapon: activeCase.config.weaponId,
              room: activeCase.config.locationId,
            },
          ],
        });
      }

      const state = useGameStore.getState();
      expect(state.unlockedClues).toHaveLength(30);
      expect(state.completedDays).toHaveLength(30);
      expect(state.matrixCells).toEqual({});

      const activeSuspects = SUSPECTS_DIRECTORY.filter(s => !state.getSuspectStatus(s).isEliminated);
      const activeWeapons = WEAPONS.filter(w => !state.getWeaponStatus(w.id).isEliminated);
      const activeRooms = LOCATIONS.filter(r => !state.getRoomStatus(r.id).isEliminated);

      expect(activeSuspects).toHaveLength(74);
      expect(activeWeapons).toHaveLength(18);
      expect(activeRooms).toHaveLength(9);
    });

    it('markDayCompleted in auto mode populates matrixCells and converges to 1 suspect, 1 weapon, 1 room', () => {
      const store = useGameStore.getState();
      store.setGameMode('auto');

      const activeCase = useGameStore.getState().activeCase;
      for (const dayData of activeCase.days) {
        useGameStore.getState().markDayCompleted(dayData.day, dayData.unlockedClue, {
          confirmedMatches:
            dayData.day === 1
              ? [
                  {
                    suspect: activeCase.config.culpritId,
                    weapon: activeCase.config.weaponId,
                    room: activeCase.config.locationId,
                  },
                ]
              : undefined,
        });
      }

      const state = useGameStore.getState();
      expect(state.matrixCells[`${activeCase.config.culpritId}:${activeCase.config.weaponId}`]).toBe('check');
      expect(state.matrixCells[`${activeCase.config.culpritId}:${activeCase.config.locationId}`]).toBe('check');

      const activeSuspects = SUSPECTS_DIRECTORY.filter(s => !state.getSuspectStatus(s).isEliminated);
      const activeWeapons = WEAPONS.filter(w => !state.getWeaponStatus(w.id).isEliminated);
      const activeRooms = LOCATIONS.filter(r => !state.getRoomStatus(r.id).isEliminated);

      expect(activeSuspects.map(s => s.id)).toEqual([activeCase.config.culpritId]);
      expect(activeWeapons.map(w => w.id)).toEqual([activeCase.config.weaponId]);
      expect(activeRooms.map(r => r.id)).toEqual([activeCase.config.locationId]);
    });
  });

  describe('Deceased victims (Doors 2-5) & manual elimination guard', () => {
    it('allows manual toggling before Door 2 opens, promotes to victim on openDoor(2), and blocks untoggling afterwards in both modes', () => {
      for (const mode of ['manual', 'auto'] as const) {
        resetSingletonStore();
        useGameStore.getState().setGameMode(mode);

        const activeCase = useGameStore.getState().activeCase;
        const act2 = activeCase.acts.find(a => a.act === 2)!;
        const victimSuspect = SUSPECTS_DIRECTORY.find(s => s.id === act2.victimId)!;

        // Pre-door manual toggle is allowed
        useGameStore.getState().toggleManualElimination(victimSuspect.id);
        expect(useGameStore.getState().manualEliminations).toContain(victimSuspect.id);
        expect(useGameStore.getState().getSuspectStatus(victimSuspect).isManual).toBe(true);

        // Complete Days 1..6 so Act 2 Door unlocks, then open Door 2
        for (let d = 1; d <= 6; d++) {
          const dayData = activeCase.days[d - 1];
          useGameStore.getState().markDayCompleted(dayData.day, dayData.unlockedClue);
        }
        useGameStore.getState().openDoor(2);
        expect(useGameStore.getState().openedDoors).toContain(2);

        // Victim status must now be isVictim: true, isManual: false, isEliminated: true in BOTH modes
        const postDoorStatus = useGameStore.getState().getSuspectStatus(victimSuspect);
        expect(postDoorStatus.isEliminated).toBe(true);
        expect(postDoorStatus.isVictim).toBe(true);
        expect(postDoorStatus.victimAct).toBe(2);
        expect(postDoorStatus.isManual).toBe(false);

        // Attempting to toggle manual elimination on opened Door 2 victim is blocked
        const pencilSpy = vi.spyOn(sound, 'playPencil');
        const errorSpy = vi.spyOn(sound, 'playError');
        const beforeManualList = [...useGameStore.getState().manualEliminations];

        useGameStore.getState().toggleManualElimination(victimSuspect.id);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(pencilSpy).not.toHaveBeenCalled();
        expect(useGameStore.getState().manualEliminations).toEqual(beforeManualList);
        expect(useGameStore.getState().getSuspectStatus(victimSuspect).isEliminated).toBe(true);

        pencilSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('blocks toggleManualElimination on opened victims for Doors 3, 4, and 5', () => {
      useGameStore.getState().setGameMode('manual');
      const activeCase = useGameStore.getState().activeCase;

      for (let d = 1; d <= 24; d++) {
        const dayData = activeCase.days[d - 1];
        useGameStore.getState().markDayCompleted(dayData.day, dayData.unlockedClue);
      }
      for (const actNum of [2, 3, 4, 5] as const) {
        useGameStore.getState().openDoor(actNum);
      }

      for (const actNum of [2, 3, 4, 5] as const) {
        const actFile = activeCase.acts.find(a => a.act === actNum)!;
        const victim = SUSPECTS_DIRECTORY.find(s => s.id === actFile.victimId)!;

        expect(useGameStore.getState().getSuspectStatus(victim).isVictim).toBe(true);
        useGameStore.getState().toggleManualElimination(victim.id);
        expect(useGameStore.getState().manualEliminations).not.toContain(victim.id);
        expect(useGameStore.getState().getSuspectStatus(victim).isEliminated).toBe(true);
      }
    });
  });

  describe('Independent manual eliminations for suspects, 18 weapons, and 9 rooms', () => {
    it('independently toggles and restores all 18 weapons, all 9 rooms, and suspects in manual mode', () => {
      useGameStore.getState().setGameMode('manual');

      const suspectA = SUSPECTS_DIRECTORY[0];
      const suspectB = SUSPECTS_DIRECTORY[1];
      useGameStore.getState().toggleManualElimination(suspectA.id);
      expect(useGameStore.getState().getSuspectStatus(suspectA).isEliminated).toBe(true);
      expect(useGameStore.getState().getSuspectStatus(suspectB).isEliminated).toBe(false);
      useGameStore.getState().toggleManualElimination(suspectA.id);
      expect(useGameStore.getState().getSuspectStatus(suspectA).isEliminated).toBe(false);

      // All 18 weapons
      expect(WEAPONS).toHaveLength(18);
      for (const weapon of WEAPONS) {
        useGameStore.getState().toggleManualWeaponElimination(weapon.id);
      }
      expect(useGameStore.getState().manualWeaponEliminations).toHaveLength(18);
      for (const weapon of WEAPONS) {
        expect(useGameStore.getState().getWeaponStatus(weapon.id)).toEqual({
          isEliminated: true,
          isManual: true,
          isAutoEliminated: false,
        });
      }
      // Restore first weapon without affecting the other 17
      useGameStore.getState().toggleManualWeaponElimination(WEAPONS[0].id);
      expect(useGameStore.getState().getWeaponStatus(WEAPONS[0].id).isEliminated).toBe(false);
      expect(useGameStore.getState().getWeaponStatus(WEAPONS[1].id).isEliminated).toBe(true);

      // All 9 rooms
      expect(LOCATIONS).toHaveLength(9);
      for (const room of LOCATIONS) {
        useGameStore.getState().toggleManualRoomElimination(room.id);
      }
      expect(useGameStore.getState().manualRoomEliminations).toHaveLength(9);
      for (const room of LOCATIONS) {
        expect(useGameStore.getState().getRoomStatus(room.id)).toEqual({
          isEliminated: true,
          isManual: true,
          isAutoEliminated: false,
        });
      }
      // Restore first room without affecting the other 8
      useGameStore.getState().toggleManualRoomElimination(LOCATIONS[0].id);
      expect(useGameStore.getState().getRoomStatus(LOCATIONS[0].id).isEliminated).toBe(false);
      expect(useGameStore.getState().getRoomStatus(LOCATIONS[1].id).isEliminated).toBe(true);
    });
  });

  describe('Mode lock, session ID & reset/new-case lifecycle', () => {
    it('locks setGameMode once selected, unlocks on resetGame and seedless startNewCase, and increments gameSessionId', () => {
      const initialSession = useGameStore.getState().gameSessionId;
      expect(useGameStore.getState().hasSelectedGameMode).toBe(false);

      // First selection locks mode
      useGameStore.getState().setGameMode('manual');
      expect(useGameStore.getState().gameMode).toBe('manual');
      expect(useGameStore.getState().hasSelectedGameMode).toBe(true);

      // Subsequent setGameMode is ignored while locked
      const clickSpy = vi.spyOn(sound, 'playClick');
      useGameStore.getState().setGameMode('auto');
      expect(useGameStore.getState().gameMode).toBe('manual');
      expect(useGameStore.getState().hasSelectedGameMode).toBe(true);
      expect(clickSpy).not.toHaveBeenCalled();

      // Add manual eliminations before seeded startNewCase
      useGameStore.getState().toggleManualElimination(SUSPECTS_DIRECTORY[0].id);
      useGameStore.getState().toggleManualWeaponElimination(WEAPONS[0].id);
      useGameStore.getState().toggleManualRoomElimination(LOCATIONS[0].id);

      // Seeded startNewCase clears manual eliminations, increments gameSessionId, preserves lock
      useGameStore.getState().startNewCase(7771924);
      expect(useGameStore.getState().caseSeed).toBe(7771924);
      expect(useGameStore.getState().gameSessionId).toBe(initialSession + 1);
      expect(useGameStore.getState().hasSelectedGameMode).toBe(true);
      expect(useGameStore.getState().gameMode).toBe('manual');
      expect(useGameStore.getState().manualEliminations).toEqual([]);
      expect(useGameStore.getState().manualWeaponEliminations).toEqual([]);
      expect(useGameStore.getState().manualRoomEliminations).toEqual([]);

      // resetGame preserves caseSeed, clears manual lists, increments gameSessionId, unlocks mode
      useGameStore.getState().toggleManualElimination(SUSPECTS_DIRECTORY[1].id);
      useGameStore.getState().toggleManualWeaponElimination(WEAPONS[1].id);
      useGameStore.getState().toggleManualRoomElimination(LOCATIONS[1].id);
      useGameStore.getState().resetGame();

      expect(useGameStore.getState().caseSeed).toBe(7771924);
      expect(useGameStore.getState().gameSessionId).toBe(initialSession + 2);
      expect(useGameStore.getState().hasSelectedGameMode).toBe(false);
      expect(useGameStore.getState().manualEliminations).toEqual([]);
      expect(useGameStore.getState().manualWeaponEliminations).toEqual([]);
      expect(useGameStore.getState().manualRoomEliminations).toEqual([]);

      // Mode can now be selected again
      useGameStore.getState().setGameMode('auto');
      expect(useGameStore.getState().gameMode).toBe('auto');
      expect(useGameStore.getState().hasSelectedGameMode).toBe(true);

      // Seedless startNewCase unlocks mode and increments gameSessionId
      useGameStore.getState().toggleManualWeaponElimination(WEAPONS[2].id);
      useGameStore.getState().toggleManualRoomElimination(LOCATIONS[2].id);
      useGameStore.getState().startNewCase();

      expect(useGameStore.getState().hasSelectedGameMode).toBe(false);
      expect(useGameStore.getState().gameSessionId).toBe(initialSession + 3);
      expect(useGameStore.getState().manualWeaponEliminations).toEqual([]);
      expect(useGameStore.getState().manualRoomEliminations).toEqual([]);
    });
  });

  describe('Persistence migrate & merge safety', () => {
    it('safely hydrates legacy v3 persisted state missing new fields and migrates v2 state', async () => {
      const backing = new Map<string, string>();
      const mockStorage = {
        getItem: (key: string) => backing.get(key) ?? null,
        setItem: (key: string, value: string) => {
          backing.set(key, value);
        },
        removeItem: (key: string) => {
          backing.delete(key);
        },
      };

      backing.set(
        'villa-acebo-game-storage',
        JSON.stringify({
          version: 3,
          state: {
            caseSeed: 20261224,
            currentDay: 2,
            completedDays: [1],
            openedDoors: [1],
            manualEliminations: [SUSPECTS_DIRECTORY[0].id],
            gameMode: 'manual',
            hasSelectedGameMode: true,
          },
        })
      );

      vi.stubGlobal('window', { localStorage: mockStorage });
      vi.resetModules();

      try {
        const { useGameStore: hydratedStore } = await import('../src/store/useGameStore');
        const state = hydratedStore.getState();

        expect(state.caseSeed).toBe(20261224);
        expect(state.manualEliminations).toEqual([SUSPECTS_DIRECTORY[0].id]);
        expect(state.manualWeaponEliminations).toEqual([]);
        expect(state.manualRoomEliminations).toEqual([]);
        expect(state.gameMode).toBe('manual');
        expect(state.hasSelectedGameMode).toBe(true);
        expect(typeof state.gameSessionId).toBe('number');
        expect(Number.isFinite(state.gameSessionId)).toBe(true);

        const persistOptions = hydratedStore.persist.getOptions();

        // Corrupted fields fall back safely via merge
        const sanitized = persistOptions.merge!(
          {
            caseSeed: 20261224,
            manualWeaponEliminations: 'invalid',
            manualRoomEliminations: [123, 'candela'],
            gameMode: 'cheating',
            hasSelectedGameMode: 'yes',
            gameSessionId: Number.NaN,
          },
          state
        );
        expect(sanitized.manualWeaponEliminations).toEqual([]);
        expect(sanitized.manualRoomEliminations).toEqual(['candela']);
        expect(sanitized.gameMode).toBe(state.gameMode);
        expect(sanitized.hasSelectedGameMode).toBe(state.hasSelectedGameMode);
        expect(sanitized.gameSessionId).toBe(state.gameSessionId);

        // Migrate v2 -> v3 fallback
        const migrated = persistOptions.migrate!({ old: true }, 2) as Record<string, unknown>;
        expect(migrated.manualWeaponEliminations).toEqual([]);
        expect(migrated.manualRoomEliminations).toEqual([]);
        expect(migrated.gameMode).toBe('auto');
        expect(migrated.hasSelectedGameMode).toBe(false);
        expect(migrated.gameSessionId).toBe(1);

        // Verify partialize includes new M1 fields
        hydratedStore.getState().toggleManualWeaponElimination(WEAPONS[0].id);
        hydratedStore.getState().toggleManualRoomElimination(LOCATIONS[0].id);
        const persistedRaw = JSON.parse(backing.get('villa-acebo-game-storage')!);
        expect(persistedRaw.state.manualWeaponEliminations).toEqual([WEAPONS[0].id]);
        expect(persistedRaw.state.manualRoomEliminations).toEqual([LOCATIONS[0].id]);
        expect(typeof persistedRaw.state.gameSessionId).toBe('number');
      } finally {
        vi.unstubAllGlobals();
        vi.resetModules();
      }
    });
  });

  describe('Shared type contract', () => {
    it('PuzzleComponentProps accepts optional gameMode of type GameMode', () => {
      const mode: GameMode = 'manual';
      const dummyConfig = {} as SudokuConfig;
      const withMode: PuzzleComponentProps<SudokuConfig> = {
        config: dummyConfig,
        onSolve: () => {},
        isSolved: false,
        hints: [],
        gameMode: mode,
      };
      const withoutMode: PuzzleComponentProps<SudokuConfig> = {
        config: dummyConfig,
        onSolve: () => {},
        isSolved: false,
        hints: [],
      };
      expect(withMode.gameMode).toBe('manual');
      expect(withoutMode.gameMode).toBeUndefined();
    });
  });
});
