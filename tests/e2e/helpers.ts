import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { vi } from 'vitest';
import type {
  Clue,
  DayData,
  DayPuzzle,
  DirectorySuspect,
  GeneratedCase,
  PuzzleType,
} from '../../src/types/game';
import { toAlphaOnlyPhrase } from '../../src/engine/puzzles/clueIntegration';
import { useGameStore, type SuspectStatus } from '../../src/store/useGameStore';
import {
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
} from '../acceptance/helpers';

// =====================================================================
// Dynamic TSX & Node-fs Loaders (keep tsc & pre-M1–M4 compatibility clean)
// =====================================================================

const nodeFsModName = 'node:fs';
const nodePathModName = 'node:path';
const storeModPath = '../../src/store/useGameStore';

export const nodeFs = (await import(/* @vite-ignore */ nodeFsModName)) as {
  readFileSync: (path: string | URL, encoding: 'utf8') => string;
  readdirSync: (
    path: string,
    opts: { withFileTypes: true }
  ) => Array<{ name: string; isDirectory: () => boolean }>;
};

export const nodePath = (await import(/* @vite-ignore */ nodePathModName)) as {
  join: (...parts: string[]) => string;
  resolve: (...parts: string[]) => string;
};

export interface PuzzleContractProps {
  config: unknown;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
  gameMode?: 'auto' | 'manual';
}

export interface BookLayoutContractProps {
  onOpenCalendar: () => void;
  onOpenDossier: () => void;
  onOpenVerdict: () => void;
  onOpenPrologue: () => void;
  onOpenGameMode?: () => void;
  onOpenActDoor: (act: 1 | 2 | 3 | 4 | 5, startOpened?: boolean) => void;
  onBookOpenChange?: (isOpen: boolean) => void;
}

export interface GameModeModalContractProps {
  onClose?: () => void;
}

export interface DetectiveHintBubbleContractProps {
  currentDay: number;
  isAlbum: boolean;
  dayData: DayData;
  isDayCompleted: boolean;
  completedDays: number[];
  unlockedClues: Clue[];
  suspectFunnel: {
    total: number;
    remaining: number;
    eliminated: number;
  };
  isHeaderCollapsed?: boolean;
}

export interface SuspectsAlbumContractProps {
  onStartAdventure: () => void;
}

export interface DetectiveDossierContractProps {
  onClose: () => void;
  onOpenVerdict: () => void;
}

export interface FinalVerdictModalContractProps {
  onClose: () => void;
}

export interface ActDoorModalContractProps {
  initialAct?: 1 | 2 | 3 | 4 | 5;
  startOpened?: boolean;
  onClose: () => void;
  onEnterActDay: (day: number) => void;
}

const PUZZLE_COMPONENT_SPECS: Record<PuzzleType, { path: string; exportName: string }> = {
  wordsearch: { path: '../../src/components/puzzles/WordSearchPuzzle.tsx', exportName: 'WordSearchPuzzle' },
  syllables: { path: '../../src/components/puzzles/SyllablesPuzzle.tsx', exportName: 'SyllablesPuzzle' },
  cryptogram: { path: '../../src/components/puzzles/CryptogramPuzzle.tsx', exportName: 'CryptogramPuzzle' },
  sudoku: { path: '../../src/components/puzzles/SudokuPuzzle.tsx', exportName: 'SudokuPuzzle' },
  murdoku: { path: '../../src/components/puzzles/MurdokuPuzzle.tsx', exportName: 'MurdokuPuzzle' },
  crossword: { path: '../../src/components/puzzles/CrosswordPuzzle.tsx', exportName: 'CrosswordPuzzle' },
  futoshiki: { path: '../../src/components/puzzles/FutoshikiPuzzle.tsx', exportName: 'FutoshikiPuzzle' },
  connections: { path: '../../src/components/puzzles/ConnectionsPuzzle.tsx', exportName: 'ConnectionsPuzzle' },
  nonogram: { path: '../../src/components/puzzles/NonogramPuzzle.tsx', exportName: 'NonogramPuzzle' },
  minesweeper: { path: '../../src/components/puzzles/MinesweeperPuzzle.tsx', exportName: 'MinesweeperPuzzle' },
  septagrama: { path: '../../src/components/puzzles/SeptagramaPuzzle.tsx', exportName: 'SeptagramaPuzzle' },
  codificados: { path: '../../src/components/puzzles/CodificadosPuzzle.tsx', exportName: 'CodificadosPuzzle' },
  ecuaciones: { path: '../../src/components/puzzles/EcuacionesPuzzle.tsx', exportName: 'EcuacionesPuzzle' },
  encajados: { path: '../../src/components/puzzles/EncajadosPuzzle.tsx', exportName: 'EncajadosPuzzle' },
};

