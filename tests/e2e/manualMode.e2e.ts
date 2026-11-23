import { beforeEach, describe, expect, it } from 'vitest';
import { LOCATIONS, WEAPONS } from '../../src/data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../../src/data/suspectsDirectory';
import {
  CLUE_SCHEDULE,
  DAYS_PER_ACT,
  TOTAL_DAYS,
  evaluateCaseClues,
  generateCase,
  verifyCaseVerdict,
} from '../../src/engine/caseGenerator';
import {
  getPuzzleManualVerificationSpec,
  verifyManualPuzzleInput,
} from '../../src/engine/puzzles/clueIntegration';
import { isActUnlocked, useGameStore } from '../../src/store/useGameStore';
import type { PuzzleType } from '../../src/types/game';
import { ALL_14_PUZZLE_TYPES } from '../acceptance/helpers';
import {
  PUZZLE_SOLVED_BANNERS,
  collectAll14PuzzleDays,
  deriveManualAnswerFromBoard,
  extractSecretSpoilerStrings,
  getFullStoreState,
  getStoreExportsModule,
  listAllSrcTsFiles,
  nodeFs,
  readSrcFile,
  renderActDoorModalMarkup,
  renderBookLayoutMarkup,
  renderDetectiveDossierMarkup,
  renderDetectiveHintBubbleMarkup,
  renderFinalVerdictModalMarkup,
  renderGameModeModalMarkup,
  renderPuzzleMarkup,
  renderSuspectsAlbumMarkup,
  resetStoreToFreshCase,
} from './helpers';

const SEED_MAIN = 19241224;
const SEED_ALT = 20261224;
const SEED_SCENARIO_1 = 7771924;

