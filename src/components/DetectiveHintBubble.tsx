import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, Sparkles, MessageSquare, Users, RotateCcw } from 'lucide-react';
import type { Clue, DayData, PuzzleType } from '../types/game';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../utils/soundEffects';

type AzlynnMood = 'angustiada' | 'asustada' | 'pensando' | 'enojada' | 'feliz';

interface AzlynnDialogueExchange {
  title: string;
  mood: AzlynnMood;
  lines: Array<{ speaker: 'Azlynn' | 'Detective'; text: string }>;
}

const AZLYNN_DIALOGUES: AzlynnDialogueExchange[] = [
  {
    title: 'Sospecha en el Salón',
    mood: 'asustada',
    lines: [
      { speaker: 'Azlynn', text: 'No me siento segura.' },
      { speaker: 'Detective', text: '¿Por qué lo dices?' },
      { speaker: 'Azlynn', text: 'Alguien quiere deshacerse de mí.' },
      { speaker: 'Detective', text: '¿Alguien? Lamento decirte que... son todos.' },
      { speaker: 'Azlynn', text: 'No somos bienvenidas aquí.' },
    ],
  },
  {
    title: 'El Temporal y el Encierro',
    mood: 'angustiada',
    lines: [
      { speaker: 'Azlynn', text: 'El temporal de nieve derribó los postes telefónicos de la montaña.' },
      { speaker: 'Detective', text: 'Significa que nadie entra ni sale de Villa Acebo hasta el amanecer.' },
      { speaker: 'Azlynn', text: 'Y que el asesino de Arturo Valdemar respira el mismo aire helado que nosotros en este salón.' },
      { speaker: 'Detective', text: 'Mantén la libreta abierta. No podemos permitirnos un solo descuido.' },
    ],
  },
  {
    title: 'Setenta y Cuatro Sospechosos Iguales',
    mood: 'pensando',
    lines: [
      { speaker: 'Detective', text: 'Aquí nadie tiene privilegios ni coartada intocable. Los setenta y cuatro presentes tenían motivos para odiar a Arturo.' },
      { speaker: 'Azlynn', text: 'Exacto. Familiares, invitados, servidumbre y vecinos del valle atrapados por la tormenta: cualquiera pudo haberlo hecho.' },
      { speaker: 'Detective', text: 'Con dieciocho armas inventariadas y nueve estancias distintas, no podemos fiarnos de corazonadas.' },
      { speaker: 'Azlynn', text: 'Solo el cruce frío de las treinta jornadas forenses nos dará un único nombre.' },
    ],
  },
  {
    title: 'Las Gemelas Marín',
    mood: 'angustiada',
    lines: [
      { speaker: 'Azlynn', text: 'Hablé con Silvia Marín en la cocina. La pobre chica temblaba al sostener la bandeja.' },
      { speaker: 'Detective', text: '¿Y su hermana gemela Sonia?' },
      { speaker: 'Azlynn', text: 'Sonia es de hielo. Una manipuladora egocéntrica que domina a Silvia y vigila cada puerta de servicio.' },
      { speaker: 'Detective', text: 'No las pierdas de vista. La servidumbre sabe secretos que la familia jamás admitirá.' },
    ],
  },
  {
    title: 'Cero Margen de Error',
    mood: 'enojada',
    lines: [
      { speaker: 'Azlynn', text: 'Setenta y cuatro coartadas ensayadas y ni una sola cara honesta.' },
      { speaker: 'Detective', text: 'Por eso nos llamaron a homicidios, colega. Uno de ellos va a tropezar.' },
      { speaker: 'Azlynn', text: 'Más vale que sea antes de cerrar las treinta jornadas del expediente.' },
    ],
  },
  {
    title: 'Lectura Fría del Cuaderno',
    mood: 'pensando',
    lines: [
      { speaker: 'Detective', text: '¿Qué ves en este expediente que se me esté escapando?' },
      { speaker: 'Azlynn', text: 'Mira los rastros físicos y los horarios, no las excusas. Todos mienten sobre dónde estaban durante el apagón.' },
      { speaker: 'Detective', text: 'El corte eléctrico a las 23:15 h les dio cinco minutos de oscuridad absoluta.' },
      { speaker: 'Azlynn', text: 'Ese minuto exacto es nuestra única ancla con la verdad.' },
    ],
  },
];

