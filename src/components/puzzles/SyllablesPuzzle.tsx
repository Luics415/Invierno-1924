import React, { useState, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, Check, KeyRound } from 'lucide-react';
import type { SyllablesConfig } from '../../types/game';
import { resolveSolvedSyllableSlots, validateSyllables } from '../../engine/puzzles/syllables';

interface SyllablesProps {
  config: SyllablesConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
}

export const SyllablesPuzzle: React.FC<SyllablesProps> = ({ config, onSolve, isSolved, hints }) => {
  const { words, secretWord, allSyllables, distractorSyllableIds = [] } = config;

  const [wordSlots, setWordSlots] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    words.forEach(w => {
      init[w.id] = [];
    });
    return init;
  });

  const [availableSyllables, setAvailableSyllables] = useState<string[]>(() =>
    allSyllables.map(s => s.id)
  );
  const [activeWordId, setActiveWordId] = useState<string>(words[0]?.id ?? '');
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const solvedSlots = useMemo(() => resolveSolvedSyllableSlots(config), [config]);
  const displaySlots = isSolved ? solvedSlots : wordSlots;
  const displayAvailable = useMemo(() => {
    if (!isSolved) return availableSyllables;
    const used = new Set(Object.values(solvedSlots).flat());
    return allSyllables.filter(s => !used.has(s.id)).map(s => s.id);
  }, [isSolved, availableSyllables, solvedSlots, allSyllables]);

  const handleSyllableClick = (sylId: string) => {
    if (isSolved) return;
    sound.playClick();

    const activeWord = words.find(w => w.id === activeWordId);
    if (!activeWord) return;

    const currentSlots = wordSlots[activeWordId] || [];
    if (currentSlots.length >= activeWord.targetSyllables.length) return;

    const newSlots = [...currentSlots, sylId];
    const newWordSlots = { ...wordSlots, [activeWordId]: newSlots };
    setWordSlots(newWordSlots);
    setAvailableSyllables(prev => prev.filter(id => id !== sylId));

    if (newSlots.length === activeWord.targetSyllables.length) {
      const nextIncomplete = words.find(
        w => (newWordSlots[w.id] || []).length < w.targetSyllables.length
      );
      if (nextIncomplete) {
        setActiveWordId(nextIncomplete.id);
      }
    }

    if (validateSyllables(config, newWordSlots)) {
      sound.playMysteryBell();
      onSolve();
    }
  };

  const handleRemoveSlot = (wordId: string, slotIdx: number) => {
    if (isSolved) return;
    sound.playPencil();

    const current = wordSlots[wordId] || [];
    if (slotIdx >= current.length) return;

    const sylIdToRemove = current[slotIdx];
    const updated = current.filter((_, idx) => idx !== slotIdx);

    setWordSlots(prev => ({ ...prev, [wordId]: updated }));
    setAvailableSyllables(prev => [...prev, sylIdToRemove]);
    setActiveWordId(wordId);
  };

  const handleReset = () => {
    sound.playPencil();
    const init: Record<string, string[]> = {};
    words.forEach(w => {
      init[w.id] = [];
    });
    setWordSlots(init);
    setAvailableSyllables(allSyllables.map(s => s.id));
    setActiveWordId(words[0]?.id ?? '');
  };

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="syllables">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-parchment-300">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-ink-700">
            Palabras Clave Largas
          </span>
          {distractorSyllableIds.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-parchment-200 text-ink-600 border border-parchment-300">
              {distractorSyllableIds.length} distractoras
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
            title="Reiniciar palabras"
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

      {/* Lista de palabras clave */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1">
        {words.map((w, idx) => {
          const currentSlots = displaySlots[w.id] || [];
          const isRowActive = !isSolved && activeWordId === w.id;
          const assembled = currentSlots
            .map(id => allSyllables.find(s => s.id === id)?.text || '')
            .join('');
          const isRowExact = assembled.toUpperCase() === w.targetSyllables.join('').toUpperCase();

          return (
            <div
              key={w.id}
              data-syllables-word={w.id}
              onClick={() => !isSolved && setActiveWordId(w.id)}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isRowExact
                  ? 'border-emerald-600/60 bg-emerald-50/70'
                  : isRowActive
                  ? 'border-crimson-600 bg-parchment-100/90 shadow-sm'
                  : 'border-parchment-300 bg-parchment-200/40 hover:bg-parchment-200/70'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-xs font-serif font-bold text-ink-800 min-w-0">
                  {idx + 1}. {w.definition}
                </span>
                <span className="text-[10px] text-ink-500 font-mono shrink-0 whitespace-nowrap">
                  {w.targetSyllables.length} sílabas
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {w.targetSyllables.map((_, slotIdx) => {
                  const placedSylId = currentSlots[slotIdx];
                  const sylObj = allSyllables.find(s => s.id === placedSylId);
                  const isHighlight = slotIdx === w.highlightIndex;

                  return (
                    <button
                      type="button"
                      key={slotIdx}
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveSlot(w.id, slotIdx);
                      }}
                      className={`min-w-9 h-8 px-1.5 flex items-center justify-center font-bold text-xs rounded border-2 transition-all ${
                        sylObj
                          ? isHighlight
                            ? 'bg-gold-200 border-gold-600 text-gold-950 shadow-sm font-black'
                            : 'bg-parchment-100 border-crimson-700 text-crimson-900'
                          : isHighlight
                          ? 'border-dashed border-gold-500 bg-gold-50/50 text-gold-600'
                          : 'border-dashed border-parchment-400 bg-parchment-300/30 text-transparent'
                      }`}
                    >
                      {sylObj ? sylObj.text : isHighlight ? <KeyRound className="w-3 h-3 text-gold-600" /> : '·'}
                    </button>
                  );
                })}

                {isRowExact && (
                  <Check className="ml-auto w-4 h-4 text-emerald-700" strokeWidth={2.6} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Banco inferior de sílabas */}
      <div className="mt-2 p-2 bg-parchment-200/70 rounded-lg border border-parchment-300">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-ink-600 mb-1.5">
          Banco de Sílabas (sobrarán {distractorSyllableIds.length} distractoras):
        </div>
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
          {displayAvailable.map(sylId => {
            const syl = allSyllables.find(s => s.id === sylId);
            if (!syl) return null;
            return (
              <button
                type="button"
                key={sylId}
                data-syllable-chip={syl.text}
                onClick={() => handleSyllableClick(sylId)}
                disabled={isSolved}
                className="px-2.5 py-1 text-xs font-bold rounded bg-parchment-50 hover:bg-white border border-parchment-400 text-ink-900 shadow-sm active:scale-95 disabled:opacity-40 transition"
              >
                {syl.text}
              </button>
            );
          })}
        </div>
      </div>

      {isSolved && (
        <div className="mt-2 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Palabras Clave Reconstruidas
          </div>
          <p className="font-serif text-sm font-black tracking-widest text-crimson-900">
            {secretWord}
          </p>
        </div>
      )}
    </div>
  );
};
