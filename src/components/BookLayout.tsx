import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  computeSuspectStatus,
  isActUnlocked,
  isDayUnlockedByDoors,
  useGameStore,
} from '../store/useGameStore';
import { BookDoorSpread } from './BookDoorSpread';
import { SUSPECTS_DIRECTORY } from '../data/suspectsDirectory';
import { WEAPONS, LOCATIONS } from '../data/narrativeBible';
import { evaluateCaseClues } from '../engine/caseGenerator';
import type { DayData } from '../types/game';
import { sound } from '../utils/soundEffects';

// Los 10 Pasatiempos Lógicos Exclusivos
import { WordSearchPuzzle } from './puzzles/WordSearchPuzzle';
import { SyllablesPuzzle } from './puzzles/SyllablesPuzzle';
import { CryptogramPuzzle } from './puzzles/CryptogramPuzzle';
import { SudokuPuzzle } from './puzzles/SudokuPuzzle';
import { MurdokuPuzzle } from './puzzles/MurdokuPuzzle';
import { CrosswordPuzzle } from './puzzles/CrosswordPuzzle';
import { FutoshikiPuzzle } from './puzzles/FutoshikiPuzzle';
import { ConnectionsPuzzle } from './puzzles/ConnectionsPuzzle';
import { NonogramPuzzle } from './puzzles/NonogramPuzzle';
import { MinesweeperPuzzle } from './puzzles/MinesweeperPuzzle';
import { SeptagramaPuzzle } from './puzzles/SeptagramaPuzzle';
import { CodificadosPuzzle } from './puzzles/CodificadosPuzzle';
import { EcuacionesPuzzle } from './puzzles/EcuacionesPuzzle';
import { EncajadosPuzzle } from './puzzles/EncajadosPuzzle';

// Álbum de Sospechosos, Globo del Detective y Manos Paranormales
import { SuspectsAlbum } from './SuspectsAlbum';
import { DetectiveHintBubble } from './DetectiveHintBubble';
import { ParanormalHandsVideo } from './ParanormalHandsVideo';

// Iconos vectoriales (cero emojis)
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  BookMarked,
  Gavel,
  CheckCircle,
  Check,
  Scroll,
  Users,
  Feather,
  Radio,
  FileSearch,
  Newspaper,
  Compass,
  Camera,
  Quote,
  Sparkles,
  Filter,
  Pin,
  PinOff,
  BookOpen,
  Book,
  Puzzle,
  ShieldCheck,
  RefreshCw,
  DoorOpen,
  Skull,
  X
} from 'lucide-react';

interface BookLayoutProps {
  onOpenCalendar: () => void;
  onOpenDossier: () => void;
  onOpenVerdict: () => void;
  onOpenPrologue: () => void;
  onOpenActDoor: (act: 1 | 2 | 3 | 4 | 5, startOpened?: boolean) => void;
  onBookOpenChange?: (isOpen: boolean) => void;
}