const PISTA_BUTTON_RE = /<button\b(?:(?!<\/button>)[\s\S])*?>Pista<\/span>/;

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeForLeakCheck(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function stripEncajadosWordBank(html: string): string {
  return html.replace(
    /<button\b[^>]*data-encajados-word=[^>]*>(?:(?!<\/button>)[\s\S])*?<\/button>/g,
    ''
  );
}

function extractSudokuCellHtml(html: string, r: number, c: number): string {
  const re = new RegExp(
    `<button\\b(?=[^>]*\\bdata-row="${r}")(?=[^>]*\\bdata-col="${c}")[^>]*>(?:(?!<\\/button>)[\\s\\S])*?<\\/button>`
  );
  const match = re.exec(html);
  return match ? match[0] : '';
}

function extractFutoshikiCellHtml(html: string, r: number, c: number): string {
  const re = new RegExp(
    `<button\\b[^>]*data-futoshiki-cell="${r}-${c}"[^>]*>(?:(?!<\\/button>)[\\s\\S])*?<\\/button>`
  );
  const match = re.exec(html);
  return match ? match[0] : '';
}

function extractVerdictItemHtml(
  html: string,
  attr: 'suspect' | 'weapon' | 'location',
  id: string
): string {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<button\\b[^>]*data-verdict-${attr}="${escapedId}"[^>]*>(?:(?!<\\/button>)[\\s\\S])*?<\\/button>`
  );
  const match = re.exec(html);
  return match ? match[0] : '';
}

describe('E2E Modo Manual (Un Asesinato en Navidad) — Tiers 1–4', () => {
  beforeEach(() => {
    resetStoreToFreshCase(SEED_MAIN);
  });

  // ===================================================================
  // TIER 1: FEATURE COVERAGE (E1–E6, >=5 tests per area)
  // ===================================================================
  describe('Tier 1 — Cobertura Funcional (E1–E6)', () => {
    // -----------------------------------------------------------------
    // E1 (R1): Retiro de ayudas en Modo Manual & preservación en Automático
    // -----------------------------------------------------------------
    describe('E1 (R1): Retiro de ayudas, pistas y banners en Modo Manual', () => {
      it('E1.1: ninguno de los 14 acertijos (isSolved=false) muestra botón Pista, Pista de Azlynn ni barras clave fijas en Modo Manual', async () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        const testHints = ['Pista secreta de prueba'];

        for (const pType of ALL_14_PUZZLE_TYPES) {
          const day = daysByType[pType];
          expect(day, `Missing puzzle type ${pType} in seed`).toBeDefined();
          const html = await renderPuzzleMarkup({
            puzzle: day.puzzle,
            isSolved: false,
            hints: testHints,
            gameMode: 'manual',
          });

          expect(html, `${pType} manual should hide Pista button`).not.toMatch(
            PISTA_BUTTON_RE
          );
          expect(html, `${pType} manual should not render Pista de Azlynn`).not.toContain(
            'Pista de Azlynn:'
          );
          expect(html, `${pType} manual should hide Celdas clave bar`).not.toContain(
            'Celdas clave:'
          );
          expect(html, `${pType} manual should hide Palabra en casillas clave bar`).not.toContain(
            'Palabra en casillas clave:'
          );
          expect(html, `${pType} manual should hide Casillas sombreadas bar`).not.toContain(
            'Casillas sombreadas:'
          );
        }
      });

      it('E1.2: ninguno de los 14 acertijos (isSolved=true) muestra banners de completado ni códigos/palabras secretas en Modo Manual', async () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        const testHints = ['Pista secreta de prueba'];

        for (const pType of ALL_14_PUZZLE_TYPES) {
          const day = daysByType[pType];
          const html = await renderPuzzleMarkup({
            puzzle: day.puzzle,
            isSolved: true,
            hints: testHints,
            gameMode: 'manual',
          });

          expect(html, `${pType} manual solved should hide Pista button`).not.toMatch(
            PISTA_BUTTON_RE
          );
          expect(html, `${pType} manual solved should not render Pista de Azlynn`).not.toContain(
            'Pista de Azlynn:'
          );
          expect(html, `${pType} manual solved should hide Celdas clave bar`).not.toContain(
            'Celdas clave:'
          );
          expect(
            html,
            `${pType} manual solved should hide Palabra en casillas clave bar`
          ).not.toContain('Palabra en casillas clave:');
          expect(html, `${pType} manual solved should hide Casillas sombreadas bar`).not.toContain(
            'Casillas sombreadas:'
          );

          for (const banner of PUZZLE_SOLVED_BANNERS[pType]) {
            expect(
              html,
              `${pType} manual solved must not render banner "${banner}"`
            ).not.toContain(banner);
          }

          // For encajados, wordBank pills (<button data-encajados-word="...">) legitimately display
          // candidate words including secretWord even when all banners and shaded bars are hidden.
          const htmlForSpoilerCheck =
            pType === 'encajados' ? stripEncajadosWordBank(html) : html;
          for (const secret of extractSecretSpoilerStrings(day.puzzle)) {
            if (secret.length >= 4) {
              expect(
                htmlForSpoilerCheck,
                `${pType} manual solved must not leak "${secret}" in spoiler banner`
              ).not.toContain(secret);
            }
          }
        }
      });

      it('E1.3: Modo Automático (gameMode=auto) conserva botón Pista y banners de completado en los 14 acertijos', async () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        const testHints = ['Pista de apoyo automática'];

        for (const pType of ALL_14_PUZZLE_TYPES) {
          const day = daysByType[pType];
          const html = await renderPuzzleMarkup({
            puzzle: day.puzzle,
            isSolved: true,
            hints: testHints,
            gameMode: 'auto',
          });

          expect(html, `${pType} auto should keep Pista button`).toMatch(PISTA_BUTTON_RE);
          const expectedBanner = PUZZLE_SOLVED_BANNERS[pType][0];
          expect(
            html,
            `${pType} auto solved should preserve banner "${expectedBanner}"`
          ).toContain(expectedBanner);
        }

        // In Auto Mode, BookLayout must NOT render the Manual Mode step-1 banner
        useGameStore.setState({
          gameMode: 'auto',
          hasSelectedGameMode: true,
          currentDay: 1,
          openedDoors: [1],
          completedDays: [],
        });
        const autoBookHtml = renderBookLayoutMarkup();
        expect(autoBookHtml).not.toContain('Modo Manual (Paso 1/2)');
      });

      it('E1.4: getPuzzleManualVerificationSpec nunca filtra expectedDisplay, ejemplos (ej. ...), conteos exactos ni claves en promptLabel/formatHint', () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);

        for (const pType of ALL_14_PUZZLE_TYPES) {
          const day = daysByType[pType];
          const spec = getPuzzleManualVerificationSpec(day.puzzle, day.unlockedClue);
          const surface = `${spec.promptLabel} ${spec.formatHint}`;
          const normalizedSurface = normalizeForLeakCheck(surface);

          expect(surface, `${pType} leaks (ej. ...)`).not.toMatch(/\(ej\./i);
          expect(surface, `${pType} leaks exact letter count`).not.toMatch(
            /\b\d+\s+letras?\b/i
          );
          expect(surface, `${pType} leaks exact word count`).not.toMatch(
            /\b\d+\s+palabras?\b/i
          );
          expect(surface, `${pType} leaks Clave:`).not.toContain('Clave:');
          expect(surface, `${pType} leaks Objeto revelado:`).not.toContain('Objeto revelado:');
          expect(surface, `${pType} leaks Clave forense:`).not.toContain('Clave forense:');

          const normExpected = normalizeForLeakCheck(spec.expectedDisplay);
          if (normExpected.length >= 3) {
            expect(
              normalizedSurface,
              `${pType} leaks expectedDisplay "${spec.expectedDisplay}"`
            ).not.toContain(normExpected);
          }
          const clueKey = normalizeForLeakCheck(day.unlockedClue.keyphrase ?? '');
          if (clueKey.length >= 4) {
            expect(
              normalizedSurface,
              `${pType} leaks clueKey "${clueKey}"`
            ).not.toContain(clueKey);
          }

          if (pType === 'minesweeper') {
            const cfg = day.puzzle.config as { rows: number; cols: number; mines: unknown[] };
            const safeCount = cfg.rows * cfg.cols - cfg.mines.length;
            const minesCount = cfg.mines.length;
            expect(surface, 'minesweeper leaks sectores seguros').not.toMatch(/sectores\s+seguros/i);
            expect(surface, 'minesweeper leaks trampas').not.toMatch(/\btrampas\b/i);
            expect(surface, `minesweeper leaks safeCount ${safeCount}`).not.toMatch(
              new RegExp(`\\b${safeCount}\\b`)
            );
            expect(surface, `minesweeper leaks mines count ${minesCount}`).not.toMatch(
              new RegExp(`\\b${minesCount}\\b`)
            );
          }
        }
      });

      it('E1.5: BookLayout en Modo Manual (Día 1) muestra Paso 1/2 y oculta formatHint, "¿De dónde sale el resultado?" y "Resultado leído del tablero"', () => {
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          currentDay: 1,
          openedDoors: [1],
          completedDays: [],
        });
        const day1 = useGameStore.getState().activeCase.days[0];
        const spec = getPuzzleManualVerificationSpec(day1.puzzle, day1.unlockedClue);
        const html = renderBookLayoutMarkup();

        expect(html).toContain('Modo Manual (Paso 1/2)');
        expect(html).not.toContain('¿De dónde sale el resultado?');
        expect(html).not.toContain('Resultado leído del tablero');
        if (spec.formatHint) {
          expect(html).not.toContain(spec.formatHint);
        }
      });

      it('E1.6: contrato de BookLayout Paso 2/2: elimina "¿De dónde sale el resultado?", expectedDisplay, unlockedClue.impact y formatHint de la UI manual', () => {
        const src = readSrcFile('src/components/BookLayout.tsx');
        expect(src).not.toContain('¿De dónde sale el resultado?');
        expect(src).not.toContain('Resultado leído del tablero');
        expect(src).not.toContain('manualSpec.formatHint');
        expect(src).not.toContain('manualSpec.expectedDisplay');

        const step2Start = src.indexOf('Modo Manual (Paso 2/2)');
        expect(step2Start).toBeGreaterThan(-1);
        const formEnd = src.indexOf('</form>', step2Start);
        expect(formEnd).toBeGreaterThan(step2Start);
        const step2Slice = src.slice(step2Start, formEnd);
        expect(step2Slice).not.toContain('expectedDisplay');
        expect(step2Slice).not.toContain('unlockedClue.impact');
        expect(step2Slice).not.toContain('formatHint');
      });

      it('E1.7: DetectiveHintBubble oculta pistas del acertijo, PUZZLE_STRATEGY_TIPS, Cotejo Documental y nodo Pistas en Modo Manual (conserva Diálogo, Caso y Reiniciar)', () => {
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          currentDay: 1,
          openedDoors: [1],
        });
        const day1 = useGameStore.getState().activeCase.days[0];
        const ssrHtml = renderDetectiveHintBubbleMarkup({
          currentDay: 1,
          isAlbum: false,
          dayData: day1,
          isDayCompleted: false,
          completedDays: [],
          unlockedClues: [],
          suspectFunnel: { total: 74, remaining: 74, eliminated: 0 },
        });
        expect(ssrHtml).toContain('data-testid="detective-hint-button"');

        const bubbleSrc = readSrcFile('src/components/DetectiveHintBubble.tsx');
        expect(bubbleSrc).toContain('gameMode');

        // Verify all 3 hint sources in the puzzle-day branch are gated on gameMode !== 'manual'
        const hintsMemoStart = bubbleSrc.indexOf('const hints = useMemo');
        const hintsMemoEnd = bubbleSrc.indexOf('}, [', hintsMemoStart);
        expect(hintsMemoStart).toBeGreaterThan(-1);
        expect(hintsMemoEnd).toBeGreaterThan(hintsMemoStart);
        const hintsMemoSlice = bubbleSrc.slice(hintsMemoStart, hintsMemoEnd);

        const manualReturnMatch = /if\s*\(\s*gameMode\s*===\s*['"]manual['"]\s*\)\s*\{\s*return\s*\[\s*\]\s*;?\s*\}/.exec(
          hintsMemoSlice
        );
        const puzzleHintsIdx = hintsMemoSlice.indexOf('dayData.puzzle.hints');
        const strategyTipsIdx = hintsMemoSlice.indexOf('PUZZLE_STRATEGY_TIPS');
        const cotejoIdx = hintsMemoSlice.indexOf('Cotejo Documental');
        expect(puzzleHintsIdx).toBeGreaterThan(-1);
        expect(strategyTipsIdx).toBeGreaterThan(-1);
        expect(cotejoIdx).toBeGreaterThan(-1);

        const hasEarlyManualReturn =
          manualReturnMatch !== null &&
          manualReturnMatch.index < puzzleHintsIdx &&
          manualReturnMatch.index < strategyTipsIdx &&
          manualReturnMatch.index < cotejoIdx;
        const hasNonManualGuard = /gameMode\s*!==\s*['"]manual['"]/.test(hintsMemoSlice);
        expect(hasEarlyManualReturn || hasNonManualGuard).toBe(true);

        // Verify the radial 'hints' ('Pistas') node and hints tab panel are suppressed when manual + !isAlbum
        expect(bubbleSrc).toMatch(/hidePuzzleHints|gameMode\s*===\s*['"]manual['"]/);
        expect(bubbleSrc).toMatch(/(?:node\.id\s*===\s*['"]hints['"]|['"]hints['"].*hidePuzzleHints|hidePuzzleHints.*node\.id\s*===\s*['"]hints['"])/);
        expect(bubbleSrc).toMatch(/effectiveActiveTab\s*===\s*['"]hints['"]\s*&&\s*!hidePuzzleHints|!hidePuzzleHints\s*&&\s*effectiveActiveTab\s*===\s*['"]hints['"]/);

        // Non-hint tabs remain present
        expect(bubbleSrc).toContain('Diálogo');
        expect(bubbleSrc).toContain('Caso');
        expect(bubbleSrc).toContain('Reiniciar');
      });

      it('E1.8: BookLayout propaga gameMode hacia los 14 componentes de acertijo (runtime y renderPuzzleEngine)', () => {
        const activeCase = useGameStore.getState().activeCase;
        const dayWithHints =
          activeCase.days.find(d => d.act === 1 && d.puzzle.hints.length > 0) ?? activeCase.days[0];
        expect(dayWithHints.puzzle.hints.length).toBeGreaterThan(0);

        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          currentDay: dayWithHints.day,
          openedDoors: [1],
          completedDays: [],
        });
        const manualHtml = renderBookLayoutMarkup();
        expect(manualHtml).not.toMatch(PISTA_BUTTON_RE);
        expect(manualHtml).not.toContain('Pista de Azlynn:');

        useGameStore.setState({
          gameMode: 'auto',
          hasSelectedGameMode: true,
          currentDay: dayWithHints.day,
          openedDoors: [1],
          completedDays: [],
        });
        const autoHtml = renderBookLayoutMarkup();
        expect(autoHtml).toMatch(PISTA_BUTTON_RE);

        const src = readSrcFile('src/components/BookLayout.tsx');
        const engineStart = src.indexOf('const renderPuzzleEngine');
        const engineEnd = src.indexOf('\n  return (', engineStart);
        expect(engineStart).toBeGreaterThan(-1);
        expect(engineEnd).toBeGreaterThan(engineStart);
        const engineSlice = src.slice(engineStart, engineEnd);

        const tagMatches = [...engineSlice.matchAll(/<([A-Z]\w+Puzzle)\b([\s\S]*?)\/>/g)];
        expect(tagMatches).toHaveLength(14);
        expect(new Set(tagMatches.map(m => m[1])).size).toBe(14);

        for (const [, compName, propsText] of tagMatches) {
          const directGameMode = /\bgameMode\b/.test(propsText);
          const spreadMatch = /\{\.\.\.(\w+)\}/.exec(propsText);
          let spreadHasGameMode = false;
          if (spreadMatch) {
            const spreadVar = spreadMatch[1];
            const defRe = new RegExp(`const\\s+${spreadVar}\\s*=\\s*\\{([\\s\\S]*?)\\};`);
            const defMatch = defRe.exec(engineSlice);
            spreadHasGameMode = Boolean(defMatch && /\bgameMode\b/.test(defMatch[1]));
          }
          expect(
            directGameMode || spreadHasGameMode,
            `BookLayout renderPuzzleEngine must pass gameMode to <${compName} />`
          ).toBe(true);
        }
      });
    });

    // -----------------------------------------------------------------
    // E2 (R2): Ingreso manual en los 14 acertijos + Sudoku/Futoshiki 1..4
    // -----------------------------------------------------------------
    describe('E2 (R2): Verificación manual en los 14 acertijos y claves 1..4', () => {
      it('E2.1: verifyManualPuzzleInput acepta la respuesta derivada del tablero en los 14 tipos de acertijos', () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);

        for (const pType of ALL_14_PUZZLE_TYPES) {
          const day = daysByType[pType];
          const boardAnswer = deriveManualAnswerFromBoard(day);
          expect(boardAnswer.length, `${pType} derived empty answer`).toBeGreaterThanOrEqual(2);
          expect(
            verifyManualPuzzleInput(day.puzzle, day.unlockedClue, boardAnswer),
            `${pType} rejected valid board-derived answer "${boardAnswer}"`
          ).toBe(true);
        }
      });

      it('E2.2: verifyManualPuzzleInput rechaza respuestas erróneas en los 14 tipos de acertijos', () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);

        for (const pType of ALL_14_PUZZLE_TYPES) {
          const day = daysByType[pType];
          expect(
            verifyManualPuzzleInput(day.puzzle, day.unlockedClue, 'RESPUESTA_ERRONEA_999'),
            `${pType} accepted bogus answer`
          ).toBe(false);
          expect(
            verifyManualPuzzleInput(day.puzzle, day.unlockedClue, '0000'),
            `${pType} accepted 0000`
          ).toBe(false);
        }
      });

      it('E2.3: en Modo Manual, resolver el tablero no lacra el día hasta confirmar manualmente mediante markDayCompleted', () => {
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          currentDay: 1,
          openedDoors: [1],
        });
        const day1 = useGameStore.getState().activeCase.days[0];
        const bookSrc = readSrcFile('src/components/BookLayout.tsx');
        // Extract handlePuzzleBoardSolved body strictly so later gameMode === 'manual' checks can't mask a bug
        const boardSolvedStart = bookSrc.indexOf('const handlePuzzleBoardSolved');
        const confirmManualStart = bookSrc.indexOf('const handleConfirmManualResult');
        expect(boardSolvedStart).toBeGreaterThan(-1);
        expect(confirmManualStart).toBeGreaterThan(boardSolvedStart);
        const boardSolvedBody = bookSrc.slice(boardSolvedStart, confirmManualStart);
        expect(boardSolvedBody).toMatch(/gameMode\s*===\s*['"]manual['"]|gameMode\s*!==\s*['"]auto['"]/);
        const manualIdx = boardSolvedBody.search(/gameMode\s*===\s*['"]manual['"]|gameMode\s*!==\s*['"]auto['"]/);
        const solveIdx = boardSolvedBody.indexOf('handleSolveCurrentPuzzle');
        expect(solveIdx).toBeGreaterThan(manualIdx);

        // Verify handleConfirmManualResult checks verifyManualPuzzleInput before completing the day
        const confirmEnd = bookSrc.indexOf('const handleTestCompleteAct', confirmManualStart);
        expect(confirmEnd).toBeGreaterThan(confirmManualStart);
        const confirmBody = bookSrc.slice(confirmManualStart, confirmEnd);
        const verifyIdx = confirmBody.indexOf('verifyManualPuzzleInput');
        const confirmSolveIdx = confirmBody.search(/handleSolveCurrentPuzzle|markDayCompleted/);
        expect(verifyIdx).toBeGreaterThan(-1);
        expect(confirmSolveIdx).toBeGreaterThan(verifyIdx);
        // Before confirmation: day 1 not completed, clue not unlocked
        expect(useGameStore.getState().completedDays).not.toContain(1);
        expect(useGameStore.getState().unlockedClues).toHaveLength(0);

        const answer = deriveManualAnswerFromBoard(day1);
        expect(verifyManualPuzzleInput(day1.puzzle, day1.unlockedClue, answer)).toBe(true);
        useGameStore
          .getState()
          .markDayCompleted(day1.day, day1.unlockedClue, day1.unlockedClue.autoEliminations);
        expect(useGameStore.getState().completedDays).toContain(1);
        expect(useGameStore.getState().unlockedClues).toHaveLength(1);
      });

      it('E2.4: SudokuPuzzle muestra los índices visibles 1, 2, 3, 4 en sus 4 casillas con llave según keyCells (manual y auto)', async () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        const sudokuDay = daysByType.sudoku;
        const config = sudokuDay.puzzle.config as {
          keyCells: Array<{ r: number; c: number }>;
        };
        expect(config.keyCells).toHaveLength(4);

        for (const mode of ['manual', 'auto'] as const) {
          const html = await renderPuzzleMarkup({
            puzzle: sudokuDay.puzzle,
            isSolved: false,
            gameMode: mode,
          });
          config.keyCells.forEach((cell, idx) => {
            const cellHtml = extractSudokuCellHtml(html, cell.r, cell.c);
            expect(cellHtml, `Sudoku (${cell.r},${cell.c}) missing`).not.toBe('');
            const text = stripHtmlTags(cellHtml);
            expect(
              text,
              `Sudoku ${mode} keyCell #${idx + 1} at (${cell.r},${cell.c}) must display index ${idx + 1}`
            ).toContain(String(idx + 1));
          });
        }
      });

      it('E2.5: FutoshikiPuzzle muestra los índices visibles 1, 2, 3, 4 en sus 4 casillas con llave según keyCells (manual y auto)', async () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        const futoshikiDay = daysByType.futoshiki;
        const config = futoshikiDay.puzzle.config as {
          keyCells?: Array<{ r: number; c: number }>;
        };
        expect(config.keyCells?.length).toBe(4);

        for (const mode of ['manual', 'auto'] as const) {
          const html = await renderPuzzleMarkup({
            puzzle: futoshikiDay.puzzle,
            isSolved: false,
            gameMode: mode,
          });
          config.keyCells!.forEach((cell, idx) => {
            const cellHtml = extractFutoshikiCellHtml(html, cell.r, cell.c);
            expect(cellHtml, `Futoshiki (${cell.r},${cell.c}) missing`).not.toBe('');
            const text = stripHtmlTags(cellHtml);
            expect(
              text,
              `Futoshiki ${mode} keyCell #${idx + 1} at (${cell.r},${cell.c}) must display index ${idx + 1}`
            ).toContain(String(idx + 1));
          });
        }
      });

      it('E2.6: ConnectionsPuzzle usa el título en español "Conexiones (4×4)" y no "Connections (4×4)"', async () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        const connDay = daysByType.connections;
        for (const mode of ['manual', 'auto'] as const) {
          const html = await renderPuzzleMarkup({
            puzzle: connDay.puzzle,
            isSolved: false,
            gameMode: mode,
          });
          expect(html).toContain('Conexiones (4×4)');
          expect(html).not.toContain('Connections (4×4)');
        }
      });
    });

    // -----------------------------------------------------------------
    // E3 (R3a): Aislamiento de pistas y matriz + tachado manual 74/18/9
    // -----------------------------------------------------------------
    describe('E3 (R3a): Aislamiento de pistas/matriz y tachado manual independiente', () => {
      it('E3.1: en Modo Manual, desbloquear las 30 pistas NO tacha automáticamente ningún sospechoso en computeSuspectStatus', async () => {
        const { computeSuspectStatus } = await getStoreExportsModule();
        const activeCase = useGameStore.getState().activeCase;
        const allClues = activeCase.days.map(d => d.unlockedClue);

        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          openedDoors: [1],
          unlockedClues: allClues,
          manualEliminations: [],
        });

        for (const suspect of SUSPECTS_DIRECTORY) {
          const status = computeSuspectStatus(
            suspect,
            [],
            allClues,
            activeCase,
            [1],
            'manual'
          );
          expect(status.isEliminated, `Suspect ${suspect.id} auto-eliminated in manual mode`).toBe(
            false
          );
          const storeStatus = useGameStore.getState().getSuspectStatus(suspect);
          expect(
            storeStatus.isEliminated,
            `Store getSuspectStatus(${suspect.id}) auto-eliminated in manual mode`
          ).toBe(false);
        }
      });

      it('E3.2: en Modo Manual, markDayCompleted con confirmedMatches NO rellena matrixCells; en Modo Automático sí escribe check', () => {
        const activeCase = useGameStore.getState().activeCase;
        const day1 = activeCase.days[0];
        const fakeMatches = [{ suspect: SUSPECTS_DIRECTORY[0].id, weapon: WEAPONS[0].id, room: LOCATIONS[0].id }];

        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true });
        useGameStore.getState().markDayCompleted(day1.day, day1.unlockedClue, {
          confirmedMatches: fakeMatches,
        });
        expect(useGameStore.getState().matrixCells).toEqual({});

        resetStoreToFreshCase(SEED_MAIN);
        useGameStore.setState({ gameMode: 'auto', hasSelectedGameMode: true });
        useGameStore.getState().markDayCompleted(day1.day, day1.unlockedClue, {
          confirmedMatches: fakeMatches,
        });
        expect(
          useGameStore.getState().matrixCells[`${SUSPECTS_DIRECTORY[0].id}:${WEAPONS[0].id}`]
        ).toBe('check');
        expect(
          useGameStore.getState().matrixCells[`${SUSPECTS_DIRECTORY[0].id}:${LOCATIONS[0].id}`]
        ).toBe('check');
      });

      it('E3.3: computeWeaponStatus y computeRoomStatus aíslan las pistas en Modo Manual y aplican auto-descarte en Modo Automático', async () => {
        const storeMod = await getStoreExportsModule();
        expect(typeof storeMod.computeWeaponStatus).toBe('function');
        expect(typeof storeMod.computeRoomStatus).toBe('function');

        const activeCase = useGameStore.getState().activeCase;
        const allClues = activeCase.days.map(d => d.unlockedClue);
        const evalRes = evaluateCaseClues(allClues);
        const autoElimWeapon = WEAPONS.find(w => !evalRes.matchingWeaponIds.includes(w.id))!;
        const autoElimRoom = LOCATIONS.find(r => !evalRes.matchingRoomIds.includes(r.id))!;

        // Manual Mode: clues do NOT eliminate weapons or rooms
        const wManual = storeMod.computeWeaponStatus!(autoElimWeapon.id, [], allClues, 'manual');
        const rManual = storeMod.computeRoomStatus!(autoElimRoom.id, [], allClues, 'manual');
        expect(wManual.isEliminated).toBe(false);
        expect(wManual.isAutoEliminated).toBe(false);
        expect(rManual.isEliminated).toBe(false);
        expect(rManual.isAutoEliminated).toBe(false);

        // Auto Mode: clues DO eliminate non-matching weapons and rooms
        const wAuto = storeMod.computeWeaponStatus!(autoElimWeapon.id, [], allClues, 'auto');
        const rAuto = storeMod.computeRoomStatus!(autoElimRoom.id, [], allClues, 'auto');
        expect(wAuto.isEliminated).toBe(true);
        expect(wAuto.isAutoEliminated).toBe(true);
        expect(rAuto.isEliminated).toBe(true);
        expect(rAuto.isAutoEliminated).toBe(true);
      });

      it('E3.4: permite tachar y destachar manualmente de forma independiente los 74 sospechosos', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true, openedDoors: [1] });

        for (const s of SUSPECTS_DIRECTORY) {
          useGameStore.getState().toggleManualElimination(s.id);
          expect(useGameStore.getState().getSuspectStatus(s).isEliminated).toBe(true);
          expect(useGameStore.getState().getSuspectStatus(s).isManual).toBe(true);
        }
        expect(useGameStore.getState().manualEliminations).toHaveLength(74);

        for (const s of SUSPECTS_DIRECTORY) {
          useGameStore.getState().toggleManualElimination(s.id);
          expect(useGameStore.getState().getSuspectStatus(s).isEliminated).toBe(false);
        }
        expect(useGameStore.getState().manualEliminations).toHaveLength(0);
      });

      it('E3.5: permite tachar y destachar manualmente de forma independiente las 18 armas y las 9 estancias', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true });
        const store = getFullStoreState();
        expect(typeof store.toggleManualWeaponElimination).toBe('function');
        expect(typeof store.toggleManualRoomElimination).toBe('function');
        expect(typeof store.getWeaponStatus).toBe('function');
        expect(typeof store.getRoomStatus).toBe('function');

        for (const w of WEAPONS) {
          getFullStoreState().toggleManualWeaponElimination!(w.id);
          expect(getFullStoreState().getWeaponStatus!(w.id).isEliminated).toBe(true);
          expect(getFullStoreState().getWeaponStatus!(w.id).isManual).toBe(true);
        }
        expect(getFullStoreState().manualWeaponEliminations).toHaveLength(18);

        for (const w of WEAPONS) {
          getFullStoreState().toggleManualWeaponElimination!(w.id);
          expect(getFullStoreState().getWeaponStatus!(w.id).isEliminated).toBe(false);
        }
        expect(getFullStoreState().manualWeaponEliminations).toHaveLength(0);

        for (const r of LOCATIONS) {
          getFullStoreState().toggleManualRoomElimination!(r.id);
          expect(getFullStoreState().getRoomStatus!(r.id).isEliminated).toBe(true);
          expect(getFullStoreState().getRoomStatus!(r.id).isManual).toBe(true);
        }
        expect(getFullStoreState().manualRoomEliminations).toHaveLength(9);

        for (const r of LOCATIONS) {
          getFullStoreState().toggleManualRoomElimination!(r.id);
          expect(getFullStoreState().getRoomStatus!(r.id).isEliminated).toBe(false);
        }
        expect(getFullStoreState().manualRoomEliminations).toHaveLength(0);
      });

      it('E3.6: DetectiveDossier en Modo Manual refleja solo descartes manuales en 74/18/9 y expone controles para armas y estancias', () => {
        const allClues = useGameStore.getState().activeCase.days.map(d => d.unlockedClue);
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          openedDoors: [1],
          unlockedClues: allClues,
          manualEliminations: [],
        });

        const htmlClean = renderDetectiveDossierMarkup();
        expect(htmlClean).toContain('74/74');
        expect(htmlClean).toContain('74 activos');
        expect(htmlClean).toContain('18/18 • 9/9');

        // Toggle 3 suspects, 2 weapons, 1 room
        for (let i = 0; i < 3; i++) {
          useGameStore.getState().toggleManualElimination(SUSPECTS_DIRECTORY[i].id);
        }
        const st = getFullStoreState();
        expect(typeof st.toggleManualWeaponElimination).toBe('function');
        expect(typeof st.toggleManualRoomElimination).toBe('function');
        st.toggleManualWeaponElimination!(WEAPONS[0].id);
        st.toggleManualWeaponElimination!(WEAPONS[1].id);
        st.toggleManualRoomElimination!(LOCATIONS[0].id);

        const htmlAfter = renderDetectiveDossierMarkup();
        expect(htmlAfter).toContain('71/74');
        expect(htmlAfter).toContain('71 activos');
        expect(htmlAfter).toContain('16/18 • 8/9');
        expect(htmlAfter).toContain('TACHADO');

        const dossierSrc = readSrcFile('src/components/DetectiveDossier.tsx');
        expect(dossierSrc).toContain('toggleManualWeaponElimination');
        expect(dossierSrc).toContain('toggleManualRoomElimination');
        expect(dossierSrc).toMatch(/getWeaponStatus|computeWeaponStatus\([^)]*gameMode/);
        expect(dossierSrc).toMatch(/getRoomStatus|computeRoomStatus\([^)]*gameMode/);

        const weaponsTabStart = dossierSrc.lastIndexOf("activeTab === 'weapons'");
        const cluesTabStart = dossierSrc.lastIndexOf("activeTab === 'clues'");
        expect(weaponsTabStart).toBeGreaterThan(-1);
        expect(cluesTabStart).toBeGreaterThan(weaponsTabStart);
        const weaponsBody = dossierSrc.slice(weaponsTabStart, cluesTabStart);
        expect(weaponsBody).toContain('toggleManualWeaponElimination');
        expect(weaponsBody).toContain('toggleManualRoomElimination');
        expect(weaponsBody).toMatch(/getWeaponStatus|computeWeaponStatus/);
        expect(weaponsBody).toMatch(/getRoomStatus|computeRoomStatus/);
        expect(weaponsBody).not.toContain('matchingWeaponSet');
        expect(weaponsBody).not.toContain('matchingRoomSet');
        expect(weaponsBody).not.toContain('clueEval.matchingWeaponIds');
        expect(weaponsBody).not.toContain('clueEval.matchingRoomIds');
      });

      it('E3.7: BookLayout embudo y modal de embudo en Modo Manual muestran contadores manuales + víctimas (no clueEval)', () => {
        const allClues = useGameStore.getState().activeCase.days.map(d => d.unlockedClue);
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          currentDay: 1,
          openedDoors: [1],
          unlockedClues: allClues,
          manualEliminations: [SUSPECTS_DIRECTORY[0].id, SUSPECTS_DIRECTORY[1].id],
        });

        const html = renderBookLayoutMarkup();
        expect(stripHtmlTags(html)).toContain('72 / 74 Bajo Sospecha');
        const bookSrc = readSrcFile('src/components/BookLayout.tsx');
        expect(bookSrc).toMatch(/gameMode\s*===\s*['"]manual['"]/);
        expect(bookSrc).toMatch(
          /manualWeaponEliminations|getWeaponStatus|computeWeaponStatus/
        );
        expect(bookSrc).toMatch(
          /manualRoomEliminations|getRoomStatus|computeRoomStatus/
        );

        const funnelModalStart = bookSrc.indexOf('isFunnelModalOpen &&');
        expect(funnelModalStart).toBeGreaterThan(-1);
        const funnelModalSlice = bookSrc.slice(funnelModalStart);
        expect(funnelModalSlice).not.toContain('clueEval.matchingSuspectIds');
        expect(funnelModalSlice).not.toContain('clueEval.matchingWeaponIds');
        expect(funnelModalSlice).not.toContain('clueEval.matchingRoomIds');
      });

      it('E3.8: FinalVerdictModal en Modo Manual usa conteos manuales + víctimas en Compatibles (X), Advertencia Sumarial y clases grayscale/opacity', () => {
        const activeCase = useGameStore.getState().activeCase;
        const clues15 = activeCase.days.slice(0, 15).map(d => d.unlockedClue);
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          openedDoors: [1],
          unlockedClues: clues15,
          completedDays: Array.from({ length: 15 }, (_, i) => i + 1),
          manualEliminations: [SUSPECTS_DIRECTORY[0].id],
        });
        const st = getFullStoreState();
        expect(typeof st.toggleManualWeaponElimination).toBe('function');
        expect(typeof st.toggleManualRoomElimination).toBe('function');
        st.toggleManualWeaponElimination!(WEAPONS[0].id);
        st.toggleManualWeaponElimination!(WEAPONS[1].id);
        st.toggleManualRoomElimination!(LOCATIONS[0].id);

        const html = renderFinalVerdictModalMarkup();
        expect(html).toContain('Compatibles (73)');
        expect(html).toContain('73 sospechosos');
        expect(html).toContain('16 armas');
        expect(html).toContain('8 estancias');

        // Manually eliminated cards get grayscale/opacity-70; non-eliminated cards stay active
        const elimSuspectHtml = extractVerdictItemHtml(html, 'suspect', SUSPECTS_DIRECTORY[0].id);
        const activeSuspectHtml = extractVerdictItemHtml(html, 'suspect', SUSPECTS_DIRECTORY[1].id);
        expect(elimSuspectHtml).toMatch(/grayscale|opacity-70/);
        expect(activeSuspectHtml).not.toContain('grayscale');
        expect(activeSuspectHtml).not.toContain('opacity-70');

        const elimWeaponHtml = extractVerdictItemHtml(html, 'weapon', WEAPONS[0].id);
        const activeWeaponHtml = extractVerdictItemHtml(html, 'weapon', WEAPONS[2].id);
        expect(elimWeaponHtml).toMatch(/grayscale|opacity-70/);
        expect(activeWeaponHtml).not.toContain('grayscale');
        expect(activeWeaponHtml).not.toContain('opacity-70');

        const elimRoomHtml = extractVerdictItemHtml(html, 'location', LOCATIONS[0].id);
        const activeRoomHtml = extractVerdictItemHtml(html, 'location', LOCATIONS[1].id);
        expect(elimRoomHtml).toMatch(/opacity-70|grayscale/);
        expect(activeRoomHtml).not.toContain('opacity-70');
        expect(activeRoomHtml).not.toContain('grayscale');

        // With 30 clues and 0 manual weapon/room eliminations, NO weapon or room card may be grayed out
        const allClues = activeCase.days.map(d => d.unlockedClue);
        useGameStore.setState({
          unlockedClues: allClues,
          completedDays: Array.from({ length: 30 }, (_, i) => i + 1),
          manualEliminations: [],
          manualWeaponEliminations: [],
          manualRoomEliminations: [],
        } as Partial<ReturnType<typeof useGameStore.getState>>);
        const allCluesHtml = renderFinalVerdictModalMarkup();
        for (const w of WEAPONS) {
          const wBtn = extractVerdictItemHtml(allCluesHtml, 'weapon', w.id);
          expect(wBtn, `Weapon ${w.id} must not be grayed by clues in Manual Mode`).not.toContain('grayscale');
          expect(wBtn, `Weapon ${w.id} must not have opacity-70 in Manual Mode`).not.toContain('opacity-70');
        }
        for (const l of LOCATIONS) {
          const lBtn = extractVerdictItemHtml(allCluesHtml, 'location', l.id);
          expect(lBtn, `Room ${l.id} must not have opacity-70 in Manual Mode`).not.toContain('opacity-70');
          expect(lBtn, `Room ${l.id} must not be grayed in Manual Mode`).not.toContain('grayscale');
        }
      });
    });

    // -----------------------------------------------------------------
    // E4 (R3b): Víctimas fallecidas en Puertas 2–5 en ambos modos
    // -----------------------------------------------------------------
    describe('E4 (R3b): Tachado automático de víctimas fallecidas (Puertas 2–5) en ambos modos', () => {
      it('E4.1: en Modo Manual, abrir Puertas 2–5 tacha automáticamente las 4 víctimas fallecidas', () => {
        const activeCase = useGameStore.getState().activeCase;
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          completedDays: Array.from({ length: 24 }, (_, i) => i + 1),
          openedDoors: [1],
        });

        for (const act of [2, 3, 4, 5] as const) {
          useGameStore.getState().openDoor(act);
          const actFile = activeCase.acts.find(a => a.act === act)!;
          const victim = SUSPECTS_DIRECTORY.find(s => s.id === actFile.victimId)!;
          const status = useGameStore.getState().getSuspectStatus(victim);
          expect(status.isEliminated).toBe(true);
          expect(status.isVictim).toBe(true);
          expect(status.victimAct).toBe(act);
          expect(status.isManual).toBe(false);
        }
      });

      it('E4.2: en Modo Automático, abrir Puertas 2–5 tacha automáticamente las 4 víctimas fallecidas', () => {
        const activeCase = useGameStore.getState().activeCase;
        useGameStore.setState({
          gameMode: 'auto',
          hasSelectedGameMode: true,
          completedDays: Array.from({ length: 24 }, (_, i) => i + 1),
          openedDoors: [1],
        });

        for (const act of [2, 3, 4, 5] as const) {
          useGameStore.getState().openDoor(act);
          const actFile = activeCase.acts.find(a => a.act === act)!;
          const victim = SUSPECTS_DIRECTORY.find(s => s.id === actFile.victimId)!;
          const status = useGameStore.getState().getSuspectStatus(victim);
          expect(status.isEliminated).toBe(true);
          expect(status.isVictim).toBe(true);
          expect(status.victimAct).toBe(act);
        }
      });

      it('E4.3: toggleManualElimination sobre víctimas fallecidas de Puertas 2–5 abiertas es un no-op en ambos modos', () => {
        for (const mode of ['manual', 'auto'] as const) {
          resetStoreToFreshCase(SEED_MAIN);
          const activeCase = useGameStore.getState().activeCase;
          useGameStore.setState({
            gameMode: mode,
            hasSelectedGameMode: true,
            completedDays: Array.from({ length: 24 }, (_, i) => i + 1),
            openedDoors: [1, 2, 3, 4, 5],
            manualEliminations: [],
          });

          for (const act of [2, 3, 4, 5] as const) {
            const victimId = activeCase.acts.find(a => a.act === act)!.victimId;
            const victim = SUSPECTS_DIRECTORY.find(s => s.id === victimId)!;

            useGameStore.getState().toggleManualElimination(victimId);
            expect(
              useGameStore.getState().manualEliminations,
              `${mode} mode must not add victim ${victimId} to manualEliminations`
            ).not.toContain(victimId);
            expect(useGameStore.getState().getSuspectStatus(victim).isEliminated).toBe(true);
            expect(useGameStore.getState().getSuspectStatus(victim).isVictim).toBe(true);
          }
        }
      });

      it('E4.4: antes de abrir una Puerta 2–5, su futura víctima no está fallecida y puede tacharse/destacharse manualmente', () => {
        const activeCase = useGameStore.getState().activeCase;
        const act2VictimId = activeCase.acts.find(a => a.act === 2)!.victimId;
        const victim = SUSPECTS_DIRECTORY.find(s => s.id === act2VictimId)!;

        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          openedDoors: [1],
          completedDays: [1, 2, 3, 4, 5, 6],
        });

        expect(useGameStore.getState().getSuspectStatus(victim).isVictim).toBeFalsy();
        expect(useGameStore.getState().getSuspectStatus(victim).isEliminated).toBe(false);

        useGameStore.getState().toggleManualElimination(act2VictimId);
        expect(useGameStore.getState().getSuspectStatus(victim).isEliminated).toBe(true);
        useGameStore.getState().toggleManualElimination(act2VictimId);
        expect(useGameStore.getState().getSuspectStatus(victim).isEliminated).toBe(false);

        // Now open Door 2
        useGameStore.getState().openDoor(2);
        expect(useGameStore.getState().getSuspectStatus(victim).isVictim).toBe(true);
        expect(useGameStore.getState().getSuspectStatus(victim).isEliminated).toBe(true);
      });

      it('E4.5: DetectiveDossier y SuspectsAlbum muestran la etiqueta de Fallecido · Acto X para víctimas (y no Exculpado · Día en el modal del Álbum)', () => {
        const activeCase = useGameStore.getState().activeCase;
        const clues12 = activeCase.days.slice(0, 12).map(d => d.unlockedClue);
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          openedDoors: [1, 2, 3],
          completedDays: Array.from({ length: 12 }, (_, i) => i + 1),
          unlockedClues: clues12,
          manualEliminations: [],
        });

        const dossierHtml = renderDetectiveDossierMarkup();
        expect(dossierHtml).toContain('FALLECIDO · ACTO 2');
        expect(dossierHtml).toContain('FALLECIDO · ACTO 3');
        expect(dossierHtml).toContain('72/74');

        // Runtime SSR check on SuspectsAlbum: with 12 clues unlocked & Doors 2-3 opened in Manual Mode,
        // only the 2 deceased victims are eliminated (72/74 Bajo Sospecha)
        const albumHtml = renderSuspectsAlbumMarkup();
        expect(albumHtml).toContain('72/74 Bajo Sospecha');

        // Verify SuspectsAlbum passes gameMode (or uses getSuspectStatus) on ALL status lookups
        // and renders Fallecido · Acto X before Exculpado in the detail modal dictamen badge
        const albumSrc = readSrcFile('src/components/SuspectsAlbum.tsx');
        const usesGetSuspectStatus = /\bgetSuspectStatus\b/.test(albumSrc);
        const computeCalls = albumSrc.match(/computeSuspectStatus\([^)]*\)/g) ?? [];
        if (!usesGetSuspectStatus) {
          expect(computeCalls.length).toBeGreaterThanOrEqual(2);
          for (const call of computeCalls) {
            expect(call, `SuspectsAlbum call missing gameMode: ${call}`).toContain('gameMode');
          }
        }

        const modalStart = albumSrc.indexOf('{selectedSuspect && (');
        const modalBadgeEnd = albumSrc.indexOf('Bajo Sospecha Activa', modalStart);
        expect(modalStart).toBeGreaterThan(-1);
        expect(modalBadgeEnd).toBeGreaterThan(modalStart);
        const modalBadgeSlice = albumSrc.slice(modalStart, modalBadgeEnd);
        const isVictimIdx = modalBadgeSlice.indexOf('isVictim');
        const fallecidoIdx = modalBadgeSlice.indexOf('Fallecido · Acto');
        const exculpadoIdx = modalBadgeSlice.indexOf('Exculpado');
        expect(isVictimIdx).toBeGreaterThan(-1);
        expect(fallecidoIdx).toBeGreaterThan(isVictimIdx);
        expect(exculpadoIdx).toBeGreaterThan(fallecidoIdx);
      });

      it('E4.6: invariante de campaña: las víctimas fallecidas de Puertas 2–5 nunca coinciden con el culpable real', () => {
        for (const seed of [SEED_MAIN, SEED_ALT, 7771924]) {
          const c = generateCase(seed);
          const victimIds = c.acts.filter(a => a.act >= 2).map(a => a.victimId);
          expect(victimIds).toHaveLength(4);
          expect(new Set(victimIds).size).toBe(4);
          expect(victimIds).not.toContain(c.config.culpritId);
        }
      });
    });

    // -----------------------------------------------------------------
    // E5 (R3c): Bloqueo de cambio de modo y ciclo de sesión
    // -----------------------------------------------------------------
    describe('E5 (R3c): Bloqueo de cambio de modo tras iniciar partida y desbloqueo al reiniciar', () => {
      it('E5.1: tras elegir Modo Manual (hasSelectedGameMode=true), setGameMode("auto") es un no-op', () => {
        useGameStore.getState().setGameMode('manual');
        expect(useGameStore.getState().gameMode).toBe('manual');
        expect(useGameStore.getState().hasSelectedGameMode).toBe(true);

        useGameStore.getState().setGameMode('auto');
        expect(useGameStore.getState().gameMode).toBe('manual');
        expect(useGameStore.getState().hasSelectedGameMode).toBe(true);
      });

      it('E5.2: tras elegir Modo Automático (hasSelectedGameMode=true), setGameMode("manual") es un no-op', () => {
        useGameStore.getState().setGameMode('auto');
        expect(useGameStore.getState().gameMode).toBe('auto');
        expect(useGameStore.getState().hasSelectedGameMode).toBe(true);

        useGameStore.getState().setGameMode('manual');
        expect(useGameStore.getState().gameMode).toBe('auto');
        expect(useGameStore.getState().hasSelectedGameMode).toBe(true);
      });

      it('E5.3: resetGame() desbloquea el cambio de modo, limpia tachados manuales (sospechosos/armas/estancias) e incrementa gameSessionId', () => {
        const stBefore = getFullStoreState();
        expect(typeof stBefore.gameSessionId).toBe('number');
        const initialSession = stBefore.gameSessionId!;

        useGameStore.getState().setGameMode('manual');
        useGameStore.getState().toggleManualElimination(SUSPECTS_DIRECTORY[0].id);
        getFullStoreState().toggleManualWeaponElimination?.(WEAPONS[0].id);
        getFullStoreState().toggleManualRoomElimination?.(LOCATIONS[0].id);

        useGameStore.getState().resetGame();

        const stAfter = getFullStoreState();
        expect(stAfter.hasSelectedGameMode).toBe(false);
        expect(stAfter.manualEliminations).toEqual([]);
        expect(stAfter.manualWeaponEliminations).toEqual([]);
        expect(stAfter.manualRoomEliminations).toEqual([]);
        expect(stAfter.gameSessionId).toBeGreaterThan(initialSession);

        // Mode can now be switched cleanly
        useGameStore.getState().setGameMode('auto');
        expect(useGameStore.getState().gameMode).toBe('auto');
      });

      it('E5.4: startNewCase() sin semilla desbloquea el modo, limpia tachados manuales e incrementa gameSessionId', () => {
        const initialSession = getFullStoreState().gameSessionId;
        expect(typeof initialSession).toBe('number');

        useGameStore.getState().setGameMode('manual');
        useGameStore.getState().toggleManualElimination(SUSPECTS_DIRECTORY[0].id);
        getFullStoreState().toggleManualWeaponElimination?.(WEAPONS[0].id);
        getFullStoreState().toggleManualRoomElimination?.(LOCATIONS[0].id);

        useGameStore.getState().startNewCase();

        const stAfter = getFullStoreState();
        expect(stAfter.hasSelectedGameMode).toBe(false);
        expect(stAfter.manualEliminations).toEqual([]);
        expect(stAfter.manualWeaponEliminations).toEqual([]);
        expect(stAfter.manualRoomEliminations).toEqual([]);
        expect(stAfter.gameSessionId).toBeGreaterThan(initialSession!);

        useGameStore.getState().setGameMode('auto');
        expect(useGameStore.getState().gameMode).toBe('auto');
      });

      it('E5.5: BookLayout deshabilita el botón de Modo en cabecera cuando hasSelectedGameMode === true', () => {
        const modeButtonRe =
          /<button\b(?:(?!<\/button>)[\s\S])*?Modo:\s*Manual(?:(?!<\/button>)[\s\S])*?<\/button>/;

        for (const testCase of [
          { currentDay: 0, openedDoors: [] as number[] },
          { currentDay: 1, openedDoors: [1] },
        ]) {
          useGameStore.setState({
            gameMode: 'manual',
            hasSelectedGameMode: true,
            currentDay: testCase.currentDay,
            openedDoors: testCase.openedDoors,
          });
          const lockedHtml = renderBookLayoutMarkup();
          const lockedBtn = modeButtonRe.exec(lockedHtml);
          expect(lockedBtn, `Missing Modo: Manual button at day ${testCase.currentDay}`).not.toBeNull();
          expect(lockedBtn![0]).not.toContain('Página anterior');
          expect(lockedBtn![0]).toMatch(/\sdisabled(?:=""|(?=\s|>))/);

          useGameStore.setState({
            gameMode: 'manual',
            hasSelectedGameMode: false,
            currentDay: testCase.currentDay,
            openedDoors: testCase.openedDoors,
          });
          const unlockedHtml = renderBookLayoutMarkup();
          const unlockedBtn = modeButtonRe.exec(unlockedHtml);
          expect(unlockedBtn, `Missing Modo: Manual button at day ${testCase.currentDay}`).not.toBeNull();
          expect(unlockedBtn![0]).not.toContain('Página anterior');
          expect(unlockedBtn![0]).not.toMatch(/\sdisabled(?:=""|(?=\s|>))/);
        }
      });

      it('E5.6: GameModeModal oculta el botón cerrar X si !hasSelectedGameMode y no afirma que el modo pueda cambiarse en cualquier momento', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: false });
        const initialHtml = renderGameModeModalMarkup(() => {});
        expect(initialHtml).not.toContain('Cerrar selector de modo');
        expect(initialHtml).not.toContain(
          'Puedes cambiar este modo en cualquier momento desde la barra superior'
        );

        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true });
        const lockedHtml = renderGameModeModalMarkup(() => {});
        expect(lockedHtml).toContain('Cerrar selector de modo');
      });
    });

    // -----------------------------------------------------------------
    // E6 (R4): 74 rutas únicas, controles [TEST], español y 0 emojis
    // -----------------------------------------------------------------
    describe('E6 (R4): Preservación de 74 rutas únicas, controles [TEST], español y cero emojis', () => {
      it('E6.1: las 74 rutas únicas para 1 asesino (74 sospechosos × 18 armas × 9 estancias) resuelven a |S|=1, |W|=1, |R|=1', () => {
        const coveredWeapons = new Set<string>();
        const coveredRooms = new Set<string>();
        for (let k = 0; k < SUSPECTS_DIRECTORY.length; k++) {
          const seed = 300000 + k * 4999;
          const weaponIdx = (k * 5) % WEAPONS.length;
          const roomIdx = (k * 5) % LOCATIONS.length;
          coveredWeapons.add(WEAPONS[weaponIdx].id);
          coveredRooms.add(LOCATIONS[roomIdx].id);
          const generated = generateCase(seed, k, weaponIdx, roomIdx);
          const evaluation = evaluateCaseClues(generated.days.map(d => d.unlockedClue));

          expect(evaluation.matchingSuspectIds).toEqual([SUSPECTS_DIRECTORY[k].id]);
          expect(evaluation.matchingWeaponIds).toEqual([WEAPONS[weaponIdx].id]);
          expect(evaluation.matchingRoomIds).toEqual([LOCATIONS[roomIdx].id]);
        }
        expect(coveredWeapons.size).toBe(WEAPONS.length);
        expect(coveredRooms.size).toBe(LOCATIONS.length);
      });

      it('E6.2: BookLayout mantiene funcionales los botones [TEST] Omitir Día y [TEST] Completar Acto en ambos modos', () => {
        for (const mode of ['manual', 'auto'] as const) {
          useGameStore.setState({
            gameMode: mode,
            hasSelectedGameMode: true,
            currentDay: 1,
            openedDoors: [1],
            completedDays: [],
          });
          const html = renderBookLayoutMarkup();
          expect(html).toContain('[TEST] Omitir Día');
          expect(html).toContain('[TEST] Completar Acto 1');
        }
      });

      it('E6.3: BookDoorSpread (via BookLayout en Día 7 bloqueado) y ActDoorModal mantienen controles [TEST] de desclasificación', () => {
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          currentDay: 7,
          openedDoors: [1],
          completedDays: [],
        });
        const doorSpreadHtml = renderBookLayoutMarkup();
        expect(doorSpreadHtml).toContain('[TEST] Completar Acto 1 y Desclasificar Puerta 2');

        const doorModalHtml = renderActDoorModalMarkup({
          initialAct: 2,
          onClose: () => {},
          onEnterActDay: () => {},
        });
        expect(doorModalHtml).toContain('[TEST] Completar Acto 1 y Desclasificar Puerta 2');
      });

      it('E6.4: la interfaz permanece en español (Álbúm, Cuaderno, Veredicto, Selector de Modo)', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true, currentDay: 0 });
        expect(renderSuspectsAlbumMarkup()).toContain('Álbum de Sospechosos');
        expect(renderDetectiveDossierMarkup()).toContain('Censo de 74 Sospechosos');
        expect(renderFinalVerdictModalMarkup()).toContain('Audiencia Formal de Acusación');
        expect(renderGameModeModalMarkup()).toContain('Elige tu Modo de Investigación');
      });

      it('E6.5: cero emojis Unicode en todos los archivos de src/ e index.html (solo lucide-react)', () => {
        const emojiPattern = /(?:\p{Extended_Pictographic}|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|\uFE0F)/gu;
        const files = listAllSrcTsFiles();
        expect(files.length).toBeGreaterThanOrEqual(50);

        for (const filePath of files) {
          const content = nodeFs.readFileSync(filePath, 'utf8');
          const matches = content.match(emojiPattern);
          expect(matches, `Emoji found in ${filePath}: ${matches?.join(', ')}`).toBeNull();
        }
        const indexHtml = readSrcFile('index.html');
        expect(indexHtml.match(emojiPattern)).toBeNull();
      });

      it('E6.6: los componentes de UI utilizan iconos vectoriales SVG de lucide-react en su renderizado', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true, currentDay: 1, openedDoors: [1] });
        const bookHtml = renderBookLayoutMarkup();
        const dossierHtml = renderDetectiveDossierMarkup();
        expect(bookHtml).toContain('<svg');
        expect(dossierHtml).toContain('<svg');
      });
    });
  });

  // ===================================================================
  // TIER 2: BOUNDARY & CORNER CASES (E1–E6, >=5 tests per area)
  // ===================================================================
  describe('Tier 2 — Casos Límite y Frontera (E1–E6)', () => {
    describe('E1 Límites (R1)', () => {
      it('T2.E1.1: hints=[] vs hints=[...] en Modo Manual nunca renderiza botón Pista; hints=[] en Modo Automático tampoco renderiza botón Pista', async () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        for (const pType of ALL_14_PUZZLE_TYPES) {
          const day = daysByType[pType];
          const manualEmpty = await renderPuzzleMarkup({
            puzzle: day.puzzle,
            isSolved: false,
            hints: [],
            gameMode: 'manual',
          });
          const autoEmpty = await renderPuzzleMarkup({
            puzzle: day.puzzle,
            isSolved: false,
            hints: [],
            gameMode: 'auto',
          });
          expect(manualEmpty).not.toMatch(PISTA_BUTTON_RE);
          expect(autoEmpty).not.toMatch(PISTA_BUTTON_RE);
        }
      });

      it('T2.E1.2: getPuzzleManualVerificationSpec para wordsearch y cryptogram en distintas longitudes/palabras no filtra conteos ni frases', () => {
        for (const seed of [SEED_MAIN, SEED_ALT]) {
          const days = collectAll14PuzzleDays(seed);
          for (const pType of ['wordsearch', 'cryptogram'] as PuzzleType[]) {
            const spec = getPuzzleManualVerificationSpec(days[pType].puzzle, days[pType].unlockedClue);
            const text = `${spec.promptLabel} ${spec.formatHint}`;
            expect(text).not.toMatch(/\b\d+\s+(letras?|palabras?)\b/i);
            expect(text.toUpperCase()).not.toContain(spec.expectedDisplay.toUpperCase());
          }
        }
      });

      it('T2.E1.3: BookLayout en Día 0 (Álbum) en Modo Manual no renderiza Modo Manual (Paso 1/2)', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true, currentDay: 0 });
        const html = renderBookLayoutMarkup();
        expect(html).toContain('Álbum de Sospechosos');
        expect(html).not.toContain('Modo Manual (Paso 1/2)');
      });

      it('T2.E1.4: BookLayout en Día 1 ya completado en Modo Manual oculta Paso 1/2 y botones [TEST]', () => {
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          currentDay: 1,
          openedDoors: [1],
          completedDays: [1],
        });
        const html = renderBookLayoutMarkup();
        expect(html).not.toContain('Modo Manual (Paso 1/2)');
        expect(html).not.toContain('[TEST] Omitir Día');
      });

      it('T2.E1.5: DetectiveHintBubble en Día 0 (isAlbum=true) y Día completado (isDayCompleted=true) en Modo Manual no rompe el render', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true });
        const day1 = useGameStore.getState().activeCase.days[0];
        const h0 = renderDetectiveHintBubbleMarkup({
          currentDay: 0,
          isAlbum: true,
          dayData: day1,
          isDayCompleted: false,
          completedDays: [],
          unlockedClues: [],
          suspectFunnel: { total: 74, remaining: 74, eliminated: 0 },
        });
        const hDone = renderDetectiveHintBubbleMarkup({
          currentDay: 1,
          isAlbum: false,
          dayData: day1,
          isDayCompleted: true,
          completedDays: [1],
          unlockedClues: [day1.unlockedClue],
          suspectFunnel: { total: 74, remaining: 74, eliminated: 0 },
        });
        expect(h0).toContain('data-testid="detective-hint-button"');
        expect(hDone).toContain('data-testid="detective-hint-button"');
      });
    });

    describe('E2 Límites (R2)', () => {
      it('T2.E2.1: cadenas vacías, espacios, saltos de línea y entradas de 1 carácter son rechazadas en los 14 acertijos', () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        for (const pType of ALL_14_PUZZLE_TYPES) {
          const day = daysByType[pType];
          for (const bad of ['', '   ', '\n\t', 'A', '1', 'ñ']) {
            expect(
              verifyManualPuzzleInput(day.puzzle, day.unlockedClue, bad),
              `${pType} accepted invalid boundary input ${JSON.stringify(bad)}`
            ).toBe(false);
          }
        }
      });

      it('T2.E2.2: variantes en minúsculas, con espacios extra y tildes equivalentes son aceptadas por verifyManualPuzzleInput (y wordsearch determinista en 20 semillas)', () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        for (const pType of ALL_14_PUZZLE_TYPES) {
          const day = daysByType[pType];
          const ans = deriveManualAnswerFromBoard(day);
          const paddedLower = `   ${ans.toLowerCase()}   `;
          expect(
            verifyManualPuzzleInput(day.puzzle, day.unlockedClue, paddedLower),
            `${pType} failed normalized lowercase/spaced variant "${paddedLower}"`
          ).toBe(true);
        }

        // Multi-seed determinism for wordsearch when clue words collide with leftover text or filler
        for (let i = 0; i < 20; i++) {
          const seed = 100000 + i * 7919;
          const generated = generateCase(seed);
          for (const d of generated.days) {
            if (d.puzzle.type === 'wordsearch') {
              const wsAns = deriveManualAnswerFromBoard(d);
              expect(
                verifyManualPuzzleInput(d.puzzle, d.unlockedClue, wsAns),
                `WordSearch failed on seed=${seed} day=${d.day} derived="${wsAns}"`
              ).toBe(true);
            }
          }
        }
      });

      it('T2.E2.3: códigos numéricos truncados (3 dígitos) o sobredimensionados (5 dígitos) son rechazados en los 5 acertijos numéricos', () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        for (const pType of ['sudoku', 'futoshiki', 'codificados', 'ecuaciones', 'minesweeper'] as PuzzleType[]) {
          const day = daysByType[pType];
          const code = deriveManualAnswerFromBoard(day);
          expect(verifyManualPuzzleInput(day.puzzle, day.unlockedClue, code.slice(0, 3))).toBe(false);
          expect(verifyManualPuzzleInput(day.puzzle, day.unlockedClue, `${code}9`)).toBe(false);
        }
      });

      it('T2.E2.4: Sudoku y Futoshiki respetan el orden barajado de keyCells (índices 1..4 coinciden con el orden del código esperado)', async () => {
        const daysByType = collectAll14PuzzleDays(SEED_MAIN);
        for (const pType of ['sudoku', 'futoshiki'] as const) {
          const day = daysByType[pType];
          const cfg = day.puzzle.config as {
            keyCells: Array<{ r: number; c: number }>;
            solution: number[][];
          };
          const html = await renderPuzzleMarkup({
            puzzle: day.puzzle,
            isSolved: false,
            gameMode: 'manual',
          });
          const digitsFromOrder = cfg.keyCells
            .map((cell, idx) => {
              const cellHtml =
                pType === 'sudoku'
                  ? extractSudokuCellHtml(html, cell.r, cell.c)
                  : extractFutoshikiCellHtml(html, cell.r, cell.c);
              expect(stripHtmlTags(cellHtml)).toContain(String(idx + 1));
              return cfg.solution[cell.r][cell.c];
            })
            .join('');
          expect(verifyManualPuzzleInput(day.puzzle, day.unlockedClue, digitsFromOrder)).toBe(true);
        }
      });

      it('T2.E2.5: idempotencia de markDayCompleted en Modo Manual al invocarlo dos veces sobre el mismo día', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true, openedDoors: [1] });
        const day1 = useGameStore.getState().activeCase.days[0];

        useGameStore.getState().markDayCompleted(1, day1.unlockedClue, day1.unlockedClue.autoEliminations);
        useGameStore.getState().markDayCompleted(1, day1.unlockedClue, day1.unlockedClue.autoEliminations);

        expect(useGameStore.getState().completedDays).toEqual([1]);
        expect(useGameStore.getState().unlockedClues).toHaveLength(1);
        expect(useGameStore.getState().matrixCells).toEqual({});
      });
    });

    describe('E3 Límites (R3a)', () => {
      it('T2.E3.1: límites de tachado manual de sospechosos: 0/74, 1/74, 74/74 y doble toggle', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true, openedDoors: [1] });
        expect(useGameStore.getState().manualEliminations).toHaveLength(0);

        const firstId = SUSPECTS_DIRECTORY[0].id;
        useGameStore.getState().toggleManualElimination(firstId);
        expect(useGameStore.getState().manualEliminations).toHaveLength(1);
        useGameStore.getState().toggleManualElimination(firstId);
        expect(useGameStore.getState().manualEliminations).toHaveLength(0);

        for (const s of SUSPECTS_DIRECTORY) {
          useGameStore.getState().toggleManualElimination(s.id);
        }
        expect(useGameStore.getState().manualEliminations).toHaveLength(74);
      });

      it('T2.E3.2: límites de tachado manual de armas: 0/18, 1/18, 18/18 y doble toggle', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true });
        const st = getFullStoreState();
        expect(typeof st.toggleManualWeaponElimination).toBe('function');
        expect(st.manualWeaponEliminations).toEqual([]);

        st.toggleManualWeaponElimination!(WEAPONS[0].id);
        expect(getFullStoreState().manualWeaponEliminations).toHaveLength(1);
        st.toggleManualWeaponElimination!(WEAPONS[0].id);
        expect(getFullStoreState().manualWeaponEliminations).toHaveLength(0);

        for (const w of WEAPONS) {
          st.toggleManualWeaponElimination!(w.id);
        }
        expect(getFullStoreState().manualWeaponEliminations).toHaveLength(18);
      });

      it('T2.E3.3: límites de tachado manual de estancias: 0/9, 1/9, 9/9 y doble toggle', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true });
        const st = getFullStoreState();
        expect(typeof st.toggleManualRoomElimination).toBe('function');
        expect(st.manualRoomEliminations).toEqual([]);

        st.toggleManualRoomElimination!(LOCATIONS[0].id);
        expect(getFullStoreState().manualRoomEliminations).toHaveLength(1);
        st.toggleManualRoomElimination!(LOCATIONS[0].id);
        expect(getFullStoreState().manualRoomEliminations).toHaveLength(0);

        for (const r of LOCATIONS) {
          st.toggleManualRoomElimination!(r.id);
        }
        expect(getFullStoreState().manualRoomEliminations).toHaveLength(9);
      });

      it('T2.E3.4: computeWeaponStatus y computeRoomStatus con IDs inexistentes y pistas vacías devuelven estado no eliminado', async () => {
        const mod = await getStoreExportsModule();
        expect(typeof mod.computeWeaponStatus).toBe('function');
        expect(typeof mod.computeRoomStatus).toBe('function');

        expect(mod.computeWeaponStatus!('arma-inexistente', [], [], 'manual')).toEqual({
          isEliminated: false,
          isManual: false,
          isAutoEliminated: false,
        });
        expect(mod.computeRoomStatus!('sala-inexistente', [], [], 'auto')).toEqual({
          isEliminated: false,
          isManual: false,
          isAutoEliminated: false,
        });
      });

      it('T2.E3.5: en Modo Manual al tachar manualmente 74/74, 18/18 y 9/9, FinalVerdictModal y DetectiveDossier reportan 0 compatibles', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true, openedDoors: [1] });
        const st = getFullStoreState();
        expect(typeof st.toggleManualWeaponElimination).toBe('function');
        expect(typeof st.toggleManualRoomElimination).toBe('function');

        for (const s of SUSPECTS_DIRECTORY) st.toggleManualElimination(s.id);
        for (const w of WEAPONS) st.toggleManualWeaponElimination!(w.id);
        for (const r of LOCATIONS) st.toggleManualRoomElimination!(r.id);

        const dossierHtml = renderDetectiveDossierMarkup();
        expect(dossierHtml).toContain('0/74');
        expect(dossierHtml).toContain('0/18 • 0/9');

        const verdictHtml = renderFinalVerdictModalMarkup();
        expect(verdictHtml).toContain('Compatibles (0)');
        expect(verdictHtml).toContain('0 sospechosos');
        expect(verdictHtml).toContain('0 armas');
        expect(verdictHtml).toContain('0 estancias');
      });
    });

    describe('E4 Límites (R3b)', () => {
      it('T2.E4.1: la víctima del Acto 1 (arturo-valdemar) no forma parte de los 74 sospechosos; Puerta 1 deja 74 activos', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true, openedDoors: [1] });
        expect(SUSPECTS_DIRECTORY.some(s => s.id === 'arturo-valdemar')).toBe(false);
        const eliminatedCount = SUSPECTS_DIRECTORY.filter(
          s => useGameStore.getState().getSuspectStatus(s).isEliminated
        ).length;
        expect(eliminatedCount).toBe(0);
      });

      it('T2.E4.2: progresión de Puertas [] -> [1] -> [1,2] -> [1,2,3,4,5] produce 0, 0, 1 y 4 víctimas tachadas', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true });

        const countVictims = () =>
          SUSPECTS_DIRECTORY.filter(s => useGameStore.getState().getSuspectStatus(s).isVictim).length;

        useGameStore.setState({ openedDoors: [] });
        expect(countVictims()).toBe(0);
        useGameStore.setState({ openedDoors: [1] });
        expect(countVictims()).toBe(0);
        useGameStore.setState({ openedDoors: [1, 2] });
        expect(countVictims()).toBe(1);
        useGameStore.setState({ openedDoors: [1, 2, 3, 4, 5] });
        expect(countVictims()).toBe(4);
      });

      it('T2.E4.3: openDoor(2) antes de completar los días 1..6 queda bloqueado y no marca víctima alguna', () => {
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          completedDays: [1, 2, 3],
          openedDoors: [1],
        });
        expect(isActUnlocked(2, [1, 2, 3])).toBe(false);
        useGameStore.getState().openDoor(2);
        expect(useGameStore.getState().openedDoors).toEqual([1]);
      });

      it('T2.E4.4: si una víctima futura fue tachada manualmente antes de abrir su Puerta, al abrirla prevalece Fallecido y no puede destacharse', () => {
        const activeCase = useGameStore.getState().activeCase;
        const victimId = activeCase.acts.find(a => a.act === 2)!.victimId;
        const victim = SUSPECTS_DIRECTORY.find(s => s.id === victimId)!;

        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          completedDays: [1, 2, 3, 4, 5, 6],
          openedDoors: [1],
        });
        useGameStore.getState().toggleManualElimination(victimId);
        expect(useGameStore.getState().getSuspectStatus(victim).isManual).toBe(true);

        useGameStore.getState().openDoor(2);
        expect(useGameStore.getState().getSuspectStatus(victim).isVictim).toBe(true);
        expect(useGameStore.getState().getSuspectStatus(victim).isManual).toBe(false);

        useGameStore.getState().toggleManualElimination(victimId);
        expect(useGameStore.getState().getSuspectStatus(victim).isEliminated).toBe(true);
      });

      it('T2.E4.5: en 5 semillas distintas, las 4 víctimas de Puertas 2–5 son siempre distintas entre sí y ajenas al culpable', () => {
        for (const seed of [19241224, 100001, 20261224, 7771924, 424242]) {
          const c = generateCase(seed);
          const vIds = c.acts.filter(a => a.act >= 2).map(a => a.victimId);
          expect(vIds).toHaveLength(4);
          expect(new Set(vIds).size).toBe(4);
          expect(vIds).not.toContain(c.config.culpritId);
        }
      });
    });

    describe('E5 Límites (R3c)', () => {
      it('T2.E5.1: startNewCase(fixedSeed) conserva el bloqueo hasSelectedGameMode pero limpia tachados e incrementa gameSessionId', () => {
        useGameStore.getState().setGameMode('manual');
        const sessionBefore = getFullStoreState().gameSessionId!;
        useGameStore.getState().toggleManualElimination(SUSPECTS_DIRECTORY[0].id);

        useGameStore.getState().startNewCase(SEED_ALT);
        const stAfter = getFullStoreState();
        expect(stAfter.caseSeed).toBe(SEED_ALT);
        expect(stAfter.hasSelectedGameMode).toBe(true);
        expect(stAfter.gameMode).toBe('manual');
        expect(stAfter.manualEliminations).toEqual([]);
        expect(stAfter.gameSessionId).toBeGreaterThan(sessionBefore);
      });

      it('T2.E5.2: llamadas consecutivas a startNewCase() sin semilla generan nuevas sesiones desbloqueadas cada vez', () => {
        useGameStore.getState().setGameMode('manual');
        const s1 = getFullStoreState().gameSessionId!;
        useGameStore.getState().startNewCase();
        const s2 = getFullStoreState().gameSessionId!;
        expect(useGameStore.getState().hasSelectedGameMode).toBe(false);
        expect(s2).toBeGreaterThan(s1);

        useGameStore.getState().setGameMode('auto');
        useGameStore.getState().startNewCase();
        const s3 = getFullStoreState().gameSessionId!;
        expect(useGameStore.getState().hasSelectedGameMode).toBe(false);
        expect(s3).toBeGreaterThan(s2);
      });

      it('T2.E5.3: llamar setGameMode con el mismo modo estando bloqueado mantiene el estado íntegro sin errores', () => {
        useGameStore.getState().setGameMode('manual');
        useGameStore.getState().setGameMode('manual');
        expect(useGameStore.getState().gameMode).toBe('manual');
        expect(useGameStore.getState().hasSelectedGameMode).toBe(true);
      });

      it('T2.E5.4: persistencia y migración de estado legado v3/v2 en persist.getOptions inicializa manualWeaponEliminations y manualRoomEliminations a [] sin errores', () => {
        const persistOpts = useGameStore.persist.getOptions();
        expect(persistOpts.name).toBe('villa-acebo-game-storage');
        expect(persistOpts.version).toBe(3);
        expect(typeof persistOpts.partialize).toBe('function');
        expect(typeof persistOpts.migrate).toBe('function');
        expect(typeof persistOpts.merge).toBe('function');

        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          manualEliminations: [SUSPECTS_DIRECTORY[0].id],
          manualWeaponEliminations: [WEAPONS[0].id],
          manualRoomEliminations: [LOCATIONS[0].id],
        } as Partial<ReturnType<typeof useGameStore.getState>>);

        const partialized = persistOpts.partialize!(useGameStore.getState()) as Record<string, unknown>;
        expect(partialized.manualWeaponEliminations).toEqual([WEAPONS[0].id]);
        expect(partialized.manualRoomEliminations).toEqual([LOCATIONS[0].id]);
        expect(partialized.gameMode).toBe('manual');
        expect(partialized.hasSelectedGameMode).toBe(true);
        expect(typeof partialized.gameSessionId).toBe('number');

        const legacyV3 = JSON.parse(
          JSON.stringify({
            caseSeed: SEED_MAIN,
            currentDay: 2,
            unlockedDays: [0, 1, 2, 3, 4, 5, 6],
            completedDays: [1],
            openedDoors: [1],
            unlockedClues: [],
            matrixCells: {},
            manualEliminations: [SUSPECTS_DIRECTORY[0].id],
            notes: {},
            freePlayMode: false,
            gameMode: 'manual',
            hasSelectedGameMode: true,
            activeView: 'book',
          })
        );

        const migratedV3 = persistOpts.migrate!(legacyV3, 3);
        const mergedV3 = persistOpts.merge!(migratedV3, useGameStore.getState()) as unknown as {
          gameMode: string;
          hasSelectedGameMode: boolean;
          manualEliminations: string[];
          manualWeaponEliminations?: string[];
          manualRoomEliminations?: string[];
        };
        expect(mergedV3.gameMode).toBe('manual');
        expect(mergedV3.hasSelectedGameMode).toBe(true);
        expect(mergedV3.manualEliminations).toEqual([SUSPECTS_DIRECTORY[0].id]);
        expect(mergedV3.manualWeaponEliminations).toEqual([]);
        expect(mergedV3.manualRoomEliminations).toEqual([]);

        const migratedV2 = persistOpts.migrate!(legacyV3, 2);
        const mergedV2 = persistOpts.merge!(migratedV2, useGameStore.getState()) as unknown as {
          gameMode: string;
          hasSelectedGameMode: boolean;
          manualWeaponEliminations?: string[];
          manualRoomEliminations?: string[];
        };
        expect(mergedV2.gameMode).toBe('auto');
        expect(mergedV2.hasSelectedGameMode).toBe(false);
        expect(mergedV2.manualWeaponEliminations).toEqual([]);
        expect(mergedV2.manualRoomEliminations).toEqual([]);
      });

      it('T2.E5.5: BookLayout vincula el estado efímero de tablero (boardSolvedMap/manualInputs) con gameSessionId', () => {
        const bookSrc = readSrcFile('src/components/BookLayout.tsx');
        expect(bookSrc).toContain('gameSessionId');
      });
    });

    describe('E6 Límites (R4)', () => {
      it('T2.E6.1: estructura fija de campaña: 30 días, 5 actos × 6 días, 18 S + 7 W + 5 R = 30 pistas', () => {
        expect(TOTAL_DAYS).toBe(30);
        expect(DAYS_PER_ACT).toBe(6);
        expect(CLUE_SCHEDULE).toHaveLength(30);
        expect(CLUE_SCHEDULE.filter(c => c === 'S')).toHaveLength(18);
        expect(CLUE_SCHEDULE.filter(c => c === 'W')).toHaveLength(7);
        expect(CLUE_SCHEDULE.filter(c => c === 'R')).toHaveLength(5);
      });

      it('T2.E6.2: todas las semillas generan los 14 tipos de acertijo con 0 repeticiones consecutivas', () => {
        for (const seed of [SEED_MAIN, SEED_ALT, 424242]) {
          const c = generateCase(seed);
          const types = c.days.map(d => d.puzzle.type);
          expect(new Set(types).size).toBe(14);
          for (let i = 1; i < types.length; i++) {
            expect(types[i]).not.toBe(types[i - 1]);
          }
        }
      });

      it('T2.E6.3: verifyCaseVerdict distingue exactamente 0/3, 1/3, 2/3 y 3/3 aciertos', () => {
        const cfg = useGameStore.getState().activeCase.config;
        const wrongS = SUSPECTS_DIRECTORY.find(s => s.id !== cfg.culpritId)!.id;
        const wrongW = WEAPONS.find(w => w.id !== cfg.weaponId)!.id;
        const wrongR = LOCATIONS.find(r => r.id !== cfg.locationId)!.id;

        expect(verifyCaseVerdict(cfg, wrongS, wrongW, wrongR)).toMatchObject({
          isCorrect: false,
          correctCount: 0,
        });
        expect(verifyCaseVerdict(cfg, cfg.culpritId, wrongW, wrongR)).toMatchObject({
          isCorrect: false,
          correctCount: 1,
        });
        expect(verifyCaseVerdict(cfg, cfg.culpritId, cfg.weaponId, wrongR)).toMatchObject({
          isCorrect: false,
          correctCount: 2,
        });
        expect(verifyCaseVerdict(cfg, cfg.culpritId, cfg.weaponId, cfg.locationId)).toMatchObject({
          isCorrect: true,
          correctCount: 3,
        });
      });

      it('T2.E6.4: Día 30 (último día) muestra botones [TEST] sin completar y los oculta tras completarse', () => {
        useGameStore.setState({
          gameMode: 'manual',
          hasSelectedGameMode: true,
          currentDay: 30,
          openedDoors: [1, 2, 3, 4, 5],
          completedDays: Array.from({ length: 29 }, (_, i) => i + 1),
        });
        const beforeHtml = renderBookLayoutMarkup();
        expect(beforeHtml).toContain('[TEST] Omitir Día');
        expect(beforeHtml).toContain('[TEST] Completar Acto 5');

        useGameStore.setState({
          completedDays: Array.from({ length: 30 }, (_, i) => i + 1),
        });
        const afterHtml = renderBookLayoutMarkup();
        expect(afterHtml).not.toContain('[TEST] Omitir Día');
      });

      it('T2.E6.5: SuspectsAlbum en el Día 0 con 0 tachados muestra 74/74 Bajo Sospecha y los retratos #01..#12', () => {
        useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true, openedDoors: [1] });
        const html = renderSuspectsAlbumMarkup();
        expect(html).toContain('74/74 Bajo Sospecha');
        expect(html).toContain('#01');
        expect(html).toContain('#12');
      });
    });
  });

  // ===================================================================
  // TIER 3: CROSS-FEATURE PAIRWISE INTERACTIONS (>=8 tests)
  // ===================================================================
  describe('Tier 3 — Interacciones Combinatorias entre Características', () => {
    it('T3.1: Modo Manual + 30 pistas + Puertas 2–5 abiertas + descartes manuales (5S, 3W, 2R) sincronizan BookLayout, DetectiveDossier y FinalVerdictModal', () => {
      const activeCase = useGameStore.getState().activeCase;
      const allClues = activeCase.days.map(d => d.unlockedClue);
      const victimIds = new Set(activeCase.acts.filter(a => a.act >= 2).map(a => a.victimId));
      const nonVictims = SUSPECTS_DIRECTORY.filter(s => !victimIds.has(s.id)).slice(0, 5);

      useGameStore.setState({
        gameMode: 'manual',
        hasSelectedGameMode: true,
        currentDay: 1,
        openedDoors: [1, 2, 3, 4, 5],
        completedDays: Array.from({ length: 30 }, (_, i) => i + 1),
        unlockedClues: allClues,
        manualEliminations: nonVictims.map(s => s.id),
      });

      const st = getFullStoreState();
      expect(typeof st.toggleManualWeaponElimination).toBe('function');
      expect(typeof st.toggleManualRoomElimination).toBe('function');
      for (let i = 0; i < 3; i++) st.toggleManualWeaponElimination!(WEAPONS[i].id);
      for (let i = 0; i < 2; i++) st.toggleManualRoomElimination!(LOCATIONS[i].id);

      // 74 - (4 victims + 5 manual) = 65; 18 - 3 = 15; 9 - 2 = 7
      expect(stripHtmlTags(renderBookLayoutMarkup())).toContain('65 / 74 Bajo Sospecha');

      const dossierHtml = renderDetectiveDossierMarkup();
      expect(dossierHtml).toContain('65/74');
      expect(dossierHtml).toContain('15/18 • 7/9');

      const verdictHtml = renderFinalVerdictModalMarkup();
      expect(verdictHtml).toContain('Compatibles (65)');
    });

    it('T3.2: Modo Automático + 30 pistas + Puertas 2–5 abiertas + tachado manual adicional se combinan aditivamente', () => {
      const activeCase = useGameStore.getState().activeCase;
      const allClues = activeCase.days.map(d => d.unlockedClue);

      useGameStore.setState({
        gameMode: 'auto',
        hasSelectedGameMode: true,
        openedDoors: [1, 2, 3, 4, 5],
        completedDays: Array.from({ length: 30 }, (_, i) => i + 1),
        unlockedClues: allClues,
        manualEliminations: [],
      });

      const dossierHtml = renderDetectiveDossierMarkup();
      expect(dossierHtml).toContain('1/74');
      expect(dossierHtml).toContain('1/18 • 1/9');

      const culprit = SUSPECTS_DIRECTORY.find(s => s.id === activeCase.config.culpritId)!;
      useGameStore.getState().toggleManualElimination(culprit.id);
      expect(useGameStore.getState().getSuspectStatus(culprit).isEliminated).toBe(true);
      expect(renderDetectiveDossierMarkup()).toContain('0/74');
    });

    it('T3.3: en Modo Manual, markDayCompleted deja matrixCells intacto mientras cycleMatrixCell y setMatrixCell manuales siguen funcionando', () => {
      const activeCase = useGameStore.getState().activeCase;
      const day1 = activeCase.days[0];
      useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true });

      const key = `${SUSPECTS_DIRECTORY[0].id}:${WEAPONS[0].id}`;
      useGameStore.getState().cycleMatrixCell(key);
      expect(useGameStore.getState().matrixCells[key]).toBe('cross');

      useGameStore.getState().markDayCompleted(1, day1.unlockedClue, {
        confirmedMatches: [
          { suspect: SUSPECTS_DIRECTORY[1].id, weapon: WEAPONS[1].id, room: LOCATIONS[1].id },
        ],
      });

      expect(useGameStore.getState().matrixCells[key]).toBe('cross');
      expect(
        useGameStore.getState().matrixCells[`${SUSPECTS_DIRECTORY[1].id}:${WEAPONS[1].id}`]
      ).toBeUndefined();

      useGameStore.getState().setMatrixCell(key, 'check');
      expect(useGameStore.getState().matrixCells[key]).toBe('check');
    });

    it('T3.4: bloqueo de modo × resetGame() × startNewCase() × gameSessionId a través de dos ciclos completos', () => {
      const s0 = getFullStoreState().gameSessionId!;
      useGameStore.getState().setGameMode('manual');
      useGameStore.getState().setGameMode('auto'); // blocked
      expect(useGameStore.getState().gameMode).toBe('manual');

      useGameStore.getState().resetGame();
      const s1 = getFullStoreState().gameSessionId!;
      expect(s1).toBeGreaterThan(s0);
      expect(useGameStore.getState().hasSelectedGameMode).toBe(false);

      useGameStore.getState().setGameMode('auto');
      expect(useGameStore.getState().gameMode).toBe('auto');
      useGameStore.getState().setGameMode('manual'); // blocked again
      expect(useGameStore.getState().gameMode).toBe('auto');

      useGameStore.getState().startNewCase();
      const s2 = getFullStoreState().gameSessionId!;
      expect(s2).toBeGreaterThan(s1);
      expect(useGameStore.getState().hasSelectedGameMode).toBe(false);
      useGameStore.getState().setGameMode('manual');
      expect(useGameStore.getState().gameMode).toBe('manual');
    });

    it('T3.5: matriz completa 14 acertijos × (manual vs auto) × (isSolved false vs true) [56 renders]', async () => {
      const daysByType = collectAll14PuzzleDays(SEED_MAIN);
      const hints = ['Pista matricial'];

      for (const pType of ALL_14_PUZZLE_TYPES) {
        const day = daysByType[pType];
        for (const mode of ['manual', 'auto'] as const) {
          for (const isSolved of [false, true] as const) {
            const html = await renderPuzzleMarkup({
              puzzle: day.puzzle,
              isSolved,
              hints,
              gameMode: mode,
            });
            expect(html.length).toBeGreaterThan(50);
            if (mode === 'manual') {
              expect(html).not.toMatch(PISTA_BUTTON_RE);
              for (const b of PUZZLE_SOLVED_BANNERS[pType]) {
                expect(html).not.toContain(b);
              }
            } else {
              expect(html).toMatch(PISTA_BUTTON_RE);
              if (isSolved) {
                expect(html).toContain(PUZZLE_SOLVED_BANNERS[pType][0]);
              }
            }
          }
        }
      }
    });

    it('T3.6: víctimas de Puertas 2–5 × Modo Manual × Album/Dossier/Veredicto mantienen su descarte protegido', () => {
      const activeCase = useGameStore.getState().activeCase;
      const allClues = activeCase.days.map(d => d.unlockedClue);
      useGameStore.setState({
        gameMode: 'manual',
        hasSelectedGameMode: true,
        openedDoors: [1, 2, 3, 4, 5],
        completedDays: Array.from({ length: 30 }, (_, i) => i + 1),
        unlockedClues: allClues,
        manualEliminations: [],
      });

      for (const act of [2, 3, 4, 5] as const) {
        const victimId = activeCase.acts.find(a => a.act === act)!.victimId;
        useGameStore.getState().toggleManualElimination(victimId);
      }

      // 74 - 4 victims = 70 active
      expect(renderDetectiveDossierMarkup()).toContain('70/74');
      expect(renderFinalVerdictModalMarkup()).toContain('Compatibles (70)');
    });

    it('T3.7: tachados manuales de armas y estancias en Modo Manual sincronizan el badge de DetectiveDossier y la Advertencia de FinalVerdictModal', () => {
      useGameStore.setState({
        gameMode: 'manual',
        hasSelectedGameMode: true,
        openedDoors: [1],
        unlockedClues: [],
      });
      const st = getFullStoreState();
      expect(typeof st.toggleManualWeaponElimination).toBe('function');
      expect(typeof st.toggleManualRoomElimination).toBe('function');

      for (let i = 0; i < 6; i++) st.toggleManualWeaponElimination!(WEAPONS[i].id);
      for (let i = 0; i < 4; i++) st.toggleManualRoomElimination!(LOCATIONS[i].id);

      expect(renderDetectiveDossierMarkup()).toContain('12/18 • 5/9');
      const verdictHtml = renderFinalVerdictModalMarkup();
      expect(verdictHtml).toContain('12 armas');
      expect(verdictHtml).toContain('5 estancias');
    });

    it('T3.8: paridad Álbum y Cuaderno en Modo Manual sobre los primeros 12 sospechosos', () => {
      useGameStore.setState({ gameMode: 'manual', hasSelectedGameMode: true, openedDoors: [1] });
      const target = SUSPECTS_DIRECTORY[2]; // #03 visible on spread 0 of SuspectsAlbum
      useGameStore.getState().toggleManualElimination(target.id);

      const albumHtml = renderSuspectsAlbumMarkup();
      const dossierHtml = renderDetectiveDossierMarkup();
      expect(albumHtml).toContain('73/74 Bajo Sospecha');
      expect(albumHtml).toContain('Tachado');
      expect(dossierHtml).toContain('73/74');
      expect(dossierHtml).toContain('TACHADO');
    });
  });

  // ===================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (>=5 scenarios)
  // ===================================================================
  describe('Tier 4 — Escenarios Completos de Aplicación (E2E)', () => {
    it('Escenario 1: Partida completa de 30 días en Modo Manual (selección -> bloqueo -> 14 acertijos -> Puertas 1–5 -> tachado manual -> veredicto ganador -> reinicio)', async () => {
      // Verify seedless startNewCase() unlocks mode selection, then start deterministic campaign
      useGameStore.getState().setGameMode('auto');
      useGameStore.getState().startNewCase();
      expect(useGameStore.getState().hasSelectedGameMode).toBe(false);
      useGameStore.getState().resetGame();
      useGameStore.getState().startNewCase(SEED_SCENARIO_1);
      expect(useGameStore.getState().hasSelectedGameMode).toBe(false);

      // Select Manual Mode and confirm lock
      useGameStore.getState().setGameMode('manual');
      expect(useGameStore.getState().gameMode).toBe('manual');
      expect(useGameStore.getState().hasSelectedGameMode).toBe(true);
      useGameStore.getState().setGameMode('auto');
      expect(useGameStore.getState().gameMode).toBe('manual');

      const activeCase = useGameStore.getState().activeCase;
      const seenTypes = new Set<PuzzleType>();

      // Open Door 1
      useGameStore.getState().openDoor(1);

      for (const dayData of activeCase.days) {
        const act = Math.ceil(dayData.day / DAYS_PER_ACT) as 1 | 2 | 3 | 4 | 5;
        if (act >= 2 && !useGameStore.getState().openedDoors.includes(act)) {
          useGameStore.getState().openDoor(act);
        }

        useGameStore.getState().setCurrentDay(dayData.day);
        seenTypes.add(dayData.puzzle.type);

        // Verify no spoilers in puzzle component or manual spec
        const spec = getPuzzleManualVerificationSpec(dayData.puzzle, dayData.unlockedClue);
        expect(`${spec.promptLabel} ${spec.formatHint}`).not.toMatch(/\(ej\./i);

        // Solve board & verify manual input
        const boardAnswer = deriveManualAnswerFromBoard(dayData);
        expect(verifyManualPuzzleInput(dayData.puzzle, dayData.unlockedClue, boardAnswer)).toBe(
          true
        );

        useGameStore
          .getState()
          .markDayCompleted(dayData.day, dayData.unlockedClue, dayData.unlockedClue.autoEliminations);
      }

      expect(seenTypes.size).toBe(14);
      expect(useGameStore.getState().completedDays).toHaveLength(30);
      expect(useGameStore.getState().matrixCells).toEqual({});

      // 4 Doors 2–5 victims auto-crossed & protected; 0 clue auto-eliminations
      const victimIds = new Set(activeCase.acts.filter(a => a.act >= 2).map(a => a.victimId));
      expect(victimIds.size).toBe(4);
      for (const vId of victimIds) {
        useGameStore.getState().toggleManualElimination(vId); // must remain eliminated
        const vObj = SUSPECTS_DIRECTORY.find(s => s.id === vId)!;
        expect(useGameStore.getState().getSuspectStatus(vObj).isEliminated).toBe(true);
      }

      // Player manually crosses off all non-culprit suspects (except 4 already-dead victims), 17 weapons, 8 rooms
      for (const s of SUSPECTS_DIRECTORY) {
        if (s.id !== activeCase.config.culpritId && !victimIds.has(s.id)) {
          useGameStore.getState().toggleManualElimination(s.id);
        }
      }
      const st = getFullStoreState();
      expect(typeof st.toggleManualWeaponElimination).toBe('function');
      expect(typeof st.toggleManualRoomElimination).toBe('function');
      for (const w of WEAPONS) {
        if (w.id !== activeCase.config.weaponId) st.toggleManualWeaponElimination!(w.id);
      }
      for (const r of LOCATIONS) {
        if (r.id !== activeCase.config.locationId) st.toggleManualRoomElimination!(r.id);
      }

      expect(renderDetectiveDossierMarkup()).toContain('1/74');
      expect(renderDetectiveDossierMarkup()).toContain('1/18 • 1/9');
      expect(renderFinalVerdictModalMarkup()).toContain('Compatibles (1)');

      const verdict = useGameStore
        .getState()
        .verifyVerdict(
          activeCase.config.culpritId,
          activeCase.config.weaponId,
          activeCase.config.locationId
        );
      expect(verdict.isCorrect).toBe(true);
      expect(verdict.correctCount).toBe(3);

      // Reset unlocks mode & clears manual eliminations
      useGameStore.getState().resetGame();
      expect(useGameStore.getState().hasSelectedGameMode).toBe(false);
      expect(useGameStore.getState().manualEliminations).toEqual([]);
      expect(getFullStoreState().manualWeaponEliminations).toEqual([]);
      expect(getFullStoreState().manualRoomEliminations).toEqual([]);
    });

    it('Escenario 2: Partida completa de 30 días en Modo Automático (regresión: ayudas, matriz, auto-descartes y víctimas intactos)', async () => {
      useGameStore.getState().startNewCase(SEED_ALT);
      useGameStore.getState().setGameMode('auto');
      const activeCase = useGameStore.getState().activeCase;

      const samplePuzzleHtml = await renderPuzzleMarkup({
        puzzle: activeCase.days[0].puzzle,
        isSolved: true,
        hints: ['Pista automática'],
        gameMode: 'auto',
      });
      expect(samplePuzzleHtml).toMatch(PISTA_BUTTON_RE);

      useGameStore.getState().openDoor(1);
      for (const dayData of activeCase.days) {
        const act = Math.ceil(dayData.day / DAYS_PER_ACT) as 1 | 2 | 3 | 4 | 5;
        if (act >= 2 && !useGameStore.getState().openedDoors.includes(act)) {
          useGameStore.getState().openDoor(act);
        }
        useGameStore
          .getState()
          .markDayCompleted(dayData.day, dayData.unlockedClue, {
            ...(dayData.unlockedClue.autoEliminations ?? {}),
            confirmedMatches:
              dayData.day === 1
                ? [{ suspect: activeCase.config.culpritId, weapon: activeCase.config.weaponId }]
                : dayData.unlockedClue.autoEliminations?.confirmedMatches,
          });
      }

      expect(
        useGameStore.getState().matrixCells[
          `${activeCase.config.culpritId}:${activeCase.config.weaponId}`
        ]
      ).toBe('check');

      const evalRes = useGameStore.getState().getClueEvaluation();
      expect(evalRes.matchingSuspectIds).toEqual([activeCase.config.culpritId]);
      expect(evalRes.matchingWeaponIds).toEqual([activeCase.config.weaponId]);
      expect(evalRes.matchingRoomIds).toEqual([activeCase.config.locationId]);

      const dossierHtml = renderDetectiveDossierMarkup();
      expect(dossierHtml).toContain('1/74');
      expect(dossierHtml).toContain('1/18 • 1/9');
      expect(renderFinalVerdictModalMarkup()).toContain('Compatibles (1)');
    });

    it('Escenario 3: Reinicio a mitad de partida en Modo Manual y cambio limpio a Modo Automático', () => {
      useGameStore.getState().setGameMode('manual');
      const session1 = getFullStoreState().gameSessionId!;
      const activeCase = useGameStore.getState().activeCase;

      // Play Act 1 and open Door 2
      useGameStore.getState().openDoor(1);
      for (let i = 0; i < 6; i++) {
        const d = activeCase.days[i];
        useGameStore.getState().markDayCompleted(d.day, d.unlockedClue, d.unlockedClue.autoEliminations);
      }
      useGameStore.getState().openDoor(2);
      useGameStore.getState().toggleManualElimination(SUSPECTS_DIRECTORY[0].id);
      getFullStoreState().toggleManualWeaponElimination?.(WEAPONS[0].id);
      getFullStoreState().toggleManualRoomElimination?.(LOCATIONS[0].id);

      // Reset mid-game
      useGameStore.getState().resetGame();
      const stReset = getFullStoreState();
      expect(stReset.gameSessionId).toBeGreaterThan(session1);
      expect(stReset.hasSelectedGameMode).toBe(false);
      expect(stReset.completedDays).toEqual([]);
      expect(stReset.openedDoors).toEqual([]);
      expect(stReset.manualEliminations).toEqual([]);
      expect(stReset.manualWeaponEliminations).toEqual([]);
      expect(stReset.manualRoomEliminations).toEqual([]);

      // Switch to Auto Mode cleanly
      useGameStore.getState().setGameMode('auto');
      expect(useGameStore.getState().gameMode).toBe('auto');
      expect(useGameStore.getState().hasSelectedGameMode).toBe(true);
    });

    it('Escenario 4: Veredicto erróneo inicial en Modo Manual, corrección de tachados manuales y acusación final exitosa', () => {
      useGameStore.getState().setGameMode('manual');
      const activeCase = useGameStore.getState().activeCase;
      const wrongSuspect = SUSPECTS_DIRECTORY.find(s => s.id !== activeCase.config.culpritId)!;

      // Player mistakenly crosses off the true culprit & weapon
      useGameStore.getState().toggleManualElimination(activeCase.config.culpritId);
      const st = getFullStoreState();
      expect(typeof st.toggleManualWeaponElimination).toBe('function');
      st.toggleManualWeaponElimination!(activeCase.config.weaponId);

      // Wrong accusation fails unconditionally (wrongSuspect.id !== culpritId)
      const wrongVerdict = useGameStore
        .getState()
        .verifyVerdict(wrongSuspect.id, WEAPONS[0].id, LOCATIONS[0].id);
      expect(wrongVerdict.isCorrect).toBe(false);

      // Player un-crosses off the true culprit & weapon
      useGameStore.getState().toggleManualElimination(activeCase.config.culpritId);
      st.toggleManualWeaponElimination!(activeCase.config.weaponId);
      expect(
        useGameStore
          .getState()
          .getSuspectStatus(SUSPECTS_DIRECTORY.find(s => s.id === activeCase.config.culpritId)!)
          .isEliminated
      ).toBe(false);
      expect(st.getWeaponStatus?.(activeCase.config.weaponId).isEliminated).toBe(false);

      // Correct accusation wins
      const win = useGameStore
        .getState()
        .verifyVerdict(
          activeCase.config.culpritId,
          activeCase.config.weaponId,
          activeCase.config.locationId
        );
      expect(win.isCorrect).toBe(true);
      expect(win.correctCount).toBe(3);
    });

    it('Escenario 5: Múltiples rutas de culpables y preservación de controles [TEST] sin emojis', () => {
      for (const culpritIdx of [0, 17, 36, 55, 73]) {
        const c = generateCase(900000 + culpritIdx * 131, culpritIdx, culpritIdx % 18, culpritIdx % 9);
        const evalRes = evaluateCaseClues(c.days.map(d => d.unlockedClue));
        expect(evalRes.matchingSuspectIds).toEqual([SUSPECTS_DIRECTORY[culpritIdx].id]);
        expect(evalRes.matchingWeaponIds).toHaveLength(1);
        expect(evalRes.matchingRoomIds).toHaveLength(1);

        // [TEST] controls remain visible in BookLayout for Manual Mode on uncompleted day 1
        useGameStore.setState({
          activeCase: c,
          caseSeed: c.config.seed,
          gameMode: 'manual',
          hasSelectedGameMode: true,
          currentDay: 1,
          openedDoors: [1],
          completedDays: [],
        });
        const html = renderBookLayoutMarkup();
        expect(html).toContain('[TEST] Omitir Día');
        expect(html).toContain('[TEST] Completar Acto 1');
      }
    });
  });
});
