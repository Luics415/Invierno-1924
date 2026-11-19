import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../utils/soundEffects';
import {
  BookOpen,
  CheckCircle,
  Lock,
  Sparkles,
  Filter,
  Clock,
  Award,
  Users,
  X,
  Check,
} from 'lucide-react';
import type { PuzzleType } from '../types/game';

interface AdventCalendarProps {
  onClose: () => void;
}

const ACT_METADATA: Record<number, { title: string; range: string }> = {
  1: { title: 'Acto I: El Encierro de Invierno', range: 'Días 1–6' },
  2: { title: 'Acto II: Peritaje y Coartadas', range: 'Días 7–12' },
  3: { title: 'Acto III: Secretos de Sangre y Deuda', range: 'Días 13–18' },
  4: { title: 'Acto IV: El Cerco se Estrecha', range: 'Días 19–24' },
  5: { title: 'Acto V: La Verdad de las 30 Jornadas', range: 'Días 25–30' },
};

const PUZZLE_TYPE_LABELS: Record<PuzzleType, string> = {
  sudoku: 'Sudoku 9×9',
  wordsearch: 'Sopa de Letras',
  murdoku: 'Murdoku',
  syllables: 'Palabras Clave',
  cryptogram: 'Criptografía',
  crossword: 'Crucigrama',
  futoshiki: 'Futoshiki',
  connections: 'Connections',
  nonogram: 'Nonograma',
  minesweeper: 'Buscaminas',
};

