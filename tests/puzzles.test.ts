import { describe, expect, it } from 'vitest';
import {
  countSudokuSolutions,
  generateSudoku,
  validateSudoku,
} from '../src/engine/puzzles/sudoku';
import {
  findWordCoordinates,
  generateWordSearch,
  validateWordSearch,
} from '../src/engine/puzzles/wordsearch';
import {
  generateMurdokuWithProof,
  isMurdokuMoveMistake,
  validateMurdoku,
} from '../src/engine/puzzles/murdoku';
import {
  generateSyllables,
  resolveSolvedSyllableSlots,
  validateSyllables,
} from '../src/engine/puzzles/syllables';
import {
  generateCryptogram,
  validateCryptogram,
} from '../src/engine/puzzles/cryptogram';
import {
  generateCrossword,
  validateCrossword,
} from '../src/engine/puzzles/crossword';
import {
  countFutoshikiSolutions,
  generateFutoshiki,
  validateFutoshiki,
} from '../src/engine/puzzles/futoshiki';
import {
  checkConnectionsSelection,
  generateConnections,
  validateConnections,
} from '../src/engine/puzzles/connections';
import {
  generateNonogram,
  validateNonogram,
} from '../src/engine/puzzles/nonogram';
import {
  generateMinesweeper,
  validateMinesweeper,
} from '../src/engine/puzzles/minesweeper';
import {
  generateSeptagrama,
  validateSeptagrama,
} from '../src/engine/puzzles/septagrama';
import {
  generateCodificados,
  validateCodificados,
} from '../src/engine/puzzles/codificados';
import {
  generateEcuaciones,
  validateEcuaciones,
} from '../src/engine/puzzles/ecuaciones';
import {
  generateEncajados,
  validateEncajados,
} from '../src/engine/puzzles/encajados';
import type { MatrixCellState } from '../src/types/game';

