import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Clue,
  ClueEvaluationResult,
  DirectorySuspect,
  GeneratedCase,
  MatrixCellState,
  VerdictResult,
} from '../types/game';
import {
  TOTAL_DAYS,
  createRandomSeed,
  evaluateCaseClues,
  getCaseForSeed,
  verifyCaseVerdict,
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

export function computeSuspectStatus(
  suspect: DirectorySuspect,
  manualEliminations: readonly string[],
  unlockedClues: readonly Clue[],
  activeCase: GeneratedCase,
  openedDoors: readonly number[] = []
): SuspectStatus {
  // Si el personaje cayó como víctima al abrirse una Puerta (Actos II–V), se tacha automáticamente
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

interface GameStoreState {
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
  notes: Record<number, string>;
  freePlayMode: boolean;
  gameMode: 'auto' | 'manual';
  hasSelectedGameMode: boolean;
  activeView: 'book' | 'calendar' | 'dossier' | 'verdict';

  // Acciones
  setCurrentDay: (day: number) => void;
  openDoor: (act: number) => void;
  setActiveView: (view: 'book' | 'calendar' | 'dossier' | 'verdict') => void;
  setGameMode: (mode: 'auto' | 'manual') => void;
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
  toggleFreePlayMode: () => void;
  setNote: (day: number, text: string) => void;
  startNewCase: (seed?: number) => void;
  resetGame: () => void;
  verifyVerdict: (suspectId: string, weaponId: string, locationId: string) => VerdictResult;

  // Selectores dinámicos basados en pistas desbloqueadas
  getClueEvaluation: () => ClueEvaluationResult;
  getSuspectStatus: (suspect: DirectorySuspect) => SuspectStatus;
}

sound.setMuted(false);

const INITIAL_SEED = createRandomSeed();
const INITIAL_CASE = getCaseForSeed(INITIAL_SEED);

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
      notes: {},
      freePlayMode: false,
      gameMode: 'auto',
      hasSelectedGameMode: false,
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
        sound.playClick();
        set({ gameMode: mode, hasSelectedGameMode: true });
      },

      markDayCompleted: (day, clue, autoEliminations) => {
        const { completedDays, unlockedDays, unlockedClues, matrixCells } = get();

        sound.playWaxSeal();
        sound.playMysteryBell();

        const newCompleted = completedDays.includes(day) ? completedDays : [...completedDays, day];
        const nextDay = Math.min(TOTAL_DAYS, day + 1);
        const newUnlocked = unlockedDays.includes(nextDay) ? unlockedDays : [...unlockedDays, nextDay];

        const newClues = unlockedClues.some(c => c.id === clue.id || c.day === clue.day)
          ? unlockedClues
          : [...unlockedClues, clue];

        const updatedCells = { ...matrixCells };
        if (autoEliminations?.confirmedMatches) {
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
        sound.playPencil();
        const current = get().manualEliminations;
        const exists = current.includes(suspectId);
        set({
          manualEliminations: exists
            ? current.filter(id => id !== suspectId)
            : [...current, suspectId],
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
          notes: {},
          hasSelectedGameMode: seed !== undefined ? get().hasSelectedGameMode : false,
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
          notes: {},
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
        const { manualEliminations, unlockedClues, activeCase, openedDoors } = get();
        return computeSuspectStatus(suspect, manualEliminations, unlockedClues, activeCase, openedDoors);
      },
    }),
    {
      name: 'villa-acebo-game-storage',
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
        notes: state.notes,
        freePlayMode: state.freePlayMode,
        gameMode: state.gameMode,
        hasSelectedGameMode: state.hasSelectedGameMode,
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
            notes: {},
            freePlayMode: false,
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
          notes: Record<number, string>;
          freePlayMode: boolean;
          activeView: 'book' | 'calendar' | 'dossier' | 'verdict';
        };
        return p;
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

        return {
          ...currentState,
          ...(persisted as Partial<GameStoreState>),
          totalDays: TOTAL_DAYS,
          caseSeed: seed,
          activeCase,
          currentDay: safeCurrentDay,
          openedDoors: validOpenedDoors,
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
