import React, { useState, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2 } from 'lucide-react';
import type { WordSearchConfig } from '../../types/game';
import { findWordCoordinates } from '../../engine/puzzles/wordsearch';

interface WordSearchProps {
  config: WordSearchConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
}

export const WordSearchPuzzle: React.FC<WordSearchProps> = ({ config, onSolve, isSolved, hints }) => {
  const { grid, words, leftoverMessage } = config;
  const cols = grid[0]?.length ?? 11;

  const [selectedCoords, setSelectedCoords] = useState<{ r: number; c: number }[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startCoord, setStartCoord] = useState<{ r: number; c: number } | null>(null);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [permanentFoundCells, setPermanentFoundCells] = useState<{ r: number; c: number; word: string }[]>([]);
  const [activeHintIdx, setActiveHintIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const solvedHighlightSet = useMemo(() => {
    if (!isSolved) return null;
    const set = new Set<string>();
    for (const item of words) {
      const coords = findWordCoordinates(grid, item.word);
      if (coords) {
        for (const coord of coords) {
          set.add(`${coord.r}-${coord.c}`);
        }
      }
    }
    return set;
  }, [isSolved, words, grid]);

  const effectiveFoundWords = useMemo(
    () => (isSolved ? words.map(w => w.word) : foundWords),
    [isSolved, words, foundWords]
  );

  const getLineCoords = (r1: number, c1: number, r2: number, c2: number) => {
    const dr = r2 - r1;
    const dc = c2 - c1;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (steps === 0) return [{ r: r1, c: c1 }];

    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) {
      return [{ r: r1, c: c1 }];
    }

    const coords: { r: number; c: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      coords.push({ r: r1 + i * stepR, c: c1 + i * stepC });
    }
    return coords;
  };

  const handlePointerDown = (r: number, c: number) => {
    if (isSolved) return;
    sound.playPencil();
    setIsSelecting(true);
    setStartCoord({ r, c });
    setSelectedCoords([{ r, c }]);
  };

  const handlePointerEnter = (r: number, c: number) => {
    if (!isSelecting || !startCoord) return;
    setSelectedCoords(getLineCoords(startCoord.r, startCoord.c, r, c));
  };

  const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSelecting || !startCoord) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const cellEl = el?.closest('[data-ws-cell]') as HTMLElement | null;
    if (!cellEl) return;
    const r = Number(cellEl.dataset.row);
    const c = Number(cellEl.dataset.col);
    if (!Number.isNaN(r) && !Number.isNaN(c)) {
      setSelectedCoords(getLineCoords(startCoord.r, startCoord.c, r, c));
    }
  };

  const handlePointerUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const wordForward = selectedCoords.map(coord => grid[coord.r][coord.c]).join('');
    const wordBackward = [...selectedCoords].reverse().map(coord => grid[coord.r][coord.c]).join('');

    const matchedWordObj = words.find(
      w => (w.word === wordForward || w.word === wordBackward) && !foundWords.includes(w.word)
    );

    if (matchedWordObj) {
      sound.playClick();
      const newFound = [...foundWords, matchedWordObj.word];
      setFoundWords(newFound);
      setPermanentFoundCells(prev => [
        ...prev,
        ...selectedCoords.map(c => ({ ...c, word: matchedWordObj.word })),
      ]);

      if (newFound.length === words.length) {
        sound.playMysteryBell();
        onSolve();
      }
    }
    setSelectedCoords([]);
    setStartCoord(null);
  };

  const isCellSelected = (r: number, c: number) =>
    selectedCoords.some(cell => cell.r === r && cell.c === c);

  const isCellPermanent = (r: number, c: number) => {
    if (solvedHighlightSet) return solvedHighlightSet.has(`${r}-${c}`);
    return permanentFoundCells.some(cell => cell.r === r && cell.c === c);
  };

  const handleReset = () => {
    sound.playPencil();
    setFoundWords([]);
    setPermanentFoundCells([]);
    setSelectedCoords([]);
    setStartCoord(null);
    setIsSelecting(false);
  };

  return (
    <div
      className="flex flex-col h-full min-w-0 select-none"
      onPointerUp={handlePointerUp}
      data-puzzle-type="wordsearch"
    >
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-parchment-300">
        <span className="text-xs tracking-wider uppercase font-semibold text-ink-600">
          Palabras halladas:{' '}
          <strong className="text-crimson-800">
            {effectiveFoundWords.length}/{words.length}
          </strong>
          <span className="ml-2 text-[10px] font-mono text-ink-500">
            ({grid.length}×{cols})
          </span>
        </span>
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
            title="Reiniciar selecciones"
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

      {/* Cuadrícula ampliada 11x11 / 12x12 */}
      <div className="flex-1 flex items-center justify-center py-1 min-h-0 overflow-hidden">
        <div
          onPointerMove={handleGridPointerMove}
          className="grid gap-0.5 p-1.5 sm:p-2 max-w-full bg-parchment-100 border-2 border-parchment-400 rounded-lg shadow-inner touch-none"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          role="grid"
          aria-label="Sopa de letras ampliada"
        >
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const selected = isCellSelected(r, c);
              const permanent = isCellPermanent(r, c);
              const leftover = isSolved && !permanent;

              return (
                <div
                  key={`${r}-${c}`}
                  data-ws-cell="true"
                  data-row={r}
                  data-col={c}
                  onPointerDown={() => handlePointerDown(r, c)}
                  onPointerEnter={() => handlePointerEnter(r, c)}
                  className={`${
                    cols >= 12
                      ? 'w-5 h-5 sm:w-6 sm:h-6 text-[11px] sm:text-xs'
                      : 'w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm'
                  } flex items-center justify-center font-bold rounded cursor-pointer transition-colors ${
                    selected
                      ? 'bg-crimson-700 text-white shadow'
                      : permanent
                      ? 'bg-crimson-200/90 text-crimson-950 font-black border border-crimson-400/60'
                      : leftover
                      ? 'bg-gold-200 text-gold-900 border border-gold-500 font-extrabold'
                      : 'hover:bg-parchment-300/80 text-ink-800'
                  }`}
                >
                  {letter}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Lista de palabras a encontrar */}
      <div className="mt-2 p-2 bg-parchment-200/60 rounded border border-parchment-300">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-600 mb-1.5">
          Términos forenses a localizar ({words.length}):
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
          {words.map(({ word, clue }) => {
            const isFound = effectiveFoundWords.includes(word);
            return (
              <span
                key={word}
                className={`text-[11px] px-1.5 py-0.5 rounded transition-all ${
                  isFound
                    ? 'line-through bg-crimson-100 text-crimson-900 font-semibold'
                    : 'bg-parchment-100 text-ink-800 border border-parchment-300'
                }`}
                title={clue}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      {isSolved && (
        <div className="mt-2 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Sopa de Letras Resuelta
          </div>
          <p className="font-serif text-xs font-semibold italic text-crimson-950">
            «{leftoverMessage}»
          </p>
        </div>
      )}
    </div>
  );
};
