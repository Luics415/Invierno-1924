import React, { useState, useMemo } from 'react';
import { sound } from '../../utils/soundEffects';
import {
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  MapPin,
  User,
  Check,
  X,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import type { MatrixCellState, MurdokuConfig } from '../../types/game';
import { isMurdokuMoveMistake, validateMurdoku } from '../../engine/puzzles/murdoku';

interface MurdokuProps {
  config: MurdokuConfig;
  onSolve: () => void;
  isSolved: boolean;
  hints: string[];
}

export const MurdokuPuzzle: React.FC<MurdokuProps> = ({ config, onSolve, isSolved, hints }) => {
  const { groupA, groupB, clues, targetMatches } = config;
  const strictReset = config.resetOnMistake ?? true;

  const [cells, setCells] = useState<Record<string, MatrixCellState>>({});
  const [checkedClues, setCheckedClues] = useState<number[]>([]);
  const [markTool, setMarkTool] = useState<'check' | 'cross' | 'question'>('cross');
  const [mistakeCount, setMistakeCount] = useState(0);
  const [mistakeAlert, setMistakeAlert] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);

  const displayCells = useMemo(() => {
    if (!isSolved) return cells;
    const solvedCells: Record<string, MatrixCellState> = {};
    for (const a of groupA.items) {
      for (const b of groupB.items) {
        const isTarget = targetMatches.some(m => m.aId === a.id && m.bId === b.id);
        solvedCells[`${a.id}:${b.id}`] = isTarget ? 'check' : 'cross';
      }
    }
    return solvedCells;
  }, [isSolved, cells, groupA.items, groupB.items, targetMatches]);

  const handleCellClick = (aId: string, bId: string) => {
    if (isSolved) return;

    const key = `${aId}:${bId}`;
    const current = cells[key] || 'neutral';
    const next: MatrixCellState = current === markTool ? 'neutral' : markTool;

    if (strictReset && isMurdokuMoveMistake(config, aId, bId, next)) {
      sound.playError();
      setCells({});
      setMistakeCount(prev => prev + 1);
      setMistakeAlert(
        'Deducción errónea: una marca incorrecta invalida la matriz. El tablero se ha reiniciado por completo.'
      );
      return;
    }

    sound.playPencil();
    setMistakeAlert(null);
    const updated: Record<string, MatrixCellState> = { ...cells, [key]: next };

    // Auto-descartar fila y columna cuando se confirma una pareja correcta
    if (next === 'check') {
      for (const otherB of groupB.items) {
        if (otherB.id !== bId) updated[`${aId}:${otherB.id}`] = 'cross';
      }
      for (const otherA of groupA.items) {
        if (otherA.id !== aId) updated[`${otherA.id}:${bId}`] = 'cross';
      }
    }

    setCells(updated);

    if (validateMurdoku(config, updated)) {
      sound.playMysteryBell();
      onSolve();
    }
  };

  const handleToggleClue = (idx: number) => {
    sound.playClick();
    setCheckedClues(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleReset = () => {
    sound.playPencil();
    setCells({});
    setCheckedClues([]);
    setMistakeAlert(null);
  };

  return (
    <div className="flex flex-col h-full min-w-0 select-none" data-puzzle-type="murdoku">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-1.5 border-b border-parchment-300">
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wider font-semibold text-ink-700">
            Murdoku {groupA.items.length}×{groupB.items.length}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-crimson-100 text-crimson-800 border border-crimson-300">
            Reinicio al fallar
          </span>
          {mistakeCount > 0 && (
            <span
              data-murdoku-mistakes={mistakeCount}
              className="text-[10px] font-mono text-crimson-700"
            >
              Reinicios: {mistakeCount}
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
            title="Limpiar matriz"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selector explícito de herramienta de marcado (evita errores accidentales al ciclar) */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center bg-parchment-200 rounded p-0.5 border border-parchment-300 gap-0.5">
          <button
            type="button"
            data-murdoku-tool="cross"
            onClick={() => {
              sound.playClick();
              setMarkTool('cross');
            }}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-semibold transition ${
              markTool === 'cross'
                ? 'bg-crimson-800 text-white shadow'
                : 'text-ink-700 hover:text-ink-950'
            }`}
          >
            <X className="w-3 h-3" /> Descartar
          </button>
          <button
            type="button"
            data-murdoku-tool="check"
            onClick={() => {
              sound.playClick();
              setMarkTool('check');
            }}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-semibold transition ${
              markTool === 'check'
                ? 'bg-emerald-700 text-white shadow'
                : 'text-ink-700 hover:text-ink-950'
            }`}
          >
            <Check className="w-3 h-3" /> Confirmar
          </button>
          <button
            type="button"
            data-murdoku-tool="question"
            onClick={() => {
              sound.playClick();
              setMarkTool('question');
            }}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-semibold transition ${
              markTool === 'question'
                ? 'bg-gold-600 text-white shadow'
                : 'text-ink-700 hover:text-ink-950'
            }`}
          >
            <HelpCircle className="w-3 h-3" /> Duda
          </button>
        </div>
        <span className="text-[10px] text-ink-500">
          Elige herramienta antes de marcar
        </span>
      </div>

      {showHint && (
        <div className="p-2 mb-2 text-xs rounded border border-gold-400 bg-gold-100/70 text-ink-800">
          <strong>Pista de Azlynn:</strong> {hints[activeHintIdx]}
        </div>
      )}

      {/* Premisas lógicas */}
      <div className="mb-2 p-2 bg-parchment-200/70 rounded-lg border border-parchment-300">
        <div className="text-[10px] font-semibold text-ink-600 uppercase tracking-wider mb-1">
          Premisas verificadas ({clues.length} — toca para tachar):
        </div>
        <div className="space-y-1 max-h-24 sm:max-h-28 overflow-y-auto pr-1">
          {clues.map((clue, idx) => {
            const isChecked = isSolved || checkedClues.includes(idx);
            return (
              <div
                key={idx}
                onClick={() => handleToggleClue(idx)}
                className={`text-[11px] p-1 rounded cursor-pointer transition flex items-start gap-1.5 ${
                  isChecked
                    ? 'line-through text-ink-400 bg-parchment-100/50'
                    : 'text-ink-900 bg-parchment-50 hover:bg-parchment-100 border border-parchment-300'
                }`}
              >
                <span className="font-bold text-crimson-800 font-mono shrink-0">{idx + 1}.</span>
                <span>{clue}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cuadrícula Murdoku 4x4 o 5x5 */}
      <div className="flex-1 w-full min-w-0 overflow-x-auto py-1 flex items-center justify-start sm:justify-center">
        <div className="inline-block mx-auto border-2 border-ink-900 bg-parchment-50 rounded shadow-sm">
          <div className="flex border-b-2 border-ink-900">
            <div className="w-24 sm:w-28 shrink-0 p-1 bg-parchment-300/60 font-serif font-bold text-[10px] text-center leading-tight flex items-center justify-center text-ink-800 border-r-2 border-ink-900">
              {groupA.title} / {groupB.title}
            </div>
            {groupB.items.map(b => (
              <div
                key={b.id}
                className="w-12 sm:w-16 p-1 flex flex-col items-center justify-center text-center border-r border-parchment-300 last:border-r-0 bg-parchment-200/60 shrink-0 gap-0.5"
                title={b.name}
              >
                <MapPin className="w-3 h-3 text-crimson-800 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-semibold text-ink-800 leading-tight break-words w-full">
                  {b.name}
                </span>
              </div>
            ))}
          </div>

          {groupA.items.map((a, aIdx) => (
            <div
              key={a.id}
              className={`flex ${
                aIdx < groupA.items.length - 1 ? 'border-b border-parchment-300' : ''
              }`}
            >
              <div className="w-24 sm:w-28 shrink-0 p-1 flex items-center gap-1 border-r-2 border-ink-900 bg-parchment-100 font-serif text-[10px] sm:text-[11px] font-bold text-ink-900">
                <User className="w-3 h-3 text-ink-700 shrink-0" />
                <span className="leading-tight truncate">{a.name}</span>
              </div>

              {groupB.items.map(b => {
                const state = displayCells[`${a.id}:${b.id}`] || 'neutral';
                return (
                  <button
                    type="button"
                    key={b.id}
                    data-murdoku-cell={`${a.id}:${b.id}`}
                    data-state={state}
                    data-cell-state={state}
                    onClick={() => handleCellClick(a.id, b.id)}
                    className={`w-12 h-8 sm:w-16 sm:h-9 shrink-0 flex items-center justify-center cursor-pointer border-r border-parchment-300 last:border-r-0 transition select-none ${
                      state === 'check'
                        ? 'bg-emerald-100 text-emerald-800 font-black'
                        : state === 'cross'
                        ? 'bg-crimson-100/75 text-crimson-800 font-bold'
                        : state === 'question'
                        ? 'bg-gold-100 text-gold-800 font-bold text-xs'
                        : 'hover:bg-parchment-200/70 text-transparent'
                    }`}
                    aria-label={`${a.name} con ${b.name}`}
                  >
                    {state === 'check' ? (
                      <Check className="w-4 h-4 text-emerald-800" strokeWidth={2.8} />
                    ) : state === 'cross' ? (
                      <X className="w-3.5 h-3.5 text-crimson-800" strokeWidth={2.5} />
                    ) : state === 'question' ? (
                      '?'
                    ) : (
                      '·'
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {mistakeAlert && (
        <div
          role="alert"
          data-murdoku-reset-alert="true"
          className="mt-2 p-2 text-xs rounded border border-crimson-500 bg-crimson-100/90 text-crimson-950 flex items-start gap-1.5 shrink-0"
        >
          <AlertTriangle className="w-4 h-4 text-crimson-700 shrink-0 mt-0.5" />
          <span>{mistakeAlert}</span>
        </div>
      )}

      {isSolved && (
        <div className="mt-2 p-2 bg-gold-100 border-2 border-gold-500 rounded text-center animate-wax-pop">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold-800 uppercase tracking-widest mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-gold-700" /> Deducción Murdoku Verificada
          </div>
          <p className="font-serif text-xs font-semibold italic text-crimson-950">
            Todas las relaciones lógicas han quedado demostradas sin margen de error.
          </p>
        </div>
      )}
    </div>
  );
};
