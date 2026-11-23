import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, ArrowRight, ArrowDown, KeyRound, Delete } from 'lucide-react';
import type { CrosswordConfig, CrosswordEntry } from '../../types/game';
import { validateCrossword } from '../../engine/puzzles/crossword';

const CROSSWORD_ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

interface CrosswordProps {
  config: CrosswordConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
  gameMode?: 'auto' | 'manual';
}

export const CrosswordPuzzle: React.FC<CrosswordProps> = ({
  config,
  onSolve,
  isSolved,
  hints,
  gameMode = 'auto',
}) => {
  const isManualMode = gameMode === 'manual';
  const { rows, cols, grid, entries, secretHighlightCells = [], secretWord, secretMeaning } = config;

  const [userGrid, setUserGrid] = useState<(string | null)[][]>(() =>
    grid.map(row => row.map(cell => (cell === null ? null : '')))
  );
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(() => {
    const first = entries[0];
    return first ? { r: first.row, c: first.col } : null;
  });
  const [direction, setDirection] = useState<'across' | 'down'>(entries[0]?.direction ?? 'across');
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const displayGrid = isSolved ? grid : userGrid;

  const cellNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(`${e.row}-${e.col}`, e.number);
    }
    return map;
  }, [entries]);

  const highlightIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    secretHighlightCells.forEach((pos, idx) => {
      map.set(`${pos.r}-${pos.c}`, idx + 1);
    });
    return map;
  }, [secretHighlightCells]);

  const activeEntry = useMemo<CrosswordEntry | null>(() => {
    if (!selectedCell) return null;
    const { r, c } = selectedCell;
    const matchDir = entries.find(e => {
      if (e.direction !== direction) return false;
      if (e.direction === 'across') {
        return e.row === r && c >= e.col && c < e.col + e.answer.length;
      }
      return e.col === c && r >= e.row && r < e.row + e.answer.length;
    });
    if (matchDir) return matchDir;
    return (
      entries.find(e =>
        e.direction === 'across'
          ? e.row === r && c >= e.col && c < e.col + e.answer.length
          : e.col === c && r >= e.row && r < e.row + e.answer.length
      ) ?? null
    );
  }, [selectedCell, direction, entries]);

  const isCellInActiveEntry = (r: number, c: number) => {
    if (!activeEntry) return false;
    if (activeEntry.direction === 'across') {
      return activeEntry.row === r && c >= activeEntry.col && c < activeEntry.col + activeEntry.answer.length;
    }
    return activeEntry.col === c && r >= activeEntry.row && r < activeEntry.row + activeEntry.answer.length;
  };

  const handleCellClick = (r: number, c: number) => {
    if (isSolved || grid[r][c] === null) return;
    sound.playClick();
    if (selectedCell?.r === r && selectedCell?.c === c) {
      setDirection(prev => (prev === 'across' ? 'down' : 'across'));
    } else {
      setSelectedCell({ r, c });
    }
  };

  const handleSelectEntry = (entry: CrosswordEntry) => {
    if (isSolved) return;
    sound.playClick();
    setDirection(entry.direction);
    setSelectedCell({ r: entry.row, c: entry.col });
  };

  const stepCell = useCallback(
    (r: number, c: number, delta: 1 | -1) => {
      const dr = direction === 'down' ? delta : 0;
      const dc = direction === 'across' ? delta : 0;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== null) {
        setSelectedCell({ r: nr, c: nc });
      }
    },
    [direction, rows, cols, grid]
  );

  const handleLetterInput = useCallback(
    (letter: string) => {
      if (isSolved || !selectedCell) return;
      const { r, c } = selectedCell;
      if (grid[r][c] === null) return;

      const upper = letter.toUpperCase();
      sound.playTypewriterKey();
      const next = userGrid.map((row, ri) =>
        row.map((val, ci) => (ri === r && ci === c ? upper : val))
      );
      setUserGrid(next);
      stepCell(r, c, 1);

      if (validateCrossword(config, next)) {
        sound.playMysteryBell();
        onSolve();
      }
    },
    [isSolved, selectedCell, grid, userGrid, stepCell, config, onSolve]
  );

  const handleBackspace = useCallback(() => {
    if (isSolved || !selectedCell) return;
    const { r, c } = selectedCell;
    if (grid[r][c] === null) return;

    sound.playPencil();
    if (userGrid[r][c]) {
      setUserGrid(prev =>
        prev.map((row, ri) => row.map((val, ci) => (ri === r && ci === c ? '' : val)))
      );
    } else {
      stepCell(r, c, -1);
    }
  }, [isSolved, selectedCell, grid, userGrid, stepCell]);

  useEffect(() => {
    if (isSolved) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleBackspace();
      } else if (/^[a-zA-ZñÑ]$/.test(e.key)) {
        e.preventDefault();
        handleLetterInput(e.key);
      } else if (e.key === ' ') {
        e.preventDefault();
        setDirection(prev => (prev === 'across' ? 'down' : 'across'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSolved, selectedCell, handleBackspace, handleLetterInput]);

  const handleReset = () => {
    sound.playPencil();
    setUserGrid(grid.map(row => row.map(cell => (cell === null ? null : ''))));
  };

  const acrossEntries = entries.filter(e => e.direction === 'across');
  const downEntries = entries.filter(e => e.direction === 'down');

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="crossword">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-1.5 border-b border-parchment-300">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-ink-700">
            Crucigrama Forense
          </span>
          <button
            type="button"
            onClick={() => setDirection(prev => (prev === 'across' ? 'down' : 'across'))}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded bg-parchment-200 text-ink-800 border border-parchment-300"
          >
            {direction === 'across' ? (
              <>
                <ArrowRight className="w-3 h-3" /> Horizontal
              </>
            ) : (
              <>
                <ArrowDown className="w-3 h-3" /> Vertical
              </>
            )}
          </button>
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
            title="Limpiar crucigrama"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isManualMode && showHint && (
        <div className="p-2 mb-1.5 text-xs rounded border border-gold-400 bg-gold-100/70 text-ink-800">
          <strong>Pista de Azlynn:</strong> {hints[activeHintIdx]}
        </div>
      )}

      {/* Definición activa */}
      {activeEntry && !isSolved && (
        <div className="mb-1.5 px-2.5 py-1.5 rounded bg-crimson-50 border border-crimson-300 text-xs text-crimson-950 font-serif">
          <strong className="font-mono text-crimson-800">
            {activeEntry.number} {activeEntry.direction === 'across' ? 'H' : 'V'}:
          </strong>{' '}
          {activeEntry.clue} ({activeEntry.answer.length} letras)
        </div>
      )}

      {/* Rejilla del crucigrama */}
      <div className="flex items-center justify-center py-1 overflow-auto">
        <div
          className="grid gap-0.5 p-1 bg-ink-900 rounded shadow-md"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          role="grid"
          aria-label="Crucigrama de Villa Acebo"
        >
          {grid.map((row, r) =>
            row.map((expected, c) => {
              if (expected === null) {
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`${
                      cols > 11 ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-6 h-6 sm:w-7 sm:h-7'
                    } bg-ink-950/90`}
                  />
                );
              }
              const cellNum = cellNumberMap.get(`${r}-${c}`);
              const keyIdx = highlightIndexMap.get(`${r}-${c}`);
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;
              const inEntry = isCellInActiveEntry(r, c);
              const val = displayGrid[r][c] ?? '';

              return (
                <button
                  type="button"
                  key={`${r}-${c}`}
                  data-crossword-cell={`${r}-${c}`}
                  data-key-cell={keyIdx !== undefined ? String(keyIdx) : undefined}
                  onClick={() => handleCellClick(r, c)}
                  className={`${
                    cols > 11 ? 'w-5 h-5 sm:w-6 sm:h-6 text-[10px] sm:text-xs' : 'w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm'
                  } relative flex items-center justify-center font-bold font-mono uppercase transition ${
                    isSelected
                      ? 'bg-crimson-200 text-crimson-950 ring-2 ring-inset ring-crimson-700'
                      : keyIdx !== undefined
                      ? 'bg-gold-200/95 text-ink-950 ring-1 ring-inset ring-gold-600'
                      : inEntry
                      ? 'bg-gold-100 text-ink-950'
                      : 'bg-parchment-50 text-ink-900 hover:bg-parchment-100'
                  }`}
                >
                  {cellNum !== undefined && (
                    <span className="absolute top-0 left-0.5 text-[7px] font-mono text-ink-500 leading-none">
                      {cellNum}
                    </span>
                  )}
                  {keyIdx !== undefined && (
                    <span className="absolute bottom-0 right-0.5 text-[6.5px] font-mono font-black text-crimson-800 leading-none">
                      {keyIdx}
                    </span>
                  )}
                  <span>{val}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Lista de pistas Horizontales y Verticales */}
      <div className="mt-1.5 flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
        <div className="p-2 rounded bg-parchment-200/60 border border-parchment-300">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-crimson-900 mb-1">
            Horizontales
          </div>
          <div className="space-y-1">
            {acrossEntries.map(e => (
              <button
                type="button"
                key={e.id}
                onClick={() => handleSelectEntry(e)}
                className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded transition ${
                  activeEntry?.id === e.id
                    ? 'bg-crimson-100 text-crimson-950 font-semibold'
                    : 'hover:bg-parchment-100 text-ink-800'
                }`}
              >
                <span className="font-mono font-bold text-crimson-800 mr-1">{e.number}.</span>
                {e.clue}
              </button>
            ))}
          </div>
        </div>

        <div className="p-2 rounded bg-parchment-200/60 border border-parchment-300">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-crimson-900 mb-1">
            Verticales
          </div>
          <div className="space-y-1">
            {downEntries.map(e => (
              <button
                type="button"
                key={e.id}
                onClick={() => handleSelectEntry(e)}
                className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded transition ${
                  activeEntry?.id === e.id
                    ? 'bg-crimson-100 text-crimson-950 font-semibold'
                    : 'hover:bg-parchment-100 text-ink-800'
                }`}
              >
                <span className="font-mono font-bold text-crimson-800 mr-1">{e.number}.</span>
                {e.clue}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Teclado táctil compacto para móviles y tabletas */}
      {!isSolved && (
        <div className="mt-1.5 p-1.5 bg-parchment-200/80 rounded-lg border border-parchment-300 shrink-0">
          <div className="flex flex-wrap justify-center gap-0.5 sm:gap-1">
            {CROSSWORD_ALPHABET.map(letter => (
              <button
                type="button"
                key={letter}
                data-crossword-key={letter}
                onClick={() => handleLetterInput(letter)}
                disabled={!selectedCell}
                className="w-6 h-7 sm:w-7 sm:h-7 text-[11px] font-bold font-mono rounded bg-parchment-50 hover:bg-white text-ink-900 border border-parchment-400 hover:border-crimson-600 shadow-sm active:scale-95 disabled:opacity-40 transition"
              >
                {letter}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              disabled={!selectedCell}
              aria-label="Borrar letra"
              title="Borrar letra"
              className="px-2 h-7 flex items-center justify-center rounded bg-parchment-50 hover:bg-white text-crimson-800 border border-parchment-400 shadow-sm active:scale-95 disabled:opacity-40 transition"
            >
              <Delete className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Casillas Clave para descubrir la palabra oculta */}
      {!isManualMode && secretHighlightCells.length > 0 && (
        <div className="mt-1.5 px-2.5 py-1.5 bg-parchment-200/85 border border-gold-500/70 rounded flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-ink-800 inline-flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-crimson-800" />
            <span>Palabra en casillas clave:</span>
          </span>
          <div className="flex items-center gap-1">
            {secretHighlightCells.map((pos, idx) => {
              const ch = displayGrid[pos.r]?.[pos.c] || '';
              return (
                <div
                  key={`${pos.r}-${pos.c}-${idx}`}
                  className="w-6 h-6 rounded-sm bg-gold-200/90 border border-gold-600 flex items-center justify-center font-mono text-xs font-black text-crimson-950 relative shadow-inner"
                  title={`Casilla clave ${idx + 1}`}
                >
                  <span className="absolute top-0 left-0.5 text-[6px] text-ink-600 leading-none">
                    {idx + 1}
                  </span>
                  <span>{ch || '·'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isSolved && !isManualMode && (
        <div className="mt-1.5 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Crucigrama Completado
            {secretWord ? ` • Palabra Clave: ${secretWord}` : ''}
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
