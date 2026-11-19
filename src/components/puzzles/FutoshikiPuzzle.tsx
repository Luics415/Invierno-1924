import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, Delete, AlertTriangle } from 'lucide-react';
import type { FutoshikiConfig } from '../../types/game';
import { getFutoshikiViolations, validateFutoshiki } from '../../engine/puzzles/futoshiki';

interface FutoshikiProps {
  config: FutoshikiConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
}

export const FutoshikiPuzzle: React.FC<FutoshikiProps> = ({ config, onSolve, isSolved, hints }) => {
  const { size, initialGrid, solution, inequalities, secretCodeMeaning } = config;

  const [grid, setGrid] = useState<(number | null)[][]>(() =>
    initialGrid.map(row => [...row])
  );
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const displayGrid = useMemo(
    () => (isSolved ? solution.map(row => [...row]) : grid),
    [isSolved, solution, grid]
  );

  const violations = useMemo(
    () => getFutoshikiViolations(config, displayGrid),
    [config, displayGrid]
  );

  const isInitial = useCallback(
    (r: number, c: number) => initialGrid[r][c] !== null,
    [initialGrid]
  );

  const getHorizOp = (r: number, c: number): '<' | '>' | null => {
    const found = inequalities.find(
      i => (i.r1 === r && i.c1 === c && i.r2 === r && i.c2 === c + 1)
    );
    return found ? found.operator : null;
  };

  const getVertOp = (r: number, c: number): '<' | '>' | null => {
    const found = inequalities.find(
      i => (i.r1 === r && i.c1 === c && i.r2 === r + 1 && i.c2 === c)
    );
    return found ? found.operator : null;
  };

  const handleNumberInput = useCallback(
    (num: number) => {
      if (isSolved || !selectedCell || num < 1 || num > size) return;
      const { r, c } = selectedCell;
      if (isInitial(r, c)) return;

      sound.playClick();
      const next = grid.map((row, ri) =>
        row.map((val, ci) => (ri === r && ci === c ? num : val))
      );
      setGrid(next);

      if (validateFutoshiki(config, next)) {
        sound.playMysteryBell();
        onSolve();
      }
    },
    [isSolved, selectedCell, size, isInitial, grid, config, onSolve]
  );

  const handleErase = useCallback(() => {
    if (isSolved || !selectedCell) return;
    const { r, c } = selectedCell;
    if (isInitial(r, c)) return;

    sound.playPencil();
    setGrid(prev =>
      prev.map((row, ri) => row.map((val, ci) => (ri === r && ci === c ? null : val)))
    );
  }, [isSolved, selectedCell, isInitial]);

  useEffect(() => {
    if (isSolved) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;
      const n = Number(e.key);
      if (n >= 1 && n <= size) {
        e.preventDefault();
        handleNumberInput(n);
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        handleErase();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSolved, selectedCell, size, handleNumberInput, handleErase]);

  const handleReset = () => {
    sound.playPencil();
    setGrid(initialGrid.map(row => [...row]));
    setSelectedCell(null);
  };

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="futoshiki">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-parchment-300">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-ink-700">
            Futoshiki {size}×{size}
          </span>
          <span className="text-[10px] font-mono text-ink-500">
            Números 1–{size} respetando &lt; y &gt;
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {violations.size > 0 && !isSolved && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-crimson-700 bg-crimson-100 px-1.5 py-0.5 rounded border border-crimson-300">
              <AlertTriangle className="w-3 h-3" /> Inconsistencia
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
            title="Reiniciar Futoshiki"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showHint && (
        <div className="p-2 mb-2 text-xs rounded border border-gold-400 bg-gold-100/70 text-ink-800">
          <strong>Pista de Azlynn:</strong> {hints[activeHintIdx]}
        </div>
      )}

      {/* Cuadrícula con desigualdades intercaladas */}
      <div className="flex-1 flex items-center justify-center py-1 min-h-0">
        <div className="inline-flex flex-col items-center p-2 sm:p-3 bg-parchment-100 border-2 border-parchment-400 rounded-lg shadow-inner">
          {displayGrid.map((row, r) => (
            <React.Fragment key={r}>
              <div className="flex items-center">
                {row.map((val, c) => {
                  const initial = isInitial(r, c);
                  const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                  const hasViolation = violations.has(`${r}-${c}`);
                  const hOp = c + 1 < size ? getHorizOp(r, c) : null;

                  return (
                    <React.Fragment key={c}>
                      <button
                        type="button"
                        data-futoshiki-cell={`${r}-${c}`}
                        onClick={() => {
                          if (!isSolved) {
                            sound.playPencil();
                            setSelectedCell({ r, c });
                          }
                        }}
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded border-2 font-serif text-base sm:text-lg flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-crimson-200 border-crimson-700 text-crimson-950 font-black'
                            : hasViolation
                            ? 'bg-crimson-100 border-crimson-500 text-crimson-900 font-black'
                            : initial
                            ? 'bg-parchment-200 border-ink-800 text-ink-950 font-black'
                            : 'bg-parchment-50 border-parchment-500 text-crimson-800 font-bold hover:bg-white'
                        }`}
                      >
                        {val ?? ''}
                      </button>

                      {c + 1 < size && (
                        <div className="w-5 sm:w-6 flex items-center justify-center font-mono font-black text-sm text-crimson-800">
                          {hOp ?? ''}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {r + 1 < size && (
                <div className="flex items-center h-5 sm:h-6">
                  {row.map((_, c) => {
                    const vOp = getVertOp(r, c);
                    // Top < Bottom => ∧ (top is smaller, points toward smaller); Top > Bottom => ∨ (bottom is smaller)
                    const symbol = vOp === '<' ? '∧' : vOp === '>' ? '∨' : '';
                    return (
                      <React.Fragment key={c}>
                        <div className="w-10 sm:w-11 flex items-center justify-center font-mono font-black text-sm text-crimson-800 leading-none">
                          {symbol}
                        </div>
                        {c + 1 < size && <div className="w-5 sm:w-6" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Teclado 1..5 */}
      <div className="mt-2 p-2 bg-parchment-200/80 rounded-lg border border-parchment-300">
        <div className="flex justify-center items-center gap-2">
          {Array.from({ length: size }, (_, i) => i + 1).map(num => (
            <button
              type="button"
              key={num}
              data-futoshiki-num={num}
              onClick={() => handleNumberInput(num)}
              disabled={isSolved || !selectedCell || isInitial(selectedCell.r, selectedCell.c)}
              className="w-9 h-9 text-base font-bold font-serif rounded bg-parchment-50 hover:bg-white text-ink-900 border border-parchment-400 hover:border-crimson-700 shadow-sm active:scale-95 disabled:opacity-40 transition"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleErase}
            disabled={isSolved || !selectedCell || isInitial(selectedCell.r, selectedCell.c)}
            className="w-9 h-9 flex items-center justify-center rounded bg-parchment-50 hover:bg-white text-crimson-800 border border-parchment-400 shadow-sm active:scale-95 disabled:opacity-40 transition"
            title="Borrar casilla"
            aria-label="Borrar casilla"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isSolved && (
        <div className="mt-2 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Futoshiki Resuelto
          </div>
          {secretCodeMeaning && (
            <p className="font-serif text-xs font-semibold italic text-crimson-950">
              {secretCodeMeaning}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
