import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, PenTool, Edit3, Delete, KeyRound, AlertTriangle } from 'lucide-react';
import type { SudokuConfig } from '../../types/game';
import { getSudokuConflicts, validateSudoku } from '../../engine/puzzles/sudoku';

interface SudokuProps {
  config: SudokuConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
}

export const SudokuPuzzle: React.FC<SudokuProps> = ({ config, onSolve, isSolved, hints }) => {
  const { initialGrid, solution, keyCells, secretCodeMeaning } = config;
  const size = 9;

  const [grid, setGrid] = useState<(number | null)[][]>(() =>
    initialGrid.map(row => [...row])
  );
  const [pencilNotes, setPencilNotes] = useState<Record<string, number[]>>({});
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [inputMode, setInputMode] = useState<'pen' | 'pencil'>('pen');
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const displayGrid = useMemo(
    () => (isSolved ? solution.map(row => [...row]) : grid),
    [isSolved, solution, grid]
  );

  const conflicts = useMemo(() => getSudokuConflicts(displayGrid), [displayGrid]);

  const isInitialCell = useCallback(
    (r: number, c: number) => initialGrid[r][c] !== null,
    [initialGrid]
  );

  const isKeyCell = (r: number, c: number) =>
    keyCells.some(cell => cell.r === r && cell.c === c);

  const handleCellClick = (r: number, c: number) => {
    if (isSolved) return;
    sound.playPencil();
    setSelectedCell({ r, c });
  };

  const handleNumberInput = useCallback(
    (num: number) => {
      if (isSolved || !selectedCell) return;
      const { r, c } = selectedCell;
      if (isInitialCell(r, c)) return;

      if (inputMode === 'pencil') {
        sound.playPencil();
        const key = `${r}-${c}`;
        setPencilNotes(prev => {
          const currentNotes = prev[key] || [];
          const updatedNotes = currentNotes.includes(num)
            ? currentNotes.filter(n => n !== num)
            : [...currentNotes, num].sort((a, b) => a - b);
          return { ...prev, [key]: updatedNotes };
        });
      } else {
        sound.playNibClick();
        const newGrid = grid.map((row, ri) =>
          row.map((val, ci) => (ri === r && ci === c ? num : val))
        );
        setGrid(newGrid);

        const key = `${r}-${c}`;
        setPencilNotes(prev => {
          if (!prev[key]) return prev;
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });

        if (validateSudoku(config, newGrid)) {
          sound.playMysteryBell();
          onSolve();
        }
      }
    },
    [isSolved, selectedCell, isInitialCell, inputMode, grid, config, onSolve]
  );

  const handleErase = useCallback(() => {
    if (isSolved || !selectedCell) return;
    const { r, c } = selectedCell;
    if (isInitialCell(r, c)) return;

    sound.playPencil();
    const newGrid = grid.map((row, ri) =>
      row.map((val, ci) => (ri === r && ci === c ? null : val))
    );
    setGrid(newGrid);

    const key = `${r}-${c}`;
    setPencilNotes(prev => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }, [isSolved, selectedCell, isInitialCell, grid]);

  useEffect(() => {
    if (isSolved) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        handleErase();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCell(prev => (prev ? { r: (prev.r + 8) % 9, c: prev.c } : null));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCell(prev => (prev ? { r: (prev.r + 1) % 9, c: prev.c } : null));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedCell(prev => (prev ? { r: prev.r, c: (prev.c + 8) % 9 } : null));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedCell(prev => (prev ? { r: prev.r, c: (prev.c + 1) % 9 } : null));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSolved, selectedCell, handleNumberInput, handleErase]);

  const handleReset = () => {
    sound.playPencil();
    setGrid(initialGrid.map(row => [...row]));
    setPencilNotes({});
    setSelectedCell(null);
  };

  const secretCode = keyCells
    .map(({ r, c }) => displayGrid[r]?.[c] ?? '?')
    .join('');

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="sudoku">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-1.5 border-b border-parchment-300">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-parchment-200 rounded p-0.5 border border-parchment-300">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setInputMode('pen');
              }}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-medium transition ${
                inputMode === 'pen'
                  ? 'bg-crimson-800 text-white shadow'
                  : 'text-ink-700 hover:text-ink-950'
              }`}
            >
              <PenTool className="w-3 h-3" /> Tinta
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setInputMode('pencil');
              }}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-medium transition ${
                inputMode === 'pencil'
                  ? 'bg-gold-600 text-white shadow'
                  : 'text-ink-700 hover:text-ink-950'
              }`}
            >
              <Edit3 className="w-3 h-3" /> Lápiz
            </button>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-500">
            9×9 (Bloques 3×3)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {conflicts.size > 0 && !isSolved && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-crimson-700 bg-crimson-100/80 px-1.5 py-0.5 rounded border border-crimson-300">
              <AlertTriangle className="w-3 h-3" /> Conflicto
            </span>
          )}
          {hints.length > 0 && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setShowHint(!showHint);
                if (!showHint && activeHintIdx < hints.length - 1) {
                  setActiveHintIdx(prev => prev + 1);
                }
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-parchment-200 hover:bg-parchment-300 text-ink-700 transition"
            >
              <Lightbulb className="w-3.5 h-3.5 text-gold-600" />
              <span>Pista</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            disabled={isSolved}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-parchment-200 hover:bg-parchment-300 text-ink-600 disabled:opacity-40 transition"
            title="Reiniciar Sudoku"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showHint && (
        <div className="p-2 mb-1.5 text-xs rounded border border-gold-400 bg-gold-100/70 text-ink-800">
          <strong>Pista de Azlynn:</strong> {hints[activeHintIdx]}
        </div>
      )}

      {/* Tablero Sudoku 9x9 con bloques 3x3 */}
      <div className="flex-1 flex items-center justify-center py-0.5 min-h-0">
        <div
          className="grid gap-0 border-2 border-ink-900 bg-parchment-50 rounded shadow-md overflow-hidden max-w-full"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          role="grid"
          aria-label="Tablero Sudoku 9 por 9"
        >
          {displayGrid.map((row, r) =>
            row.map((val, c) => {
              const initial = isInitialCell(r, c);
              const keyCell = isKeyCell(r, c);
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;
              const isPeer =
                selectedCell !== null &&
                !isSelected &&
                (selectedCell.r === r ||
                  selectedCell.c === c ||
                  (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) &&
                    Math.floor(selectedCell.c / 3) === Math.floor(c / 3)));
              const hasConflict = conflicts.has(`${r}-${c}`);
              const notes = pencilNotes[`${r}-${c}`] || [];

              const borderBottom =
                (r + 1) % 3 === 0 && r + 1 < size
                  ? 'border-b-2 border-b-ink-900'
                  : 'border-b border-parchment-300';
              const borderRight =
                (c + 1) % 3 === 0 && c + 1 < size
                  ? 'border-r-2 border-r-ink-900'
                  : 'border-r border-parchment-300';

              return (
                <button
                  type="button"
                  key={`${r}-${c}`}
                  data-row={r}
                  data-col={c}
                  data-given={initial ? 'true' : 'false'}
                  onClick={() => handleCellClick(r, c)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex flex-col items-center justify-center relative cursor-pointer font-serif select-none transition ${borderBottom} ${borderRight} ${
                    isSelected
                      ? 'bg-crimson-200/95 text-crimson-950 font-bold ring-1 ring-inset ring-crimson-700'
                      : hasConflict
                      ? 'bg-crimson-100 text-crimson-900'
                      : keyCell
                      ? 'bg-gold-100/85'
                      : initial
                      ? 'bg-parchment-200/75 font-black text-ink-950'
                      : isPeer
                      ? 'bg-parchment-200/35'
                      : 'hover:bg-parchment-100'
                  }`}
                >
                  {keyCell && (
                    <KeyRound className="w-2 h-2 absolute top-0.5 right-0.5 text-gold-700 pointer-events-none" />
                  )}

                  {val !== null ? (
                    <span
                      className={`text-xs sm:text-sm md:text-base leading-none ${
                        hasConflict
                          ? 'text-crimson-800 font-black underline'
                          : initial
                          ? 'font-black text-ink-950'
                          : keyCell
                          ? 'text-gold-900 font-bold'
                          : 'text-crimson-800 font-bold'
                      }`}
                    >
                      {val}
                    </span>
                  ) : notes.length > 0 ? (
                    <div className="grid grid-cols-3 gap-0 text-[7px] font-sans text-ink-500 leading-none">
                      {notes.map(n => (
                        <span key={n}>{n}</span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Teclado numérico 1-9 */}
      <div className="mt-1.5 p-1.5 bg-parchment-200/80 rounded-lg border border-parchment-300">
        <div className="flex flex-wrap justify-center items-center gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              type="button"
              key={num}
              data-sudoku-num={num}
              onClick={() => handleNumberInput(num)}
              disabled={isSolved || !selectedCell || isInitialCell(selectedCell.r, selectedCell.c)}
              className="w-7 h-8 sm:w-8 sm:h-8 text-xs sm:text-sm font-bold font-serif rounded bg-parchment-50 hover:bg-white text-ink-900 border border-parchment-400 hover:border-crimson-700 shadow-sm active:scale-95 disabled:opacity-40 transition"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleErase}
            disabled={isSolved || !selectedCell || isInitialCell(selectedCell.r, selectedCell.c)}
            className="w-7 h-8 sm:w-8 sm:h-8 flex items-center justify-center rounded bg-parchment-50 hover:bg-white text-crimson-800 border border-parchment-400 shadow-sm active:scale-95 disabled:opacity-40 transition"
            title="Borrar casilla"
            aria-label="Borrar casilla"
          >
            <Delete className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Código secreto */}
      <div className="mt-1.5 px-2 py-1.5 bg-gold-100/90 border border-gold-400 rounded flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-gold-900 font-medium flex items-center gap-1">
          <KeyRound className="w-3.5 h-3.5 text-gold-700" />
          <span>Celdas clave:</span>
        </div>
        <div className="font-mono text-xs sm:text-sm font-black tracking-widest text-crimson-900 px-2 py-0.5 bg-white/70 rounded border border-gold-300">
          {secretCode}
        </div>
      </div>

      {isSolved && (
        <div className="mt-1.5 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Sudoku 9×9 Resuelto
          </div>
          <p className="font-serif text-xs font-semibold italic text-crimson-950">
            {secretCodeMeaning}: <strong>{secretCode}</strong>
          </p>
        </div>
      )}
    </div>
  );
};
