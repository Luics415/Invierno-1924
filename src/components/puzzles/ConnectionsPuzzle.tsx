import React, { useState, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import { RotateCcw, Lightbulb, CheckCircle2, Shuffle, AlertTriangle, Check } from 'lucide-react';
import type { ConnectionsConfig, ConnectionsGroup } from '../../types/game';
import { checkConnectionsSelection, validateConnections } from '../../engine/puzzles/connections';
import { mulberry32, shuffle } from '../../engine/puzzles/prng';

interface ConnectionsProps {
  config: ConnectionsConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
  gameMode?: 'auto' | 'manual';
}

const GROUP_STYLES: Record<1 | 2 | 3 | 4, string> = {
  1: 'bg-amber-100 border-amber-500 text-amber-950',
  2: 'bg-emerald-100 border-emerald-600 text-emerald-950',
  3: 'bg-sky-100 border-sky-600 text-sky-950',
  4: 'bg-crimson-100 border-crimson-700 text-crimson-950',
};

export const ConnectionsPuzzle: React.FC<ConnectionsProps> = ({
  config,
  onSolve,
  isSolved,
  hints,
  gameMode = 'auto',
}) => {
  const isManualMode = gameMode === 'manual';
  const { groups, maxMistakes = 4, secretMeaning } = config;

  const initialTiles = useMemo(() => {
    const flat = groups.flatMap(g => g.items);
    return shuffle(mulberry32(flat.join('|').length * 2654435761), flat);
  }, [groups]);

  const [tiles, setTiles] = useState<string[]>(initialTiles);
  const [selected, setSelected] = useState<string[]>([]);
  const [solvedGroupIds, setSolvedGroupIds] = useState<string[]>([]);
  const [mistakesLeft, setMistakesLeft] = useState<number>(maxMistakes);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const effectiveSolvedIds = isSolved ? groups.map(g => g.id) : solvedGroupIds;

  const solvedGroups: ConnectionsGroup[] = useMemo(
    () =>
      effectiveSolvedIds
        .map(id => groups.find(g => g.id === id))
        .filter((g): g is ConnectionsGroup => Boolean(g)),
    [effectiveSolvedIds, groups]
  );

  const solvedItemSet = useMemo(
    () => new Set(solvedGroups.flatMap(g => g.items)),
    [solvedGroups]
  );

  const remainingTiles = useMemo(
    () => tiles.filter(item => !solvedItemSet.has(item)),
    [tiles, solvedItemSet]
  );

  const handleToggleItem = (item: string) => {
    if (isSolved) return;
    sound.playTileSnap();
    setFeedback(null);
    setSelected(prev => {
      if (prev.includes(item)) return prev.filter(i => i !== item);
      if (prev.length >= 4) return prev;
      return [...prev, item];
    });
  };

  const handleSubmit = () => {
    if (isSolved || selected.length !== 4) return;
    const { matchedGroup, oneAway } = checkConnectionsSelection(config, selected);

    if (matchedGroup && !solvedGroupIds.includes(matchedGroup.id)) {
      sound.playWaxSeal();
      const nextSolved = [...solvedGroupIds, matchedGroup.id];
      setSolvedGroupIds(nextSolved);
      setSelected([]);
      setFeedback(null);

      if (validateConnections(config, nextSolved)) {
        sound.playMysteryBell();
        onSolve();
      }
      return;
    }

    sound.playError();
    const nextMistakes = mistakesLeft - 1;
    if (nextMistakes <= 0) {
      setSolvedGroupIds([]);
      setSelected([]);
      setMistakesLeft(maxMistakes);
      setFeedback('Agotaste los intentos. El tablero de conexiones se ha reiniciado para un nuevo cotejo.');
    } else {
      setMistakesLeft(nextMistakes);
      setFeedback(
        oneAway
          ? 'Muy cerca: te falta exactamente 1 elemento para completar la categoría.'
          : 'Esa combinación no comparte una categoría forense común.'
      );
    }
  };

  const handleShuffle = () => {
    sound.playPencil();
    setTiles(prev => shuffle(mulberry32(Date.now() & 0xffffffff), prev));
  };

  const handleReset = () => {
    sound.playPencil();
    setSolvedGroupIds([]);
    setSelected([]);
    setMistakesLeft(maxMistakes);
    setFeedback(null);
  };

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="connections">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-parchment-300">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-ink-700">
            Conexiones (4×4)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-parchment-200 text-ink-700 border border-parchment-300">
            Intentos restantes: {mistakesLeft}/{maxMistakes}
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
            title="Reiniciar Conexiones"
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

      {feedback && (
        <div
          role="alert"
          className="p-2 mb-2 text-xs rounded border border-crimson-400 bg-crimson-100/80 text-crimson-950 flex items-center gap-1.5"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-crimson-700 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Categorías resueltas */}
      <div className="space-y-1.5 mb-2">
        {solvedGroups.map(group => (
          <div
            key={group.id}
            data-connections-solved={group.id}
            className={`p-2 rounded-lg border-2 text-center shadow-sm ${GROUP_STYLES[group.difficulty]}`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider">{group.category}</div>
            <div className="text-xs font-serif">{group.items.join(' • ')}</div>
          </div>
        ))}
      </div>

      {/* Rejilla de fichas pendientes */}
      {remainingTiles.length > 0 && (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="grid grid-cols-4 gap-1.5 w-full max-w-md">
            {remainingTiles.map(item => {
              const isSelected = selected.includes(item);
              return (
                <button
                  type="button"
                  key={item}
                  data-connections-tile={item}
                  onClick={() => handleToggleItem(item)}
                  className={`h-12 sm:h-14 px-1 rounded-md border-2 text-[11px] sm:text-xs font-bold font-serif text-center leading-tight flex items-center justify-center transition active:scale-95 ${
                    isSelected
                      ? 'bg-ink-900 text-parchment-50 border-gold-500 shadow-md'
                      : 'bg-parchment-50 hover:bg-white text-ink-900 border-parchment-400 hover:border-crimson-600'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Controles */}
      {!isSolved && (
        <div className="mt-2 pt-2 border-t border-parchment-300 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleShuffle}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-parchment-200 hover:bg-parchment-300 text-ink-800 border border-parchment-400 transition"
          >
            <Shuffle className="w-3.5 h-3.5" /> Mezclar
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
            className="px-2.5 py-1.5 text-xs rounded bg-parchment-200 hover:bg-parchment-300 text-ink-800 border border-parchment-400 disabled:opacity-40 transition"
          >
            Deseleccionar ({selected.length}/4)
          </button>
          <button
            type="button"
            data-connections-submit="true"
            onClick={handleSubmit}
            disabled={selected.length !== 4}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded bg-crimson-800 hover:bg-crimson-700 text-white border border-crimson-950 disabled:opacity-40 transition"
          >
            <Check className="w-3.5 h-3.5" /> Comprobar grupo
          </button>
        </div>
      )}

      {isSolved && !isManualMode && (
        <div className="mt-2 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Conexiones Completadas
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