export const AdventCalendar: React.FC<AdventCalendarProps> = ({ onClose }) => {
  const {
    totalDays,
    activeCase,
    currentDay,
    completedDays,
    unlockedDays,
    freePlayMode,
    setCurrentDay,
  } = useGameStore();
  const [selectedAct, setSelectedAct] = useState<number | 'all'>('all');

  const days = activeCase.days;
  const filteredDays = days.filter(d => (selectedAct === 'all' ? true : d.act === selectedAct));
  const progressPct = Math.round((completedDays.length / totalDays) * 100);

  const handleSelectDay = (dayNum: number, isUnlocked: boolean) => {
    if (!isUnlocked && !freePlayMode) return;
    sound.playWaxSeal();
    setCurrentDay(dayNum);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={() => {
        sound.playClick();
        onClose();
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative book-cover-leather border-2 border-[#08090c] ring-1 ring-[#b79b65]/35 rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-[0_30px_80px_rgba(0,0,0,0.95)] overflow-hidden animate-page-turn"
      >
        <div className="pointer-events-none absolute inset-0 book-arcane-wear z-0" />
        <div className="pointer-events-none absolute inset-1.5 rounded-lg border border-[#b79b65]/35 z-20" />

        {/* Cabecera del Archivo Cronológico */}
        <div className="relative z-10 header-leather-bar p-4 sm:p-5 border-b border-[#b79b65]/30 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-[#08090c] border border-[#c5a059]/75 flex items-center justify-center shadow-md shrink-0">
                <img
                  src="./app-icon.jpg"
                  alt="Emblema Calendario Villa Acebo"
                  draggable={false}
                  className="pointer-events-none w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold-400/85 block">
                  Archivo Cronológico • 1 al {totalDays} de Diciembre
                </span>
                <h2 className="font-title text-2xl sm:text-3xl text-gold-200 leading-none pt-1">
                  Calendario de Adviento Criminal
                </h2>
              </div>
            </div>
          </div>

          {/* Filtro por 5 Actos + Acceso al Álbum */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0a0b0e]/90 p-1.5 rounded-md border border-[#b79b65]/30 text-xs">
            <button
              type="button"
              onClick={() => {
                sound.playPageTurn();
                setCurrentDay(0);
                onClose();
              }}
              className={`px-2.5 py-1 rounded-sm font-desc font-semibold border transition flex items-center gap-1.5 ${
                currentDay === 0
                  ? 'bg-gold-300 text-ink-950 border-gold-500 shadow'
                  : 'btn-ledger text-gold-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Álbum: 74 Sospechosos</span>
            </button>

            <div className="h-4 w-px bg-[#b79b65]/25 mx-0.5 hidden sm:block" />
            <Filter className="w-3.5 h-3.5 text-gold-400 ml-1 hidden sm:block" />

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setSelectedAct('all');
              }}
              className={`px-2.5 py-1 rounded-sm transition font-desc ${
                selectedAct === 'all'
                  ? 'bg-gold-300 text-ink-950 font-bold shadow'
                  : 'text-parchment-300 hover:text-white'
              }`}
            >
              Todos ({totalDays})
            </button>
            {[1, 2, 3, 4, 5].map(act => {
              const actDone = days.filter(
                d => d.act === act && completedDays.includes(d.day)
              ).length;
              return (
                <button
                  type="button"
                  key={act}
                  onClick={() => {
                    sound.playClick();
                    setSelectedAct(act);
                  }}
                  className={`px-2 py-1 rounded-sm transition font-desc flex items-center gap-1 ${
                    selectedAct === act
                      ? 'bg-gold-300 text-ink-950 font-bold shadow'
                      : 'text-parchment-300 hover:text-white'
                  }`}
                >
                  <span>Acto {act}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded-sm ${
                      selectedAct === act ? 'bg-ink-950/20 text-ink-950' : 'bg-[#17191f] text-gold-300'
                    }`}
                  >
                    {actDone}/6
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-parchment-300 hover:text-white p-1.5 rounded-sm hover:bg-white/5 transition"
            title="Cerrar Calendario"
            aria-label="Cerrar Calendario"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-barra de progreso */}
        <div className="relative z-10 bg-[#0c0d11]/95 px-4 sm:px-6 py-2.5 border-b border-[#b79b65]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-parchment-200 font-desc">
            <Award className="w-4 h-4 text-gold-400 shrink-0" />
            <span>
              {selectedAct === 'all'
                ? `Mostrando las ${totalDays} jornadas del expediente de Villa Acebo`
                : `${ACT_METADATA[selectedAct]?.title} (${ACT_METADATA[selectedAct]?.range})`}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-[11px] font-mono text-gold-300 whitespace-nowrap">
              Progreso: <strong>{completedDays.length}/{totalDays}</strong> ({progressPct}%)
            </span>
            <div className="flex-1 sm:w-36 h-2 bg-[#16181e] rounded-full overflow-hidden border border-[#b79b65]/30">
              <div
                className="h-full bg-gradient-to-r from-crimson-700 via-crimson-500 to-gold-300 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cuadrícula de 30 Ventanas */}
        <div className="relative z-10 p-4 sm:p-6 overflow-y-auto flex-1 bg-gradient-to-b from-[#0d0f13]/92 to-[#08090c]/96">
          <div
            key={`act-${selectedAct}`}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3"
          >
            {filteredDays.map((d, idx) => {
              const isCompleted = completedDays.includes(d.day);
              const isUnlocked = unlockedDays.includes(d.day) || freePlayMode;
              const isCurrent = currentDay === d.day;

              return (
                <div
                  key={d.day}
                  data-calendar-day={d.day}
                  style={{ animationDelay: `${idx * 16}ms` }}
                  onClick={() => handleSelectDay(d.day, isUnlocked)}
                  className={`animate-calendar-window group relative rounded-md p-3 flex flex-col justify-between border transition-all duration-300 select-none overflow-hidden ${
                    isCurrent
                      ? 'border-gold-400 bg-gradient-to-b from-[#3b1016] via-[#191418] to-[#0e0f13] shadow-[0_0_24px_rgba(212,179,84,0.28)] hover:-translate-y-1 cursor-pointer'
                      : isCompleted
                      ? 'border-[#b79b65]/65 bg-gradient-to-b from-[#1a1c22] to-[#0e1014] hover:border-gold-300 hover:-translate-y-1 cursor-pointer shadow-md'
                      : isUnlocked
                      ? 'border-[#333742] bg-[#13151a]/90 hover:border-[#b79b65]/75 hover:bg-[#1b1e25] hover:-translate-y-1 cursor-pointer shadow'
                      : 'border-[#1d1f26] bg-[#0c0d10]/60 opacity-45 cursor-not-allowed'
                  }`}
                >
                  {isUnlocked && (
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-tr from-transparent via-[#e1ca85]/10 to-transparent" />
                  )}

                  <div className="flex items-start justify-between gap-1 relative z-10">
                    <div>
                      <span className="font-title text-2xl font-bold text-gold-300 group-hover:text-gold-200 inline-block transition leading-none">
                        {d.day < 10 ? `0${d.day}` : d.day}
                      </span>
                      <span className="text-[9px] font-mono text-parchment-400/80 mt-0.5 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-gold-500/70" />
                        {d.hourStr}
                      </span>
                    </div>

                    {isCompleted ? (
                      <div
                        className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7c1925] to-[#440910] border border-gold-400/60 text-gold-200 flex items-center justify-center shadow"
                        title="Capítulo Lacrado y Resuelto"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </div>
                    ) : isCurrent ? (
                      <span className="px-1.5 py-0.5 rounded-sm bg-gold-300 text-ink-950 font-mono font-bold text-[9px] uppercase tracking-wider">
                        Actual
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-[9px] text-gold-300/90 uppercase tracking-widest font-mono border border-[#b79b65]/35 px-1.5 py-0.5 rounded-sm bg-[#0b0c0f]/80">
                        Abierto
                      </span>
                    ) : (
                      <Lock className="w-4 h-4 text-ink-600" />
                    )}
                  </div>

                  <div className="my-2 relative z-10">
                    <h3 className="font-desc text-xs font-semibold text-parchment-100 line-clamp-2 leading-snug group-hover:text-gold-200 transition">
                      {d.title}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="inline-block text-[9px] font-mono text-gold-300/90 bg-[#0b0c0f]/85 px-1.5 py-0.5 rounded-sm border border-[#b79b65]/30">
                        {PUZZLE_TYPE_LABELS[d.puzzle.type] ?? d.puzzle.type}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#262932] flex items-center justify-between text-[10px] text-ink-400 relative z-10">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-parchment-400/75">
                      Acto {d.act}
                    </span>
                    {isCompleted ? (
                      <span className="text-gold-300 font-semibold flex items-center gap-1 text-[10px]">
                        <CheckCircle className="w-3 h-3 text-crimson-400" /> Lacrado
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-gold-300 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                        <BookOpen className="w-3 h-3" /> Leer
                      </span>
                    ) : (
                      <span>Cerrado</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Barra inferior */}
        <div className="relative z-10 p-3.5 bg-[#0b0c0f] border-t border-[#b79b65]/25 flex flex-wrap items-center justify-between gap-2 text-xs text-parchment-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span className="font-desc">
              Cada una de las 30 jornadas aporta una prueba verificada para aislar a 1 único culpable entre los{' '}
              <strong className="text-gold-300">74 sospechosos</strong>, 18 armas y 9 estancias.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 btn-crimson-wax text-parchment-50 rounded-sm font-desc font-semibold transition shadow"
          >
            Volver al Libro Abierto
          </button>
        </div>
      </div>
    </div>
  );
};