const MOOD_LABELS: Record<AzlynnMood, string> = {
  angustiada: 'Angustiada',
  asustada: 'Asustada',
  pensando: 'Pensando',
  enojada: 'Enojada',
  feliz: 'Aliviada',
};

const AZLYNN_EMOTION_IMAGES: Record<AzlynnMood, string> = {
  feliz: './portraits/detective-happy.png',
  angustiada: './portraits/detective-worried.png',
  enojada: './portraits/detective-angry.png',
  pensando: './portraits/detective-thinking.png',
  asustada: './portraits/detective-scared.png',
};

export interface DetectiveSuspectFunnelSummary {
  total: number;
  remaining: number;
  eliminated: number;
}

export interface DetectiveHintBubbleProps {
  currentDay: number;
  isAlbum: boolean;
  dayData: DayData;
  isDayCompleted: boolean;
  completedDays: number[];
  unlockedClues: Clue[];
  suspectFunnel: DetectiveSuspectFunnelSummary;
  isHeaderCollapsed?: boolean;
}

interface HintEntry {
  tag: string;
  text: string;
}

interface DesktopBubblePos {
  top: number;
  left: number;
  width: number;
  caretLeft: number;
}

const PUZZLE_STRATEGY_TIPS: Record<PuzzleType, string> = {
  wordsearch:
    'Estrategia: busca primero las letras menos comunes de cada término (como Z, K, Ñ o Q) en horizontal, vertical y diagonal; las letras sobrantes revelan el mensaje.',
  syllables:
    'Estrategia: lee la definición de cada palabra clave y fija cuántas sílabas pide; empieza por las palabras más claras para despejar el banco de sílabas.',
  cryptogram:
    'Estrategia: localiza los números más repetidos (suelen ser E, A, O o S) y apóyate en palabras de dos o tres letras para deducir artículos y preposiciones.',
  sudoku:
    'Estrategia: usa el modo Lápiz para anotar candidatos en filas, columnas o bloques 3x3 casi completos; presta especial atención a las casillas clave doradas.',
  murdoku:
    'Estrategia: marca primero los descartes seguros (X) a partir de cada declaración antes de confirmar; un solo fallo reinicia el tablero por completo.',
  crossword:
    'Estrategia: resuelve primero las definiciones horizontales o verticales más cortas y usa las letras cruzadas para validar los términos más largos.',
  futoshiki:
    'Estrategia: empieza por las cadenas de desigualdades (< o >) más largas para acotar valores mínimos y máximos en cada fila y columna.',
  connections:
    'Estrategia: busca el vínculo específico y excluyente entre cuatro conceptos antes de confirmar, evitando agrupaciones superficiales o ambiguas.',
  nonogram:
    'Estrategia: marca primero las filas y columnas con bloques grandes que se solapan en el centro y señala con X los espacios vacíos seguros.',
  minesweeper:
    'Estrategia: deduce qué casillas adyacentes a los números descubiertos contienen minas seguras usando banderas antes de revelar celdas vecinas.',
  septagrama:
    'Estrategia: todas las palabras usan las 7 letras de la flor e incluyen obligatoriamente la letra central; las casillas sombreadas revelan la palabra clave inferior.',
  codificados:
    'Estrategia: tacha primero las cifras de la pista donde ninguna pertenece al código y luego cruza las pistas con cifras bien colocadas.',
  ecuaciones:
    'Estrategia: despeja primero la ecuación con un solo icono repetido y sustituye su valor en las siguientes filas hasta hallar los 4 iconos del marcador.',
  encajados:
    'Estrategia: comienza por las palabras cuya longitud sea única o que coincidan con las letras ya reveladas en el tablero.',
};

