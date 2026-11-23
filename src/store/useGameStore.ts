import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type {
  Clue,
  ClueEvaluationResult,
  DirectorySuspect,
  GameMode,
  GeneratedCase,
  MatrixCellState,
  VerdictResult,
} from '../types/game';
import { LOCATIONS, WEAPONS } from '../data/narrativeBible';
import {
  TOTAL_DAYS,
  createRandomSeed,
  evaluateCaseClues,
  getCaseForSeed,
  roomMatches,
  verifyCaseVerdict,
  weaponMatches,
} from '../engine/caseGenerator';
import { sound } from '../utils/soundEffects';

export interface SuspectStatus {
  isEliminated: boolean;
  isVictim?: boolean;
  victimAct?: number;
  reason?: string;
  dayEliminated?: number;
  isManual: boolean;
}

export interface ElementStatus {
  isEliminated: boolean;
  isManual: boolean;
  isAutoEliminated: boolean;
}

export type WeaponStatus = ElementStatus;
export type RoomStatus = ElementStatus;

export function computeSuspectStatus(
  suspect: DirectorySuspect,
  manualEliminations: readonly string[],
  unlockedClues: readonly Clue[],
  activeCase: GeneratedCase,
  openedDoors: readonly number[] = [],
  gameMode: GameMode = 'auto'
): SuspectStatus {
  // Si el personaje cayó como víctima al abrirse una Puerta (Actos II–V), se tacha automáticamente en ambos modos
  for (const actFile of activeCase.acts) {
    if (actFile.act >= 2 && openedDoors.includes(actFile.act) && actFile.victimId === suspect.id) {
      return {
        isEliminated: true,
        isVictim: true,
        victimAct: actFile.act,
        reason: `Fallecido · Víctima del Acto ${actFile.doorRoman} (${actFile.sceneLocationName})`,
        dayEliminated: actFile.dayStart,
        isManual: false,
      };
    }
  }

  if (gameMode === 'auto') {
    for (const clue of unlockedClues) {
      const dayRecord = activeCase.days.find(d => d.day === clue.day);
      const eliminated = dayRecord?.unlockedClue.autoEliminations?.suspectsEliminated ?? [];
      if (eliminated.includes(suspect.id)) {
        return {
          isEliminated: true,
          reason: `Descartado por la pista del Día ${clue.day}: ${clue.impact}`,
          dayEliminated: clue.day,
          isManual: false,
        };
      }
    }
  }

  if (manualEliminations.includes(suspect.id)) {
    return {
      isEliminated: true,
      reason: 'Descartado manualmente en las notas del detective',
      isManual: true,
    };
  }

  return {
    isEliminated: false,
    isManual: false,
  };
}

export function computeWeaponStatus(
  weaponId: string,
  manualWeaponEliminations: readonly string[],
  unlockedClues: readonly Clue[],
  gameMode: GameMode = 'auto'
): ElementStatus {
  const isManual = manualWeaponEliminations.includes(weaponId);
  let isAutoEliminated = false;
  if (gameMode === 'auto' && unlockedClues.length > 0) {
    const weapon = WEAPONS.find(w => w.id === weaponId);
    if (weapon) {
      const preds = unlockedClues.flatMap(c => c.predicates ?? []);
      isAutoEliminated = preds.some(p => !weaponMatches(p, weapon));
    }
  }
  return {
    isEliminated: isAutoEliminated || isManual,
    isManual,
    isAutoEliminated,
  };
}

export function computeRoomStatus(
  roomId: string,
  manualRoomEliminations: readonly string[],
  unlockedClues: readonly Clue[],
  gameMode: GameMode = 'auto'
): ElementStatus {
  const isManual = manualRoomEliminations.includes(roomId);
  let isAutoEliminated = false;
  if (gameMode === 'auto' && unlockedClues.length > 0) {
    const room = LOCATIONS.find(l => l.id === roomId);
    if (room) {
      const preds = unlockedClues.flatMap(c => c.predicates ?? []);
      isAutoEliminated = preds.some(p => !roomMatches(p, room));
    }
  }
  return {
    isEliminated: isAutoEliminated || isManual,
    isManual,
    isAutoEliminated,
  };
}

