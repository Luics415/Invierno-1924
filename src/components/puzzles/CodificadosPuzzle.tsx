import React, { useState, useEffect, useCallback } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, Delete } from 'lucide-react';
import type { CodificadosConfig } from '../../types/game';
import { validateCodificados } from '../../engine/puzzles/codificados';

interface CodificadosProps {
  config: CodificadosConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
  gameMode?: 'auto' | 'manual';
}

export const CodificadosPuzzle: React.FC<CodificadosProps> = ({
  config,
  onSolve,
  isSolved,
  hints,
  gameMode = 'auto',
}) => {
  const isManualMode = gameMode === 'manual';
  const { secretCode, clues, secretMeaning } = config;

  const [digits, setDigits] = useState<(number | null)[]>([null, null, null, null]);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [eliminatedDigits, setEliminatedDigits] = useState<Set<number>>(() => new Set());
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const displayDigits = isSolved ? secretCode : digits;

  const handleDigitInput = useCallback(
    (num: number) => {
      if (isSolved) return;
      sound.playNibClick();
      const next = [...digits];
      next[selectedSlot] = num;
      setDigits(next);

      if (selectedSlot < 3) {
        setSelectedSlot(selectedSlot + 1);
      }

      if (validateCodificados(config, next)) {
        sound.playMysteryBell();
        onSolve();
      }
    },
    [isSolved, digits, selectedSlot, config, onSolve]
  );

  const handleErase = useCallback(() => {
    if (isSolved) return;
    sound.playPencil();
    const next = [...digits];
    if (next[selectedSlot] !== null) {
      next[selectedSlot] = null;
      setDigits(next);
    } else if (selectedSlot > 0) {
      next[selectedSlot - 1] = null;
      setDigits(next);
      setSelectedSlot(selectedSlot - 1);
    }
  }, [isSolved, digits, selectedSlot]);

  useEffect(() => {
    if (isSolved) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitInput(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleErase();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedSlot(s => (s + 3) % 4);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedSlot(s => (s + 1) % 4);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSolved, handleDigitInput, handleErase]);

  const toggleScratchDigit = (d: number) => {
    if (isSolved) return;
    sound.playPencil();
    setEliminatedDigits(prev => {
      const copy = new Set(prev);
      if (copy.has(d)) copy.delete(d);
      else copy.add(d);
      return copy;
    });
  };

  const handleReset = () => {
    sound.playPencil();
    setDigits([null, null, null, null]);
    setEliminatedDigits(new Set());
    setSelectedSlot(0);
  };

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="codificados">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 mb-2 border-b border-parchment-300">
        <span className="text-xs uppercase tracking-wider font-semibold text-ink-700">
          Codificados (Deducción de 4 Cifras)
        </span>
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
            title="Reiniciar código"
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

      {/* Reloj / Marcador de 4 cifras superior estilo imagen "CODIFICADOS" */}
      <div className="flex flex-col items-center my-1 shrink-0">
        <div className="flex items-center gap-3 mb-0.5">
          <div className="w-6 h-1.5 rounded-t bg-ink-800" />
          <div className="w-8 h-1.5 rounded-t bg-ink-800" />
          <div className="w-6 h-1.5 rounded-t bg-ink-800" />
        </div>
        <div className="px-4 py-2.5 rounded-xl bg-ink-800/20 border-2 border-ink-900 shadow-inner flex items-center gap-2">
          {[0, 1, 2, 3].map(slotIdx => {
            const val = displayDigits[slotIdx];
            const isSelected = !isSolved && selectedSlot === slotIdx;
            return (
              <React.Fragment key={slotIdx}>
                {slotIdx === 2 && (
                  <div className="flex flex-col gap-1.5 px-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-900" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-900" />
                  </div>
                )}
                <button
                  type="button"
                  data-codificados-slot={slotIdx}
                  onClick={() => {
                    if (!isSolved) {
                      sound.playClick();
                      setSelectedSlot(slotIdx);
                    }
                  }}
                  className={`w-11 h-12 sm:w-12 sm:h-14 rounded-lg border-2 font-mono text-xl sm:text-2xl font-black flex items-center justify-center transition shadow-sm ${
                    isSelected
                      ? 'bg-crimson-100 border-crimson-800 text-crimson-950 ring-2 ring-crimson-700/40'
                      : 'bg-parchment-50 border-ink-900 text-ink-950 hover:bg-white'
                  }`}
                >
                  {val !== null ? val : ''}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Las 5 Tarjetas de Pistas Lógicas (toca cualquier cifra en las pistas para tacharla como nota) */}
      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 py-1 pr-0.5">
        {clues.map((clue, idx) => (
          <div
            key={clue.id}
            className={`p-2 rounded-lg border-2 border-ink-900/75 bg-parchment-50/90 shadow-sm flex flex-col justify-between ${
              idx === clues.length - 1 && clues.length % 2 === 1 ? 'sm:col-span-2 sm:max-w-[70%] sm:mx-auto w-full' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-ink-900">
                PISTA {idx + 1}
              </span>
              <span className="text-[9px] font-mono text-ink-500">Toca cifra para tachar</span>
            </div>

            <div className="flex items-center justify-center gap-1.5 my-1">
              {clue.attempt.map((d, dIdx) => {
                const isScratched = eliminatedDigits.has(d);
                return (
                  <button
                    key={dIdx}
                    type="button"
                    onClick={() => toggleScratchDigit(d)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded border border-ink-900 font-mono text-xs sm:text-sm font-black flex items-center justify-center transition ${
                      isScratched
                        ? 'bg-crimson-100/80 text-crimson-800 line-through opacity-60'
                        : 'bg-parchment-200/85 text-ink-950 hover:bg-parchment-300'
                    }`}
                    title={`Tachar/destachar cifra ${d}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] font-reading text-ink-900 leading-tight text-center mt-0.5">
              {clue.text}
            </p>
          </div>
        ))}
      </div>

      {/* Teclado numérico 0–9 */}
      <div className="mt-1.5 p-1.5 bg-parchment-200/80 rounded-lg border border-parchment-300 shrink-0">
        <div className="flex flex-wrap justify-center items-center gap-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              type="button"
              key={num}
              data-codificados-num={num}
              onClick={() => handleDigitInput(num)}
              disabled={isSolved}
              className={`w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm font-bold font-mono rounded border shadow-sm active:scale-95 disabled:opacity-40 transition ${
                eliminatedDigits.has(num)
                  ? 'bg-parchment-200 text-ink-400 border-parchment-400 line-through'
                  : 'bg-parchment-50 hover:bg-white text-ink-900 border-parchment-400 hover:border-crimson-700'
              }`}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleErase}
            disabled={isSolved}
            className="px-2 h-7 sm:h-8 flex items-center justify-center rounded bg-parchment-50 hover:bg-white text-crimson-800 border border-parchment-400 shadow-sm active:scale-95 disabled:opacity-40 transition"
            title="Borrar cifra"
          >
            <Delete className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isSolved && !isManualMode && (
        <div className="mt-1.5 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Código Descifrado:{' '}
            {secretCode.join('')}
          </div>
          <p className="font-serif text-xs font-semibold italic text-crimson-950">
            {secretMeaning}
          </p>
        </div>
      )}
    </div>
  );
};