export const DetectiveHintBubble: React.FC<DetectiveHintBubbleProps> = ({
  currentDay,
  isAlbum,
  dayData,
  isDayCompleted,
  completedDays,
  unlockedClues,
  suspectFunnel,
  isHeaderCollapsed = false,
}) => {
  const totalDays = useGameStore(state => state.totalDays);
  const caseSeed = useGameStore(state => state.caseSeed);
  const startNewCase = useGameStore(state => state.startNewCase);
  const resetGame = useGameStore(state => state.resetGame);
  const [isRadialOpen, setIsRadialOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'hints' | 'dialogue' | 'status' | null>(null);
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [hintState, setHintState] = useState<{ day: number; completed: boolean; index: number }>({
    day: currentDay,
    completed: isDayCompleted,
    index: 0,
  });
  const hintIndex =
    hintState.day === currentDay && hintState.completed === isDayCompleted ? hintState.index : 0;
  const [desktopPos, setDesktopPos] = useState<DesktopBubblePos | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isOpen = isRadialOpen || activeTab !== null;

  const hints = useMemo<HintEntry[]>(() => {
    if (isAlbum) {
      const albumHints: HintEntry[] = [];

      if (completedDays.length >= totalDays) {
        albumHints.push({
          tag: 'Veredicto Listo',
          text: `Las ${totalDays} jornadas han concluido y todas las pruebas están sobre la mesa. Abre «Veredicto» en la barra superior para dictar tu acusación final.`,
        });
      }

      albumHints.push(
        {
          tag: 'Álbum de Sospechosos',
          text: 'Examina cada ficha del censo de Villa Acebo para revisar coartadas, parentescos y motivos antes de abrir el primer capítulo.',
        },
        {
          tag: 'Embudo de Deducción',
          text: `Actualmente siguen ${suspectFunnel.remaining} de ${suspectFunnel.total} invitados bajo sospecha. Cada día resuelto cerrará el cerco sobre el culpable.`,
        },
        {
          tag: 'Cuaderno del Detective',
          text: 'Usa el botón «Cuaderno» para cruzar sospechosos, armas y estancias en tu Matriz Murdoku conforme reúnas pruebas.',
        },
        {
          tag: 'Prólogo del Caso',
          text: 'Cuando estés listo para la primera investigación, pulsa «Comenzar la Investigación» o avanza al Día 01 con la flecha superior.',
        }
      );

      return albumHints;
    }

    if (!isDayCompleted) {
      const chapterHints: HintEntry[] = dayData.puzzle.hints.map(hint => ({
        tag: `Pista del Día ${dayData.day}`,
        text: hint,
      }));

      chapterHints.push({
        tag: 'Consejo de Gabinete',
        text: PUZZLE_STRATEGY_TIPS[dayData.puzzle.type],
      });

      chapterHints.push({
        tag: 'Cotejo Documental',
        text: `No pases por alto «${dayData.narrative.evidenceTitle}» en el pliego izquierdo; suele confirmar nombres, horas o estancias clave.`,
      });

      return chapterHints;
    }

    const rawImpact = dayData.unlockedClue.impact.trim();
    const formattedImpact = /[.!?…]$/.test(rawImpact) ? rawImpact : `${rawImpact}.`;

    const solvedHints: HintEntry[] = [
      {
        tag: `Día ${dayData.day} Lacrado`,
        text: `Deducción asegurada: ${formattedImpact}`,
      },
      {
        tag: 'Estado del Caso',
        text: `Quedan ${suspectFunnel.remaining} de ${suspectFunnel.total} sospechosos activos con ${unlockedClues.length} pistas reunidas en tu expediente.`,
      },
    ];

    if (currentDay < totalDays && completedDays.length < totalDays) {
      solvedHints.push({
        tag: 'Siguiente Pesquisas',
        text: `Capítulo completado con éxito. Puedes avanzar al Día ${dayData.day + 1} para continuar estrechando el embudo.`,
      });
    } else {
      solvedHints.push({
        tag: 'Acusación Final',
        text: 'Con este expediente completo ya puedes pulsar «Veredicto» para señalar al culpable, el arma y la estancia del crimen.',
      });
    }

    return solvedHints;
  }, [
    isAlbum,
    isDayCompleted,
    dayData,
    completedDays.length,
    totalDays,
    suspectFunnel.remaining,
    suspectFunnel.total,
    unlockedClues.length,
    currentDay,
  ]);

  const safeIndex = hints.length > 0 ? hintIndex % hints.length : 0;
  const activeHint = hints[safeIndex] ?? {
    tag: 'Inspector',
    text: 'Observa cada detalle del expediente antes de emitir tu juicio.',
  };

  const updateDesktopPosition = useCallback(() => {
    if (typeof window === 'undefined' || window.innerWidth < 640) {
      setDesktopPos(null);
      return;
    }

    const btn = buttonRef.current;
    if (!btn) {
      return;
    }

    const btnRect = btn.getBoundingClientRect();
    const headerRect = btn.closest('header')?.getBoundingClientRect();
    const bubbleWidth = Math.min(384, window.innerWidth - 24);
    const top = Math.max(btnRect.bottom + 14, (headerRect?.bottom ?? btnRect.bottom) + 12);
    const left = Math.max(
      12,
      Math.min(btnRect.right - bubbleWidth, window.innerWidth - bubbleWidth - 12)
    );
    const caretLeft = Math.max(
      16,
      Math.min(btnRect.left + btnRect.width / 2 - left - 8, bubbleWidth - 28)
    );

    setDesktopPos({ top, left, width: bubbleWidth, caretLeft });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const rafId = window.requestAnimationFrame(updateDesktopPosition);
    const midTimer = window.setTimeout(updateDesktopPosition, 160);
    const settleTimer = window.setTimeout(updateDesktopPosition, 340);

    window.addEventListener('resize', updateDesktopPosition);
    window.addEventListener('scroll', updateDesktopPosition, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(midTimer);
      window.clearTimeout(settleTimer);
      window.removeEventListener('resize', updateDesktopPosition);
      window.removeEventListener('scroll', updateDesktopPosition);
    };
  }, [isOpen, isHeaderCollapsed, currentDay, updateDesktopPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsRadialOpen(false);
        setActiveTab(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleDetectiveClick = () => {
    sound.playClick();
    updateDesktopPosition();
    if (isRadialOpen || activeTab !== null) {
      setIsRadialOpen(false);
      setActiveTab(null);
    } else {
      setIsRadialOpen(true);
    }
  };

  const handleNextHint = () => {
    sound.playClick();
    setHintState(prev => {
      const currentIdx =
        prev.day === currentDay && prev.completed === isDayCompleted ? prev.index : 0;
      return {
        day: currentDay,
        completed: isDayCompleted,
        index: (currentIdx + 1) % hints.length,
      };
    });
  };

  const handleClose = () => {
    sound.playClick();
    setIsRadialOpen(false);
    setActiveTab(null);
  };

  const activeDialogue = AZLYNN_DIALOGUES[dialogueIdx % AZLYNN_DIALOGUES.length];

  const currentMood: AzlynnMood =
    activeTab === 'dialogue'
      ? activeDialogue.mood
      : activeTab === 'status'
      ? completedDays.length >= totalDays
        ? 'feliz'
        : 'angustiada'
      : completedDays.length >= totalDays
      ? 'feliz'
      : 'pensando';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-testid="detective-hint-button"
        aria-expanded={isOpen}
        aria-label="Menú radial de Detective Azlynn"
        title="Detective de Homicidios Azlynn"
        onClick={handleDetectiveClick}
        className={`relative flex items-center justify-center rounded-full border-2 overflow-hidden transition shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
          isHeaderCollapsed ? 'w-8 h-8' : 'w-10 h-10'
        } ${
          isOpen
            ? 'bg-crimson-950 border-gold-400 ring-2 ring-gold-500/40 scale-105'
            : 'bg-ink-900 hover:bg-ink-800 border-gold-500/70 hover:border-gold-300'
        }`}
      >
        <img
          src={AZLYNN_EMOTION_IMAGES[currentMood]}
          alt={`Detective Azlynn (${MOOD_LABELS[currentMood]})`}
          className="w-full h-full object-cover object-top"
        />
      </button>

      {/* Menú Radial ampliado en la esquina superior derecha con difuminado de pantalla */}
      {isRadialOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex justify-center sm:justify-end items-start pt-14 px-4 sm:pt-16 sm:pr-16 lg:pr-24 transition-all duration-300"
            onClick={() => setIsRadialOpen(false)}
          >
            <div
              data-testid="detective-radial-menu"
              onClick={e => e.stopPropagation()}
              className="relative w-[310px] h-[310px] sm:w-[440px] sm:h-[440px] flex items-center justify-center"
            >
              {/* Anillos giratorios estilo brújula / Arcane */}
              <div className="pointer-events-none absolute inset-3 rounded-full border border-[#b79b65]/35 shadow-[0_0_80px_rgba(0,0,0,0.98)]" />
              <div className="pointer-events-none absolute inset-8 rounded-full border border-dashed border-[#b79b65]/40 animate-radial-ring" />
              <div className="pointer-events-none absolute inset-[62px] sm:inset-[80px] rounded-full border border-crimson-800/50" />

              {/* Retrato central GRANDE de Detective Azlynn */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsRadialOpen(false);
                }}
                title="Cerrar menú radial"
                className="relative z-10 w-36 h-36 sm:w-52 sm:h-52 rounded-full border-[3px] border-[#d4b354] ring-4 ring-[#0c0d10] overflow-hidden shadow-[0_0_52px_rgba(124,25,37,0.78)] bg-ink-950 hover:scale-[1.03] transition-transform duration-300"
              >
                <img
                  src={AZLYNN_EMOTION_IMAGES[currentMood]}
                  alt={`Detective Azlynn (${MOOD_LABELS[currentMood]})`}
                  draggable={false}
                  className="pointer-events-none w-full h-full object-cover object-top"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 py-1 bg-gradient-to-t from-black/90 via-black/65 to-transparent text-[10px] font-mono uppercase tracking-[0.2em] text-gold-200 text-center">
                  Azlynn
                </span>
              </button>

              {/* 4 nodos compactos orbitando alrededor del retrato grande */}
              {[
                {
                  id: 'hints' as const,
                  label: 'Pistas',
                  posClass: 'top-2 left-1/2 -translate-x-1/2',
                  delay: '0ms',
                  icon: <Sparkles className="w-4 h-4 text-gold-300" />,
                  onClick: () => {
                    sound.playClick();
                    setIsRadialOpen(false);
                    setActiveTab('hints');
                  },
                },
                {
                  id: 'dialogue' as const,
                  label: 'Diálogo',
                  posClass: 'right-2 top-1/2 -translate-y-1/2',
                  delay: '55ms',
                  icon: <MessageSquare className="w-4 h-4 text-gold-300" />,
                  onClick: () => {
                    sound.playClick();
                    setIsRadialOpen(false);
                    setActiveTab('dialogue');
                  },
                },
                {
                  id: 'status' as const,
                  label: 'Caso',
                  posClass: 'bottom-2 left-1/2 -translate-x-1/2',
                  delay: '110ms',
                  icon: <Users className="w-4 h-4 text-gold-300" />,
                  onClick: () => {
                    sound.playClick();
                    setIsRadialOpen(false);
                    setActiveTab('status');
                  },
                },
                {
                  id: 'reset' as const,
                  label: 'Reiniciar',
                  posClass: 'left-2 top-1/2 -translate-y-1/2',
                  delay: '0ms',
                  icon: <RotateCcw className="w-4 h-4 text-crimson-300" />,
                  onClick: () => {
                    sound.playClick();
                    resetGame();
                    setIsRadialOpen(false);
                    setActiveTab(null);
                  },
                },
              ].map(node => (
                <button
                  key={node.id}
                  type="button"
                  onClick={node.onClick}
                  className={`absolute ${node.posClass} w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-ink-950/95 hover:bg-crimson-950 border border-[#b79b65]/80 hover:border-gold-200 shadow-[0_10px_26px_rgba(0,0,0,0.92)] flex flex-col items-center justify-center gap-0.5 transition-colors`}
                  title={node.label}
                >
                  {node.icon}
                  <span className="text-[7px] sm:text-[8px] font-mono uppercase tracking-wider text-parchment-100 leading-tight font-bold text-center px-0.5">
                    {node.label}
                  </span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}

      {/* Panel activo elegido desde el Menú Radial */}
      {activeTab !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={
              desktopPos
                ? { top: desktopPos.top, left: desktopPos.left, width: desktopPos.width }
                : undefined
            }
            className={
              desktopPos
                ? 'fixed z-40 pointer-events-none flex justify-center sm:block'
                : 'fixed inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-28 z-40 pointer-events-none flex justify-center sm:justify-end'
            }
          >
            <div
              data-testid="detective-hint-bubble"
              role="status"
              aria-live="polite"
              className={`pointer-events-auto relative w-full ${
                desktopPos ? 'sm:w-full' : 'max-w-sm sm:w-80 md:w-96'
              } bg-gradient-to-br from-parchment-50 via-parchment-100 to-parchment-200 border-2 border-gold-600/85 rounded-xl p-3.5 shadow-[0_16px_38px_rgba(0,0,0,0.78)] text-ink-950 animate-page-turn`}
            >
              <div
                aria-hidden="true"
                style={desktopPos ? { left: desktopPos.caretLeft } : undefined}
                className={`hidden sm:block absolute -top-2 ${
                  desktopPos ? '' : 'right-12'
                } w-3.5 h-3.5 rotate-45 bg-parchment-50 border-t-2 border-l-2 border-gold-600/85`}
              />

              <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-parchment-300/90">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-crimson-800/80 shadow shrink-0 bg-ink-950">
                    <img
                      src={AZLYNN_EMOTION_IMAGES[currentMood]}
                      alt={`Azlynn ${MOOD_LABELS[currentMood]}`}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-serif font-black text-xs text-crimson-950 leading-tight">
                      Detective de Homicidios Azlynn
                    </span>
                    <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-gold-800 font-bold">
                      {activeTab === 'hints'
                        ? activeHint.tag
                        : activeTab === 'dialogue'
                        ? `${activeDialogue.title} · ${MOOD_LABELS[activeDialogue.mood]}`
                        : `Estado del Cerco · ${MOOD_LABELS[currentMood]}`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="detective-hint-close"
                  aria-label="Cerrar panel de Azlynn"
                  onClick={handleClose}
                  className="p-1 rounded-md text-ink-600 hover:text-crimson-900 hover:bg-parchment-200 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeTab === 'hints' && (
                <>
                  <p className="font-reading text-xs sm:text-[13px] leading-snug text-ink-900 break-words">
                    {activeHint.text}
                  </p>
                  <div className="mt-2.5 pt-1.5 border-t border-parchment-300/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-ink-600">
                      Pista {safeIndex + 1}/{hints.length}
                    </span>
                    {hints.length > 1 && (
                      <button
                        type="button"
                        onClick={handleNextHint}
                        className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded bg-crimson-900 hover:bg-crimson-800 text-gold-100 text-[11px] font-serif font-bold transition shadow-sm"
                      >
                        <span>Otra pista</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'dialogue' && (
                <>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {activeDialogue.lines.map((line, i) => (
                      <p
                        key={i}
                        className={`text-xs leading-snug rounded px-2 py-1 ${
                          line.speaker === 'Azlynn'
                            ? 'bg-crimson-950/10 border-l-2 border-crimson-800 text-ink-950'
                            : 'bg-parchment-200/75 border-l-2 border-ink-700 text-ink-800'
                        }`}
                      >
                        <strong className="font-mono text-[10px] uppercase tracking-wider mr-1.5 text-crimson-900">
                          {line.speaker}:
                        </strong>
                        <span className="font-reading">{line.text}</span>
                      </p>
                    ))}
                  </div>
                  <div className="mt-2.5 pt-1.5 border-t border-parchment-300/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] italic text-ink-600 font-serif">
                      Conversación entre colegas
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setDialogueIdx(prev => (prev + 1) % AZLYNN_DIALOGUES.length);
                      }}
                      className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded bg-crimson-900 hover:bg-crimson-800 text-gold-100 text-[11px] font-serif font-bold transition shadow-sm"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'status' && (
                <div className="space-y-2 text-xs font-reading text-ink-900">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-crimson-900">
                    Expediente activo #{caseSeed % 10000}
                  </p>
                  <p>
                    Quedan <strong>{suspectFunnel.remaining}</strong> de{' '}
                    <strong>{suspectFunnel.total}</strong> sospechosos bajo investigación.
                  </p>
                  <p>
                    Has completado <strong>{completedDays.length}/{totalDays}</strong> jornadas y reunido{' '}
                    <strong>{unlockedClues.length}</strong> pruebas en el cuaderno.
                  </p>
                  <div className="pt-2 border-t border-parchment-300 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        startNewCase();
                        setActiveTab(null);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded bg-crimson-900 hover:bg-crimson-800 text-gold-100 text-[11px] font-serif font-bold transition"
                    >
                      Nuevo Caso (74 opciones)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetGame();
                        setActiveTab(null);
                      }}
                      className="px-2.5 py-1.5 rounded bg-parchment-200 hover:bg-parchment-300 text-ink-800 text-[11px] font-mono transition"
                    >
                      Reiniciar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