export function isActUnlocked(act: number, completedDays: readonly number[]): boolean {
  if (act <= 1) return true;
  const prevStart = (act - 2) * 6 + 1;
  const prevEnd = (act - 1) * 6;
  for (let d = prevStart; d <= prevEnd; d++) {
    if (!completedDays.includes(d)) return false;
  }
  return true;
}

export function getMaxUnlockedAct(completedDays: readonly number[]): 1 | 2 | 3 | 4 | 5 {
  for (let act = 5; act >= 1; act--) {
    if (isActUnlocked(act, completedDays)) return act as 1 | 2 | 3 | 4 | 5;
  }
  return 1;
}

export function isDayUnlockedByDoors(day: number, completedDays: readonly number[]): boolean {
  if (day <= 0) return true;
  const act = Math.ceil(day / 6);
  return isActUnlocked(act, completedDays);
}

export interface GameStoreState {
  totalDays: number;
  caseSeed: number;
  activeCase: GeneratedCase;
  currentDay: number;
  unlockedDays: number[];
  completedDays: number[];
  openedDoors: number[];
  unlockedClues: Clue[];
  matrixCells: Record<string, MatrixCellState>;
  manualEliminations: string[];
  manualWeaponEliminations: string[];
  manualRoomEliminations: string[];
  notes: Record<number, string>;
  freePlayMode: boolean;
  gameMode: GameMode;
  hasSelectedGameMode: boolean;
  gameSessionId: number;
  activeView: 'book' | 'calendar' | 'dossier' | 'verdict';

  // Acciones
  setCurrentDay: (day: number) => void;
  openDoor: (act: number) => void;
  setActiveView: (view: 'book' | 'calendar' | 'dossier' | 'verdict') => void;
  setGameMode: (mode: GameMode) => void;
  markDayCompleted: (
    day: number,
    clue: Clue,
    autoEliminations?: {
      suspectsEliminated?: string[];
      weaponsEliminated?: string[];
      roomsEliminated?: string[];
      confirmedMatches?: Array<{ suspect?: string; weapon?: string; room?: string }>;
    }
  ) => void;
  setMatrixCell: (key: string, state: MatrixCellState) => void;
  cycleMatrixCell: (key: string) => void;
  toggleManualElimination: (suspectId: string) => void;
  toggleManualWeaponElimination: (weaponId: string) => void;
  toggleManualRoomElimination: (roomId: string) => void;
  toggleFreePlayMode: () => void;
  setNote: (day: number, text: string) => void;
  startNewCase: (seed?: number) => void;
  resetGame: () => void;
  verifyVerdict: (suspectId: string, weaponId: string, locationId: string) => VerdictResult;

  // Selectores dinámicos basados en pistas desbloqueadas
  getClueEvaluation: () => ClueEvaluationResult;
  getSuspectStatus: (suspect: DirectorySuspect) => SuspectStatus;
  getWeaponStatus: (weaponId: string) => ElementStatus;
  getRoomStatus: (roomId: string) => ElementStatus;
}

sound.setMuted(false);

const INITIAL_SEED = createRandomSeed();
const INITIAL_CASE = getCaseForSeed(INITIAL_SEED);

const memoryFallbackStore = new Map<string, string>();
const fallbackMemoryStorage: StateStorage = {
  getItem: name => memoryFallbackStore.get(name) ?? null,
  setItem: (name, value) => {
    memoryFallbackStore.set(name, value);
  },
  removeItem: name => {
    memoryFallbackStore.delete(name);
  },
};

