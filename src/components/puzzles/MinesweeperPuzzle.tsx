import React, { useState, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, Flag, Search, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { MinesweeperConfig } from '../../types/game';
import {
  countAdjacentMines,
  floodRevealSafeCells,
  validateMinesweeper,
} from '../../engine/puzzles/minesweeper';

interface MinesweeperProps {
  config: MinesweeperConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
}

const NUMBER_COLORS: Record<number, string> = {
  1: 'text-blue-800',
  2: 'text-emerald-800',
  3: 'text-crimson-700',
  4: 'text-indigo-900',
  5: 'text-amber-900',
  6: 'text-teal-800',
  7: 'text-ink-900',
  8: 'text-ink-700',
};

export const MinesweeperPuzzle: React.FC<MinesweeperProps> = ({ config, onSolve, isSolved, hints }) => {
  const { rows, cols, mines, initialRevealed, secretMeaning } = config;

  const mineSet = useMemo(() => new Set(mines.map(m => `${m.r}:${m.c}`)), [mines]);
  const initialSet = useMemo(
    () => new Set(initialRevealed.map(cell => `${cell.r}:${cell.c}`)),
    [initialRevealed]
  );

  const [revealed, setRevealed] = useState<Set<string>>(() => new Set(initialSet));
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set());
  const [tool, setTool] = useState<'reveal' | 'flag'>('reveal');
  const [detonationAlert, setDetonationAlert] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const displayRevealed = useMemo(() => {
    if (!isSolved) return revealed;
    const allSafe = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}:${c}`;
        if (!mineSet.has(key)) allSafe.add(key);
      }
    }
    return allSafe;
  }, [isSolved, revealed, rows, cols, mineSet]);

  const displayFlagged = isSolved ? mineSet : flagged;

  const handleCellAction = (r: number, c: number, mode: 'reveal' | 'flag') => {
    if (isSolved) return;
    const key = `${r}:${c}`;
    if (revealed.has(key)) return;

    if (mode === 'flag') {
      sound.playPencil();
      setDetonationAlert(null);
      const nextFlags = new Set(flagged);
      if (nextFlags.has(key)) nextFlags.delete(key);
      else nextFlags.add(key);
      setFlagged(nextFlags);

      if (validateMinesweeper(config, revealed, nextFlags)) {
        sound.playMysteryBell();
        onSolve();
      }
      return;
    }

    if (flagged.has(key)) return;

    if (mineSet.has(key)) {
      sound.playError();
      setRevealed(new Set(initialSet));
      setFlagged(new Set());
      setDetonationAlert(
        'Has activado una trampa oculta en la escena. El perímetro se ha reiniciado desde la zona segura.'
      );
      return;
    }

    sound.playClick();
    setDetonationAlert(null);
    const nextRevealed = floodRevealSafeCells(rows, cols, mineSet, r, c, revealed);
    setRevealed(nextRevealed);

    if (validateMinesweeper(config, nextRevealed, flagged)) {
      sound.playMysteryBell();
      onSolve();
    }
  };

  const handleReset = () => {
    sound.playPencil();
    setRevealed(new Set(initialSet));
    setFlagged(new Set());
    setDetonationAlert(null);
  };

  const totalSafe = rows * cols - mines.length;

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="minesweeper">
      <div data-toolbar="true" className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-1.5 border-b border-parchment-300">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-parchment-200 rounded p-0.5 border border-parchment-300">
            <button
              type="button"
              data-ms-tool="reveal"
              onClick={() => {
                sound.playClick();
                setTool('reveal');
              }}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-semibold transition ${
                tool === 'reveal' ? 'bg-ink-900 text-parchment-50 shadow' : 'text-ink-700'
              }`}
            >
              <Search className="w-3 h-3" /> Revelar
            </button>
            <button
              type="button"
              data-ms-tool="flag"
              onClick={() => {
                sound.playClick();
                setTool('flag');
              }}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-semibold transition ${
                tool === 'flag' ? 'bg-crimson-800 text-white shadow' : 'text-ink-700'
              }`}
            >
              <Flag className="w-3 h-3" /> Bandera
            </button>
          </div>
          <span data-mine-counter="true" className="text-[10px] font-mono text-ink-600">
            Minas: {displayFlagged.size}/{mines.length} • Restantes: {Math.max(0, mines.length - displayFlagged.size)} • Seguras: {displayRevealed.size}/{totalSafe}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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
            title="Reiniciar buscaminas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {detonationAlert && (
        <div
          role="alert"
          className="p-2 mb-1.5 text-xs rounded border border-crimson-500 bg-crimson-100/90 text-crimson-950 flex items-center gap-1.5"
        >
          <AlertTriangle className="w-4 h-4 text-crimson-700 shrink-0" />
          <span>{detonationAlert}</span>
        </div>
      )}

      {showHint && (
        <div className="p-2 mb-1.5 text-xs rounded border border-gold-400 bg-gold-100/70 text-ink-800">
          <strong>Pista de Azlynn:</strong> {hints[activeHintIdx]}
        </div>
      )}

      {/* Rejilla Buscaminas 8x8 */}
      <div className="flex-1 flex items-center justify-center py-1 min-h-0">
        <div
          className="grid gap-0.5 p-1.5 bg-ink-900 rounded-lg shadow-md"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          role="grid"
          aria-label="Buscaminas forense"
        >
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((__, c) => {
              const key = `${r}:${c}`;
              const isRevealed = displayRevealed.has(key);
              const isFlagged = displayFlagged.has(key);
              const adj = isRevealed ? countAdjacentMines(rows, cols, mineSet, r, c) : 0;

              return (
                <button
                  type="button"
                  key={key}
                  data-minesweeper-cell={`${r}-${c}`}
                  data-ms-cell={`${r}-${c}`}
                  data-state={isRevealed ? 'revealed' : isFlagged ? 'flagged' : 'hidden'}
                  data-revealed={isRevealed ? 'true' : 'false'}
                  data-flagged={isFlagged ? 'true' : 'false'}
                  onClick={() => handleCellAction(r, c, tool)}
                  onContextMenu={e => {
                    e.preventDefault();
                    handleCellAction(r, c, 'flag');
                  }}
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-sm font-mono text-xs sm:text-sm font-black flex items-center justify-center transition ${
                    isRevealed
                      ? 'bg-parchment-100 text-ink-900 border border-parchment-300 cursor-default'
                      : isFlagged
                      ? 'bg-crimson-900/90 text-gold-300 border border-gold-500/70'
                      : 'bg-[#2a2f3a] hover:bg-[#3a4150] text-transparent border border-[#464e5f] cursor-pointer shadow-inner'
                  }`}
                  aria-label={isFlagged ? `Casilla ${r + 1},${c + 1} con bandera` : `Casilla ${r + 1},${c + 1}`}
                >
                  {isRevealed ? (
                    adj > 0 ? (
                      <span className={NUMBER_COLORS[adj] ?? 'text-ink-900'}>{adj}</span>
                    ) : null
                  ) : isFlagged ? (
                    <Flag className="w-3.5 h-3.5 text-gold-300" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-1.5 text-[10px] text-ink-500 text-center flex items-center justify-center gap-1.5">
        <ShieldAlert className="w-3 h-3 text-crimson-700" />
        <span>Clic izquierdo según herramienta • Clic derecho coloca/quita bandera</span>
      </div>

      {isSolved && (
        <div className="mt-1.5 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Buscaminas Despejado
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
