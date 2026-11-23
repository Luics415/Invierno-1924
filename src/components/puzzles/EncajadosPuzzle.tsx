import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, MapPin } from 'lucide-react';
import type { EncajadosConfig, EncajadosSlot } from '../../types/game';
import { validateEncajados } from '../../engine/puzzles/encajados';

interface EncajadosProps {
  config: EncajadosConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
}

export const EncajadosPuzzle: React.FC<EncajadosProps> = ({
  config,
  onSolve,
  isSolved,
  hints,
}) => {
  const { rows, cols, grid, slots, wordBank, givenCells, keyCells, secretWord, secretMeaning } =
    config;

  const givenMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of givenCells) {
      map.set(`${g.r}-${g.c}`, g.letter);
    }
    return map;
  }, [givenCells]);

  const keyIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    keyCells.forEach((pos, idx) => {
      map.set(`${pos.r}-${pos.c}`, idx + 1);
    });
    return map;
  }, [keyCells]);

  const [userGrid, setUserGrid] = useState<(string | null)[][]>(() =>
    grid.map((row, r) =>
      row.map((cell, c) => (cell === null ? null : givenMap.get(`${r}-${c}`) ?? ''))
    )
  );
  const [activeSlotId, setActiveSlotId] = useState<string>(slots[0]?.id ?? '');
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(() =>
    slots[0] ? { r: slots[0].row, c: slots[0].col } : null
  );
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const displayGrid = isSolved ? grid : userGrid;
  const activeSlot = useMemo(
    () => slots.find(s => s.id === activeSlotId) ?? null,
    [slots, activeSlotId]
  );

  const isCellInSlot = (r: number, c: number, slot: EncajadosSlot | null) => {
    if (!slot) return false;
    if (slot.direction === 'across') {
      return slot.row === r && c >= slot.col && c < slot.col + slot.answer.length;
    }
    return slot.col === c && r >= slot.row && r < slot.row + slot.answer.length;
  };

  // Qué palabras del banco ya están colocadas en algún slot de la cuadrícula
  const placedWordsSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      const dr = s.direction === 'down' ? 1 : 0;
      const dc = s.direction === 'across' ? 1 : 0;
      let built = '';
      for (let i = 0; i < s.answer.length; i++) {
        built += displayGrid[s.row + dr * i]?.[s.col + dc * i] ?? '';
      }
      if (built.length === s.answer.length && wordBank.includes(built)) {
        set.add(built);
      }
    }
    return set;
  }, [slots, displayGrid, wordBank]);

  const handleCellClick = (r: number, c: number) => {
    if (isSolved || grid[r][c] === null) return;
    sound.playClick();
    setSelectedCell({ r, c });
    const matchingSlots = slots.filter(s => isCellInSlot(r, c, s));
    if (matchingSlots.length > 0) {
      const other = matchingSlots.find(s => s.id !== activeSlotId) ?? matchingSlots[0];
      setActiveSlotId(other.id);
    }
  };

  // Encajar una palabra completa del banco en el slot activo (o en el único slot compatible por longitud y letras ya puestas)
  const handleWordPillClick = (word: string) => {
    if (isSolved) return;

    // Buscar si encaja en el slot activo; si no, buscar un slot de la misma longitud compatible
    let targetSlot =
      activeSlot && activeSlot.answer.length === word.length ? activeSlot : null;

    const canFitInSlot = (slot: EncajadosSlot) => {
      if (slot.answer.length !== word.length) return false;
      const dr = slot.direction === 'down' ? 1 : 0;
      const dc = slot.direction === 'across' ? 1 : 0;
      for (let i = 0; i < word.length; i++) {
        const rr = slot.row + dr * i;
        const cc = slot.col + dc * i;
        const fixed = givenMap.get(`${rr}-${cc}`);
        if (fixed && fixed !== word[i]) return false;
      }
      return true;
    };

    if (!targetSlot || !canFitInSlot(targetSlot)) {
      targetSlot =
        slots.find(s => canFitInSlot(s) && s.answer === word) ??
        slots.find(s => canFitInSlot(s)) ??
        null;
    }

    if (!targetSlot) {
      sound.playError();
      return;
    }

    sound.playTileSnap();
    const dr = targetSlot.direction === 'down' ? 1 : 0;
    const dc = targetSlot.direction === 'across' ? 1 : 0;
    const next = userGrid.map(row => [...row]);
    for (let i = 0; i < word.length; i++) {
      next[targetSlot.row + dr * i][targetSlot.col + dc * i] = word[i];
    }
    setUserGrid(next);

    // Avanzar al siguiente slot incompleto
    const nextEmpty = slots.find(s => {
      const sdr = s.direction === 'down' ? 1 : 0;
      const sdc = s.direction === 'across' ? 1 : 0;
      for (let i = 0; i < s.answer.length; i++) {
        if (!next[s.row + sdr * i][s.col + sdc * i]) return true;
      }
      return false;
    });
    if (nextEmpty) {
      setActiveSlotId(nextEmpty.id);
      setSelectedCell({ r: nextEmpty.row, c: nextEmpty.col });
    }

    if (validateEncajados(config, next)) {
      sound.playMysteryBell();
      onSolve();
    }
  };

  const handleLetterInput = useCallback(
    (letter: string) => {
      if (isSolved || !selectedCell) return;
      const { r, c } = selectedCell;
      if (grid[r][c] === null) return;
      if (givenMap.has(`${r}-${c}`)) return;

      sound.playTypewriterKey();
      const upper = letter.toUpperCase();
      const next = userGrid.map((row, ri) =>
        row.map((val, ci) => (ri === r && ci === c ? upper : val))
      );
      setUserGrid(next);

      if (activeSlot) {
        const dr = activeSlot.direction === 'down' ? 1 : 0;
        const dc = activeSlot.direction === 'across' ? 1 : 0;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < rows && nc < cols && grid[nr]?.[nc] !== null) {
          setSelectedCell({ r: nr, c: nc });
        }
      }

      if (validateEncajados(config, next)) {
        sound.playMysteryBell();
        onSolve();
      }
    },
    [isSolved, selectedCell, grid, givenMap, userGrid, activeSlot, rows, cols, config, onSolve]
  );

  const handleBackspace = useCallback(() => {
    if (isSolved || !selectedCell) return;
    const { r, c } = selectedCell;
    if (grid[r][c] === null || givenMap.has(`${r}-${c}`)) return;
    sound.playPencil();
    setUserGrid(prev =>
      prev.map((row, ri) => row.map((val, ci) => (ri === r && ci === c ? '' : val)))
    );
  }, [isSolved, selectedCell, grid, givenMap]);

  useEffect(() => {
    if (isSolved) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleBackspace();
      } else if (/^[a-zA-ZñÑ]$/.test(e.key)) {
        e.preventDefault();
        handleLetterInput(e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSolved, handleBackspace, handleLetterInput]);

  const handleReset = () => {
    sound.playPencil();
    setUserGrid(
      grid.map((row, r) =>
        row.map((cell, c) => (cell === null ? null : givenMap.get(`${r}-${c}`) ?? ''))
      )
    );
  };

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="encajados">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-parchment-300">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-ink-700">
            Encajados ({wordBank.length} palabras)
          </span>
          {activeSlot && !isSolved && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-parchment-200 text-crimson-900 border border-parchment-300">
              Hueco seleccionado: <strong>{activeSlot.answer.length} letras</strong>
            </span>
          )}
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
            title="Reiniciar Encajados"
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

      {/* Rejilla de Encajados (solo las celdas válidas tienen borde, igual que la imagen de referencia) */}
      <div className="flex items-center justify-center py-1 overflow-auto">
        <div
          className="grid gap-0.5 p-1.5 bg-parchment-100/80 border border-parchment-300 rounded-lg"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          role="grid"
          aria-label="Rejilla de Encajados"
        >
          {grid.map((row, r) =>
            row.map((expected, c) => {
              if (expected === null) {
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`${
                      cols > 11 ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-6 h-6 sm:w-7 sm:h-7'
                    } bg-transparent`}
                  />
                );
              }

              const isGiven = givenMap.has(`${r}-${c}`);
              const keyIdx = keyIndexMap.get(`${r}-${c}`);
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;
              const inSlot = isCellInSlot(r, c, activeSlot);
              const val = displayGrid[r][c] ?? '';

              return (
                <button
                  type="button"
                  key={`${r}-${c}`}
                  data-encajados-cell={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`${
                    cols > 11
                      ? 'w-5 h-5 sm:w-6 sm:h-6 text-[10px] sm:text-xs'
                      : 'w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm'
                  } relative flex items-center justify-center font-mono font-black uppercase border border-ink-900 transition ${
                    isSelected
                      ? 'bg-crimson-200 text-crimson-950 ring-2 ring-inset ring-crimson-700'
                      : keyIdx !== undefined
                      ? 'bg-ink-800/25 text-ink-950'
                      : isGiven
                      ? 'bg-parchment-200 text-ink-950'
                      : inSlot
                      ? 'bg-gold-100 text-ink-950'
                      : 'bg-parchment-50 text-ink-900 hover:bg-white'
                  }`}
                >
                  {keyIdx !== undefined && (
                    <span className="absolute bottom-0 right-0.5 text-[6px] font-mono text-crimson-900 leading-none">
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

      {/* Banco de palabras en cápsulas (toca cualquier cápsula para encajarla en el hueco seleccionado) */}
      <div className="mt-1.5 p-2 rounded-lg bg-parchment-200/70 border border-parchment-300">
        <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-ink-600 mb-1">
          Toca una palabra para encajarla en la cuadrícula:
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-24 overflow-y-auto">
          {wordBank.map(word => {
            const isPlaced = placedWordsSet.has(word);
            const matchesActiveLen = activeSlot?.answer.length === word.length;
            return (
              <button
                key={word}
                type="button"
                data-encajados-word={word}
                onClick={() => handleWordPillClick(word)}
                disabled={isSolved}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border transition active:scale-95 ${
                  isPlaced
                    ? 'bg-parchment-300 text-ink-500 border-parchment-400 line-through opacity-60'
                    : matchesActiveLen
                    ? 'bg-gold-100 hover:bg-gold-200 text-ink-950 border-crimson-800 shadow-sm'
                    : 'bg-parchment-50 hover:bg-white text-ink-900 border-ink-800/70'
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* Casillas sombreadas inferiores que descubren la palabra oculta */}
      <div className="mt-1.5 px-2.5 py-1.5 bg-parchment-200/90 border border-ink-800/40 rounded flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider font-bold text-ink-800">
          <span className="w-6 h-6 rounded bg-ink-900 text-parchment-50 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-gold-300" />
          </span>
          <span>Casillas sombreadas:</span>
        </div>
        <div className="flex items-center gap-1">
          {keyCells.map((pos, idx) => {
            const ch = displayGrid[pos.r]?.[pos.c] || '';
            return (
              <div
                key={`${pos.r}-${pos.c}-${idx}`}
                className="w-6 h-6 rounded-sm bg-ink-800/25 border-2 border-ink-900 flex items-center justify-center font-mono text-xs font-black text-crimson-950"
                title={`Casilla sombreada ${idx + 1}`}
              >
                {ch || '·'}
              </div>
            );
          })}
        </div>
      </div>

      {isSolved && (
        <div className="mt-1.5 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Encajados Completado: {secretWord}
          </div>
          <p className="font-serif text-xs font-semibold italic text-crimson-950">
            {secretMeaning}
          </p>
        </div>
      )}
    </div>
  );
};