function resolvePersistStorage(): StateStorage {
  if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
    return window.localStorage;
  }
  return fallbackMemoryStorage;
}

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      totalDays: TOTAL_DAYS,
      caseSeed: INITIAL_SEED,
      activeCase: INITIAL_CASE,
      currentDay: 0,
      unlockedDays: [0, 1, 2, 3, 4, 5, 6],
      completedDays: [],
      openedDoors: [],
      unlockedClues: [],
      matrixCells: {},
      manualEliminations: [],
      manualWeaponEliminations: [],
      manualRoomEliminations: [],
      notes: {},
      freePlayMode: false,
      gameMode: 'auto',
      hasSelectedGameMode: false,
      gameSessionId: 1,
      activeView: 'book',

      setCurrentDay: (day: number) => {
        const clamped = Math.max(0, Math.min(TOTAL_DAYS, day));
        const { completedDays } = get();
        if (clamped > 0 && !isDayUnlockedByDoors(clamped, completedDays)) {
          sound.playError();
          return;
        }
        sound.playPageTurn();
        set({ currentDay: clamped, activeView: 'book' });
      },

      openDoor: (act: number) => {
        const { completedDays, openedDoors } = get();
        if (!isActUnlocked(act, completedDays)) {
          sound.playError();
          return;
        }
        sound.playWoodCreak();
        sound.playPageTurn();
        if (!openedDoors.includes(act)) {
          set({ openedDoors: [...openedDoors, act] });
        }
      },

      setActiveView: view => {
        sound.playPageTurn();
        set({ activeView: view });
      },

      setGameMode: mode => {
        if (get().hasSelectedGameMode) return;
        sound.playClick();
        set({ gameMode: mode, hasSelectedGameMode: true });
      },

      markDayCompleted: (day, clue, autoEliminations) => {
        const { completedDays, unlockedDays, unlockedClues, matrixCells, gameMode } = get();

        sound.playWaxSeal();
        sound.playMysteryBell();

        const newCompleted = completedDays.includes(day) ? completedDays : [...completedDays, day];
        const nextDay = Math.min(TOTAL_DAYS, day + 1);
        const newUnlocked = unlockedDays.includes(nextDay) ? unlockedDays : [...unlockedDays, nextDay];

        const newClues = unlockedClues.some(c => c.id === clue.id || c.day === clue.day)
          ? unlockedClues
          : [...unlockedClues, clue];

        const updatedCells = { ...matrixCells };
        if (gameMode === 'auto' && autoEliminations?.confirmedMatches) {
          for (const match of autoEliminations.confirmedMatches) {
            if (match.suspect && match.weapon) {
              updatedCells[`${match.suspect}:${match.weapon}`] = 'check';
            }
            if (match.suspect && match.room) {
              updatedCells[`${match.suspect}:${match.room}`] = 'check';
            }
          }
        }

        set({
          completedDays: newCompleted,
          unlockedDays: newUnlocked,
          unlockedClues: newClues,
          matrixCells: updatedCells,
        });
      },

      setMatrixCell: (key, state) => {
        sound.playPencil();
        set(prev => ({
          matrixCells: {
            ...prev.matrixCells,
            [key]: state,
          },
        }));
      },

      cycleMatrixCell: key => {
        sound.playPencil();
        const current = get().matrixCells[key] || 'neutral';
        const nextState: Record<MatrixCellState, MatrixCellState> = {
          neutral: 'cross',
          cross: 'check',
          check: 'question',
          question: 'neutral',
        };
        const next = nextState[current];
        set(prev => ({
          matrixCells: {
            ...prev.matrixCells,
            [key]: next,
          },
        }));
      },

      toggleManualElimination: suspectId => {
        const { activeCase, openedDoors, manualEliminations } = get();
        const isOpenedVictim = activeCase.acts.some(
          actFile =>
            actFile.act >= 2 &&
            openedDoors.includes(actFile.act) &&
            actFile.victimId === suspectId
        );
        if (isOpenedVictim) {
          sound.playError();
          return;
        }
        sound.playPencil();
        const exists = manualEliminations.includes(suspectId);
        set({
          manualEliminations: exists
            ? manualEliminations.filter(id => id !== suspectId)
            : [...manualEliminations, suspectId],
        });
      },

      toggleManualWeaponElimination: weaponId => {
        sound.playPencil();
        const current = get().manualWeaponEliminations;
        const exists = current.includes(weaponId);
        set({
          manualWeaponEliminations: exists
            ? current.filter(id => id !== weaponId)
            : [...current, weaponId],
        });
      },

      toggleManualRoomElimination: roomId => {
        sound.playPencil();
        const current = get().manualRoomEliminations;
        const exists = current.includes(roomId);
        set({
          manualRoomEliminations: exists
            ? current.filter(id => id !== roomId)
            : [...current, roomId],
        });
      },

      toggleFreePlayMode: () => {
        set(prev => ({ freePlayMode: !prev.freePlayMode }));
      },

      setNote: (day, text) => {
        set(prev => ({
          notes: {
            ...prev.notes,
            [day]: text,
          },
        }));
      },

      startNewCase: seed => {
        let nextSeed = seed !== undefined ? seed >>> 0 : createRandomSeed();
        if (seed === undefined && nextSeed === get().caseSeed) {
          nextSeed = (nextSeed + 1013904223) >>> 0;
        }
        const nextCase = getCaseForSeed(nextSeed);
        sound.playPageTurn();
        set({
          totalDays: TOTAL_DAYS,
          caseSeed: nextSeed,
          activeCase: nextCase,
          currentDay: 0,
          unlockedDays: [0, 1, 2, 3, 4, 5, 6],
          completedDays: [],
          openedDoors: [],
          unlockedClues: [],
          matrixCells: {},
          manualEliminations: [],
          manualWeaponEliminations: [],
          manualRoomEliminations: [],
          notes: {},
          hasSelectedGameMode: seed !== undefined ? get().hasSelectedGameMode : false,
          gameSessionId: get().gameSessionId + 1,
          activeView: 'book',
        });
      },

      resetGame: () => {
        // Reinicia el progreso manteniendo la semilla actual del caso
        set({
          currentDay: 0,
          unlockedDays: [0, 1, 2, 3, 4, 5, 6],
          completedDays: [],
          openedDoors: [],
          unlockedClues: [],
          matrixCells: {},
          manualEliminations: [],
          manualWeaponEliminations: [],
          manualRoomEliminations: [],
          notes: {},
          hasSelectedGameMode: false,
          gameSessionId: get().gameSessionId + 1,
          activeView: 'book',
        });
      },

      verifyVerdict: (suspectId, weaponId, locationId) => {
        const { activeCase } = get();
        return verifyCaseVerdict(activeCase.config, suspectId, weaponId, locationId);
      },

      getClueEvaluation: () => {
        const { unlockedClues } = get();
        return evaluateCaseClues(unlockedClues);
      },

      getSuspectStatus: suspect => {
        const { manualEliminations, unlockedClues, activeCase, openedDoors, gameMode } = get();
        return computeSuspectStatus(
          suspect,
          manualEliminations,
          unlockedClues,
          activeCase,
          openedDoors,
          gameMode
        );
      },

      getWeaponStatus: weaponId => {
        const { manualWeaponEliminations, unlockedClues, gameMode } = get();
        return computeWeaponStatus(weaponId, manualWeaponEliminations, unlockedClues, gameMode);
      },

      getRoomStatus: roomId => {
        const { manualRoomEliminations, unlockedClues, gameMode } = get();
        return computeRoomStatus(roomId, manualRoomEliminations, unlockedClues, gameMode);
      },
    }),
    {
      name: 'villa-acebo-game-storage',
      storage: createJSONStorage(resolvePersistStorage),
      version: 3,
      partialize: state => ({
        caseSeed: state.caseSeed,
        activeCase: {
          config: state.activeCase.config,
          murderNarrative: state.activeCase.murderNarrative,
        },
        currentDay: state.currentDay,
        unlockedDays: state.unlockedDays,
        completedDays: state.completedDays,
        openedDoors: state.openedDoors,
        unlockedClues: state.unlockedClues,
        matrixCells: state.matrixCells,
        manualEliminations: state.manualEliminations,
        manualWeaponEliminations: state.manualWeaponEliminations,
        manualRoomEliminations: state.manualRoomEliminations,
        notes: state.notes,
        freePlayMode: state.freePlayMode,
        gameMode: state.gameMode,
        hasSelectedGameMode: state.hasSelectedGameMode,
        gameSessionId: state.gameSessionId,
        activeView: state.activeView,
      }),
      migrate: (persistedState, version) => {
        if (version < 3 || !persistedState || typeof persistedState !== 'object') {
          const freshSeed = createRandomSeed();
          return {
            caseSeed: freshSeed,
            currentDay: 0,
            unlockedDays: [0, 1, 2, 3, 4, 5, 6],
            completedDays: [],
            openedDoors: [],
            unlockedClues: [],
            matrixCells: {},
            manualEliminations: [],
            manualWeaponEliminations: [],
            manualRoomEliminations: [],
            notes: {},
            freePlayMode: false,
            gameMode: 'auto' as GameMode,
            hasSelectedGameMode: false,
            gameSessionId: 1,
            activeView: 'book' as const,
          };
        }
        const p = persistedState as {
          caseSeed: number;
          currentDay: number;
          unlockedDays: number[];
          completedDays: number[];
          unlockedClues: Clue[];
          matrixCells: Record<string, MatrixCellState>;
          manualEliminations: string[];
          manualWeaponEliminations?: string[];
          manualRoomEliminations?: string[];
          notes: Record<number, string>;
          freePlayMode: boolean;
          gameMode?: GameMode;
          hasSelectedGameMode?: boolean;
          gameSessionId?: number;
          activeView: 'book' | 'calendar' | 'dossier' | 'verdict';
        };
        return {
          ...p,
          manualWeaponEliminations: Array.isArray(p.manualWeaponEliminations)
            ? p.manualWeaponEliminations
            : [],
          manualRoomEliminations: Array.isArray(p.manualRoomEliminations)
            ? p.manualRoomEliminations
            : [],
        };
      },
      merge: (persistedState, currentState) => {
        const persisted =
          persistedState && typeof persistedState === 'object'
            ? { ...(persistedState as Record<string, unknown>) }
            : {};
        delete persisted.soundMuted;
        const seed =
          typeof persisted.caseSeed === 'number' && Number.isFinite(persisted.caseSeed)
            ? persisted.caseSeed >>> 0
            : currentState.caseSeed;
        const activeCase = getCaseForSeed(seed);
        const persistedCompleted = Array.isArray(persisted.completedDays)
          ? (persisted.completedDays as number[])
          : currentState.completedDays;
        const rawOpenedDoors = Array.isArray(persisted.openedDoors)
          ? (persisted.openedDoors as number[])
          : currentState.openedDoors;
        const validOpenedDoors = rawOpenedDoors.filter(act =>
          isActUnlocked(act, persistedCompleted)
        );
        const persistedDay =
          typeof persisted.currentDay === 'number' ? persisted.currentDay : currentState.currentDay;
        const safeCurrentDay =
          persistedDay > 0 && !isDayUnlockedByDoors(persistedDay, persistedCompleted)
            ? 0
            : persistedDay;

        const manualEliminations = Array.isArray(persisted.manualEliminations)
          ? (persisted.manualEliminations.filter(x => typeof x === 'string') as string[])
          : currentState.manualEliminations;
        const manualWeaponEliminations = Array.isArray(persisted.manualWeaponEliminations)
          ? (persisted.manualWeaponEliminations.filter(x => typeof x === 'string') as string[])
          : currentState.manualWeaponEliminations;
        const manualRoomEliminations = Array.isArray(persisted.manualRoomEliminations)
          ? (persisted.manualRoomEliminations.filter(x => typeof x === 'string') as string[])
          : currentState.manualRoomEliminations;
        const gameMode: GameMode =
          persisted.gameMode === 'auto' || persisted.gameMode === 'manual'
            ? persisted.gameMode
            : currentState.gameMode;
        const hasSelectedGameMode =
          typeof persisted.hasSelectedGameMode === 'boolean'
            ? persisted.hasSelectedGameMode
            : currentState.hasSelectedGameMode;
        const gameSessionId =
          typeof persisted.gameSessionId === 'number' && Number.isFinite(persisted.gameSessionId)
            ? persisted.gameSessionId
            : currentState.gameSessionId;

        return {
          ...currentState,
          ...(persisted as Partial<GameStoreState>),
          totalDays: TOTAL_DAYS,
          caseSeed: seed,
          activeCase,
          currentDay: safeCurrentDay,
          openedDoors: validOpenedDoors,
          manualEliminations,
          manualWeaponEliminations,
          manualRoomEliminations,
          gameMode,
          hasSelectedGameMode,
          gameSessionId,
          freePlayMode: false,
        };
      },
      onRehydrateStorage: () => () => {
        sound.setMuted(false);
      },
    }
  )
);

if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
  try {
    if (!window.localStorage.getItem('villa-acebo-game-storage')) {
      useGameStore.setState(s => ({ caseSeed: s.caseSeed }));
    }
  } catch {
    // ignore storage access issues
  }
}
