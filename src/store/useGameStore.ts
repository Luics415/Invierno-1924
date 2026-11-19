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
  reason?: string;
  dayEliminated?: number;
  isManual: boolean;
}

export function computeSuspectStatus(
  suspect: DirectorySuspect,
  manualEliminations: readonly string[],
  unlockedClues: readonly Clue[],
  activeCase: GeneratedCase
): SuspectStatus {
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

interface GameStoreState {
  totalDays: number;
  caseSeed: number;
  activeCase: GeneratedCase;
  currentDay: number;
  unlockedDays: number[];
  completedDays: number[];
  unlockedClues: Clue[];
  matrixCells: Record<string, MatrixCellState>;
  manualEliminations: string[];
  notes: Record<number, string>;
  freePlayMode: boolean;
  activeView: 'book' | 'calendar' | 'dossier' | 'verdict';

  // Acciones
  setCurrentDay: (day: number) => void;
  setActiveView: (view: 'book' | 'calendar' | 'dossier' | 'verdict') => void;
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
      unlockedDays: [0, 1],
      completedDays: [],
      unlockedClues: [],
      matrixCells: {},
      manualEliminations: [],
      notes: {},
      freePlayMode: true,
      activeView: 'book',

      setCurrentDay: (day: number) => {
        const clamped = Math.max(0, Math.min(TOTAL_DAYS, day));
        sound.playPageTurn();
        set({ currentDay: clamped, activeView: 'book' });
      },

      setActiveView: view => {
        sound.playPageTurn();
        set({ activeView: view });
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
          unlockedDays: [0, 1],
          completedDays: [],
          unlockedClues: [],
          matrixCells: {},
          manualEliminations: [],
          notes: {},
          activeView: 'book',
        });
      },

      resetGame: () => {
        // Reinicia el progreso manteniendo la semilla actual del caso
        set({
          currentDay: 0,
          unlockedDays: [0, 1],
          completedDays: [],
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
        const { manualEliminations, unlockedClues, activeCase } = get();
        return computeSuspectStatus(suspect, manualEliminations, unlockedClues, activeCase);
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
        unlockedClues: state.unlockedClues,
        matrixCells: state.matrixCells,
        manualEliminations: state.manualEliminations,
        notes: state.notes,
        freePlayMode: state.freePlayMode,
        activeView: state.activeView,
      }),
      migrate: (persistedState, version) => {
        if (version < 3 || !persistedState || typeof persistedState !== 'object') {
          const freshSeed = createRandomSeed();
          return {
            caseSeed: freshSeed,
            currentDay: 0,
            unlockedDays: [0, 1],
            completedDays: [],
            unlockedClues: [],
            matrixCells: {},
            manualEliminations: [],
            notes: {},
            freePlayMode: true,
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
        return {
          ...currentState,
          ...(persisted as Partial<GameStoreState>),
          totalDays: TOTAL_DAYS,
          caseSeed: seed,
          activeCase,
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
