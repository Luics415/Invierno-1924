import React, { useState, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, Square, X } from 'lucide-react';
import type { NonogramConfig } from '../../types/game';
import { computeLineClues, validateNonogram } from '../../engine/puzzles/nonogram';

interface NonogramProps {
  config: NonogramConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
  gameMode?: 'auto' | 'manual';
}

type CellMark = 0 | 1 | 2; // 0 = empty, 1 = filled, 2 = crossed X

export const NonogramPuzzle: React.FC<NonogramProps> = ({
  config,
  onSolve,
  isSolved,
  hints,
  gameMode = 'auto',
}) => {
  const isManualMode = gameMode === 'manual';
  const { rows, cols, solution, rowClues, colClues, revealTitle, secretMeaning } = config;

  const [marks, setMarks] = useState<CellMark[][]>(() =>
    Array.from({ length: rows }, () => Array<CellMark>(cols).fill(0))
  );
  const [tool, setTool] = useState<'fill' | 'cross'>('fill');
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const displayMarks: CellMark[][] = useMemo(() => {
    if (!isSolved) return marks;
    return solution.map(row => row.map(v => (v ? 1 : 0)));
  }, [isSolved, marks, solution]);

  const applyAction = (r: number, c: number, mode: 'fill' | 'cross') => {
    if (isSolved) return;
    if (mode === 'fill') {
      sound.playHighlighterStroke((r + c) % 6);
    } else {
      sound.playPencil();
    }
    const targetVal: CellMark = mode === 'fill' ? 1 : 2;
    const next = marks.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? (cell === targetVal ? 0 : targetVal) : cell))
    );
    setMarks(next);

    const boolGrid = next.map(row => row.map(v => v === 1));
    if (validateNonogram(config, boolGrid)) {
      sound.playMysteryBell();
      onSolve();
    }
  };

  const isRowComplete = (r: number) => {
    const actual = computeLineClues(displayMarks[r].map(v => v === 1));
    const expected = rowClues[r];
    return actual.length === expected.length && actual.every((v, idx) => v === expected[idx]);
  };

  const isColComplete = (c: number) => {
    const actual = computeLineClues(displayMarks.map(row => row[c] === 1));
    const expected = colClues[c];
    return actual.length === expected.length && actual.every((v, idx) => v === expected[idx]);
  };

  const handleReset = () => {
    sound.playPencil();
    setMarks(Array.from({ length: rows }, () => Array<CellMark>(cols).fill(0)));
  };

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="nonogram">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-parchment-300">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-parchment-200 rounded p-0.5 border border-parchment-300">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setTool('fill');
              }}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-semibold transition ${
                tool === 'fill' ? 'bg-ink-900 text-parchment-50 shadow' : 'text-ink-700'
              }`}
            >
              <Square className="w-3 h-3 fill-current" /> Pintar
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setTool('cross');
              }}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-semibold transition ${
                tool === 'cross' ? 'bg-crimson-800 text-white shadow' : 'text-ink-700'
              }`}
            >
              <X className="w-3 h-3" /> Vacía
            </button>
          </div>
          <span className="text-[10px] font-mono text-ink-500">
            Nonograma {rows}×{cols}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!isManualMode && hints.length > 0 && (
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
            title="Limpiar nonograma"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isManualMode && showHint && (
        <div className="p-2 mb-2 text-xs rounded border border-gold-400 bg-gold-100/70 text-ink-800">
          <strong>Pista de Azlynn:</strong> {hints[activeHintIdx]}
        </div>
      )}

      {/* Rejilla Nonograma */}
      <div className="flex-1 flex items-center justify-center py-1 min-h-0 overflow-auto">
        <div className="inline-block p-2 bg-parchment-100 border-2 border-parchment-400 rounded-lg shadow-inner">
          {/* Pistas de columna */}
          <div className="flex items-end mb-1">
            <div className="w-14 sm:w-16 shrink-0" />
            {colClues.map((clueArr, c) => {
              const ok = isColComplete(c);
              return (
                <div
                  key={c}
                  className={`w-7 sm:w-8 flex flex-col items-center justify-end text-[10px] font-mono font-bold leading-tight pb-0.5 ${
                    ok ? 'text-emerald-700' : 'text-ink-800'
                  }`}
                >
                  {clueArr.map((n, idx) => (
                    <span key={idx}>{n}</span>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Filas */}
          <div className="border-2 border-ink-900 inline-block">
            {displayMarks.map((row, r) => {
              const ok = isRowComplete(r);
              return (
                <div key={r} className="flex items-center">
                  <div
                    className={`w-14 sm:w-16 pr-1.5 flex items-center justify-end gap-1 text-[10px] font-mono font-bold border-r-2 border-ink-900 h-7 sm:h-8 bg-parchment-200/70 ${
                      ok ? 'text-emerald-700' : 'text-ink-800'
                    }`}
                  >
                    {rowClues[r].map((n, idx) => (
                      <span key={idx}>{n}</span>
                    ))}
                  </div>
                  {row.map((val, c) => (
                    <button
                      type="button"
                      key={c}
                      data-nonogram-cell={`${r}-${c}`}
                      data-filled={val === 1 ? 'true' : 'false'}
                      onClick={() => applyAction(r, c, tool)}
                      onContextMenu={e => {
                        e.preventDefault();
                        applyAction(r, c, 'cross');
                      }}
                      className={`w-7 h-7 sm:w-8 sm:h-8 border-r border-b border-parchment-400 last:border-r-0 flex items-center justify-center transition ${
                        val === 1
                          ? 'bg-ink-900 text-parchment-50'
                          : val === 2
                          ? 'bg-parchment-200 text-crimson-700'
                          : 'bg-parchment-50 hover:bg-parchment-200/70'
                      }`}
                      aria-label={`Fila ${r + 1}, columna ${c + 1}`}
                    >
                      {val === 2 ? <X className="w-3.5 h-3.5" /> : null}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isSolved && !isManualMode && (
        <div className="mt-2 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Silueta Revelada: {revealTitle}
          </div>
          {secretMeaning && (
            <p className="font-serif text-xs font-semibold italic text-crimson-950">
              {secretMeaning}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
