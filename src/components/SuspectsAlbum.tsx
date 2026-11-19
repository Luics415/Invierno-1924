import React, { useState, useMemo, useRef } from 'react';
import { SUSPECTS_DIRECTORY, type DirectorySuspect } from '../data/suspectsDirectory';
import { VICTIM } from '../data/narrativeBible';
import { GENDER_LABELS } from '../types/game';
import {
  ACCESS_LEVEL_SHORT,
  FORENSIC_TRACE_LABEL,
  HANDEDNESS_SHORT,
  PRESENCE_WING_LABEL,
  VISUAL_MARKER_SHORT,
} from '../engine/clueLabels';
import { computeSuspectStatus, useGameStore } from '../store/useGameStore';
import { sound } from '../utils/soundEffects';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  EyeOff,
  Quote,
  Fingerprint,
  Users,
  ShieldAlert,
  User,
  Skull,
  X,
  Check,
  ZoomIn,
  ZoomOut,
  Paperclip,
  RotateCw
} from 'lucide-react';

interface SuspectsAlbumProps {
  onStartAdventure: () => void;
}

interface SuspectStatusResult {
  isEliminated: boolean;
  reason?: string;
  dayEliminated?: number;
  isManual: boolean;
}

export const SuspectsAlbum: React.FC<SuspectsAlbumProps> = ({ onStartAdventure }) => {
  const {
    toggleManualElimination,
    manualEliminations,
    unlockedClues,
    activeCase,
  } = useGameStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'eliminated'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedSuspect, setSelectedSuspect] = useState<DirectorySuspect | null>(null);
  const [failedPortraits, setFailedPortraits] = useState<Record<string, boolean>>({});
  const [albumPage, setAlbumPage] = useState(0);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev'>('next');
  const [isPhotoFlipped, setIsPhotoFlipped] = useState(false);

  // Conteo dinámico del embudo (74 -> 1) basado en pistas + descartes manuales
  const { suspectsWithStatus, activeCount, eliminatedCount, categoryStats } = useMemo(() => {
    let active = 0;
    let eliminated = 0;
    const catMap: Record<string, { total: number; active: number }> = {
      'Familia Valdemar': { total: 0, active: 0 },
      'Invitados de Gala': { total: 0, active: 0 },
      'Servicio de la Mansión': { total: 0, active: 0 },
      'Habitantes del Valle': { total: 0, active: 0 },
    };

    const list: Array<DirectorySuspect & { status: SuspectStatusResult }> = [];
    for (const s of SUSPECTS_DIRECTORY) {
      const status = computeSuspectStatus(s, manualEliminations, unlockedClues, activeCase);
      if (catMap[s.category]) {
        catMap[s.category].total++;
        if (!status.isEliminated) {
          catMap[s.category].active++;
        }
      }
      if (status.isEliminated) {
        eliminated++;
      } else {
        active++;
      }
      list.push({ ...s, status });
    }

    return {
      suspectsWithStatus: list,
      activeCount: active,
      eliminatedCount: eliminated,
      categoryStats: catMap,
    };
  }, [manualEliminations, unlockedClues, activeCase]);

  const selectedStatus = useMemo(() => {
    if (!selectedSuspect) return null;
    return computeSuspectStatus(selectedSuspect, manualEliminations, unlockedClues, activeCase);
  }, [selectedSuspect, manualEliminations, unlockedClues, activeCase]);

  // Estado de la fotografía sujeta con clip dentro del expediente
  const [isPhotoAside, setIsPhotoAside] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoDrag, setPhotoDrag] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const photoDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const photoDidDragRef = useRef(false);

  const openSuspectModal = (s: DirectorySuspect) => {
    sound.playPageTurn();
    setIsPhotoAside(false);
    setIsPhotoFlipped(false);
    setPhotoZoom(1);
    setPhotoDrag({ x: 0, y: 0 });
    setIsDraggingPhoto(false);
    setSelectedSuspect(s);
  };

  const closeSuspectModal = () => {
    setSelectedSuspect(null);
    setIsPhotoAside(false);
    setIsPhotoFlipped(false);
    setPhotoZoom(1);
    setPhotoDrag({ x: 0, y: 0 });
    setIsDraggingPhoto(false);
  };

  const handlePhotoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    photoDragStartRef.current = { x: e.clientX - photoDrag.x, y: e.clientY - photoDrag.y };
    photoDidDragRef.current = false;
    setIsDraggingPhoto(true);
  };

  const handlePhotoPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPhoto || !photoDragStartRef.current) return;
    const nx = e.clientX - photoDragStartRef.current.x;
    const ny = e.clientY - photoDragStartRef.current.y;
    if (Math.abs(nx - photoDrag.x) > 3 || Math.abs(ny - photoDrag.y) > 3) {
      photoDidDragRef.current = true;
    }
    setPhotoDrag({ x: nx, y: ny });
  };

  const handlePhotoPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPhoto) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    photoDragStartRef.current = null;
    setIsDraggingPhoto(false);
    // La fotografía permanece en la posición arrastrada para lectura cómoda.
    // Solo vuelve a su origen cuando se cierra y vuelve a abrir el expediente.
    if (!photoDidDragRef.current) {
      sound.playClick();
      setIsPhotoFlipped(prev => !prev);
    }
  };

  // Filtrado
  const filteredSuspects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return suspectsWithStatus.filter(s => {
      const paddedNumber = s.number < 10 ? `0${s.number}` : `${s.number}`;
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.role.toLowerCase().includes(query) ||
        s.trait.toLowerCase().includes(query) ||
        s.relation.toLowerCase().includes(query) ||
        paddedNumber.includes(query) ||
        `#${paddedNumber}`.includes(query);

      if (!matchesSearch) return false;
      if (statusFilter === 'active' && s.status.isEliminated) return false;
      if (statusFilter === 'eliminated' && !s.status.isEliminated) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;

      return true;
    });
  }, [suspectsWithStatus, searchQuery, statusFilter, categoryFilter]);

  // Paginación física del álbum: 12 retratos por pliego doble (6 izquierda + 6 derecha)
  const itemsPerSpread = 12;
  const totalSpreads = Math.max(1, Math.ceil(filteredSuspects.length / itemsPerSpread));
  const safeSpreadIndex = Math.min(albumPage, totalSpreads - 1);
  const spreadSuspects = filteredSuspects.slice(
    safeSpreadIndex * itemsPerSpread,
    safeSpreadIndex * itemsPerSpread + itemsPerSpread
  );

  // Simetría 6 y 6 en ambos lados del pliego abierto (2 filas x 3 columnas por página)
  const leftSuspects = spreadSuspects.slice(0, 6);
  const rightSuspects = spreadSuspects.slice(6, 12);

  const handleSpreadChange = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= totalSpreads || nextIdx === safeSpreadIndex) return;
    sound.playPageTurn();
    setTurnDirection(nextIdx > safeSpreadIndex ? 'next' : 'prev');
    setAlbumPage(nextIdx);
  };

  const categories = [
    { id: 'all', label: 'Todos (74)' },
    { id: 'Familia Valdemar', label: `Familia (${categoryStats['Familia Valdemar']?.active ?? 12}/12)` },
    { id: 'Invitados de Gala', label: `Invitados (${categoryStats['Invitados de Gala']?.active ?? 18}/18)` },
    { id: 'Servicio de la Mansión', label: `Servicio (${categoryStats['Servicio de la Mansión']?.active ?? 24}/24)` },
    { id: 'Habitantes del Valle', label: `Valle (${categoryStats['Habitantes del Valle']?.active ?? 20}/20)` },
  ];

  const totalSuspects = SUSPECTS_DIRECTORY.length;
  const modalNum = selectedSuspect
    ? selectedSuspect.number < 10
      ? `0${selectedSuspect.number}`
      : `${selectedSuspect.number}`
    : '';

  const renderPhotoCard = (s: DirectorySuspect & { status: SuspectStatusResult }) => {
    const isEliminated = s.status.isEliminated;
    const numLabel = s.number < 10 ? `0${s.number}` : `${s.number}`;
    const hasPortrait = Boolean(s.portraitGif) && !failedPortraits[s.id];

    return (
      <div
        key={s.id}
        onClick={() => openSuspectModal(s)}
        className={`group relative rounded-sm border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${
          isEliminated
            ? 'border-crimson-800/35 bg-[#e3ded5] opacity-80 hover:opacity-100 hover:border-crimson-800/70'
            : 'border-parchment-400 bg-[#f6f4ef] hover:border-ink-800 hover:-translate-y-0.5 shadow-[0_3px_10px_rgba(12,13,16,0.12)] hover:shadow-[0_10px_22px_rgba(12,13,16,0.22)]'
        }`}
      >
        {/* Marco fotográfico principal */}
        <div className="p-1 pb-0.5 flex-1 flex flex-col">
          <div className="relative w-full aspect-[4/3.2] bg-ink-950 border border-ink-800 overflow-hidden shadow-inner flex items-center justify-center">
            {hasPortrait ? (
              /\.(mp4|webm|mov)$/i.test(s.portraitGif!) ? (
                <video
                  src={s.portraitGif}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={() => setFailedPortraits(prev => ({ ...prev, [s.id]: true }))}
                  className={`w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03] ${
                    isEliminated ? 'grayscale contrast-125 brightness-90' : ''
                  }`}
                />
              ) : (
                <img
                  src={s.portraitGif}
                  alt={`Retrato de ${s.name}`}
                  onError={() => setFailedPortraits(prev => ({ ...prev, [s.id]: true }))}
                  className={`w-full h-full object-cover object-top transition-transform duration-500 portrait-idle group-hover:scale-[1.03] ${
                    isEliminated ? 'grayscale contrast-125 brightness-90' : ''
                  }`}
                />
              )
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-ink-900 to-ink-950 flex flex-col items-center justify-center gap-1.5 text-ink-500">
                <User className="w-9 h-9 stroke-[1.1] text-gold-400/45" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-parchment-400/70">
                  Placa #{numLabel}
                </span>
              </div>
            )}

            {/* Etiqueta discreta de número arriba a la izquierda */}
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-ink-950/85 border border-gold-400/35 text-gold-200 font-mono text-[9px] tracking-wider">
              #{numLabel}
            </span>

            {/* Sello de estado sobre la esquina inferior */}
            {isEliminated ? (
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-crimson-900/95 border border-crimson-300/35 text-parchment-50 font-mono text-[8px] font-bold uppercase tracking-wider">
                {s.status.dayEliminated ? `Exculpado · D.${s.status.dayEliminated}` : 'Tachado'}
              </span>
            ) : (
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-ink-950/85 border border-gold-400/35 text-gold-200 font-mono text-[8px] uppercase tracking-wider">
                Activo
              </span>
            )}
          </div>

          {/* Pie de foto manuscrito */}
          <div className="pt-1 px-0.5">
            <div className="flex items-baseline justify-between gap-1">
              <h4
                className={`font-title text-[17px] sm:text-lg text-ink-950 leading-none truncate ${
                  isEliminated ? 'line-through decoration-crimson-800 decoration-1' : ''
                }`}
              >
                {s.name}
              </h4>
              <span className="text-[9px] font-mono text-ink-500 shrink-0">{s.age}a</span>
            </div>
            <p className="text-[10px] font-desc italic text-ink-700 truncate mt-0.5">
              {s.role}
            </p>
          </div>
        </div>

        {/* Franja inferior sutil */}
        <div className="px-2 py-1 border-t border-parchment-300/80 bg-parchment-200/45 flex items-center justify-between gap-1 text-[9px] font-mono">
          <span className="truncate text-ink-600 uppercase tracking-tight">{s.category}</span>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              toggleManualElimination(s.id);
            }}
            className={`p-0.5 rounded hover:bg-parchment-300 text-ink-600 hover:text-ink-950 transition shrink-0 ${
              s.status.isManual ? 'text-crimson-800' : ''
            }`}
            title={s.status.isManual ? 'Quitar descarte manual' : 'Tachar manualmente'}
          >
            {isEliminated ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 flex-1 min-h-0 relative">
      {/* ================================================================
          PÁGINA IZQUIERDA DEL ÁLBUM: CABECERA, VÍCTIMA Y RETRATOS
         ================================================================ */}
      <section className="page-verso p-3 sm:p-4 lg:p-5 lg:pr-7 flex flex-col justify-between min-w-0 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-2">
          {/* Foliación superior */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-parchment-400/70 pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-600">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-crimson-800" />
              <span>Archivo Fotográfico • Villa Acebo</span>
            </span>
            <span className="text-crimson-800 font-bold">
              {activeCount}/{totalSuspects} Bajo Sospecha
            </span>
          </div>

          {/* Título del Álbum y Placa de la Víctima */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-title text-3xl sm:text-4xl text-ink-950 leading-none">
                Álbum de Sospechosos
              </h2>
              <p className="text-xs font-desc italic text-ink-700 mt-0.5">
                Censo oficial de los 74 implicados en la noche del 23 de diciembre de 1924
              </p>
            </div>

            {/* Placa compacta de la víctima */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-ink-900 text-parchment-100 rounded-sm border border-crimson-800/70 shadow-sm">
              <Skull className="w-4 h-4 text-crimson-400 shrink-0" />
              <div className="leading-tight">
                <span className="text-[8px] font-mono uppercase tracking-widest text-crimson-300 block">
                  Víctima · {VICTIM.timeOfDeath}
                </span>
                <span className="font-desc font-semibold text-xs text-parchment-50">
                  {VICTIM.name} ({VICTIM.age} años)
                </span>
              </div>
            </div>
          </div>

          {/* Buscador y Filtros de Estado */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type="text"
                placeholder="Buscar nombre, oficio o #..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setAlbumPage(0);
                }}
                className="w-full pl-8 pr-6 py-1 text-xs rounded-sm bg-parchment-50/90 border border-parchment-400 text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-ink-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setAlbumPage(0);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center bg-parchment-300/70 p-0.5 rounded-sm border border-parchment-400 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setStatusFilter('all');
                  setAlbumPage(0);
                }}
                className={`px-2 py-0.5 rounded-sm transition ${
                  statusFilter === 'all' ? 'bg-ink-900 text-gold-200 font-bold' : 'text-ink-700'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setStatusFilter('active');
                  setAlbumPage(0);
                }}
                className={`px-2 py-0.5 rounded-sm transition ${
                  statusFilter === 'active' ? 'bg-emerald-900 text-white font-bold' : 'text-ink-700'
                }`}
              >
                Activos ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setStatusFilter('eliminated');
                  setAlbumPage(0);
                }}
                className={`px-2 py-0.5 rounded-sm transition ${
                  statusFilter === 'eliminated' ? 'bg-crimson-800 text-white font-bold' : 'text-ink-700'
                }`}
              >
                Desc. ({eliminatedCount})
              </button>
            </div>
          </div>

          {/* Pliego Izquierdo: 6 Retratos */}
          <div
            key={`left-${safeSpreadIndex}-${statusFilter}-${categoryFilter}-${searchQuery}`}
            className={`grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5 ${
              turnDirection === 'next' ? 'animate-page-turn' : 'animate-page-turn-prev'
            }`}
          >
            {leftSuspects.map(renderPhotoCard)}
          </div>

          {filteredSuspects.length === 0 && (
            <div className="text-center py-8 text-ink-600 text-sm font-desc italic">
              Ningún expediente coincide con el filtro actual.
            </div>
          )}
        </div>

        {/* Pie izquierdo: Navegación del Álbum */}
        <div className="shrink-0 pt-2 mt-1.5 border-t border-parchment-400/70 flex items-center justify-between text-xs font-desc text-ink-700">
          <button
            type="button"
            onClick={() => handleSpreadChange(safeSpreadIndex - 1)}
            disabled={safeSpreadIndex <= 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-sm btn-ledger text-gold-200 disabled:opacity-30 transition text-[11px] font-mono uppercase tracking-wider"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Pliego Ant.</span>
          </button>

          <span className="font-mono text-[10px] tracking-widest uppercase text-ink-600">
            Álbum · Pliego {safeSpreadIndex + 1} de {totalSpreads}
          </span>
        </div>
      </section>

      {/* ================================================================
          PÁGINA DERECHA DEL ÁLBUM: FILTRO POR GRUPO, RETRATOS Y DÍA 01
         ================================================================ */}
      <section className="page-recto p-3 sm:p-4 lg:p-5 lg:pl-7 flex flex-col justify-between border-t lg:border-t-0 border-parchment-400/70 min-w-0 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-2">
          {/* Foliación superior derecha */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-parchment-400/70 pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-600">
            <span>Registro Nominal y Coartadas</span>
            <span>Página {safeSpreadIndex * 2 + 2}</span>
          </div>

          {/* Filtro por Categoría de Villa Acebo */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            {categories.map(cat => (
              <button
                type="button"
                key={cat.id}
                onClick={() => {
                  sound.playClick();
                  setCategoryFilter(cat.id);
                  setAlbumPage(0);
                }}
                className={`px-2 py-1 rounded-sm transition border ${
                  categoryFilter === cat.id
                    ? 'bg-ink-900 text-gold-200 font-bold border-gold-500/50 shadow-sm'
                    : 'bg-parchment-50/75 text-ink-700 border-parchment-400 hover:border-ink-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Pliego Derecho: 6 Retratos */}
          <div
            key={`right-${safeSpreadIndex}-${statusFilter}-${categoryFilter}-${searchQuery}`}
            className={`grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5 ${
              turnDirection === 'next' ? 'animate-page-turn' : 'animate-page-turn-prev'
            }`}
          >
            {rightSuspects.map(renderPhotoCard)}
          </div>

          {/* Nota breve de apertura del libro */}
          <p className="text-[11px] font-desc italic text-ink-700 leading-snug px-0.5">
            Haz clic en cualquier retrato para inspeccionar su testimonio e historial.
          </p>
        </div>

        {/* Pie derecho: Pliego siguiente + Abrir Día 01 */}
        <div className="shrink-0 pt-2 mt-1.5 border-t border-parchment-400/70 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleSpreadChange(safeSpreadIndex + 1)}
            disabled={safeSpreadIndex >= totalSpreads - 1}
            className="flex items-center gap-1 px-2.5 py-1 rounded-sm btn-ledger text-gold-200 disabled:opacity-30 transition text-[11px] font-mono uppercase tracking-wider"
          >
            <span>Pliego Sig.</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playPageTurn();
              onStartAdventure();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-sm btn-crimson-wax text-parchment-50 font-desc font-semibold text-sm transition hover:scale-[1.02]"
          >
            <span>Abrir Día 01: El Relato</span>
            <ChevronRight className="w-4 h-4 text-gold-300" />
          </button>
        </div>
      </section>

      {/* ================================================================
          MODAL DE EXPEDIENTE OFICIAL (FOTO CON CLIP + HOJA ARRANCADA)
         ================================================================ */}
      {selectedSuspect && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden"
          onClick={closeSuspectModal}
        >
          <div
            className="relative max-w-xl w-full flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            {/* FOTOGRAFÍA SUELTA AGARRADA CON CLIP (3D FLIP CARD AL CLIC, ARRASTRABLE Y ZOOMABLE) */}
            <div
              onPointerDown={handlePhotoPointerDown}
              onPointerMove={handlePhotoPointerMove}
              onPointerUp={handlePhotoPointerUp}
              onPointerCancel={handlePhotoPointerUp}
              onDragStart={e => e.preventDefault()}
              onWheel={e => {
                e.preventDefault();
                setPhotoZoom(z =>
                  Math.min(2.6, Math.max(1, Number((z + (e.deltaY < 0 ? 0.2 : -0.2)).toFixed(1))))
                );
              }}
              style={{
                transform: `translate3d(${photoDrag.x}px, ${photoDrag.y}px, 0) scale(${photoZoom})`,
              }}
              title="Haz clic sobre la fotografía para voltearla y leer las notas confidenciales al reverso · Arrastra para mover"
              className={`z-[60] w-44 sm:w-52 bg-[#f5f2ea] p-2 pb-2.5 border border-[#8e8474] shadow-[0_20px_42px_rgba(0,0,0,0.75)] select-none touch-none ${
                isDraggingPhoto
                  ? 'cursor-grabbing transition-none'
                  : 'cursor-grab transition-all duration-300 ease-out'
              } ${
                isPhotoAside
                  ? 'fixed sm:absolute right-3 top-3 sm:-right-40 sm:top-6 rotate-[3deg]'
                  : 'absolute right-3 sm:right-5 -top-3 sm:top-4 rotate-[-2.5deg]'
              }`}
            >
              {/* Clip metálico sujetando la foto */}
              <div className="pointer-events-none absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                <Paperclip className="w-6 h-6 text-[#5f6672] drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] -rotate-12" />
              </div>

              {/* Contenedor 3D Flip */}
              <div className="photo-flip-card relative w-full aspect-[4/4.8] cursor-pointer">
                <div className={`photo-flip-inner ${isPhotoFlipped ? 'is-flipped' : ''}`}>
                  {/* CARA FRONTAL: RETRATO FOTOGRÁFICO DE LA ÉPOCA */}
                  <div className="photo-flip-front w-full h-full bg-ink-950 border border-ink-800 overflow-hidden flex items-center justify-center">
                    {selectedSuspect.portraitGif && !failedPortraits[selectedSuspect.id] ? (
                      /\.(mp4|webm|mov)$/i.test(selectedSuspect.portraitGif) ? (
                        <video
                          src={selectedSuspect.portraitGif}
                          autoPlay
                          loop
                          muted
                          playsInline
                          draggable={false}
                          onError={() =>
                            setFailedPortraits(prev => ({ ...prev, [selectedSuspect.id]: true }))
                          }
                          className={`pointer-events-none select-none w-full h-full object-cover object-top ${
                            selectedStatus?.isEliminated ? 'grayscale contrast-125' : ''
                          }`}
                        />
                      ) : (
                        <img
                          src={selectedSuspect.portraitGif}
                          alt={`Retrato de ${selectedSuspect.name}`}
                          draggable={false}
                          onError={() =>
                            setFailedPortraits(prev => ({ ...prev, [selectedSuspect.id]: true }))
                          }
                          className={`pointer-events-none select-none w-full h-full object-cover object-top ${
                            selectedStatus?.isEliminated ? 'grayscale contrast-125' : ''
                          }`}
                        />
                      )
                    ) : (
                      <User className="w-10 h-10 text-gold-400/60 stroke-[1.2]" />
                    )}

                    <span className="pointer-events-none absolute top-1 left-1 px-1 py-0.5 bg-ink-950/85 text-gold-200 font-mono text-[8px] tracking-wider border border-gold-500/30">
                      #{modalNum}
                    </span>

                    <span className="pointer-events-none absolute bottom-1 right-1 px-1 py-0.5 bg-black/75 text-parchment-200 font-mono text-[7px] uppercase tracking-wider rounded-sm">
                      Clic: Voltear
                    </span>
                  </div>

                  {/* CARA TRASERA: PAPEL FOTOGRÁFICO KODAK 1924 CON NOTAS EN LETRAS CHICAS */}
                  <div className="photo-flip-back w-full h-full bg-[#ede5d0] border border-[#7a705e] p-2 flex flex-col justify-between text-left shadow-inner overflow-hidden">
                    <div className="border-b border-[#a89b82] pb-0.5 flex items-center justify-between text-[7px] font-mono uppercase tracking-widest text-[#5c5240]">
                      <span>KODAK VELOX · 1924</span>
                      <span>EXP. #{modalNum}</span>
                    </div>

                    {/* Notas en letras chicas para obligar al uso de zoom */}
                    <div className="flex-1 my-1 overflow-y-auto space-y-1 text-[8px] sm:text-[8.5px] leading-tight font-typewriter text-[#22211e] pr-0.5">
                      <p className="font-bold uppercase tracking-wider text-crimson-900">
                        {selectedSuspect.name} ({selectedSuspect.age} años)
                      </p>
                      <p className="text-[#3c3730]">
                        <strong>Rango / Oficio:</strong> {selectedSuspect.role}
                      </p>
                      <p className="text-[#3c3730]">
                        <strong>Conducta observada:</strong> {selectedSuspect.trait}
                      </p>
                      <p className="text-[#3c3730] border-t border-dashed border-[#b8ab92] pt-0.5">
                        <strong>Vínculo con Don Arturo:</strong> {selectedSuspect.relation}
                      </p>
                      <p className="text-[#4b4336] text-[7.5px] sm:text-[8px] border-t border-dashed border-[#b8ab92] pt-0.5">
                        <strong>Filiación en mansión:</strong> Grupo {selectedSuspect.category.toUpperCase()}
                      </p>
                    </div>

                    <div className="border-t border-[#a89b82] pt-0.5 text-center flex items-center justify-center gap-1">
                      <Search className="w-2.5 h-2.5 text-[#635948]" />
                      <span className="text-[7px] font-mono text-[#635948] uppercase tracking-wider">
                        Inspección lupa ({photoZoom}x)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controles de zoom + voltear + apartar */}
              <div className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    sound.playClick();
                    setIsPhotoFlipped(prev => !prev);
                  }}
                  className="px-1.5 py-0.5 rounded bg-parchment-200 hover:bg-parchment-300 text-ink-900 border border-parchment-400 font-mono text-[8px] uppercase tracking-wider flex items-center gap-1"
                  title="Voltear fotografía (anverso / reverso)"
                >
                  <RotateCw className="w-2.5 h-2.5" />
                  <span>{isPhotoFlipped ? 'Foto' : 'Notas'}</span>
                </button>

                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    sound.playClick();
                    setIsPhotoAside(prev => !prev);
                  }}
                  className="font-mono text-[8px] uppercase tracking-wider text-ink-600 hover:text-ink-900 px-1 py-0.5 rounded hover:bg-parchment-200 truncate"
                >
                  {isPhotoAside ? 'Volver' : 'Apartar'}
                </button>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setPhotoZoom(z => Math.max(1, Number((z - 0.2).toFixed(1))));
                    }}
                    className="p-0.5 rounded bg-parchment-200 hover:bg-parchment-300 text-ink-800 border border-parchment-400"
                    title="Alejar fotografía"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setPhotoZoom(z => Math.min(2.6, Number((z + 0.2).toFixed(1))));
                    }}
                    className="p-0.5 rounded bg-parchment-200 hover:bg-parchment-300 text-ink-800 border border-parchment-400"
                    title="Acercar fotografía"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* DOCUMENTO OFICIAL DE LA JEFATURA (1924) */}
            <div className="bg-[#efeade] border-2 border-[#2a2722] rounded-sm p-4 sm:p-6 w-full shadow-[0_24px_60px_rgba(0,0,0,0.85)] space-y-3.5 font-reading max-h-[90vh] overflow-y-auto relative">
              {/* Membrete oficial superior */}
              <div className="border-b-2 border-[#2a2722] pb-2.5 pr-28 sm:pr-36">
                <div className="flex items-center justify-between gap-2 text-[9px] font-mono uppercase tracking-[0.22em] text-[#5c5346]">
                  <span>Jefatura de Investigación Criminal · Villa Acebo</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-[#1b2432] text-[#e7decb] font-mono text-[9px] font-bold uppercase tracking-widest">
                    Exp. N.º {modalNum}-VA
                  </span>
                  <span className="font-mono text-[10px] text-crimson-800 font-bold uppercase tracking-wider">
                    {selectedSuspect.category}
                  </span>
                </div>
                <h3 className="font-title text-3xl sm:text-4xl text-ink-950 leading-none mt-1.5">
                  {selectedSuspect.name}
                </h3>
                <p className="text-xs sm:text-sm text-ink-700 font-desc italic mt-0.5">
                  {selectedSuspect.age} años • {GENDER_LABELS[selectedSuspect.gender]} — {selectedSuspect.role}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {selectedStatus?.isEliminated ? (
                    <span className="inline-block px-2 py-0.5 bg-crimson-800 text-parchment-50 font-mono text-[9px] font-bold uppercase tracking-wider">
                      {selectedStatus.dayEliminated
                        ? `Exculpado · Día ${selectedStatus.dayEliminated}`
                        : 'Descartado manualmente'}
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 bg-emerald-800 text-parchment-50 font-mono text-[9px] font-bold uppercase tracking-wider">
                      Bajo Sospecha Activa
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={closeSuspectModal}
                    className="ml-auto sm:hidden text-ink-600 hover:text-ink-950 p-1"
                    aria-label="Cerrar expediente"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Auto-declaración en primera persona (HOJA ARRANCADA ESCRITA A MANO) */}
              {selectedSuspect.alibiQuote && (
                <div
                  className="torn-note-paper p-3.5 sm:p-4 border-l-4 border-crimson-800 -rotate-[0.6deg] relative"
                  style={{
                    clipPath:
                      'polygon(0 2%, 4% 0, 9% 2.5%, 15% 0.5%, 22% 2%, 30% 0, 38% 2%, 46% 0.5%, 54% 2.5%, 62% 0, 70% 2%, 78% 0.5%, 86% 2.5%, 94% 0, 100% 2%, 100% 98%, 95% 100%, 88% 97.5%, 80% 99.5%, 72% 97.5%, 64% 100%, 56% 98%, 48% 100%, 40% 97.5%, 32% 99.5%, 24% 98%, 16% 100%, 8% 97.5%, 0 99.5%)',
                  }}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-crimson-900 mb-1">
                    <Quote className="w-3.5 h-3.5" /> Declaración en Interrogatorio
                  </div>
                  <p className="font-declaration italic text-xs sm:text-[13px] text-ink-900 leading-relaxed">
                    {selectedSuspect.alibiQuote}
                  </p>
                </div>
              )}

              {/* Datos Oficiales con código de color archival */}
              <div className="space-y-2 text-sm font-reading">
                <div className="p-2.5 bg-[#e6ebf0] border border-[#96a6b8] border-l-4 border-l-[#2c4259] space-y-1">
                  <strong className="text-[#1f344a] font-mono uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Vínculo e Historia Personal
                  </strong>
                  <p className="text-ink-900 leading-snug text-[13px]">{selectedSuspect.relation}</p>
                  <p className="text-ink-800 leading-snug text-[12px] italic">{selectedSuspect.backstory}</p>
                </div>

                <div className="p-2.5 bg-[#f4ecd8] border border-[#c8b282] border-l-4 border-l-[#8b6a28] space-y-1.5">
                  <strong className="text-[#6e5118] font-mono uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5" /> Rasgos y Ficha Pericial
                  </strong>
                  <p className="text-ink-900 leading-snug text-[13px]">{selectedSuspect.trait}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 pt-1 border-t border-[#c8b282]/60 text-[10px] font-mono text-ink-800">
                    <span><strong>Mano:</strong> {HANDEDNESS_SHORT[selectedSuspect.attributes.handedness]}</span>
                    <span><strong>Rasgo:</strong> {VISUAL_MARKER_SHORT[selectedSuspect.attributes.visualMarker]}</span>
                    <span><strong>Sector:</strong> {PRESENCE_WING_LABEL[selectedSuspect.attributes.presenceWing]}</span>
                    <span><strong>Rastro:</strong> {FORENSIC_TRACE_LABEL[selectedSuspect.attributes.forensicTrace]}</span>
                    <span className="col-span-2"><strong>Acceso:</strong> {ACCESS_LEVEL_SHORT[selectedSuspect.attributes.accessLevel]}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#f3e3e3] border border-[#cca0a0] border-l-4 border-l-[#7b1e24]">
                  <strong className="text-crimson-900 font-mono uppercase tracking-wider text-[10px] flex items-center gap-1.5 mb-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Móvil Presunto
                  </strong>
                  <p className="text-ink-900 leading-snug text-[13px]">{selectedSuspect.motiveSummary}</p>
                </div>

                <div
                  className={`p-3 border border-l-4 ${
                    selectedStatus?.isEliminated
                      ? 'bg-[#f6e8e8] border-[#c89b9b] border-l-crimson-800'
                      : 'bg-[#e6efe9] border-[#96b8a2] border-l-emerald-800'
                  }`}
                >
                  <strong className="text-ink-950 font-mono uppercase tracking-wider text-[10px] block mb-1">
                    Dictamen Oficial de la Investigación
                  </strong>
                  {selectedStatus?.isEliminated ? (
                    <p className="text-crimson-900 font-reading font-medium leading-snug text-[13px] flex items-start gap-1.5">
                      <X className="w-4 h-4 shrink-0 mt-0.5 text-crimson-700" />
                      <span>{selectedStatus.reason}</span>
                    </p>
                  ) : (
                    <p className="text-emerald-900 font-reading font-medium leading-snug text-[13px] flex items-start gap-1.5">
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                      <span>
                        Continúa formalmente bajo sospecha. Las pruebas periciales reunidas hasta el momento no logran exculparlo.
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2.5 flex justify-between items-center border-t border-[#c8bfae]">
                <button
                  type="button"
                  onClick={() => toggleManualElimination(selectedSuspect.id)}
                  className="text-xs font-desc font-semibold text-crimson-800 hover:text-crimson-950 underline"
                >
                  {selectedStatus?.isManual ? 'Deshacer tacha manual' : 'Tachar con lápiz del detective'}
                </button>

                <button
                  type="button"
                  onClick={closeSuspectModal}
                  className="px-4 py-1.5 btn-ledger text-gold-200 rounded-sm font-desc text-xs font-semibold transition"
                >
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
