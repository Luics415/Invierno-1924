import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookLayout } from '../src/components/BookLayout';
import { DetectiveHintBubble } from '../src/components/DetectiveHintBubble';
import { GameModeModal } from '../src/components/GameModeModal';
import { LOCATIONS, WEAPONS } from '../src/data/narrativeBible';
import { generateCase } from '../src/engine/caseGenerator';
import { toPuzzleText } from '../src/engine/clueLabels';
import {
  getPuzzleManualVerificationSpec,
  verifyManualPuzzleInput,
} from '../src/engine/puzzles/clueIntegration';
import { useGameStore } from '../src/store/useGameStore';
import type { Clue, DayData, NonogramPuzzleConfig, PuzzleType } from '../src/types/game';

const TEST_SEED = 19241224;
const PROJECT_ROOT = path.resolve(__dirname, '..');

function readProjectFile(relPath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8');
}

function resetStore(seed = TEST_SEED): void {
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

function renderBookLayoutMarkup(currentDay = 1): string {
  useGameStore.setState({ currentDay });
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

describe('M2 — Manual Mode Shell, Clue Specs, Funnel, Mode Lock UI & Azlynn', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetStore();
  });

  describe('clueIntegration.ts — Spoiler-free specs & validation across all 14 puzzle types', () => {
    it('removes all answer, length, mask, and example spoilers across all 14 puzzle types', () => {
      const seeds = [19241224, 19240101, 19240715, 19241130];
      const seenTypes = new Set<PuzzleType>();

      for (const seed of seeds) {
        const generated = generateCase(seed);
        for (const day of generated.days) {
          seenTypes.add(day.puzzle.type);
          const spec = getPuzzleManualVerificationSpec(day.puzzle, day.unlockedClue);
          const combined = `${spec.promptLabel} ${spec.formatHint}`;
          const upperCombined = toPuzzleText(combined);
          const clueKey = toPuzzleText(
            day.unlockedClue.keyphrase || day.unlockedClue.impact
          ).trim();
          const expectedUpper = toPuzzleText(spec.expectedDisplay).trim();

          expect(combined).not.toMatch(/\(ej\./i);
          expect(combined).not.toMatch(/\b\d+\s+(letras?|palabras?|cifras)\b/i);
          expect(combined).not.toContain('7 casillas');
          expect(combined).not.toContain('Clave:');
          expect(combined).not.toContain('Objeto revelado:');
          expect(combined).not.toContain('Clave forense:');

          if (expectedUpper.length >= 3) {
            expect(upperCombined).not.toContain(expectedUpper);
          }
          if (clueKey.length >= 4 && day.puzzle.type !== 'murdoku') {
            expect(upperCombined).not.toContain(clueKey);
          }

          expect(spec.expectedDisplay.trim().length).toBeGreaterThanOrEqual(2);
          expect(
            verifyManualPuzzleInput(day.puzzle, day.unlockedClue, spec.expectedDisplay)
          ).toBe(true);
          expect(
            verifyManualPuzzleInput(
              day.puzzle,
              day.unlockedClue,
              `  ${spec.expectedDisplay.toLowerCase()}  `
            )
          ).toBe(true);

          expect(
            verifyManualPuzzleInput(day.puzzle, day.unlockedClue, 'RESPUESTA_ERRONEA_999')
          ).toBe(false);
          expect(verifyManualPuzzleInput(day.puzzle, day.unlockedClue, '0000')).toBe(false);
          expect(verifyManualPuzzleInput(day.puzzle, day.unlockedClue, '')).toBe(false);
          expect(verifyManualPuzzleInput(day.puzzle, day.unlockedClue, 'A')).toBe(false);
        }
      }

      expect(seenTypes.size).toBe(14);
    });

    it('directs syllables promptLabel to gold-highlighted syllables and accepts spaced/accented variants', () => {
      const generated = generateCase(TEST_SEED);
      const syllablesDay = generated.days.find(d => d.puzzle.type === 'syllables');
      expect(syllablesDay).toBeDefined();
      if (!syllablesDay || syllablesDay.puzzle.type !== 'syllables') return;

      const spec = getPuzzleManualVerificationSpec(syllablesDay.puzzle, syllablesDay.unlockedClue);
      expect(spec.promptLabel.toLowerCase()).toContain('sílabas destacadas en dorado');
      expect(spec.formatHint).not.toContain(spec.expectedDisplay);

      const spacedHighlighted = syllablesDay.puzzle.config.words
        .map(w => w.targetSyllables[w.highlightIndex] ?? '')
        .join(' ')
        .toLowerCase();
      const compactHighlighted = spacedHighlighted.replace(/\s+/g, '');

      expect(
        verifyManualPuzzleInput(syllablesDay.puzzle, syllablesDay.unlockedClue, spacedHighlighted)
      ).toBe(true);
      expect(
        verifyManualPuzzleInput(syllablesDay.puzzle, syllablesDay.unlockedClue, compactHighlighted)
      ).toBe(true);
    });

    it('accepts template-scoped visual synonyms in nonogram and rejects cross-template synonyms', () => {
      const generated = generateCase(TEST_SEED);
      const nonogramDay = generated.days.find(d => d.puzzle.type === 'nonogram');
      expect(nonogramDay).toBeDefined();
      if (!nonogramDay || nonogramDay.puzzle.type !== 'nonogram') return;

      const makeNonogramPuzzle = (revealTitle: string): NonogramPuzzleConfig => ({
        ...nonogramDay.puzzle.config,
        revealTitle,
      });

      const dummyClue: Clue = {
        id: 'clue-nonogram-test',
        day: 1,
        text: 'Prueba visual aislada.',
        category: 'weapon',
        impact: 'Evidencia visual',
        keyphrase: 'SILUETA',
        predicates: [],
      };

      const chalicePuzzle = {
        type: 'nonogram' as const,
        instructions: 'Nonograma',
        hints: [],
        config: makeNonogramPuzzle('Cáliz de Oporto'),
      };
      expect(verifyManualPuzzleInput(chalicePuzzle, dummyClue, 'copa')).toBe(true);
      expect(verifyManualPuzzleInput(chalicePuzzle, dummyClue, 'Llave')).toBe(false);

      const poisonPuzzle = {
        type: 'nonogram' as const,
        instructions: 'Nonograma',
        hints: [],
        config: makeNonogramPuzzle('Frasco de Veneno'),
      };
      expect(verifyManualPuzzleInput(poisonPuzzle, dummyClue, 'botella')).toBe(true);
      expect(verifyManualPuzzleInput(poisonPuzzle, dummyClue, 'ampolla')).toBe(true);
      expect(verifyManualPuzzleInput(poisonPuzzle, dummyClue, 'copa')).toBe(false);

      const daggerPuzzle = {
        type: 'nonogram' as const,
        instructions: 'Nonograma',
        hints: [],
        config: makeNonogramPuzzle('Daga de Plata'),
      };
      expect(verifyManualPuzzleInput(daggerPuzzle, dummyClue, 'puñal')).toBe(true);
      expect(verifyManualPuzzleInput(daggerPuzzle, dummyClue, 'cuchillo')).toBe(true);
      expect(verifyManualPuzzleInput(daggerPuzzle, dummyClue, 'carta')).toBe(false);

      const letterPuzzle = {
        type: 'nonogram' as const,
        instructions: 'Nonograma',
        hints: [],
        config: makeNonogramPuzzle('Sobre Lacrado'),
      };
      expect(verifyManualPuzzleInput(letterPuzzle, dummyClue, 'carta')).toBe(true);
      expect(verifyManualPuzzleInput(letterPuzzle, dummyClue, 'botella')).toBe(false);
    });

    it('accepts clue.impact and base category title in connections and uses singular grammar in murdoku', () => {
      const generated = generateCase(TEST_SEED);
      const connectionsDay = generated.days.find(d => d.puzzle.type === 'connections');
      expect(connectionsDay).toBeDefined();
      if (connectionsDay && connectionsDay.puzzle.type === 'connections') {
        const baseCategory = connectionsDay.puzzle.config.groups[0].category.split('·')[0].trim();
        expect(
          verifyManualPuzzleInput(
            connectionsDay.puzzle,
            connectionsDay.unlockedClue,
            connectionsDay.unlockedClue.impact
          )
        ).toBe(true);
        expect(
          verifyManualPuzzleInput(connectionsDay.puzzle, connectionsDay.unlockedClue, baseCategory)
        ).toBe(true);
      }

      const murdokuDays = generated.days.filter(d => d.puzzle.type === 'murdoku');
      expect(murdokuDays.length).toBeGreaterThan(0);
      for (const mDay of murdokuDays) {
        const spec = getPuzzleManualVerificationSpec(mDay.puzzle, mDay.unlockedClue);
        expect(spec.promptLabel).not.toMatch(/qué (armas|estancias|sospechosos) corresponde/i);
        expect(spec.promptLabel).toMatch(/qué (arma|estancia|sospechoso) corresponde/i);
      }
    });
  });

  describe('BookLayout.tsx — Manual confirmation, funnel counts, mode lock & [TEST] controls', () => {
    it('omits all Manual Mode spoilers and helper panels in Day 1 SSR while preserving [TEST] controls', () => {
      const generated = generateCase(TEST_SEED);
      const day1 = generated.days[0];
      const spec = getPuzzleManualVerificationSpec(day1.puzzle, day1.unlockedClue);

      useGameStore.setState({
        activeCase: generated,
        gameMode: 'manual',
        hasSelectedGameMode: true,
        openedDoors: [1],
        completedDays: [],
      });

      const html = renderBookLayoutMarkup(1);

      expect(html).toContain('Modo Manual (Paso 1/2)');
      expect(html).not.toContain('¿De dónde sale el resultado?');
      expect(html).not.toContain('Resultado leído del tablero');
      expect(html).not.toContain(spec.formatHint);
      expect(html).toContain('[TEST] Omitir Día');
      expect(html).toContain('[TEST] Completar Acto 1');
    });

    it('disables header mode button when hasSelectedGameMode is true and enables it when false', () => {
      useGameStore.setState({
        gameMode: 'manual',
        hasSelectedGameMode: true,
        openedDoors: [1],
      });
      const lockedHtml = renderBookLayoutMarkup(1);
      expect(lockedHtml).toMatch(
        /<button[^>]*\sdisabled=""[^>]*>(?:(?!<\/button>).)*Modo:\s*Manual/
      );

      useGameStore.setState({
        gameMode: 'manual',
        hasSelectedGameMode: false,
        openedDoors: [1],
      });
      const unlockedHtml = renderBookLayoutMarkup(1);
      expect(unlockedHtml).toContain('Modo: Manual');
      expect(unlockedHtml).not.toMatch(
        /<button[^>]*\sdisabled=""[^>]*>(?:(?!<\/button>).)*Modo:\s*Manual/
      );
    });

    it('renders exact manual + victim funnel counts (72 / 74 and 65 / 74) and ignores clue auto-eliminations', () => {
      const generated = generateCase(TEST_SEED);
      const allClues = generated.days.map(d => d.unlockedClue);
      const nonVictims = generated.acts
        .filter(a => a.act === 1)
        .map(a => a.victimId);
      const nonVictimSet = new Set([
        generated.config.culpritId,
        ...generated.acts.filter(a => a.act >= 2).map(a => a.victimId),
      ]);
      const extraSuspects = generated.days
        .flatMap(d => d.unlockedClue.autoEliminations?.suspectsEliminated ?? [])
        .filter((id, idx, arr) => !nonVictimSet.has(id) && arr.indexOf(id) === idx);
      expect(extraSuspects.length).toBeGreaterThanOrEqual(5);
      void nonVictims;

      // Case A: 30 clues + 2 manual suspects (Doors 2-5 closed) => 72 / 74 Bajo Sospecha
      useGameStore.setState({
        activeCase: generated,
        gameMode: 'manual',
        hasSelectedGameMode: true,
        openedDoors: [1],
        unlockedClues: allClues,
        manualEliminations: extraSuspects.slice(0, 2),
        manualWeaponEliminations: [],
        manualRoomEliminations: [],
      });
      const html72 = renderBookLayoutMarkup(1);
      expect(html72).toContain('72 / 74');

      // Case B: 30 clues + Doors 2-5 opened (4 victims) + 5 manual suspects + 3 weapons + 2 rooms => 65 / 74
      useGameStore.setState({
        activeCase: generated,
        gameMode: 'manual',
        hasSelectedGameMode: true,
        openedDoors: [1, 2, 3, 4, 5],
        unlockedClues: allClues,
        manualEliminations: extraSuspects.slice(0, 5),
        manualWeaponEliminations: WEAPONS.slice(0, 3).map(w => w.id),
        manualRoomEliminations: LOCATIONS.slice(0, 2).map(l => l.id),
      });
      const html65 = renderBookLayoutMarkup(1);
      expect(html65).toContain('65 / 74');
    });

    it('keeps Auto Mode funnel eliminating suspects via clues and preserves gameMode >= 10 times in source', () => {
      const generated = generateCase(TEST_SEED);
      const allClues = generated.days.map(d => d.unlockedClue);

      useGameStore.setState({
        activeCase: generated,
        gameMode: 'auto',
        hasSelectedGameMode: true,
        openedDoors: [1, 2, 3, 4, 5],
        unlockedClues: allClues,
        manualEliminations: [],
      });
      const autoHtml = renderBookLayoutMarkup(1);
      expect(autoHtml).toContain('Modo: Automático');
      expect(autoHtml).toContain('1 / 74');

      const src = readProjectFile('src/components/BookLayout.tsx');
      expect((src.match(/gameMode/g) ?? []).length).toBeGreaterThanOrEqual(10);
      expect(src).toContain('gameSessionId');
      expect(src).toContain('computeWeaponStatus');
      expect(src).toContain('computeRoomStatus');
      expect(src).not.toContain('showManualHelper');
      expect(src).not.toContain('¿De dónde sale el resultado?');
      expect(src).not.toContain('Resultado leído del tablero');
      expect(src).not.toContain('manualSpec.formatHint');
      expect(src).not.toContain('evaluateCaseClues');
    });
  });

  describe('GameModeModal.tsx — Mode lock copy & controls', () => {
    it('omits switch-anytime copy and locks controls when hasSelectedGameMode is true while keeping close button', () => {
      useGameStore.setState({
        gameMode: 'manual',
        hasSelectedGameMode: false,
      });
      const unlockedHtml = renderWithLiveStore(
        React.createElement(GameModeModal, { onClose: () => {} })
      );
      expect(unlockedHtml).toContain('Elige tu Modo de Investigación');
      expect(unlockedHtml).not.toContain(
        'Puedes cambiar este modo en cualquier momento desde la barra superior'
      );
      expect(unlockedHtml).toContain('Esta elección quedará bloqueada durante toda la partida');
      expect(unlockedHtml).not.toContain('Cerrar selector de modo');
      expect(unlockedHtml).toContain('Confirmar Modo Manual e Iniciar');

      useGameStore.setState({
        gameMode: 'manual',
        hasSelectedGameMode: true,
      });
      const lockedHtml = renderWithLiveStore(
        React.createElement(GameModeModal, { onClose: () => {} })
      );
      expect(lockedHtml).toContain('Cerrar selector de modo');
      expect(lockedHtml).toContain('Modo bloqueado para esta partida');
    });
  });

  describe('DetectiveHintBubble.tsx — Hides puzzle hints in Manual Mode while preserving Auto & Day 0', () => {
    it('renders cleanly on Day 0 and puzzle days in both modes and gates puzzle hints on gameMode === manual', () => {
      const generated = generateCase(TEST_SEED);
      const day1: DayData = generated.days[0];

      useGameStore.setState({ gameMode: 'manual' });
      const manualDay1Html = renderWithLiveStore(
        React.createElement(DetectiveHintBubble, {
          currentDay: 1,
          isAlbum: false,
          dayData: day1,
          isDayCompleted: false,
          completedDays: [],
          unlockedClues: [],
          suspectFunnel: { total: 74, remaining: 74, eliminated: 0 },
        })
      );
      expect(manualDay1Html).toContain('data-testid="detective-hint-button"');

      const manualDay0Html = renderWithLiveStore(
        React.createElement(DetectiveHintBubble, {
          currentDay: 0,
          isAlbum: true,
          dayData: day1,
          isDayCompleted: false,
          completedDays: [],
          unlockedClues: [],
          suspectFunnel: { total: 74, remaining: 74, eliminated: 0 },
        })
      );
      expect(manualDay0Html).toContain('data-testid="detective-hint-button"');

      useGameStore.setState({ gameMode: 'auto' });
      const autoDay1Html = renderWithLiveStore(
        React.createElement(DetectiveHintBubble, {
          currentDay: 1,
          isAlbum: false,
          dayData: day1,
          isDayCompleted: false,
          completedDays: [],
          unlockedClues: [],
          suspectFunnel: { total: 74, remaining: 74, eliminated: 0 },
        })
      );
      expect(autoDay1Html).toContain('data-testid="detective-hint-button"');

      const src = readProjectFile('src/components/DetectiveHintBubble.tsx');
      expect(src).toContain('gameMode');
      expect(src).toContain("const hidePuzzleHints = gameMode === 'manual' && !isAlbum");
      expect(src).toMatch(/if\s*\(\s*gameMode\s*===\s*['"]manual['"]\s*\)\s*\{\s*return\s*\[\];/);
      expect(src).toContain("!(hidePuzzleHints && node.id === 'hints')");
      expect(src).toContain('if (hints.length === 0) return;');
      expect(src).toContain('Diálogo');
      expect(src).toContain('Caso');
      expect(src).toContain('Reiniciar');
    });
  });

  describe('UI Conventions — Zero emojis across all M2 modified files', () => {
    it('contains zero Unicode emojis in M2 source files', () => {
      const m2Files = [
        'src/engine/puzzles/clueIntegration.ts',
        'src/components/BookLayout.tsx',
        'src/components/GameModeModal.tsx',
        'src/components/DetectiveHintBubble.tsx',
      ];
      const emojiRegex = /\p{Extended_Pictographic}/u;

      for (const file of m2Files) {
        const content = readProjectFile(file);
        expect(content, `${file} should not contain Unicode emojis`).not.toMatch(emojiRegex);
      }
    });
  });
});