export const BookLayout: React.FC<BookLayoutProps> = ({
  onOpenCalendar,
  onOpenDossier,
  onOpenVerdict,
  onOpenPrologue,
  onOpenActDoor,
  onBookOpenChange,
}) => {
  const {
    totalDays,
    activeCase,
    currentDay,
    setCurrentDay,
    completedDays,
    openedDoors,
    openDoor,
    markDayCompleted,
    unlockedClues,
    manualEliminations,
    startNewCase,
  } = useGameStore();

  // Puerta mostrada directamente como pliego del libro (cuando está sellada o el jugador quiere revisarla)
  const [doorPreviewAct, setDoorPreviewAct] = useState<1 | 2 | 3 | 4 | 5 | null>(null);

  // En pantallas móviles: alternar entre página izquierda (relato) y derecha (puzzle)
  const [mobilePageState, setMobilePageState] = useState<{ day: number; page: 'left' | 'right' }>({
    day: currentDay,
    page: 'left',
  });
  const mobilePage = mobilePageState.day === currentDay ? mobilePageState.page : 'left';
  const setMobilePage = (page: 'left' | 'right') => {
    setMobilePageState({ day: currentDay, page });
  };

  // Dirección de cambio de página para animación 3D sutil
  const prevDayRef = useRef<number>(currentDay);
  const [pageDir, setPageDir] = useState<'next' | 'prev'>('next');

  // Barra superior: Fijar / Desfijar
  const [isHeaderPinned, setIsHeaderPinned] = useState(true);
  const isHeaderExpanded = isHeaderPinned;

  // Estado físico de la libreta: abierta o cerrada (portada / contraportada) para ver el fondo
  const [bookCoverMode, setBookCoverMode] = useState<'open' | 'front' | 'back'>('open');

  useEffect(() => {
    sound.playPageTurn();
  }, []);
  const [isFunnelModalOpen, setIsFunnelModalOpen] = useState(false);
  const bookCoverModeRef = useRef(bookCoverMode);
  useEffect(() => {
    bookCoverModeRef.current = bookCoverMode;
  }, [bookCoverMode]);

  // Manos sombrías emergiendo del video chroma-key (solo con la libreta abierta)
  const [handsActive, setHandsActive] = useState(false);

  // Arrastrar la libreta cerrada con retorno elástico a su posición
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingBook, setIsDraggingBook] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const changeBookCoverMode = (nextMode: 'open' | 'front' | 'back') => {
    if (nextMode !== 'open') {
      setHandsActive(false);
    }
    setDragOffset({ x: 0, y: 0 });
    setIsDraggingBook(false);
    dragStartRef.current = null;
    setBookCoverMode(nextMode);
    onBookOpenChange?.(nextMode === 'open');
  };

  useEffect(() => {
    const handleParanormalHands = () => {
      // Si la libreta está cerrada, cancelar y posponer hasta el siguiente evento
      if (bookCoverModeRef.current !== 'open') return;
      setHandsActive(true);
    };

    window.addEventListener('paranormal-hands', handleParanormalHands);
    return () => {
      window.removeEventListener('paranormal-hands', handleParanormalHands);
    };
  }, []);

  const handleClosedBookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
    setIsDraggingBook(true);
  };

  const handleClosedBookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBook || !dragStartRef.current) return;
    setDragOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleClosedBookPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBook) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStartRef.current = null;
    setIsDraggingBook(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const isAlbum = currentDay === 0;
  const days = activeCase.days;
  const dayData = days.find(d => d.day === currentDay) || days[0];
  const isDayCompleted = completedDays.includes(dayData.day);

  const clueEval = useMemo(() => evaluateCaseClues(unlockedClues), [unlockedClues]);

  // Cálculo reactivo del Embudo de Sospechosos (74 -> 1)
  const suspectFunnel = useMemo(() => {
    const total = SUSPECTS_DIRECTORY.length;
    const remaining = SUSPECTS_DIRECTORY.filter(
      suspect => !computeSuspectStatus(suspect, manualEliminations, unlockedClues, activeCase, openedDoors).isEliminated
    ).length;
    const eliminated = total - remaining;
    const percentageRemaining = Math.round((remaining / total) * 100);
    return {
      total,
      remaining,
      eliminated,
      percentageRemaining,
      hasManual: manualEliminations.length > 0,
    };
  }, [unlockedClues, manualEliminations, activeCase, openedDoors]);

  const navigateToDay = (nextDay: number) => {
    if (nextDay < 0 || nextDay > totalDays) return;
    if (nextDay > 0 && !isDayUnlockedByDoors(nextDay, completedDays)) {
      const targetAct = Math.ceil(nextDay / 6) as 1 | 2 | 3 | 4 | 5;
      sound.playError();
      setPageDir('next');
      setDoorPreviewAct(targetAct);
      return;
    }
    setDoorPreviewAct(null);
    if (nextDay === currentDay) return;
    setPageDir(nextDay > prevDayRef.current ? 'next' : 'prev');
    prevDayRef.current = nextDay;
    setCurrentDay(nextDay);
  };

  const handlePrevDay = () => {
    if (doorPreviewAct !== null) {
      setDoorPreviewAct(null);
      return;
    }
    navigateToDay(currentDay - 1);
  };
  const handleNextDay = () => {
    if (doorPreviewAct !== null) return;
    navigateToDay(currentDay + 1);
  };

  const handleSolveCurrentPuzzle = () => {
    markDayCompleted(
      dayData.day,
      {
        id: dayData.unlockedClue.id,
        day: dayData.day,
        text: dayData.unlockedClue.text,
        category: dayData.unlockedClue.category,
        impact: dayData.unlockedClue.impact,
        predicates: dayData.unlockedClue.predicates,
        keyphrase: dayData.unlockedClue.keyphrase,
      },
      dayData.unlockedClue.autoEliminations
    );
  };

  // [TEMPORAL - TEST] Completar automáticamente todos los días de un acto (1..5)
  const handleTestCompleteAct = (actNum: number) => {
    const actDays = days.filter(d => d.act === actNum);
    for (const d of actDays) {
      markDayCompleted(
        d.day,
        {
          id: d.unlockedClue.id,
          day: d.day,
          text: d.unlockedClue.text,
          category: d.unlockedClue.category,
          impact: d.unlockedClue.impact,
          predicates: d.unlockedClue.predicates,
          keyphrase: d.unlockedClue.keyphrase,
        },
        d.unlockedClue.autoEliminations
      );
    }
  };

  const getEvidenceStyle = (type: DayData['narrative']['evidenceType']) => {
    switch (type) {
      case 'telegram':
        return {
          wrapperClass: 'evidence-telegram font-typewriter',
          headerBorder: 'border-b border-dashed border-parchment-500/70 pb-1.5',
          badgeText: 'TELÉGRAFO NACIONAL • DESPACHO INTERCEPTADO',
          badgeClass: 'bg-ink-900/10 text-ink-900 border border-parchment-600/50 font-mono',
          stampText: 'URGENTE',
          stampClass: 'border-crimson-700 text-crimson-700 rotate-[-2deg]',
          bodyClass: 'font-typewriter text-xs text-ink-900 tracking-tight leading-relaxed',
          icon: <Radio className="w-3.5 h-3.5 text-ink-700 shrink-0" />,
          showWaxSeal: false,
        };
      case 'letter':
        return {
          wrapperClass: 'evidence-letter font-declaration',
          headerBorder: 'border-b border-parchment-300 pb-1.5',
          badgeText: 'CORRESPONDENCIA PRIVADA • ARCHIVO VALDEMAR',
          badgeClass: 'bg-crimson-950/10 text-crimson-800 border border-crimson-700/30 font-serif',
          stampText: 'CONFIDENCIAL',
          stampClass: 'border-crimson-800/70 text-crimson-800 rotate-[2deg]',
          bodyClass: 'font-declaration italic text-xs sm:text-[13px] text-ink-900 leading-relaxed',
          icon: <Feather className="w-3.5 h-3.5 text-crimson-700 shrink-0" />,
          showWaxSeal: true,
        };
      case 'autopsy':
        return {
          wrapperClass: 'evidence-autopsy font-typewriter',
          headerBorder: 'border-b-2 border-ink-300 pb-1.5',
          badgeText: 'PROTOCOLO FORENSE • EXAMEN TANATOLÓGICO',
          badgeClass: 'bg-ink-900 text-parchment-100 border border-ink-700 font-mono',
          stampText: 'FORENSE',
          stampClass: 'border-crimson-700 text-crimson-700 rotate-[-2deg]',
          bodyClass: 'font-typewriter text-xs text-ink-900 leading-snug',
          icon: <FileSearch className="w-3.5 h-3.5 text-crimson-700 shrink-0" />,
          showWaxSeal: false,
        };
      case 'diary':
        return {
          wrapperClass: 'evidence-diary font-declaration',
          headerBorder: 'border-b border-parchment-400/60 pb-1.5',
          badgeText: 'DIARIO PERSONAL • PÁGINA SUSTRAÍDA',
          badgeClass: 'bg-parchment-300/80 text-ink-900 border border-parchment-500 font-serif',
          stampText: 'MANUSCRITO',
          stampClass: 'border-ink-600 text-ink-700 rotate-[1deg]',
          bodyClass: 'font-declaration italic text-xs sm:text-[13px] text-ink-900 leading-relaxed pl-2 border-l-2 border-crimson-700/35',
          icon: <Feather className="w-3.5 h-3.5 text-ink-700 shrink-0" />,
          showWaxSeal: false,
        };
      case 'newspaper':
        return {
          wrapperClass: 'evidence-newspaper font-serif',
          headerBorder: 'border-b-2 border-ink-700/60 pb-1.5',
          badgeText: 'HEMEROTECA DEL VALLE • RECORTE DE PRENSA',
          badgeClass: 'bg-ink-900/10 text-ink-950 border border-ink-700/40 font-serif',
          stampText: 'EDICIÓN IMPRESA',
          stampClass: 'border-ink-700 text-ink-800 rotate-[-1deg]',
          bodyClass: 'font-reading text-xs sm:text-[13px] text-ink-900 leading-snug',
          icon: <Newspaper className="w-3.5 h-3.5 text-ink-800 shrink-0" />,
          showWaxSeal: false,
        };
      case 'map':
        return {
          wrapperClass: 'evidence-map font-typewriter',
          headerBorder: 'border-b border-parchment-500/60 pb-1.5',
          badgeText: 'PLANIMETRÍA Y CROQUIS • INSPECCIÓN TÉCNICA',
          badgeClass: 'bg-ink-900/10 text-ink-900 border border-parchment-600 font-mono',
          stampText: 'PLANO OFICIAL',
          stampClass: 'border-ink-700 text-ink-800 rotate-[-2deg]',
          bodyClass: 'font-typewriter text-xs text-ink-900 leading-snug',
          icon: <Compass className="w-3.5 h-3.5 text-ink-700 shrink-0" />,
          showWaxSeal: false,
        };
      case 'photo':
        return {
          wrapperClass: 'evidence-photo font-serif',
          headerBorder: 'border-b border-parchment-400 pb-1.5',
          badgeText: 'REGISTRO DE INSPECCIÓN OCULAR • PLACA N.º ' + dayData.day,
          badgeClass: 'bg-ink-900/15 text-ink-950 border border-parchment-600 font-mono',
          stampText: 'PRUEBA VISUAL',
          stampClass: 'border-crimson-700/80 text-crimson-800 rotate-[2deg]',
          bodyClass: 'font-reading text-xs sm:text-[13px] text-ink-900 leading-snug',
          icon: <Camera className="w-3.5 h-3.5 text-ink-800 shrink-0" />,
          showWaxSeal: false,
        };
      default:
        return {
          wrapperClass: 'typewriter-doc font-typewriter',
          headerBorder: 'border-b border-parchment-300 pb-1',
          badgeText: 'PRUEBA DOCUMENTAL',
          badgeClass: 'bg-parchment-200 text-ink-800 font-mono',
          stampText: 'EVIDENCIA',
          stampClass: 'border-crimson-700 text-crimson-700',
          bodyClass: 'font-typewriter text-xs text-ink-900 leading-snug',
          icon: <Scroll className="w-3.5 h-3.5 text-crimson-700 shrink-0" />,
          showWaxSeal: false,
        };
    }
  };

  const evidenceStyle = getEvidenceStyle(dayData.narrative.evidenceType);

  const getActRoman = (act: number) => {
    const romans: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
    return romans[act] || String(act);
  };

  const renderPuzzleEngine = () => {
    const puzzleKey = `${activeCase.config.seed}-${dayData.day}-${dayData.puzzle.type}`;
    switch (dayData.puzzle.type) {
      case 'wordsearch':
        return (
          <WordSearchPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'syllables':
        return (
          <SyllablesPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'cryptogram':
        return (
          <CryptogramPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'sudoku':
        return (
          <SudokuPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'murdoku':
        return (
          <MurdokuPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'crossword':
        return (
          <CrosswordPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'futoshiki':
        return (
          <FutoshikiPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'connections':
        return (
          <ConnectionsPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'nonogram':
        return (
          <NonogramPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'minesweeper':
        return (
          <MinesweeperPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'septagrama':
        return (
          <SeptagramaPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'codificados':
        return (
          <CodificadosPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'ecuaciones':
        return (
          <EcuacionesPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
      case 'encajados':
        return (
          <EncajadosPuzzle
            key={puzzleKey}
            config={dayData.puzzle.config}
            onSolve={handleSolveCurrentPuzzle}
            isSolved={isDayCompleted}
            hints={dayData.puzzle.hints}
          />
        );
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col justify-between items-center py-2 sm:py-3.5 lg:py-4 px-2.5 sm:px-5 lg:px-8 xl:px-12 relative select-none">
      {/* ================================================================
          BARRA SUPERIOR DE CUERO FRÍO (Fijar / Desfijar)
         ================================================================ */}
      <div className="w-full flex justify-center z-30 shrink-0">
        <header
          className={`relative header-leather-bar border-2 border-[#08090c] ring-1 ring-[#b79b65]/45 flex flex-wrap items-center justify-between transition-all duration-300 ease-in-out ${
            !isHeaderExpanded
              ? 'w-fit max-w-full rounded-full px-3.5 py-1 mb-1.5 mx-auto gap-1.5'
              : 'max-w-[1720px] w-full rounded-[6px] px-4 py-2 mb-2.5 gap-2'
          }`}
        >
          {/* Doble filete dorado interior y estrellas/remaches de latón cuando está expandida */}
          {isHeaderExpanded && (
            <>
              <div className="pointer-events-none absolute inset-[3px] rounded-[4px] border border-[#b79b65]/35" />
              <span className="pointer-events-none absolute top-1.5 left-1.5 w-1.5 h-1.5 rotate-45 bg-[#c5a059]" />
              <span className="pointer-events-none absolute top-1.5 right-1.5 w-1.5 h-1.5 rotate-45 bg-[#c5a059]" />
              <span className="pointer-events-none absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rotate-45 bg-[#c5a059]" />
              <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rotate-45 bg-[#c5a059]" />
            </>
          )}
          {/* Navegación de Días / Álbum */}
          <div
            className={`order-1 flex items-center gap-1.5 sm:gap-2.5 min-w-0 max-w-full ${
              !isHeaderExpanded ? '' : 'flex-1 lg:flex-none'
            }`}
          >
            {isHeaderExpanded && (
              <div className="hidden sm:block w-8 h-8 rounded-full overflow-hidden border border-[#c5a059]/75 shadow shrink-0 bg-[#08090c]">
                <img
                  src="./app-icon.jpg"
                  alt="Emblema Villa Acebo"
                  draggable={false}
                  className="pointer-events-none w-full h-full object-cover"
                />
              </div>
            )}
            <button
              type="button"
              onClick={handlePrevDay}
              disabled={currentDay <= 0}
              className={`${!isHeaderExpanded ? 'p-1' : 'p-1.5'} rounded-sm btn-ledger text-gold-300 disabled:opacity-30 transition shrink-0`}
              title="Página anterior"
              aria-label="Página o capítulo anterior"
            >
              <ChevronLeft className={!isHeaderExpanded ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>

            {!isHeaderExpanded ? (
              <span className="font-desc font-semibold text-xs text-parchment-100 px-1.5 whitespace-nowrap tracking-wide">
                {isAlbum ? 'Censo (74)' : `Día ${currentDay < 10 ? `0${currentDay}` : currentDay} · ${dayData.hourStr}`}
              </span>
            ) : (
              <div className="text-center px-1 sm:px-3 min-w-0 flex-1 sm:flex-none sm:min-w-[170px]">
                {isAlbum ? (
                  <>
                    <span className="text-[9px] uppercase font-mono tracking-widest text-gold-400 block truncate">
                      Censo Criminal • 1924
                    </span>
                    <span className="font-desc font-bold text-sm sm:text-base text-parchment-100 flex items-center justify-center gap-1.5 min-w-0">
                      <Users className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                      <span className="truncate">Álbum de los 74 Sospechosos</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] uppercase font-mono tracking-widest text-gold-400 block truncate">
                      Día {currentDay < 10 ? `0${currentDay}` : currentDay} · {dayData.hourStr}
                    </span>
                    <span className="font-desc font-bold text-sm sm:text-base text-parchment-100 block truncate">
                      {dayData.title}
                    </span>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleNextDay}
              disabled={currentDay >= totalDays}
              className={`${!isHeaderExpanded ? 'p-1' : 'p-1.5'} rounded-sm btn-ledger text-gold-300 disabled:opacity-30 transition shrink-0`}
              title="Página siguiente"
              aria-label="Página o capítulo siguiente"
            >
              <ChevronRight className={!isHeaderExpanded ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </div>

          {/* Controles centrales desplegables */}
          <div
            id="book-header-controls"
            aria-hidden={!isHeaderExpanded}
            className={`flex flex-wrap items-center justify-center sm:justify-between lg:justify-around xl:justify-between gap-2 transition-all duration-300 ease-in-out ${
              !isHeaderExpanded
                ? 'order-3 max-w-0 max-h-0 opacity-0 overflow-hidden pointer-events-none invisible'
                : 'order-3 lg:order-2 basis-full lg:basis-auto lg:flex-1 min-w-0 max-h-[200px] opacity-100'
            }`}
          >
            {/* Botón Distinto: Embudo de Deducción (Abre el panel piramidal del embudo) */}
            <button
              type="button"
              tabIndex={!isHeaderExpanded ? -1 : undefined}
              onClick={() => {
                sound.playClick();
                setIsFunnelModalOpen(true);
              }}
              className="group flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-sm border transition shadow-md min-w-0 max-w-full btn-ledger text-parchment-100 hover:border-gold-300"
              title="Abrir Embudo Forense: deducción y descarte de sospechosos"
            >
              <div className="p-1 rounded-sm flex items-center justify-center shrink-0 bg-crimson-900/80 text-gold-300 border border-crimson-700/40">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[9px] uppercase font-mono tracking-wider block leading-none text-gold-400 font-bold">
                  Embudo de Sospechosos
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-desc font-semibold text-xs sm:text-sm leading-none text-parchment-100">
                    {suspectFunnel.remaining} / {suspectFunnel.total}{' '}
                    <span className="font-normal text-[11px] opacity-85">Bajo Sospecha</span>
                  </span>
                  <div className="hidden sm:block w-14 h-1.5 rounded-full overflow-hidden bg-ink-950 border border-gold-700/30">
                    <div
                      className="h-full bg-gradient-to-r from-crimson-600 to-gold-300 transition-all duration-500"
                      style={{ width: `${suspectFunnel.percentageRemaining}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* Botones de acción derecha */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <button
                type="button"
                tabIndex={!isHeaderExpanded ? -1 : undefined}
                onClick={() => {
                  sound.playPageTurn();
                  onOpenPrologue();
                }}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-sm btn-ledger text-gold-200 text-xs sm:text-sm font-desc font-medium transition"
                title="Leer el Prólogo y ambientación de Villa Acebo (1924)"
              >
                <Compass className="w-3.5 h-3.5 text-gold-400" />
                <span className="hidden xl:inline">Prólogo</span>
              </button>

              <button
                type="button"
                tabIndex={!isHeaderExpanded ? -1 : undefined}
                onClick={() => {
                  sound.playClick();
                  onOpenActDoor(isAlbum ? 1 : dayData.act, false);
                }}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-sm btn-ledger text-gold-200 text-xs sm:text-sm font-desc font-medium transition"
                title="Consultar las 5 Puertas del Expediente"
              >
                <DoorOpen className="w-3.5 h-3.5 text-gold-400" />
                <span className="hidden xl:inline">Puertas</span>
              </button>

              <button
                type="button"
                tabIndex={!isHeaderExpanded ? -1 : undefined}
                onClick={() => {
                  sound.playClick();
                  onOpenCalendar();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm btn-ledger text-gold-200 text-xs sm:text-sm font-desc font-medium transition"
                title={`Abrir las ${totalDays} jornadas del Calendario de Investigación`}
              >
                <Calendar className="w-3.5 h-3.5 text-gold-400" />
                <span className="hidden md:inline">Calendario</span>
                <span className="px-1.5 py-0.5 bg-crimson-800 text-parchment-100 text-[10px] font-mono rounded-sm border border-gold-500/25">
                  {completedDays.length}/{totalDays}
                </span>
              </button>

              <button
                type="button"
                tabIndex={!isHeaderExpanded ? -1 : undefined}
                onClick={() => {
                  sound.playPageTurn();
                  onOpenDossier();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm btn-ledger text-gold-200 text-xs sm:text-sm font-desc font-medium transition"
                title="Abrir Cuaderno del Detective — Consulta en tiempo real"
              >
                <BookMarked className="w-3.5 h-3.5 text-gold-400" />
                <span className="hidden md:inline">Cuaderno</span>
                <span className="px-1.5 py-0.5 bg-gold-300 text-ink-950 text-[10px] font-mono font-bold rounded-sm">
                  {unlockedClues.length}
                </span>
              </button>

              <button
                type="button"
                tabIndex={!isHeaderExpanded ? -1 : undefined}
                onClick={() => {
                  onOpenVerdict();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm btn-crimson-wax text-parchment-50 text-xs sm:text-sm font-desc font-semibold transition"
                title="Emitir Acusación Formal y Veredicto"
              >
                <Gavel className="w-3.5 h-3.5 text-gold-300" />
                <span className="hidden xl:inline">Veredicto</span>
              </button>

              <button
                type="button"
                tabIndex={!isHeaderExpanded ? -1 : undefined}
                onClick={() => {
                  startNewCase();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm btn-ledger text-gold-200 text-xs sm:text-sm font-desc font-medium transition"
                title="Nuevo Caso: Generar una nueva partida con otro culpable aleatorio entre los 74"
                aria-label="Nuevo Caso"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gold-400" />
                <span className="hidden xl:inline">Nuevo Caso</span>
              </button>

              <button
                type="button"
                tabIndex={!isHeaderExpanded ? -1 : undefined}
                onClick={() => {
                  sound.playPageTurn();
                  changeBookCoverMode(bookCoverMode === 'open' ? 'front' : 'open');
                }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm text-xs sm:text-sm font-desc font-medium transition ${
                  bookCoverMode !== 'open'
                    ? 'bg-gold-300 text-ink-950 font-bold border border-gold-500 shadow'
                    : 'btn-ledger text-gold-200'
                }`}
                title={
                  bookCoverMode === 'open'
                    ? 'Cerrar la libreta momentáneamente para observar la sala'
                    : 'Reabrir la libreta del detective'
                }
              >
                {bookCoverMode === 'open' ? (
                  <>
                    <Book className="w-3.5 h-3.5 text-gold-400" />
                    <span className="hidden xl:inline">Cerrar</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-ink-950" />
                    <span className="hidden xl:inline">Abrir</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grupo persistente derecha: Globo del Detective + Botón Fijar / Desfijar */}
          <div
            className={`order-2 lg:order-3 flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              !isHeaderExpanded ? 'ml-1' : 'ml-auto lg:ml-0'
            }`}
          >
            <DetectiveHintBubble
              currentDay={currentDay}
              isAlbum={isAlbum}
              dayData={dayData}
              isDayCompleted={isDayCompleted}
              completedDays={completedDays}
              unlockedClues={unlockedClues}
              suspectFunnel={suspectFunnel}
              isHeaderCollapsed={!isHeaderExpanded}
            />

            <button
              type="button"
              data-testid="header-collapse-toggle"
              onClick={() => {
                sound.playClick();
                setIsHeaderPinned(prev => !prev);
              }}
              aria-expanded={isHeaderExpanded}
              aria-pressed={isHeaderPinned}
              aria-controls="book-header-controls"
              aria-label={isHeaderPinned ? 'Desfijar barra superior' : 'Fijar barra superior'}
              title={
                isHeaderPinned
                  ? 'Desfijar barra (se ocultará y abrirá al pasar el cursor)'
                  : 'Fijar barra en pantalla'
              }
              className={`flex items-center gap-1.5 rounded-sm border text-xs font-desc font-medium transition ${
                isHeaderPinned
                  ? 'btn-ledger text-gold-200 border-gold-400/50'
                  : 'btn-ledger text-parchment-300 hover:text-gold-200'
              } ${!isHeaderExpanded ? 'px-2 py-1' : 'p-1.5 sm:px-2.5 sm:py-1.5'}`}
            >
              {isHeaderPinned ? (
                <>
                  <PinOff className="w-3.5 h-3.5 text-gold-300" />
                  <span className="hidden sm:inline">Desfijar</span>
                </>
              ) : (
                <>
                  <Pin className="w-3.5 h-3.5 text-gold-400" />
                  <span>Fijar</span>
                </>
              )}
            </button>
          </div>
        </header>
      </div>

      {/* Selector móvil de pliego para capítulos diarios y puertas */}
      {(!isAlbum || doorPreviewAct !== null) && bookCoverMode === 'open' && (
        <div className="lg:hidden w-full flex justify-center mb-2 z-20 shrink-0">
          <div className="w-full max-w-md bg-ink-950/95 p-1 rounded-md border border-gold-500/35 grid grid-cols-2 gap-1 text-xs shadow-lg">
            <button
              type="button"
              aria-pressed={mobilePage === 'left'}
              onClick={() => {
                sound.playPageTurn();
                setMobilePage('left');
              }}
              className={`px-2.5 py-1.5 rounded-sm font-desc font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                mobilePage === 'left'
                  ? 'bg-gold-300 text-ink-950 shadow'
                  : 'text-parchment-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              {doorPreviewAct !== null || (!isAlbum && !openedDoors.includes(dayData.act)) ? (
                <>
                  <span className="sm:hidden">Puerta</span>
                  <span className="hidden sm:inline">Pliego Izquierdo: Puerta</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Relato</span>
                  <span className="hidden sm:inline">Pliego Izquierdo: Relato</span>
                </>
              )}
            </button>
            <button
              type="button"
              aria-pressed={mobilePage === 'right'}
              onClick={() => {
                sound.playPageTurn();
                setMobilePage('right');
              }}
              className={`px-2.5 py-1.5 rounded-sm font-desc font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                mobilePage === 'right'
                  ? 'bg-crimson-800 text-parchment-50 shadow'
                  : 'text-parchment-300 hover:text-white'
              }`}
            >
              <Puzzle className="w-3.5 h-3.5 shrink-0" />
              {doorPreviewAct !== null || (!isAlbum && !openedDoors.includes(dayData.act)) ? (
                <>
                  <span className="sm:hidden">Expediente</span>
                  <span className="hidden sm:inline">Pliego Derecho: Expediente</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Pasatiempo</span>
                  <span className="hidden sm:inline">Pliego Derecho: Pasatiempo</span>
                  {isDayCompleted && (
                    <span className="w-4 h-4 rounded-full bg-gold-300 text-ink-950 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          TOMO ARTESANAL DE CUERO PESADO — ACOPLADO A PANTALLA SIN SCROLL
         ================================================================ */}
      <main className="max-w-[1720px] w-full flex-1 min-h-0 flex items-center justify-center z-10 pb-1 px-3 sm:px-4 overflow-hidden">
        {bookCoverMode !== 'open' ? (
          /* ============================================================
             LIBRETA CERRADA (PORTADA Y CONTRAPORTADA 1924 EN 3D REAL)
             ============================================================ */
          <div className="relative flex flex-col items-center justify-center w-full h-full">
            <div
              className={`h-[88%] max-h-[760px] transition-transform duration-500 ease-out ${
                bookCoverMode === 'front'
                  ? 'aspect-[674/993] translate-x-6 sm:translate-x-14 lg:translate-x-24'
                  : 'aspect-[691/995] -translate-x-6 sm:-translate-x-14 lg:-translate-x-24'
              }`}
            >
              {/* Tomo físico arrastrable con retorno elástico */}
              <div
                onPointerDown={handleClosedBookPointerDown}
                onPointerMove={handleClosedBookPointerMove}
                onPointerUp={handleClosedBookPointerUp}
                onPointerCancel={handleClosedBookPointerUp}
                onDragStart={e => e.preventDefault()}
                style={{
                  transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.015}deg)`,
                }}
                className={`relative w-full h-full select-none touch-none ${
                  isDraggingBook
                    ? 'cursor-grabbing transition-none'
                    : 'cursor-grab transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
                }`}
              >
                {bookCoverMode === 'front' ? (
                  /* ==================== PORTADA OFICIAL ==================== */
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src="./portraits/book-front.png"
                      alt="Portada de la Libreta de Investigación: Villa Acebo — Un Asesinato en Navidad"
                      draggable={false}
                      className="pointer-events-none w-full h-full object-fill drop-shadow-[0_28px_65px_rgba(0,0,0,0.96)]"
                    />

                    {/* Botones interactivos invisibles mapeados con precisión pixel-perfect sobre el arte */}
                    <button
                      type="button"
                      onClick={() => {
                        sound.playPageTurn();
                        changeBookCoverMode('back');
                      }}
                      style={{
                        left: '47.92%',
                        top: '81.97%',
                        width: '15.58%',
                        height: '4.03%',
                      }}
                      aria-label="Ver Final (Contraportada)"
                      className="absolute rounded-[4px] hover:ring-1 hover:ring-[#d4b354]/70 hover:bg-[#d4b354]/10 active:scale-[0.98] transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#d4b354]"
                      title="Girar libreta hacia la contraportada"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        sound.playPageTurn();
                        changeBookCoverMode('open');
                      }}
                      style={{
                        left: '65.58%',
                        top: '81.97%',
                        width: '21.96%',
                        height: '4.03%',
                      }}
                      aria-label="Abrir Libreta del Detective"
                      className="absolute rounded-[4px] hover:ring-1 hover:ring-[#e5ca8f]/80 hover:bg-[#e5ca8f]/10 active:scale-[0.98] transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#e5ca8f]"
                      title="Abrir expediente e iniciar la investigación"
                    />
                  </div>
                ) : (
                  /* ==================== CONTRAPORTADA OFICIAL ==================== */
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src="./portraits/book-back.png"
                      alt="Contraportada con Sello de Custodia de Villa Acebo"
                      draggable={false}
                      className="pointer-events-none w-full h-full object-fill drop-shadow-[0_28px_65px_rgba(0,0,0,0.96)]"
                    />

                    {/* Botones de navegación en la contraportada posicionados limpiamente en la piel inferior */}
                    <div
                      style={{ bottom: '9%' }}
                      className="absolute inset-x-8 flex items-center justify-between gap-3 z-20"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          sound.playPageTurn();
                          changeBookCoverMode('front');
                        }}
                        className="px-3.5 py-1.5 rounded-[4px] bg-[#14171d]/90 hover:bg-[#202530] border border-[#b79b65]/80 text-[10px] sm:text-[11px] font-serif font-bold uppercase tracking-wider text-[#e5ca8f] shadow-lg transition active:scale-95"
                      >
                        Ver Portada
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playPageTurn();
                          changeBookCoverMode('open');
                        }}
                        className="px-4 py-1.5 rounded-[4px] bg-gradient-to-b from-[#6e171e] to-[#480c11] hover:from-[#841c25] hover:to-[#5c0f16] border border-[#c5a059] text-xs font-serif font-bold text-parchment-50 flex items-center gap-1.5 shadow-lg transition active:scale-95"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#e5ca8f]" />
                        <span>Abrir Libreta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
        <div className="relative w-full h-full max-h-[880px] rounded-xl book-cover-leather p-2.5 sm:p-3.5 border-2 border-[#08090c] flex">
          {/* Detalles de desgaste pictórico y marco de filete dorado interior */}
          <div className="pointer-events-none absolute inset-0 rounded-xl book-arcane-wear z-0" />
          <div className="pointer-events-none absolute inset-1.5 rounded-lg border border-[#b79b65]/40 z-20" />

          {/* Hojas laterales decorativas contenidas dentro del borde exterior */}
          <div className="pointer-events-none absolute -left-2 sm:-left-2.5 top-16 w-4 sm:w-5 h-36 bg-[#ede6d6] border border-[#b8ab96] rounded-l-sm -rotate-[1.5deg] shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-0" />
          <div className="pointer-events-none absolute -left-1.5 sm:-left-2 top-56 w-3.5 sm:w-4 h-44 bg-[#e5decd] border border-[#a89c85] rounded-l-sm rotate-[1deg] shadow-[0_4px_10px_rgba(0,0,0,0.45)] z-0" />
          <div className="pointer-events-none absolute -left-1 sm:-left-1.5 bottom-16 w-3 sm:w-4 h-28 bg-[#dfd6c3] border border-[#9e927c] rounded-l-sm -rotate-[1.5deg] shadow-[0_4px_8px_rgba(0,0,0,0.4)] z-0" />

          <div className="pointer-events-none absolute -right-2 sm:-right-2.5 top-20 w-4 sm:w-5 h-40 bg-[#ede6d6] border border-[#b8ab96] rounded-r-sm rotate-[1.5deg] shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-0" />
          <div className="pointer-events-none absolute -right-1.5 sm:-right-2 top-64 w-3.5 sm:w-4 h-36 bg-[#e5decd] border border-[#a89c85] rounded-r-sm -rotate-[1deg] shadow-[0_4px_10px_rgba(0,0,0,0.45)] z-0" />
          <div className="pointer-events-none absolute -right-1 sm:-right-1.5 bottom-20 w-3 sm:w-4 h-32 bg-[#dfd6c3] border border-[#9e927c] rounded-r-sm rotate-[1.5deg] shadow-[0_4px_8px_rgba(0,0,0,0.4)] z-0" />

          {/* Video chroma-key de manos sujetando el libro desde atrás (solo con libreta abierta) */}
          <ParanormalHandsVideo
            active={handsActive && bookCoverMode === 'open'}
            onComplete={() => setHandsActive(false)}
          />
          {/* Hoja física apilada con pliegue natural central */}
          <div
            key={`spread-${currentDay}`}
            className={`relative w-full h-full bg-parchment-100 rounded-md overflow-hidden book-pages-edge flex flex-col justify-between ${
              pageDir === 'next' ? 'animate-page-turn' : 'animate-page-turn-prev'
            }`}
          >
            {/* Pliegue cosido orgánico del centro del libro (sin barra geométrica artificial) */}
            <div className="hidden lg:block pointer-events-none absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 book-center-seam z-20" />

            {/* Hoja fantasma barriendo al pasar de página */}
            <div
              key={`leaf-${currentDay}`}
              className={`hidden lg:block pointer-events-none absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-[#d8d2c6]/80 via-[#f2efe8]/60 to-[#e6e1d7]/80 z-30 ${
                pageDir === 'next' ? 'left-1/2 animate-leaf-next' : 'right-1/2 animate-leaf-prev'
              }`}
            />

            {doorPreviewAct !== null || (!isAlbum && !openedDoors.includes(dayData.act)) ? (
              /* ========================================================
                  PUERTA FÍSICA DEL ACTO (1–5) INTEGRADA EN EL LIBRO
                 ======================================================== */
              (() => {
                const targetAct = (doorPreviewAct ?? dayData.act) as 1 | 2 | 3 | 4 | 5;
                const actFile = activeCase.acts.find(a => a.act === targetAct) ?? activeCase.acts[0];
                const unlocked = isActUnlocked(targetAct, completedDays);
                const prevStart = (targetAct - 2) * 6 + 1;
                const prevEnd = (targetAct - 1) * 6;
                const prevDone =
                  targetAct <= 1
                    ? 6
                    : completedDays.filter(d => d >= prevStart && d <= prevEnd).length;

                return (
                  <BookDoorSpread
                    key={`door-${targetAct}`}
                    actFile={actFile}
                    isUnlocked={unlocked}
                    prevActCompletedCount={prevDone}
                    mobilePage={mobilePage}
                    onTestUnlockDoor={() => {
                      if (targetAct > 1) {
                        handleTestCompleteAct(targetAct - 1);
                      }
                    }}
                    onCrossDoor={() => {
                      openDoor(targetAct);
                      setDoorPreviewAct(null);
                      if (currentDay < actFile.dayStart || currentDay > actFile.dayEnd) {
                        setCurrentDay(actFile.dayStart);
                      }
                    }}
                    onGoBack={() => {
                      setDoorPreviewAct(null);
                      if (targetAct === 1) {
                        setCurrentDay(0);
                      } else {
                        const prevLastDay = (targetAct - 1) * 6;
                        setCurrentDay(prevLastDay);
                      }
                    }}
                  />
                );
              })()
            ) : isAlbum ? (
              /* ========================================================
                  VISTA ÁLBUM (DÍA 0): ÁLBUM FOTOGRÁFICO PAGINADO
                 ======================================================== */
              <SuspectsAlbum onStartAdventure={() => navigateToDay(1)} />
            ) : (
              /* ========================================================
                  VISTA DÍA 1-24: DOBLE PLIEGO (RELATO + PASATIEMPO)
                 ======================================================== */
              <div className="w-full h-full flex flex-col lg:flex-row flex-1 min-h-0">
                {/* PÁGINA IZQUIERDA (VERSO): RELATO Y PRUEBA DOCUMENTAL */}
                <section
                  className={`page-verso lg:w-1/2 p-4 sm:p-5 lg:p-6 lg:pr-8 flex flex-col justify-between font-reading relative min-w-0 min-h-0 ${
                    mobilePage === 'left' ? 'flex' : 'hidden lg:flex'
                  }`}
                >
                  {/* Cinta marcapáginas sobria */}
                  <div
                    className="absolute top-0 right-6 w-5 h-10 bg-gradient-to-b from-crimson-800 via-crimson-700 to-crimson-950 shadow-md rounded-b-sm flex items-end justify-center pb-1 text-gold-200 border-x border-gold-400/20 z-10"
                    title={`Capítulo ${dayData.day} de ${totalDays}`}
                  >
                    <span className="text-[9px] font-mono tracking-tighter text-gold-200/90">
                      {dayData.day < 10 ? `0${dayData.day}` : dayData.day}
                    </span>
                  </div>

                  {/* Cuerpo central con ajuste fluido al alto disponible */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-600 border-b border-parchment-400/70 pb-1 mb-2 pr-8">
                        <span>Crónica de Villa Acebo • Acto {getActRoman(dayData.act)}</span>
                        <span className="font-semibold text-crimson-700">
                          {dayData.dateStr} • {dayData.hourStr}
                        </span>
                      </div>

                      {(() => {
                        const actCrime = activeCase.acts.find(a => a.act === dayData.act);
                        if (!actCrime) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              onOpenActDoor(dayData.act, false);
                            }}
                            className="w-full mb-2 px-2.5 py-1.5 rounded-sm bg-parchment-200/80 hover:bg-parchment-300/75 border border-crimson-800/30 flex items-center justify-between gap-2 text-left transition group"
                            title={`Ver Puerta ${actCrime.doorNumber} y expediente forense de ${actCrime.victimName}`}
                          >
                            <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-crimson-900 min-w-0">
                              <Skull className="w-3.5 h-3.5 text-crimson-800 shrink-0" />
                              <span className="truncate">
                                Puerta {actCrime.doorRoman} • Víctima: {actCrime.victimName}
                              </span>
                            </span>
                            <span className="text-[9px] font-mono uppercase tracking-wider text-ink-700 group-hover:text-crimson-900 shrink-0 inline-flex items-center gap-0.5">
                              <DoorOpen className="w-3 h-3" /> Abrir
                            </span>
                          </button>
                        );
                      })()}

                      <div className="text-center mb-2.5">
                        <span className="inline-block px-2 py-0.5 rounded-sm bg-parchment-200/90 border border-parchment-400 text-[9px] font-mono uppercase tracking-widest text-crimson-800 font-bold mb-0.5">
                          Capítulo {dayData.day < 10 ? `0${dayData.day}` : dayData.day}
                        </span>
                        <h1 className="font-title text-2xl sm:text-3xl lg:text-[34px] text-ink-950 leading-none pt-0.5">
                          {dayData.title}
                        </h1>
                        <p className="text-xs sm:text-sm italic text-ink-700 font-desc mt-0.5">
                          — {dayData.subtitle} —
                        </p>
                      </div>

                      {/* Contenido del Relato */}
                      <div className="space-y-2 text-[13.5px] sm:text-[14.5px] leading-[1.45] text-ink-900 text-justify font-reading font-normal">
                        {dayData.narrative.storyText.map((p, idx) => (
                          <p key={idx} className={idx === 0 ? 'clearfix' : 'indent-4'}>
                            {idx === 0 && (
                              <span className="drop-cap-victorian">
                                {p.charAt(0)}
                              </span>
                            )}
                            {idx === 0 ? p.slice(1) : p}
                          </p>
                        ))}
                      </div>

                      {/* Auto-declaración / cita (se mantiene intacta) */}
                      {dayData.narrative.characterQuote && (
                        <div className="my-2.5 p-2 sm:p-2.5 bg-parchment-200/70 border border-crimson-800/45 text-xs italic text-ink-800 shadow-sm">
                          <div className="flex items-start gap-2">
                            <Quote className="w-3.5 h-3.5 text-crimson-700/60 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-declaration text-xs text-ink-900 leading-snug break-words">
                                «{dayData.narrative.characterQuote.quote}»
                              </p>
                              <span className="block mt-0.5 text-[10px] font-bold not-italic font-mono uppercase tracking-wider text-crimson-900 text-right">
                                — {dayData.narrative.characterQuote.author}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Documento Probatorio Dinámico */}
                      <div
                        className={`mt-2.5 p-2.5 sm:p-3 rounded-sm relative transition-all min-w-0 ${evidenceStyle.wrapperClass}`}
                      >
                        {evidenceStyle.showWaxSeal && (
                          <div
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full wax-seal-badge flex items-center justify-center text-[9px] text-gold-200 font-serif font-bold shadow-md pointer-events-none"
                            title="Lacre de la Familia Valdemar"
                          >
                            V
                          </div>
                        )}

                        <div
                          className={`flex flex-wrap items-center justify-between gap-1.5 mb-1.5 ${evidenceStyle.headerBorder}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {evidenceStyle.icon}
                            <span
                              className={`text-[8.5px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold break-words ${evidenceStyle.badgeClass}`}
                            >
                              {evidenceStyle.badgeText}
                            </span>
                          </div>

                          <span
                            className={`text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.2 border rounded-sm tracking-widest shrink-0 ${evidenceStyle.stampClass}`}
                          >
                            {evidenceStyle.stampText}
                          </span>
                        </div>

                        <div className="font-desc font-semibold uppercase tracking-wider text-[11px] text-crimson-900 mb-0.5 break-words">
                          {dayData.narrative.evidenceTitle}
                        </div>

                        <p className={`${evidenceStyle.bodyClass} break-words`}>
                          {dayData.narrative.evidenceContent}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pie de Página Izquierda */}
                  <div className="mt-2 pt-2 border-t border-parchment-400/70 space-y-1.5 shrink-0">
                    {isDayCompleted ? (
                      <div className="p-2 bg-gold-100/80 border border-gold-500 rounded-sm flex items-start gap-2 animate-wax-pop shadow-sm">
                        <div className="w-6 h-6 rounded-full wax-seal-badge text-gold-200 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="font-bold text-[9px] font-mono uppercase tracking-wider text-crimson-900">
                              Deducción Confirmada
                            </span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-crimson-800/10 text-crimson-800 rounded-sm">
                              {dayData.unlockedClue.impact}
                            </span>
                          </div>
                          <p className="font-reading text-xs font-semibold text-ink-950 mt-0.5 leading-snug break-words">
                            «{dayData.unlockedClue.text}»
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="px-2.5 py-1.5 rounded-sm bg-parchment-200/70 border border-dashed border-parchment-400 text-[11px] font-desc italic text-ink-700 text-center flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-gold-600 shrink-0" />
                        <span>
                          Resuelve el enigma del pliego derecho para lacrar la deducción del Día {dayData.day}.
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs font-desc text-ink-600">
                      <button
                        onClick={handlePrevDay}
                        disabled={currentDay <= 0}
                        className="flex items-center gap-0.5 hover:text-crimson-800 disabled:opacity-30 transition font-semibold"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>{currentDay === 1 ? 'Álbum' : `Día ${currentDay - 1}`}</span>
                      </button>
                      <span className="font-mono text-[10px] tracking-widest uppercase">
                        — Pág. {currentDay * 2 - 1} —
                      </span>
                      <span className="text-[11px] italic text-ink-500 hidden sm:inline">
                        Villa Acebo, 1924
                      </span>
                    </div>
                  </div>
                </section>

                {/* PÁGINA DERECHA (RECTO): MOTOR DE PASATIEMPO */}
                <section
                  className={`page-recto lg:w-1/2 p-4 sm:p-5 lg:p-6 lg:pl-8 flex flex-col justify-between font-reading border-t lg:border-t-0 border-parchment-400/70 min-w-0 min-h-0 ${
                    mobilePage === 'right' ? 'flex' : 'hidden lg:flex'
                  }`}
                >
                  <div className="shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-600 border-b border-parchment-400/70 pb-1 mb-2">
                      <span>Gabinete de Criptografía y Lógica</span>
                      <span>Expediente N.º {dayData.day < 10 ? `0${dayData.day}` : dayData.day}/{totalDays}</span>
                    </div>

                    <div className="border-b border-parchment-300 pb-2 mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-gold-700 font-bold block">
                          Desafío Mental de Adviento
                        </span>
                        <h2 className="font-desc text-sm sm:text-base font-medium italic text-ink-950 leading-snug mt-0.5 break-words">
                          {dayData.puzzle.instructions}
                        </h2>
                      </div>

                      {isDayCompleted ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-gold-100 wax-seal-badge px-2.5 py-0.5 rounded-full shadow-sm shrink-0 animate-wax-pop">
                          <CheckCircle className="w-3 h-3 text-gold-200" />
                          <span>Lacrado</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={handleSolveCurrentPuzzle}
                            className="px-2 py-1 rounded bg-amber-400 hover:bg-amber-300 text-ink-950 font-mono text-[10px] font-black uppercase tracking-wider border border-ink-900 shadow-sm transition"
                            title="[TEST TEMPORAL] Completar acertijo de este día automáticamente"
                          >
                            [TEST] Omitir Día
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestCompleteAct(dayData.act)}
                            className="px-2 py-1 rounded bg-emerald-400 hover:bg-emerald-300 text-ink-950 font-mono text-[10px] font-black uppercase tracking-wider border border-ink-900 shadow-sm transition"
                            title="[TEST TEMPORAL] Completar los 6 acertijos de este acto automáticamente"
                          >
                            [TEST] Completar Acto {dayData.act}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Renderizado del Puzzle con contención sin romper el alto ni recortar arriba */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col w-full">
                    <div className="my-auto w-full">{renderPuzzleEngine()}</div>
                  </div>

                  <div data-toolbar="true" className="pt-2 mt-2 border-t border-parchment-400/70 flex items-center justify-between gap-2 shrink-0">
                    <span className="font-mono text-[10px] tracking-widest uppercase text-ink-600">
                      — Pág. {currentDay * 2} —
                    </span>

                    <div className="flex items-center gap-2">
                      {isDayCompleted && currentDay < totalDays && (
                        <button
                          onClick={handleNextDay}
                          className="flex items-center gap-1.5 px-3.5 py-1 rounded-sm btn-crimson-wax text-gold-100 text-xs font-desc font-semibold transition hover:scale-[1.02]"
                        >
                          <span>Pasar al Día {currentDay + 1}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gold-300" />
                        </button>
                      )}

                      {isDayCompleted && currentDay === totalDays && (
                        <button
                          onClick={onOpenVerdict}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-sm bg-gold-300 hover:bg-gold-200 text-ink-950 border border-gold-500 text-xs sm:text-sm font-desc font-bold shadow-lg transition hover:scale-105 animate-pulse"
                        >
                          <Gavel className="w-4 h-4" />
                          <span>Emitir Veredicto Final</span>
                        </button>
                      )}

                      {!isDayCompleted && currentDay < totalDays && (
                        <button
                          onClick={handleNextDay}
                          className="flex items-center gap-0.5 text-xs font-desc font-semibold text-ink-600 hover:text-crimson-800 transition"
                        >
                          <span>Día {currentDay + 1}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      {/* ================================================================
          MODAL DEDICADO: EMBUDO DE SOSPECHOSOS (DEDUCCIÓN PIRAMIDAL)
         ================================================================ */}
      {isFunnelModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => {
            sound.playClick();
            setIsFunnelModalOpen(false);
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative book-cover-leather border-2 border-[#08090c] ring-1 ring-[#b79b65]/45 rounded-lg max-w-2xl w-full flex flex-col shadow-[0_34px_90px_rgba(0,0,0,0.96)] overflow-hidden font-reading animate-page-turn"
          >
            <div className="pointer-events-none absolute inset-0 book-arcane-wear z-0" />

            {/* Cabecera del Embudo */}
            <div className="relative z-10 header-leather-bar p-4 border-b border-[#b79b65]/35 text-gold-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-[#c5a059]/75 bg-[#08090c] flex items-center justify-center shadow-md shrink-0">
                  <img
                    src="./app-icon.jpg"
                    alt="Emblema Villa Acebo"
                    draggable={false}
                    className="pointer-events-none w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#dec48c]/85 block">
                    Protocolo Forense • Villa Acebo
                  </span>
                  <h3 className="font-title text-xl sm:text-2xl text-[#e5ca8f] leading-none pt-0.5">
                    Embudo de Deducción de Sospechosos
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsFunnelModalOpen(false);
                }}
                className="text-parchment-300 hover:text-white p-1 rounded hover:bg-white/10 transition"
                title="Cerrar embudo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido sobre papel de archivo */}
            <div className="relative z-10 p-4 sm:p-6 bg-[#efeade] space-y-4 max-h-[82vh] overflow-y-auto">
              <p className="text-xs sm:text-[13px] text-ink-900 leading-relaxed bg-[#e4decb] p-3 rounded-[3px] border border-[#b5ab96]">
                El <strong>Embudo de Deducción</strong> rastrea cómo las {totalDays} pruebas forenses reducen en igualdad de condiciones los{' '}
                <strong>74 sospechosos</strong>, las <strong>{WEAPONS.length} armas</strong> y las <strong>{LOCATIONS.length} estancias</strong> hasta aislar a <strong>1 único culpable</strong>.
              </p>

              {/* Pirámide visual dinámica del Embudo */}
              <div className="space-y-2.5">
                <div className="p-3 rounded-[3px] bg-[#14171e] text-parchment-100 border border-[#b79b65]/50 flex items-center justify-between gap-3 shadow">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#c5a059] text-ink-950 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="font-serif text-sm text-[#e5ca8f] block">
                        Censo Igualitario de Villa Acebo
                      </strong>
                      <span className="text-[11px] font-mono text-parchment-300 block">
                        Familia (12) • Invitados (18) • Servicio (24) • Valle (20)
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-[#e5ca8f]">74 / 74</span>
                </div>

                <div className="p-3 rounded-[3px] bg-[#e1d9c7] border border-[#8e8474] flex items-center justify-between gap-3 text-ink-950 shadow-sm ml-3 sm:ml-5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-crimson-800 text-parchment-50 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="font-serif text-sm block">Sospechosos Compatibles con las Pruebas</strong>
                      <span className="text-[11px] font-desc italic text-ink-700 block">
                        {suspectFunnel.eliminated} descartados entre pruebas y notas manuales
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-crimson-800">
                    {clueEval.matchingSuspectIds.length} / 74
                  </span>
                </div>

                <div className="p-3 rounded-[3px] bg-[#d5cbba] border-2 border-crimson-800/60 flex items-center justify-between gap-3 text-ink-950 shadow-sm ml-6 sm:ml-10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#1b2432] text-[#e5ca8f] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="font-serif text-sm text-crimson-950 block">
                        Armas Compatibles
                      </strong>
                      <span className="text-[11px] font-desc italic text-ink-700 block">
                        De los {WEAPONS.length} objetos inventariados en la mansión
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-ink-950">
                    {clueEval.matchingWeaponIds.length} / {WEAPONS.length}
                  </span>
                </div>

                <div className="p-3 rounded-[3px] bg-[#c8bcab] border border-ink-800 flex items-center justify-between gap-3 text-ink-950 shadow-sm ml-9 sm:ml-16">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#8b6a28] text-parchment-50 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div>
                      <strong className="font-serif text-sm block">Estancias Compatibles</strong>
                      <span className="text-[11px] font-desc italic text-ink-700 block">
                        Planta Baja, Planta Alta y Sótano ({LOCATIONS.length} estancias)
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-ink-950">
                    {clueEval.matchingRoomIds.length} / {LOCATIONS.length}
                  </span>
                </div>

                <div className="p-3 rounded-[3px] bg-[#6b141e] text-parchment-50 border-2 border-gold-400 flex items-center justify-between gap-3 shadow-md ml-12 sm:ml-20">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-gold-300 text-ink-950 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      5
                    </span>
                    <div>
                      <strong className="font-serif text-sm text-gold-200 block">
                        Resolución Única del Caso #{activeCase.config.seed % 10000}
                      </strong>
                      <span className="text-[11px] font-mono text-parchment-200 block">
                        1 Culpable • 1 Arma • 1 Estancia ({unlockedClues.length}/{totalDays} pruebas)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFunnelModalOpen(false);
                      startNewCase();
                    }}
                    className="px-2.5 py-1 rounded bg-gold-300 hover:bg-gold-200 text-ink-950 font-mono text-[11px] font-bold flex items-center gap-1 transition"
                    title="Generar una nueva partida con otro culpable aleatorio entre los 74"
                  >
                    <RefreshCw className="w-3 h-3" /> Nuevo Caso
                  </button>
                </div>
              </div>

              {/* Botones de acción directa */}
              <div className="pt-2 border-t border-[#b5ab96] flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playPageTurn();
                    setIsFunnelModalOpen(false);
                    navigateToDay(0);
                  }}
                  className="px-3.5 py-2 rounded-[3px] btn-ledger text-gold-200 text-xs font-serif font-bold transition flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-gold-400" />
                  <span>Explorar Álbum de los 74 Sospechosos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playPageTurn();
                    setIsFunnelModalOpen(false);
                    onOpenDossier();
                  }}
                  className="px-3.5 py-2 rounded-[3px] bg-[#14171d] hover:bg-[#202530] border border-[#b79b65] text-gold-300 text-xs font-serif font-bold transition flex items-center gap-1.5"
                >
                  <BookMarked className="w-4 h-4 text-gold-400" />
                  <span>Abrir Cuaderno del Detective</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