describe('M3 All 10 Exclusive Logic Minigame Engines', () => {
  it('1. Sudoku: strictly 9x9 (3x3 blocks) with unique solution and valid verification', () => {
    for (const day of [2, 12, 21]) {
      const cfg = generateSudoku(19241224, day);
      expect(cfg.size).toBe(9);
      expect(cfg.initialGrid).toHaveLength(9);
      expect(cfg.solution).toHaveLength(9);
      expect(countSudokuSolutions(cfg.initialGrid, 2)).toBe(1);
      expect(validateSudoku(cfg, cfg.solution)).toBe(true);

      // Tampering one cell fails validation
      const broken = cfg.solution.map(r => [...r]);
      broken[0][0] = (broken[0][0] % 9) + 1;
      expect(validateSudoku(cfg, broken)).toBe(false);
    }
  });

  it('2. WordSearch: >=11x11 grids, >=8 words, zero ! fillers, all words locatable', () => {
    for (const day of [1, 11, 22]) {
      const cfg = generateWordSearch(19241224, day);
      expect(cfg.grid.length).toBeGreaterThanOrEqual(11);
      expect(cfg.grid[0].length).toBeGreaterThanOrEqual(11);
      expect(cfg.words.length).toBeGreaterThanOrEqual(8);

      for (const row of cfg.grid) {
        for (const ch of row) {
          expect(ch).toMatch(/^[A-ZÑ]$/);
          expect(ch).not.toBe('!');
        }
      }
      for (const item of cfg.words) {
        expect(findWordCoordinates(cfg.grid, item.word)).not.toBeNull();
      }
      expect(validateWordSearch(cfg, cfg.words.map(w => w.word))).toBe(true);
    }
  });

  it('3. Murdoku: >=4x4 harder grids, unique solution, and mistake detection triggers reset', () => {
    for (const day of [4, 15, 24]) {
      const { config, solutionCount } = generateMurdokuWithProof(19241224, day);
      expect(config.groupA.items.length).toBeGreaterThanOrEqual(4);
      expect(config.groupB.items.length).toBe(config.groupA.items.length);
      expect(config.resetOnMistake).toBe(true);
      expect(solutionCount).toBe(1);

      const solvedCells: Record<string, MatrixCellState> = {};
      for (const a of config.groupA.items) {
        for (const b of config.groupB.items) {
          const isTarget = config.targetMatches.some(m => m.aId === a.id && m.bId === b.id);
          solvedCells[`${a.id}:${b.id}`] = isTarget ? 'check' : 'cross';
        }
      }
      expect(validateMurdoku(config, solvedCells)).toBe(true);

      // Mistake check: marking a true target as 'cross' or a non-target as 'check' must flag mistake
      const target = config.targetMatches[0];
      expect(isMurdokuMoveMistake(config, target.aId, target.bId, 'cross')).toBe(true);
      expect(isMurdokuMoveMistake(config, target.aId, target.bId, 'check')).toBe(false);

      const wrongB = config.groupB.items.find(b => b.id !== target.bId)!;
      expect(isMurdokuMoveMistake(config, target.aId, wrongB.id, 'check')).toBe(true);
      expect(isMurdokuMoveMistake(config, target.aId, wrongB.id, 'cross')).toBe(false);
    }
  });

  it('4. Syllables (Palabras clave más largas): multi-syllable words + distractors + exact validation', () => {
    for (const day of [5, 17, 25]) {
      const cfg = generateSyllables(19241224, day);
      expect(cfg.words.length).toBeGreaterThanOrEqual(4);
      expect(cfg.words.every(w => w.targetSyllables.length >= 4)).toBe(true);
      expect((cfg.distractorSyllableIds ?? []).length).toBeGreaterThanOrEqual(3);

      const solved = resolveSolvedSyllableSlots(cfg);
      expect(validateSyllables(cfg, solved)).toBe(true);
    }
  });

  it('5. Cryptogram: strict 1-to-1 bijection and <=1 initial revealed letter', () => {
    for (const day of [3, 13, 23]) {
      const cfg = generateCryptogram(19241224, day);
      expect((cfg.initialRevealed ?? []).length).toBeLessThanOrEqual(1);

      const codeValues = Object.values(cfg.cipherMap);
      expect(new Set(codeValues).size).toBe(codeValues.length);

      const correctMap: Record<number, string> = {};
      for (const [letter, code] of Object.entries(cfg.cipherMap)) {
        correctMap[code] = letter;
      }
      expect(validateCryptogram(cfg, correctMap)).toBe(true);

      // Duplicate letter assignment violates bijection
      const codes = Object.keys(correctMap).map(Number);
      const brokenMap = { ...correctMap, [codes[1]]: correctMap[codes[0]] };
      expect(validateCryptogram(cfg, brokenMap)).toBe(false);
    }
  });

  it('6. Crossword: intersecting valid grid with >=5 entries and exact validation', () => {
    for (const day of [7, 16, 26]) {
      const cfg = generateCrossword(19241224, day);
      expect(cfg.entries.length).toBeGreaterThanOrEqual(5);

      for (const entry of cfg.entries) {
        const dr = entry.direction === 'down' ? 1 : 0;
        const dc = entry.direction === 'across' ? 1 : 0;
        for (let i = 0; i < entry.answer.length; i++) {
          expect(cfg.grid[entry.row + dr * i][entry.col + dc * i]).toBe(entry.answer[i]);
        }
      }
      expect(validateCrossword(cfg, cfg.grid)).toBe(true);
    }
  });

  it('7. Futoshiki: 5x5 unique solution obeying Latin square and all inequalities', () => {
    for (const day of [8, 18, 28]) {
      const cfg = generateFutoshiki(19241224, day);
      expect(cfg.size).toBe(5);
      expect(cfg.inequalities.length).toBeGreaterThanOrEqual(6);
      expect(countFutoshikiSolutions(cfg.size, cfg.initialGrid, cfg.inequalities, 2)).toBe(1);
      expect(validateFutoshiki(cfg, cfg.solution)).toBe(true);
    }
  });

  it('8. Connections: 4x4 unique items with exact match & one-away detection', () => {
    for (const day of [6, 14, 27]) {
      const cfg = generateConnections(19241224, day);
      expect(cfg.groups).toHaveLength(4);
      const allItems = cfg.groups.flatMap(g => g.items);
      expect(new Set(allItems).size).toBe(16);

      const exact = checkConnectionsSelection(cfg, [...cfg.groups[0].items]);
      expect(exact.matchedGroup?.id).toBe(cfg.groups[0].id);
      expect(exact.oneAway).toBe(false);

      const almost = checkConnectionsSelection(cfg, [
        cfg.groups[0].items[0],
        cfg.groups[0].items[1],
        cfg.groups[0].items[2],
        cfg.groups[1].items[0],
      ]);
      expect(almost.matchedGroup).toBeNull();
      expect(almost.oneAway).toBe(true);

      expect(validateConnections(cfg, cfg.groups.map(g => g.id))).toBe(true);
    }
  });

  it('9. Nonogram: valid row/col clues and exact clue-matching validation', () => {
    for (const day of [9, 19, 29]) {
      const cfg = generateNonogram(19241224, day);
      expect(cfg.rows).toBeGreaterThanOrEqual(7);
      expect(cfg.cols).toBeGreaterThanOrEqual(7);
      expect(validateNonogram(cfg, cfg.solution)).toBe(true);

      const blank = Array.from({ length: cfg.rows }, () => Array<boolean>(cfg.cols).fill(false));
      expect(validateNonogram(cfg, blank)).toBe(false);
    }
  });

  it('10. Minesweeper: safe initial opening with zero mines in initialRevealed and valid clear', () => {
    for (const day of [10, 20, 30]) {
      const cfg = generateMinesweeper(19241224, day);
      const mineSet = new Set(cfg.mines.map(m => `${m.r}:${m.c}`));
      expect(cfg.mines.length).toBeGreaterThanOrEqual(8);
      expect(cfg.initialRevealed.length).toBeGreaterThanOrEqual(9);

      for (const cell of cfg.initialRevealed) {
        expect(mineSet.has(`${cell.r}:${cell.c}`)).toBe(false);
      }

      const allSafe = new Set<string>();
      for (let r = 0; r < cfg.rows; r++) {
        for (let c = 0; c < cfg.cols; c++) {
          const key = `${r}:${c}`;
          if (!mineSet.has(key)) allSafe.add(key);
        }
      }
      expect(validateMinesweeper(cfg, allSafe)).toBe(true);
    }
  });

  it('11. Septagrama: 7-letter flower with center letter in all words and shaded secret word', () => {
    for (const day of [3, 15]) {
      const cfg = generateSeptagrama(19241224, day);
      expect(cfg.outerLetters).toHaveLength(6);
      expect(cfg.words.length).toBeGreaterThanOrEqual(7);
      const allowed = new Set([cfg.centerLetter, ...cfg.outerLetters]);
      for (const w of cfg.words) {
        expect(w.answer.includes(cfg.centerLetter)).toBe(true);
        for (const ch of w.answer) {
          expect(allowed.has(ch)).toBe(true);
        }
      }
      const extracted = cfg.words.map(w => w.answer[w.highlightIndex]).join('');
      expect(extracted).toBe(cfg.secretWord);

      const solvedMap: Record<string, string> = {};
      for (const w of cfg.words) solvedMap[w.id] = w.answer;
      expect(validateSeptagrama(cfg, solvedMap)).toBe(true);
    }
  });

  it('12. Codificados: 4-digit secret code with 5 Mastermind-style deduction clues', () => {
    for (const day of [2, 16, 29]) {
      const cfg = generateCodificados(19241224, day);
      expect(cfg.secretCode).toHaveLength(4);
      expect(cfg.clues).toHaveLength(5);
      expect(validateCodificados(cfg, cfg.secretCode)).toBe(true);
      expect(validateCodificados(cfg, [null, 0, 0, 0])).toBe(false);
    }
  });

  it('13. Ecuaciones: icon equations solving uniquely to the 4-digit target code', () => {
    for (const day of [4, 17]) {
      const cfg = generateEcuaciones(19241224, day);
      expect(cfg.targetSymbols).toHaveLength(4);
      expect(cfg.targetCode).toHaveLength(4);
      expect(cfg.equations.length).toBeGreaterThanOrEqual(5);
      expect(validateEcuaciones(cfg, cfg.targetCode)).toBe(true);
      expect(validateEcuaciones(cfg, [0, 0, 0, 0])).toBe(false);
    }
  });

  it('14. Encajados: intersecting grid with word bank, anchor cells, and shaded key cells', () => {
    for (const day of [5, 18, 30]) {
      const cfg = generateEncajados(19241224, day);
      expect(cfg.slots.length).toBeGreaterThanOrEqual(5);
      expect(cfg.wordBank).toHaveLength(cfg.slots.length);
      expect(cfg.givenCells.length).toBeGreaterThanOrEqual(1);
      expect(cfg.keyCells.length).toBeGreaterThanOrEqual(4);
      const spelled = cfg.keyCells.map(p => cfg.grid[p.r][p.c]).join('');
      expect(spelled).toBe(cfg.secretWord);
      expect(validateEncajados(cfg, cfg.grid)).toBe(true);
    }
  });
});