const puzzleComponentCache = new Map<PuzzleType, React.ComponentType<PuzzleContractProps>>();

function cleanSsrHtml(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function renderWithLiveStore(element: React.ReactElement): string {
  const spy = vi
    .spyOn(React, 'useSyncExternalStore')
    .mockImplementation((_subscribe, getSnapshot) => getSnapshot());
  try {
    return cleanSsrHtml(renderToStaticMarkup(element));
  } finally {
    spy.mockRestore();
  }
}

export async function loadPuzzleComponent(
  type: PuzzleType
): Promise<React.ComponentType<PuzzleContractProps>> {
  const cached = puzzleComponentCache.get(type);
  if (cached) return cached;
  const spec = PUZZLE_COMPONENT_SPECS[type];
  let mod: Record<string, React.ComponentType<PuzzleContractProps>>;
  switch (type) {
    case 'wordsearch':
      mod = (await import('../../src/components/puzzles/WordSearchPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'syllables':
      mod = (await import('../../src/components/puzzles/SyllablesPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'cryptogram':
      mod = (await import('../../src/components/puzzles/CryptogramPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'sudoku':
      mod = (await import('../../src/components/puzzles/SudokuPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'murdoku':
      mod = (await import('../../src/components/puzzles/MurdokuPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'crossword':
      mod = (await import('../../src/components/puzzles/CrosswordPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'futoshiki':
      mod = (await import('../../src/components/puzzles/FutoshikiPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'connections':
      mod = (await import('../../src/components/puzzles/ConnectionsPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'nonogram':
      mod = (await import('../../src/components/puzzles/NonogramPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'minesweeper':
      mod = (await import('../../src/components/puzzles/MinesweeperPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'septagrama':
      mod = (await import('../../src/components/puzzles/SeptagramaPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'codificados':
      mod = (await import('../../src/components/puzzles/CodificadosPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'ecuaciones':
      mod = (await import('../../src/components/puzzles/EcuacionesPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
    case 'encajados':
      mod = (await import('../../src/components/puzzles/EncajadosPuzzle')) as unknown as Record<string, React.ComponentType<PuzzleContractProps>>;
      break;
  }
  const comp = mod[spec.exportName];
  puzzleComponentCache.set(type, comp);
  return comp;
}

export async function renderPuzzleMarkup(params: {
  puzzle: DayPuzzle;
  isSolved: boolean;
  hints?: string[];
  gameMode?: 'auto' | 'manual';
}): Promise<string> {
  const Comp = await loadPuzzleComponent(params.puzzle.type);
  const props: PuzzleContractProps = {
    config: params.puzzle.config,
    onSolve: () => {},
    isSolved: params.isSolved,
    hints: params.hints ?? params.puzzle.hints,
  };
  if (params.gameMode !== undefined) {
    props.gameMode = params.gameMode;
  }
  return cleanSsrHtml(renderToStaticMarkup(React.createElement(Comp, props)));
}

import { BookLayout } from '../../src/components/BookLayout';
import { GameModeModal } from '../../src/components/GameModeModal';
import { DetectiveHintBubble } from '../../src/components/DetectiveHintBubble';
import { SuspectsAlbum } from '../../src/components/SuspectsAlbum';
import { DetectiveDossier } from '../../src/components/DetectiveDossier';
import { FinalVerdictModal } from '../../src/components/FinalVerdictModal';
import { ActDoorModal } from '../../src/components/ActDoorModal';

export function renderBookLayoutMarkup(): string {
  return renderWithLiveStore(
    React.createElement(BookLayout, {
      onOpenCalendar: () => {},
      onOpenDossier: () => {},
      onOpenVerdict: () => {},
      onOpenPrologue: () => {},
      onOpenGameMode: () => {},
      onOpenActDoor: () => {},
    })
  );
}

export function renderGameModeModalMarkup(onClose?: () => void): string {
  return renderWithLiveStore(
    React.createElement(GameModeModal, {
      onClose,
    })
  );
}

export function renderDetectiveHintBubbleMarkup(props: DetectiveHintBubbleContractProps): string {
  return renderWithLiveStore(React.createElement(DetectiveHintBubble, props));
}

export function renderSuspectsAlbumMarkup(): string {
  return renderWithLiveStore(
    React.createElement(SuspectsAlbum, {
      onStartAdventure: () => {},
    })
  );
}

export function renderDetectiveDossierMarkup(): string {
  return renderWithLiveStore(
    React.createElement(DetectiveDossier, {
      onClose: () => {},
      onOpenVerdict: () => {},
    })
  );
}

export function renderFinalVerdictModalMarkup(): string {
  return renderWithLiveStore(
    React.createElement(FinalVerdictModal, {
      onClose: () => {},
    })
  );
}

export function renderActDoorModalMarkup(props: ActDoorModalContractProps): string {
  return renderWithLiveStore(React.createElement(ActDoorModal, props));
}

// =====================================================================
// M1–M4 Contract Accessors (safe pre-M1 typing + loud Vitest assertions)
// =====================================================================

export interface ItemEliminationStatus {
  isEliminated: boolean;
  isManual: boolean;
  isAutoEliminated: boolean;
}

export interface ExtendedStoreContract {
  manualWeaponEliminations?: string[];
  manualRoomEliminations?: string[];
  gameSessionId?: number;
  toggleManualWeaponElimination?: (weaponId: string) => void;
  toggleManualRoomElimination?: (roomId: string) => void;
  getWeaponStatus?: (weaponId: string) => ItemEliminationStatus;
  getRoomStatus?: (roomId: string) => ItemEliminationStatus;
}

export type FullStoreState = ReturnType<typeof useGameStore.getState> & ExtendedStoreContract;

export function getFullStoreState(): FullStoreState {
  return useGameStore.getState() as FullStoreState;
}

export async function getStoreExportsModule(): Promise<{
  computeSuspectStatus: (
    suspect: DirectorySuspect,
    manualEliminations: readonly string[],
    unlockedClues: readonly Clue[],
    activeCase: GeneratedCase,
    openedDoors?: readonly number[],
    gameMode?: 'auto' | 'manual'
  ) => SuspectStatus;
  computeWeaponStatus?: (
    weaponId: string,
    manualWeaponEliminations: readonly string[],
    unlockedClues: readonly Clue[] | readonly number[],
    gameMode?: 'auto' | 'manual'
  ) => ItemEliminationStatus;
  computeRoomStatus?: (
    roomId: string,
    manualRoomEliminations: readonly string[],
    unlockedClues: readonly Clue[] | readonly number[],
    gameMode?: 'auto' | 'manual'
  ) => ItemEliminationStatus;
}> {
  const mod = (await import(/* @vite-ignore */ storeModPath)) as Record<string, unknown>;
  return {
    computeSuspectStatus: mod.computeSuspectStatus as (
      suspect: DirectorySuspect,
      manualEliminations: readonly string[],
      unlockedClues: readonly Clue[],
      activeCase: GeneratedCase,
      openedDoors?: readonly number[],
      gameMode?: 'auto' | 'manual'
    ) => SuspectStatus,
    computeWeaponStatus: mod.computeWeaponStatus as
      | ((
          weaponId: string,
          manualWeaponEliminations: readonly string[],
          unlockedClues: readonly Clue[] | readonly number[],
          gameMode?: 'auto' | 'manual'
        ) => ItemEliminationStatus)
      | undefined,
    computeRoomStatus: mod.computeRoomStatus as
      | ((
          roomId: string,
          manualRoomEliminations: readonly string[],
          unlockedClues: readonly Clue[] | readonly number[],
          gameMode?: 'auto' | 'manual'
        ) => ItemEliminationStatus)
      | undefined,
  };
}

export function resetStoreToFreshCase(seed = 19241224): void {
  const patch: Record<string, unknown> = {
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
    activeView: 'book',
  };
  useGameStore.setState(patch as Partial<ReturnType<typeof useGameStore.getState>>);
  useGameStore.getState().startNewCase(seed);
  useGameStore.setState({ hasSelectedGameMode: false, gameMode: 'auto' });
}

export function readSrcFile(relFromRoot: string): string {
  return nodeFs.readFileSync(
    new URL(`../../${relFromRoot}`, import.meta.url),
    'utf8'
  );
}

export function listAllSrcTsFiles(): string[] {
  const srcRoot = nodePath.resolve('src');
  const walk = (dir: string): string[] => {
    const entries = nodeFs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = nodePath.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walk(full));
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(full);
      }
    }
    return files;
  };
  return walk(srcRoot);
}

// =====================================================================
// Opaque-Box Board Solver -> Manual Answer Extractor (All 14 Puzzles)
// =====================================================================

const WS_DIRECTIONS: readonly { dr: number; dc: number }[] = [
  { dr: 0, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: -1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: -1, dc: -1 },
];

function findAllWordOccurrences(
  grid: string[][],
  word: string
): Array<Array<{ r: number; c: number }>> {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const target = word.toUpperCase();
  if (target.length === 0 || rows === 0 || cols === 0) return [];
  const results: Array<Array<{ r: number; c: number }>> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== target[0]) continue;
      for (const { dr, dc } of WS_DIRECTIONS) {
        const endR = r + dr * (target.length - 1);
        const endC = c + dc * (target.length - 1);
        if (endR < 0 || endR >= rows || endC < 0 || endC >= cols) continue;

        let match = true;
        const coords: Array<{ r: number; c: number }> = [];
        for (let i = 0; i < target.length; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (grid[nr][nc] !== target[i]) {
            match = false;
            break;
          }
          coords.push({ r: nr, c: nc });
        }
        if (match) results.push(coords);
      }
    }
  }
  return results;
}

function solveWordSearchLeftoverFromGrid(dayData: DayData): string {
  const puzzle = dayData.puzzle;
  if (puzzle.type !== 'wordsearch') {
    throw new Error(`Expected wordsearch on day ${dayData.day}`);
  }
  const { grid, words, leftoverMessage } = puzzle.config;
  const targetLen = leftoverMessage.replace(/[^A-ZÑÁÉÍÓÚÜ]/gi, '').length;

  const allOccs = words.map(w => {
    const occs = findAllWordOccurrences(grid, w.word);
    if (occs.length === 0) {
      throw new Error(`WordSearch word ${w.word} missing on day ${dayData.day}`);
    }
    return occs;
  });

  const fixedCovered = new Set<string>();
  const ambiguous: Array<Array<Array<{ r: number; c: number }>>> = [];
  for (const occs of allOccs) {
    if (occs.length === 1) {
      for (const p of occs[0]) {
        fixedCovered.add(`${p.r}:${p.c}`);
      }
    } else {
      ambiguous.push(occs);
    }
  }

  const extractLeftover = (covered: Set<string>): string => {
    let out = '';
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (!covered.has(`${r}:${c}`)) {
          out += grid[r][c];
        }
      }
    }
    return out.slice(0, targetLen);
  };

  if (ambiguous.length === 0) {
    return extractLeftover(fixedCovered);
  }

  // Sort ambiguous words by fewest occurrences first and score intersections with fixed cells
  ambiguous.sort((a, b) => a.length - b.length);
  const sortedAmbiguous = ambiguous.map(occs =>
    [...occs].sort((a, b) => {
      const ovA = a.filter(p => fixedCovered.has(`${p.r}:${p.c}`)).length;
      const ovB = b.filter(p => fixedCovered.has(`${p.r}:${p.c}`)).length;
      return ovB - ovA;
    })
  );

  // Clue tokens derived from the day's narrative clue (used solely to disambiguate duplicate
  // grid occurrences when a placed word also appears inside the leftover phrase or filler)
  const clueTokens = Array.from(
    new Set(
      toAlphaOnlyPhrase(
        `${dayData.unlockedClue.keyphrase ?? ''} ${dayData.unlockedClue.impact}`
      )
        .split(' ')
        .filter(t => t.length >= 2)
    )
  ).sort((a, b) => b.length - a.length);

  const scoreCandidate = (candidate: string, overlapBonus: number): number => {
    // Score greedy non-overlapping coverage by clue tokens + Spanish vowel plausibility
    let score = overlapBonus * 5;
    let remaining = candidate;
    for (const tok of clueTokens) {
      if (remaining.includes(tok)) {
        score += tok.length * 100;
        remaining = remaining.replace(tok, ' ');
      }
    }
    const compactClue = toAlphaOnlyPhrase(
      dayData.unlockedClue.keyphrase || dayData.unlockedClue.impact
    ).replace(/\s+/g, '');
    if (compactClue.length >= 6 && candidate === compactClue) {
      score += 10000;
    }
    // Penalize unlikely 4+ consonant runs that arise when a word inside the phrase is masked
    const badClusters = candidate.match(/[BCDFGHJKLMNÑPQRSTVWXYZ]{4,}/g);
    if (badClusters) {
      score -= badClusters.length * 50;
    }
    return score;
  };

  let bestAnswer = extractLeftover(fixedCovered);
  let bestScore = -Infinity;
  let evaluations = 0;
  const maxEvaluations = 1024;

  const chosen: Array<Array<{ r: number; c: number }>> = [];
  const backtrack = (idx: number) => {
    if (evaluations >= maxEvaluations) return;
    if (idx === sortedAmbiguous.length) {
      evaluations++;
      const covered = new Set(fixedCovered);
      let overlaps = 0;
      for (const coords of chosen) {
        for (const p of coords) {
          const key = `${p.r}:${p.c}`;
          if (covered.has(key)) overlaps++;
          covered.add(key);
        }
      }
      const candidate = extractLeftover(covered);
      const score = scoreCandidate(candidate, overlaps);
      if (score > bestScore) {
        bestScore = score;
        bestAnswer = candidate;
      }
      return;
    }

    for (const occ of sortedAmbiguous[idx]) {
      chosen.push(occ);
      backtrack(idx + 1);
      chosen.pop();
      if (evaluations >= maxEvaluations) return;
    }
  };

  backtrack(0);
  return bestAnswer;
}

export function deriveManualAnswerFromBoard(dayData: DayData): string {
  const { puzzle } = dayData;
  switch (puzzle.type) {
    case 'sudoku': {
      const solved = solveSudokuOpaque(puzzle.config.initialGrid);
      if (!solved.solution) throw new Error(`Sudoku unsolvable on day ${dayData.day}`);
      return puzzle.config.keyCells.map(k => solved.solution![k.r]?.[k.c] ?? '').join('');
    }
    case 'futoshiki': {
      const solved = solveFutoshikiOpaque(puzzle.config);
      if (!solved.solution) throw new Error(`Futoshiki unsolvable on day ${dayData.day}`);
      return (puzzle.config.keyCells ?? [])
        .map(k => solved.solution![k.r]?.[k.c] ?? '')
        .join('');
    }
    case 'codificados': {
      const solved = solveCodificadosOpaque(puzzle.config);
      if (!solved.solution) throw new Error(`Codificados unsolvable on day ${dayData.day}`);
      return solved.solution.join('');
    }
    case 'ecuaciones': {
      const solved = solveEcuacionesOpaque(puzzle.config);
      if (!solved.targetCode) throw new Error(`Ecuaciones unsolvable on day ${dayData.day}`);
      return solved.targetCode.join('');
    }
    case 'minesweeper': {
      const solved = solveMinesweeperDeterministic(puzzle.config);
      if (!solved.solvedAllSafe) throw new Error(`Minesweeper unsolvable on day ${dayData.day}`);
      const safeCount = solved.revealed.size;
      const mines = solved.flagged.size;
      return `${safeCount}${mines < 10 ? `0${mines}` : mines}`;
    }
    case 'nonogram': {
      const solved = solveNonogramOpaque(puzzle.config);
      if (!solved.solution) throw new Error(`Nonogram unsolvable on day ${dayData.day}`);
      return puzzle.config.revealTitle;
    }
    case 'connections': {
      const solvedIds = solveConnectionsOpaque(puzzle.config);
      if (solvedIds.length !== 4) throw new Error(`Connections unsolvable on day ${dayData.day}`);
      const firstGroup = puzzle.config.groups.find(g => g.id === solvedIds[0]);
      return firstGroup?.category ?? '';
    }
    case 'murdoku': {
      const solved = solveMurdokuOpaque(puzzle.config);
      if (!solved.cells) throw new Error(`Murdoku unsolvable on day ${dayData.day}`);
      const firstA = puzzle.config.groupA.items[0];
      const matchedB = puzzle.config.groupB.items.find(
        b => solved.cells?.[`${firstA.id}:${b.id}`] === 'check'
      );
      if (!matchedB) throw new Error(`Murdoku match missing on day ${dayData.day}`);
      return matchedB.name;
    }
    case 'wordsearch': {
      return solveWordSearchLeftoverFromGrid(dayData);
    }
    case 'crossword': {
      const solved = solveCrosswordOpaque(puzzle.config);
      if (solved.hasCollision || !solved.isConnected) {
        throw new Error(`Crossword invalid on day ${dayData.day}`);
      }
      return (puzzle.config.secretHighlightCells ?? [])
        .map(k => solved.grid[k.r]?.[k.c] ?? '')
        .join('');
    }
    case 'septagrama': {
      const solved = solveSeptagramaOpaque(puzzle.config);
      return puzzle.config.words
        .map(w => solved[w.id]?.[w.highlightIndex] ?? '')
        .join('');
    }
    case 'encajados': {
      const solved = solveEncajadosOpaque(puzzle.config);
      if (!solved.grid) throw new Error(`Encajados unsolvable on day ${dayData.day}`);
      return puzzle.config.keyCells.map(k => solved.grid![k.r]?.[k.c] ?? '').join('');
    }
    case 'syllables': {
      const slots = solveSyllablesOpaque(puzzle.config);
      const idToText = new Map(puzzle.config.allSyllables.map(s => [s.id, s.text]));
      return puzzle.config.words
        .map(w => idToText.get(slots[w.id]?.[w.highlightIndex] ?? '') ?? '')
        .join('');
    }
    case 'cryptogram': {
      const map = solveCryptogramOpaque(puzzle.config);
      const decoded = puzzle.config.cipherText
        .split('')
        .map(ch => {
          const upper = ch.toUpperCase();
          const code = puzzle.config.cipherMap[upper];
          return code !== undefined ? (map[code] ?? ch) : ch;
        })
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      return decoded.split(' ').slice(0, 3).join(' ');
    }
  }
}

export function collectAll14PuzzleDays(seed: number): Record<PuzzleType, DayData> {
  resetStoreToFreshCase(seed);
  const c = useGameStore.getState().activeCase;
  const out = {} as Record<PuzzleType, DayData>;
  for (const d of c.days) {
    if (!(d.puzzle.type in out)) {
      out[d.puzzle.type] = d;
    }
  }
  return out;
}

export const PUZZLE_SOLVED_BANNERS: Record<PuzzleType, string[]> = {
  wordsearch: ['Casillas Doradas Sobrantes', 'Clave revelada por las letras no tachadas'],
  syllables: ['Sílabas Clave Ensambladas'],
  cryptogram: ['Mensaje Cifrado Revelado'],
  sudoku: ['Sudoku 9×9 Resuelto'],
  murdoku: ['Deducción Murdoku Verificada'],
  crossword: ['Crucigrama Completado'],
  futoshiki: ['Futoshiki Resuelto'],
  connections: ['Conexiones Completadas'],
  nonogram: ['Silueta Revelada'],
  minesweeper: ['Buscaminas Despejado'],
  septagrama: ['Septagrama Resuelto'],
  codificados: ['Código Descifrado'],
  ecuaciones: ['Ecuaciones Resueltas'],
  encajados: ['Encajados Completado'],
};

export function extractSecretSpoilerStrings(puzzle: DayPuzzle): string[] {
  switch (puzzle.type) {
    case 'wordsearch':
      return [puzzle.config.leftoverMessage];
    case 'syllables':
      return [puzzle.config.secretWord];
    case 'cryptogram':
      return [puzzle.config.cipherText];
    case 'sudoku':
      return [
        puzzle.config.keyCells.map(k => puzzle.config.solution[k.r]?.[k.c] ?? '').join(''),
        puzzle.config.secretCodeMeaning,
      ].filter(Boolean);
    case 'futoshiki':
      return [
        (puzzle.config.keyCells ?? []).map(k => puzzle.config.solution[k.r]?.[k.c] ?? '').join(''),
        puzzle.config.secretCodeMeaning ?? '',
      ].filter(Boolean);
    case 'crossword':
      return [puzzle.config.secretWord ?? '', puzzle.config.secretMeaning ?? ''].filter(Boolean);
    case 'septagrama':
      return [puzzle.config.secretWord, puzzle.config.secretMeaning].filter(Boolean);
    case 'encajados':
      return [puzzle.config.secretWord, puzzle.config.secretMeaning].filter(Boolean);
    case 'nonogram':
      return [puzzle.config.revealTitle, puzzle.config.secretMeaning ?? ''].filter(Boolean);
    case 'connections':
      return [puzzle.config.secretMeaning ?? ''].filter(Boolean);
    case 'minesweeper':
      return [puzzle.config.secretMeaning ?? ''].filter(Boolean);
    case 'codificados':
      return [puzzle.config.secretCode.join(''), puzzle.config.secretMeaning].filter(Boolean);
    case 'ecuaciones':
      return [puzzle.config.targetCode.join(''), puzzle.config.secretMeaning].filter(Boolean);
    case 'murdoku':
      return ['Todas las relaciones lógicas han quedado demostradas'];
  }
}
