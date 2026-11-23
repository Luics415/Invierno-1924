import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import {
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  Delete,
  FlaskConical,
  Flame,
  Snowflake,
  Sparkles,
  Footprints,
  Sword,
  KeyRound,
  Bell,
  ArrowUp,
} from 'lucide-react';
import type { EcuacionesConfig, EcuacionesSymbol } from '../../types/game';
import { validateEcuaciones } from '../../engine/puzzles/ecuaciones';

interface EcuacionesProps {
  config: EcuacionesConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
  gameMode?: 'auto' | 'manual';
}

export const EcuacionesPuzzle: React.FC<EcuacionesProps> = ({
  config,
  onSolve,
  isSolved,
  hints,
  gameMode = 'auto',
}) => {
  const isManualMode = gameMode === 'manual';
  const { symbols, equations, targetSymbols, targetCode, secretMeaning } = config;

  const [digits, setDigits] = useState<(number | null)[]>([null, null, null, null]);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const symbolMap = useMemo(() => new Map(symbols.map(s => [s.id, s])), [symbols]);
  const displayDigits = isSolved ? targetCode : digits;

  const renderSymbolIcon = (iconName: EcuacionesSymbol['iconName'], sizeClass = 'w-5 h-5') => {
    switch (iconName) {
      case 'venom':
        return <FlaskConical className={`${sizeClass} text-emerald-900`} />;
      case 'candle':
        return <Flame className={`${sizeClass} text-amber-700`} />;
      case 'snowman':
        return <Snowflake className={`${sizeClass} text-sky-900`} />;
      case 'ornament':
        return <Sparkles className={`${sizeClass} text-crimson-800`} />;
      case 'boot':
        return <Footprints className={`${sizeClass} text-ink-800`} />;
      case 'dagger':
        return <Sword className={`${sizeClass} text-crimson-950`} />;
      case 'key':
        return <KeyRound className={`${sizeClass} text-amber-900`} />;
      case 'bell':
        return <Bell className={`${sizeClass} text-gold-700`} />;
    }
  };

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

      if (validateEcuaciones(config, next)) {
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

  const handleReset = () => {
    sound.playPencil();
    setDigits([null, null, null, null]);
    setSelectedSlot(0);
  };

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="ecuaciones">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-parchment-300">
        <span className="text-xs uppercase tracking-wider font-semibold text-ink-700">
          Ecuaciones de Símbolos Forenses
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
            title="Reiniciar Ecuaciones"
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

      {/* Reloj superior con las 4 casillas y los 4 iconos objetivo apuntando hacia arriba */}
      <div className="flex flex-col items-center my-1 shrink-0">
        <div className="px-3.5 py-2 rounded-xl bg-ink-800/20 border-2 border-ink-900 shadow-inner flex items-center gap-2">
          {[0, 1, 2, 3].map(slotIdx => {
            const val = displayDigits[slotIdx];
            const isSelected = !isSolved && selectedSlot === slotIdx;
            const sym = symbolMap.get(targetSymbols[slotIdx]);
            return (
              <React.Fragment key={slotIdx}>
                {slotIdx === 2 && (
                  <div className="flex flex-col gap-1.5 px-0.5 pb-7">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-900" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-900" />
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    data-ecuaciones-slot={slotIdx}
                    onClick={() => {
                      if (!isSolved) {
                        sound.playClick();
                        setSelectedSlot(slotIdx);
                      }
                    }}
                    className={`w-10 h-11 sm:w-11 sm:h-12 rounded-lg border-2 font-mono text-lg sm:text-xl font-black flex items-center justify-center transition shadow-sm ${
                      isSelected
                        ? 'bg-crimson-100 border-crimson-800 text-crimson-950 ring-2 ring-crimson-700/40'
                        : 'bg-parchment-50 border-ink-900 text-ink-950 hover:bg-white'
                    }`}
                  >
                    {val !== null ? val : ''}
                  </button>
                  <ArrowUp className="w-3 h-3 text-ink-800 my-0.5" />
                  <div
                    className="w-8 h-8 rounded-md bg-parchment-100 border border-ink-800 flex items-center justify-center shadow-sm"
                    title={sym?.label}
                  >
                    {sym ? renderSymbolIcon(sym.iconName, 'w-4 h-4') : null}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Lista de las 6 ecuaciones visuales con iconos */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 py-1 pr-1">
        {equations.map((eq, idx) => (
          <div
            key={eq.id}
            className="px-2.5 py-1.5 rounded-lg border border-parchment-400 bg-parchment-100/85 flex items-center justify-between gap-2 shadow-sm"
          >
            <span className="w-5 h-5 rounded-full bg-ink-900 text-parchment-50 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
              {idx + 1}
            </span>

            <div className="flex flex-wrap items-center justify-center gap-1.5 flex-1">
              {eq.terms.map((t, tIdx) => {
                const sym = symbolMap.get(t.symbolId);
                return (
                  <React.Fragment key={tIdx}>
                    {tIdx > 0 && (
                      <span className="font-mono font-black text-sm text-ink-900 px-0.5">
                        {t.op}
                      </span>
                    )}
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-parchment-50 border border-ink-800/60 flex items-center justify-center shadow-inner"
                      title={sym?.label}
                    >
                      {sym ? renderSymbolIcon(sym.iconName, 'w-4 h-4 sm:w-5 sm:h-5') : null}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono font-black text-sm text-ink-900">=</span>
              <div className="min-w-9 h-7 px-2 rounded-md border-2 border-ink-900 bg-parchment-50 font-mono text-xs sm:text-sm font-black text-ink-950 flex items-center justify-center">
                {eq.result}
              </div>
            </div>
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
              data-ecuaciones-num={num}
              onClick={() => handleDigitInput(num)}
              disabled={isSolved}
              className="w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm font-bold font-mono rounded bg-parchment-50 hover:bg-white text-ink-900 border border-parchment-400 hover:border-crimson-700 shadow-sm active:scale-95 disabled:opacity-40 transition"
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
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Ecuaciones Resueltas:{' '}
            {targetCode.join('')}
          </div>
          <p className="font-serif text-xs font-semibold italic text-crimson-950">
            {secretMeaning}
          </p>
        </div>
      )}
    </div>
  );
};
