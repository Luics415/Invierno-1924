import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, Delete, MapPin, Check } from 'lucide-react';
import type { SeptagramaConfig } from '../../types/game';
import { validateSeptagrama } from '../../engine/puzzles/septagrama';

interface SeptagramaProps {
  config: SeptagramaConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
}

export const SeptagramaPuzzle: React.FC<SeptagramaProps> = ({
  config,
  onSolve,
  isSolved,
  hints,
}) => {
  const { centerLetter, outerLetters, words, secretWord, secretMeaning } = config;

  const [userWords, setUserWords] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const w of words) init[w.id] = '';
    return init;
  });
  const [activeWordId, setActiveWordId] = useState<string>(words[0]?.id ?? '');
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const displayWords = useMemo(() => {
    if (!isSolved) return userWords;
    const solved: Record<string, string> = {};
    for (const w of words) solved[w.id] = w.answer;
    return solved;
  }, [isSolved, userWords, words]);

  const allowedSet = useMemo(
    () => new Set([centerLetter.toUpperCase(), ...outerLetters.map(l => l.toUpperCase())]),
    [centerLetter, outerLetters]
  );

  const handleAppendLetter = useCallback(
    (letter: string) => {
      if (isSolved || !activeWordId) return;
      const upper = letter.toUpperCase();
      if (!allowedSet.has(upper)) return;

      const targetWord = words.find(w => w.id === activeWordId);
      if (!targetWord) return;

      const current = userWords[activeWordId] ?? '';
      if (current.length >= targetWord.answer.length) return;

      sound.playTileSnap();
      const updatedStr = current + upper;
      const nextMap = { ...userWords, [activeWordId]: updatedStr };
      setUserWords(nextMap);

      // Si completó la longitud de la palabra activa, saltar a la siguiente incompleta
      if (updatedStr.length === targetWord.answer.length) {
        const nextIncomplete = words.find(
          w => (nextMap[w.id] ?? '').length < w.answer.length
        );
        if (nextIncomplete) {
          setActiveWordId(nextIncomplete.id);
        }
      }

      if (validateSeptagrama(config, nextMap)) {
        sound.playMysteryBell();
        onSolve();
      }
    },
    [isSolved, activeWordId, allowedSet, words, userWords, config, onSolve]
  );

  const handleBackspace = useCallback(() => {
    if (isSolved || !activeWordId) return;
    const current = userWords[activeWordId] ?? '';
    if (current.length === 0) return;
    sound.playPencil();
    setUserWords(prev => ({
      ...prev,
      [activeWordId]: current.slice(0, -1),
    }));
  }, [isSolved, activeWordId, userWords]);

  useEffect(() => {
    if (isSolved) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleBackspace();
      } else if (/^[a-zA-ZñÑ]$/.test(e.key)) {
        const upper = e.key.toUpperCase();
        if (allowedSet.has(upper)) {
          e.preventDefault();
          handleAppendLetter(upper);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSolved, allowedSet, handleAppendLetter, handleBackspace]);

  const handleReset = () => {
    sound.playPencil();
    const init: Record<string, string> = {};
    for (const w of words) init[w.id] = '';
    setUserWords(init);
    setActiveWordId(words[0]?.id ?? '');
  };

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="septagrama">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-parchment-300">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-ink-700">
            Septagrama Forense (7 letras)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-parchment-200 text-ink-700 border border-parchment-300">
            Centro obligatorio: <strong>{centerLetter}</strong>
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
            onClick={handleBackspace}
            disabled={isSolved}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-parchment-200 hover:bg-parchment-300 text-crimson-800 disabled:opacity-40 transition"
            title="Borrar última letra"
          >
            <Delete className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isSolved}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-parchment-200 hover:bg-parchment-300 text-ink-600 disabled:opacity-40 transition"
            title="Reiniciar Septagrama"
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

      {/* Flor / Panal de 7 letras (2 - 3 - 2) como en la imagen de referencia */}
      <div className="flex items-center justify-center gap-2 py-1.5 shrink-0">
        {/* Columna izquierda (2 pétalos) */}
        <div className="flex flex-col gap-1.5">
          {[outerLetters[0], outerLetters[1]].map((letter, idx) => (
            <button
              key={`left-${idx}`}
              type="button"
              onClick={() => handleAppendLetter(letter)}
              disabled={isSolved}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-ink-900 bg-parchment-50 hover:bg-white text-ink-950 font-mono text-sm sm:text-base font-black shadow-sm active:scale-95 transition -rotate-3"
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Columna central (Pétalo superior + LETRA CENTRAL SOMBREADA + Pétalo inferior) */}
        <div className="flex flex-col gap-1.5 items-center">
          <button
            type="button"
            onClick={() => handleAppendLetter(outerLetters[2])}
            disabled={isSolved}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-ink-900 bg-parchment-50 hover:bg-white text-ink-950 font-mono text-sm sm:text-base font-black shadow-sm active:scale-95 transition"
          >
            {outerLetters[2]}
          </button>
          <button
            type="button"
            onClick={() => handleAppendLetter(centerLetter)}
            disabled={isSolved}
            title={`Letra central obligatoria: ${centerLetter}`}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border-2 border-ink-950 bg-ink-800 hover:bg-crimson-900 text-gold-200 font-mono text-base sm:text-lg font-black shadow-md active:scale-95 transition ring-2 ring-gold-400/60"
          >
            {centerLetter}
          </button>
          <button
            type="button"
            onClick={() => handleAppendLetter(outerLetters[3])}
            disabled={isSolved}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-ink-900 bg-parchment-50 hover:bg-white text-ink-950 font-mono text-sm sm:text-base font-black shadow-sm active:scale-95 transition"
          >
            {outerLetters[3]}
          </button>
        </div>

        {/* Columna derecha (2 pétalos) */}
        <div className="flex flex-col gap-1.5">
          {[outerLetters[4], outerLetters[5]].map((letter, idx) => (
            <button
              key={`right-${idx}`}
              type="button"
              onClick={() => handleAppendLetter(letter)}
              disabled={isSolved}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-ink-900 bg-parchment-50 hover:bg-white text-ink-950 font-mono text-sm sm:text-base font-black shadow-sm active:scale-95 transition rotate-3"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Filas numeradas de palabras (1..7) con casilla clave sombreada */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 py-1">
        {words.map(w => {
          const typed = displayWords[w.id] ?? '';
          const isActive = !isSolved && activeWordId === w.id;
          const isWordExact = typed.toUpperCase() === w.answer.toUpperCase();

          return (
            <div
              key={w.id}
              onClick={() => {
                if (!isSolved) {
                  sound.playClick();
                  setActiveWordId(w.id);
                }
              }}
              className={`p-1.5 rounded border transition cursor-pointer ${
                isWordExact
                  ? 'bg-emerald-50/75 border-emerald-600/60'
                  : isActive
                  ? 'bg-parchment-100 border-crimson-700 shadow-sm'
                  : 'bg-parchment-200/45 border-parchment-300 hover:bg-parchment-200/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-ink-900 text-parchment-50 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                    {w.number}
                  </span>
                  <span className="text-[11px] font-serif text-ink-800 truncate">{w.clue}</span>
                </div>
                {isWordExact && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
              </div>

              <div className="flex items-center gap-1 pl-5">
                {Array.from({ length: w.answer.length }).map((_, charIdx) => {
                  const ch = typed[charIdx] ?? '';
                  const isKey = charIdx === w.highlightIndex;
                  return (
                    <div
                      key={charIdx}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-sm border flex items-center justify-center font-mono text-xs font-black uppercase ${
                        isKey
                          ? 'bg-ink-800/20 border-2 border-ink-900 text-crimson-950 shadow-inner'
                          : 'bg-parchment-50 border-parchment-400 text-ink-900'
                      }`}
                    >
                      {ch}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra inferior de casillas sombreadas que revelan la palabra secreta */}
      <div className="mt-1.5 px-2.5 py-1.5 bg-parchment-200/90 border border-ink-800/40 rounded flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider font-bold text-ink-800">
          <span className="w-6 h-6 rounded bg-ink-900 text-parchment-50 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-gold-300" />
          </span>
          <span>Casillas sombreadas:</span>
        </div>
        <div className="flex items-center gap-1">
          {words.map((w, idx) => {
            const typed = displayWords[w.id] ?? '';
            const ch = typed[w.highlightIndex] ?? '';
            return (
              <div
                key={w.id}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-sm bg-ink-800/25 border-2 border-ink-900 flex items-center justify-center font-mono text-xs font-black text-crimson-950"
                title={`Letra clave de palabra ${idx + 1}`}
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
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Septagrama Resuelto: {secretWord}
          </div>
          <p className="font-serif text-xs font-semibold italic text-crimson-950">
            {secretMeaning}
          </p>
        </div>
      )}
    </div>
  );
};
