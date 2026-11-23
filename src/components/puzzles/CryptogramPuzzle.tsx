import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, Delete, Lock, AlertTriangle } from 'lucide-react';
import type { CryptogramConfig } from '../../types/game';
import { validateCryptogram } from '../../engine/puzzles/cryptogram';

interface CryptogramProps {
  config: CryptogramConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
  gameMode?: 'auto' | 'manual';
}

const ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

export const CryptogramPuzzle: React.FC<CryptogramProps> = ({
  config,
  onSolve,
  isSolved,
  hints,
  gameMode = 'auto',
}) => {
  const isManualMode = gameMode === 'manual';
  const { cipherText, cipherMap, initialRevealed = [] } = config;

  const initialLockedNums = useMemo(() => {
    const locked = new Set<number>();
    for (const letter of initialRevealed) {
      const num = cipherMap[letter];
      if (num !== undefined) locked.add(num);
    }
    return locked;
  }, [initialRevealed, cipherMap]);

  const [userMapping, setUserMapping] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const letter of initialRevealed) {
      const num = cipherMap[letter];
      if (num !== undefined) {
        init[num] = letter;
      }
    }
    return init;
  });

  const [selectedNum, setSelectedNum] = useState<number | null>(null);
  const [bijectionError, setBijectionError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const displayMapping = useMemo(() => {
    if (!isSolved) return userMapping;
    const solvedMap: Record<number, string> = {};
    for (const [letter, num] of Object.entries(cipherMap)) {
      solvedMap[num] = letter;
    }
    return solvedMap;
  }, [isSolved, userMapping, cipherMap]);

  const handleSelectNumber = (num: number) => {
    if (isSolved || initialLockedNums.has(num)) return;
    sound.playClick();
    setBijectionError(null);
    setSelectedNum(num);
  };

  const handleKeyInput = useCallback(
    (letter: string) => {
      if (isSolved || selectedNum === null || initialLockedNums.has(selectedNum)) return;
      const upper = letter.toUpperCase();

      // Estricta biyección 1 a 1: prohibir asignar una letra ya usada por otro número
      const conflictingEntry = Object.entries(userMapping).find(
        ([numKey, val]) => Number(numKey) !== selectedNum && val.toUpperCase() === upper
      );
      if (conflictingEntry) {
        sound.playError();
        setBijectionError(
          `La letra «${upper}» ya está asignada al código [${conflictingEntry[0]}]. Cada letra tiene un único número.`
        );
        return;
      }

      sound.playTypewriterKey();
      setBijectionError(null);
      const updated = { ...userMapping, [selectedNum]: upper };
      setUserMapping(updated);

      if (validateCryptogram(config, updated)) {
        sound.playMysteryBell();
        onSolve();
      }
    },
    [isSolved, selectedNum, initialLockedNums, userMapping, config, onSolve]
  );

  const handleClearSelected = useCallback(() => {
    if (isSolved || selectedNum === null || initialLockedNums.has(selectedNum)) return;
    sound.playPencil();
    setBijectionError(null);
    const updated = { ...userMapping };
    delete updated[selectedNum];
    setUserMapping(updated);
  }, [isSolved, selectedNum, initialLockedNums, userMapping]);

  useEffect(() => {
    if (isSolved) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedNum === null) return;
      const key = e.key.toUpperCase();
      if (ALPHABET.includes(key)) {
        e.preventDefault();
        handleKeyInput(key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleClearSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSolved, selectedNum, handleKeyInput, handleClearSelected]);

  const handleReset = () => {
    sound.playPencil();
    const init: Record<number, string> = {};
    for (const letter of initialRevealed) {
      const num = cipherMap[letter];
      if (num !== undefined) init[num] = letter;
    }
    setUserMapping(init);
    setSelectedNum(null);
    setBijectionError(null);
  };

  const words = cipherText.split(' ');
  const assignedLetterToNum = useMemo(() => {
    const map = new Map<string, number>();
    for (const [k, v] of Object.entries(displayMapping)) {
      if (v) map.set(v.toUpperCase(), Number(k));
    }
    return map;
  }, [displayMapping]);

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="cryptogram">
      {/* Barra superior (sin botón trampa de revelar letras ilimitadas) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-1.5 border-b border-parchment-300">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-ink-700">
            Criptografía Estricta (1 a 1)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-parchment-200 text-ink-600 border border-parchment-300 inline-flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Sin ayudas automáticas
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
            title="Reiniciar criptograma"
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

      {/* Texto cifrado */}
      <div className="flex-1 max-h-[185px] sm:max-h-[280px] lg:max-h-none overflow-y-auto p-2 sm:p-3 bg-parchment-100/80 border-2 border-parchment-400 rounded-lg shadow-inner font-serif min-w-0">
        <div className="flex flex-wrap gap-x-2.5 sm:gap-x-3 gap-y-1.5 sm:gap-y-2.5">
          {words.map((word, wIdx) => (
            <div key={wIdx} className="flex flex-wrap items-end gap-x-0.5 gap-y-0.5 max-w-full">
              {word.split('').map((char, cIdx) => {
                const upper = char.toUpperCase();
                const num = cipherMap[upper];

                if (!/[A-ZÑ]/.test(upper) || num === undefined) {
                  return (
                    <span key={cIdx} className="text-sm sm:text-base font-bold text-ink-700 pb-0.5 sm:pb-1">
                      {char}
                    </span>
                  );
                }

                const mappedLetter = displayMapping[num] || '';
                const isSelected = selectedNum === num;
                const isLocked = initialLockedNums.has(num);

                return (
                  <button
                    type="button"
                    key={cIdx}
                    data-cipher-code={num}
                    data-cipher-num={num}
                    data-letter={mappedLetter}
                    onClick={() => handleSelectNumber(num)}
                    className={`flex flex-col items-center transition-all ${
                      isLocked ? 'cursor-default' : 'cursor-pointer'
                    } ${isSelected ? 'scale-105' : ''}`}
                  >
                    <div
                      className={`w-4 h-5 sm:w-6 sm:h-7 flex items-center justify-center font-bold text-[11px] sm:text-sm border-b-2 transition ${
                        isLocked
                          ? 'border-gold-700 bg-gold-100/80 text-ink-950 font-black'
                          : isSelected
                          ? 'border-crimson-700 bg-crimson-100/90 text-crimson-950 font-black'
                          : mappedLetter
                          ? 'border-ink-800 text-ink-900'
                          : 'border-parchment-400 text-transparent'
                      }`}
                    >
                      {mappedLetter || '·'}
                    </div>
                    <span
                      className={`text-[8px] sm:text-[9px] font-mono leading-tight mt-0.5 ${
                        isSelected ? 'text-crimson-700 font-bold' : 'text-ink-500'
                      }`}
                    >
                      {num}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Teclado de sustitución biyectiva */}
      <div className="mt-1.5 sm:mt-2 p-1.5 sm:p-2 bg-parchment-200/80 rounded-lg border border-parchment-300 shrink-0">
        <div className="flex items-center justify-between gap-1 mb-1 h-6">
          <span className="text-[10px] font-semibold text-ink-600 uppercase tracking-wider truncate">
            {selectedNum !== null
              ? `Código [${selectedNum}] — elige letra única:`
              : 'Selecciona un código arriba:'}
          </span>
          <button
            type="button"
            onClick={handleClearSelected}
            disabled={selectedNum === null}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 text-crimson-800 hover:bg-crimson-100 rounded shrink-0 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Delete className="w-3 h-3" /> Borrar
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-0.5 sm:gap-1">
          {ALPHABET.map(letter => {
            const ownerNum = assignedLetterToNum.get(letter);
            const usedByOther = ownerNum !== undefined && ownerNum !== selectedNum;

            return (
              <button
                type="button"
                key={letter}
                data-cipher-key={letter}
                onClick={() => handleKeyInput(letter)}
                disabled={isSolved || usedByOther}
                title={usedByOther ? `Ya asignada al código ${ownerNum}` : `Asignar ${letter}`}
                className={`w-6 h-6 sm:w-7 sm:h-8 text-[11px] sm:text-xs font-bold rounded border shadow-sm transition active:scale-95 ${
                  usedByOther
                    ? 'bg-parchment-300/70 text-ink-400 border-parchment-400 line-through cursor-not-allowed opacity-50'
                    : ownerNum === selectedNum && selectedNum !== null
                    ? 'bg-crimson-800 text-white border-crimson-900'
                    : 'bg-parchment-50 hover:bg-white text-ink-900 border-parchment-400 hover:border-crimson-600 disabled:opacity-40'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {bijectionError && (
        <div
          role="alert"
          data-cryptogram-bijection-error="true"
          className="mt-1.5 p-2 text-xs rounded border border-crimson-500 bg-crimson-100/90 text-crimson-950 flex items-center gap-1.5 shrink-0"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-crimson-700 shrink-0" />
          <span>{bijectionError}</span>
        </div>
      )}

      {isSolved && !isManualMode && (
        <div className="mt-2 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Mensaje Cifrado Revelado
          </div>
          <p className="font-serif text-xs font-semibold italic text-crimson-950 break-words">
            «{cipherText}»
          </p>
        </div>
      )}
    </div>
  );
};
