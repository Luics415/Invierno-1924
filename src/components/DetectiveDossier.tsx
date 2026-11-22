import React, { useState, useMemo } from 'react';
import { computeSuspectStatus, useGameStore } from '../store/useGameStore';
import { WEAPONS, LOCATIONS, VICTIM } from '../data/narrativeBible';
import { SUSPECTS_DIRECTORY, type DirectorySuspect } from '../data/suspectsDirectory';
import { evaluateCaseClues } from '../engine/caseGenerator';
import { sound } from '../utils/soundEffects';
import {
  Users,
  MapPin,
  FileText,
  Gavel,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  Quote,
  X,
} from 'lucide-react';

interface DetectiveDossierProps {
  onClose: () => void;
  onOpenVerdict: () => void;
}

export const DetectiveDossier: React.FC<DetectiveDossierProps> = ({ onClose, onOpenVerdict }) => {
  const [activeTab, setActiveTab] = useState<'suspects' | 'weapons' | 'clues'>('suspects');
  const {
    totalDays,
    activeCase,
    unlockedClues,
    completedDays,
    openedDoors,
    manualEliminations,
    toggleManualElimination,
  } = useGameStore();

  const clueEval = useMemo(() => evaluateCaseClues(unlockedClues), [unlockedClues]);
  const matchingWeaponSet = useMemo(() => new Set(clueEval.matchingWeaponIds), [clueEval]);
  const matchingRoomSet = useMemo(() => new Set(clueEval.matchingRoomIds), [clueEval]);

  // Filtros para la pestaña de 74 sospechosos
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'eliminated'>('all');
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [failedPortraits, setFailedPortraits] = useState<Record<string, boolean>>({});

  // Filtro para la pestaña de pistas
  const [clueCategoryFilter, setClueCategoryFilter] = useState<
    'all' | 'suspect' | 'weapon' | 'room' | 'timeline'
  >('all');

  // Calcular estado en tiempo real de los 74 sospechosos reactivo a pistas, víctimas de actos y tachas manuales
  const { suspectsWithStatus, activeCount, eliminatedCount, categoryCounts } = useMemo(() => {
    const list = SUSPECTS_DIRECTORY.map(s => ({
      ...s,
      status: computeSuspectStatus(s, manualEliminations, unlockedClues, activeCase, openedDoors),
    }));

    let active = 0;
    let eliminated = 0;
    const catMap: Record<string, { total: number; active: number }> = {
      'Familia Valdemar': { total: 0, active: 0 },
      'Invitados de Gala': { total: 0, active: 0 },
      'Servicio de la Mansión': { total: 0, active: 0 },
      'Habitantes del Valle': { total: 0, active: 0 },
    };

    for (const item of list) {
      if (catMap[item.category]) {
        catMap[item.category].total++;
        if (!item.status.isEliminated) catMap[item.category].active++;
      }
      if (item.status.isEliminated) {
        eliminated++;
      } else {
        active++;
      }
    }

    return {
      suspectsWithStatus: list,
      activeCount: active,
      eliminatedCount: eliminated,
      categoryCounts: catMap,
    };
  }, [manualEliminations, unlockedClues, activeCase, openedDoors]);

  const filteredSuspects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return suspectsWithStatus.filter(s => {
      const paddedNum = s.number < 10 ? `0${s.number}` : `${s.number}`;
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.role.toLowerCase().includes(query) ||
        s.trait.toLowerCase().includes(query) ||
        s.relation.toLowerCase().includes(query) ||
        paddedNum.includes(query) ||
        `#${paddedNum}`.includes(query);

      if (!matchesSearch) return false;
      if (statusFilter === 'active' && s.status.isEliminated) return false;
      if (statusFilter === 'eliminated' && !s.status.isEliminated) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;

      return true;
    });
  }, [suspectsWithStatus, searchQuery, statusFilter, categoryFilter]);

  const filteredClues = useMemo(() => {
    const sorted = [...unlockedClues].sort((a, b) => b.day - a.day);
    if (clueCategoryFilter === 'all') return sorted;
    return sorted.filter(c => c.category === clueCategoryFilter);
  }, [unlockedClues, clueCategoryFilter]);

  const categories = [
    { id: 'all', label: 'Todos (74)' },
    {
      id: 'Familia Valdemar',
      label: `Familia (${categoryCounts['Familia Valdemar']?.active ?? 12}/12)`,
    },
    {
      id: 'Invitados de Gala',
      label: `Invitados (${categoryCounts['Invitados de Gala']?.active ?? 18}/18)`,
    },
    {
      id: 'Servicio de la Mansión',
      label: `Servicio (${categoryCounts['Servicio de la Mansión']?.active ?? 24}/24)`,
    },
    {
      id: 'Habitantes del Valle',
      label: `El Valle (${categoryCounts['Habitantes del Valle']?.active ?? 20}/20)`,
    },
  ];

  const clueCategoryLabels: Record<string, string> = {
    suspect: 'Sospechosos',
    weapon: 'Armas',
    room: 'Habitaciones',
    timeline: 'Cronología',
  };

  const getAlibiQuote = (suspect: DirectorySuspect): string | undefined => {
    return (suspect as DirectorySuspect & { alibiQuote?: string }).alibiQuote;
  };

  const activePercent = Math.round((activeCount / 74) * 100);
  const eliminatedPercent = 100 - activePercent;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      onClick={() => {
        sound.playClick();
        onClose();
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative book-cover-leather border-2 border-[#08090c] ring-1 ring-[#b79b65]/45 rounded-lg max-w-5xl w-full max-h-[94vh] flex flex-col shadow-[0_32px_85px_rgba(0,0,0,0.96)] overflow-hidden text-ink-900 font-reading animate-page-turn"
      >
        <div className="pointer-events-none absolute inset-0 book-arcane-wear z-0" />

        {/* Cabecera de cuero negro desgastado con filete dorado y emblema */}
        <div className="relative z-10 header-leather-bar p-3.5 sm:p-5 border-b border-[#b79b65]/35 text-gold-300 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0 min-w-0">
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto sm:flex-1">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-[#08090c] border border-[#c5a059]/75 flex items-center justify-center shadow-md shrink-0">
              <img
                src="./app-icon.jpg"
                alt="Emblema Cuaderno del Detective"
                draggable={false}
                className="pointer-events-none w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-[2px] bg-[#5a1218] text-[#e5ca8f] border border-[#b79b65]/40">
                  Consulta en Tiempo Real • Expediente N.º 1924-VA
                </span>
                <span className="text-[10px] font-mono text-parchment-300/80 hidden sm:inline tabular-nums">
                  Capítulos resueltos:{' '}
                  <strong className="text-[#e5ca8f]">
                    {completedDays.length}/{totalDays}
                  </strong>
                </span>
              </div>
              <h2 className="font-title text-2xl sm:text-3xl tracking-wide text-[#e5ca8f] leading-none mt-1 break-words">
                Cuaderno del Detective — Villa Acebo
              </h2>
              <p className="text-[11px] sm:text-xs text-parchment-300/85 font-desc italic mt-0.5 break-words">
                Víctima inicial: <strong className="not-italic text-parchment-100">{VICTIM.name}</strong> •
                Hora: <strong className="not-italic text-parchment-100">{VICTIM.timeOfDeath}</strong> •
                Lugar: <strong className="not-italic text-parchment-100">{VICTIM.estate} (9 estancias)</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono tabular-nums mr-1">
              <div className="px-2.5 py-1 rounded-[3px] bg-[#0c0e12] border border-[#b79b65]/35 text-emerald-300">
                Sospechosos: <strong>{activeCount}/74</strong>
              </div>
              <div className="px-2.5 py-1 rounded-[3px] bg-[#0c0e12] border border-[#b79b65]/35 text-[#e5ca8f]">
                Pistas: <strong>{unlockedClues.length}/{totalDays}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onOpenVerdict();
              }}
              className="px-3.5 sm:px-4 py-1.5 btn-crimson-wax text-parchment-50 rounded-[3px] text-xs sm:text-sm font-desc font-semibold flex items-center gap-1.5 shadow-md transition"
            >
              <Gavel className="w-4 h-4 text-[#e5ca8f] shrink-0" />
              <span>Emitir Veredicto</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="text-parchment-300 hover:text-white p-1.5 rounded-[3px] hover:bg-white/10 transition"
              title="Cerrar Cuaderno"
              aria-label="Cerrar Cuaderno"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pestañas del Cuaderno: 1) Censo de 74 Sospechosos, 2) Armas y Estancias, 3) Pistas Obtenidas */}
        <div className="relative z-10 flex shrink-0 border-b border-[#b79b65]/35 bg-[#12141a] font-desc text-xs sm:text-sm overflow-x-auto px-2 pt-1.5 gap-1">
          <button
            type="button"
            onClick={() => {
              sound.playPageTurn();
              setActiveTab('suspects');
            }}
            className={`px-3.5 sm:px-4 py-2 font-semibold flex items-center gap-1.5 rounded-t-[4px] border-t border-x whitespace-nowrap transition ${
              activeTab === 'suspects'
                ? 'border-[#b79b65] bg-[#efeade] text-ink-950 shadow-sm'
                : 'border-transparent text-parchment-300 hover:text-[#e5ca8f] hover:bg-[#1a1d26]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-gold-500 shrink-0" />
            <span>Censo de 74 Sospechosos</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-[2px] bg-emerald-900 text-parchment-50 font-mono tabular-nums">
              {activeCount} activos
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playPageTurn();
              setActiveTab('weapons');
            }}
            className={`px-3.5 sm:px-4 py-2 font-semibold flex items-center gap-1.5 rounded-t-[4px] border-t border-x whitespace-nowrap transition ${
              activeTab === 'weapons'
                ? 'border-[#b79b65] bg-[#efeade] text-ink-950 shadow-sm'
                : 'border-transparent text-parchment-300 hover:text-[#e5ca8f] hover:bg-[#1a1d26]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-gold-500 shrink-0" />
            <span>Armas y Estancias</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-[2px] bg-ink-900/15 font-mono tabular-nums">
              {clueEval.matchingWeaponIds.length}/{WEAPONS.length} • {clueEval.matchingRoomIds.length}/
              {LOCATIONS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playPageTurn();
              setActiveTab('clues');
            }}
            className={`px-3.5 sm:px-4 py-2 font-semibold flex items-center gap-1.5 rounded-t-[4px] border-t border-x whitespace-nowrap transition ${
              activeTab === 'clues'
                ? 'border-[#b79b65] bg-[#efeade] text-ink-950 shadow-sm'
                : 'border-transparent text-parchment-300 hover:text-[#e5ca8f] hover:bg-[#1a1d26]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-gold-500 shrink-0" />
            <span>Pistas Obtenidas</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-[2px] bg-[#c5a059] text-ink-950 font-mono font-bold tabular-nums">
              {unlockedClues.length}/{totalDays}
            </span>
          </button>
        </div>

        {/* Contenido de la Pestaña Activa sobre papel hueso forense */}
        <div className="relative z-10 p-3.5 sm:p-5 flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[#efeade]">
          {/* 1. CENSO COMPLETO DE LOS 74 SOSPECHOSOS CON EMBUDO Y DESCARTE EN TIEMPO REAL */}
          {activeTab === 'suspects' && (
            <div className="space-y-3 min-w-0">
              {/* Barra de Progreso del Embudo Deductivo */}
              <div className="bg-parchment-200/80 p-3 rounded-lg border border-amber-900/30 space-y-2 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans min-w-0">
                  <span className="font-bold text-ink-900 flex flex-wrap items-center gap-1.5 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-gold-700 shrink-0" />
                    <span>Estado en Tiempo Real del Censo:</span>
                    <span className="font-mono font-normal">
                      74 censados → <strong className="text-emerald-800">{activeCount} bajo sospecha</strong> /{' '}
                      <strong className="text-crimson-800">{eliminatedCount} descartados o fallecidos</strong>
                    </span>
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-950 shrink-0">
                    {eliminatedPercent}% del censo descartado
                  </span>
                </div>
                <div className="w-full h-2.5 bg-parchment-300 rounded-full overflow-hidden flex border border-amber-950/30 p-0.5 gap-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-800 to-emerald-600 rounded-l-full transition-all duration-500"
                    style={{ width: `${activePercent}%` }}
                  />
                  {eliminatedCount > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-crimson-700 to-crimson-900 rounded-r-full transition-all duration-500"
                      style={{ width: `${eliminatedPercent}%` }}
                    />
                  )}
                </div>

                {/* Controles de filtrado */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 min-w-0">
                  <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm min-w-0">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      aria-label="Buscar en el censo de sospechosos"
                      placeholder="Buscar por #01-#74, nombre, oficio o rasgo..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-6 py-1 text-xs rounded bg-parchment-50 border border-amber-900/40 text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-crimson-700 font-sans"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-800"
                        aria-label="Limpiar búsqueda"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-[11px] font-sans bg-parchment-100 p-0.5 rounded border border-amber-900/25 max-w-full">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-2 py-0.5 rounded transition ${
                        statusFilter === 'all'
                          ? 'bg-amber-900 text-gold-200 font-bold shadow-sm'
                          : 'text-ink-700'
                      }`}
                    >
                      Todos (74)
                    </button>
                    <button
                      onClick={() => setStatusFilter('active')}
                      className={`px-2 py-0.5 rounded transition ${
                        statusFilter === 'active'
                          ? 'bg-emerald-800 text-white font-bold shadow-sm'
                          : 'text-ink-700'
                      }`}
                    >
                      Bajo Sospecha ({activeCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('eliminated')}
                      className={`px-2 py-0.5 rounded transition ${
                        statusFilter === 'eliminated'
                          ? 'bg-crimson-800 text-white font-bold shadow-sm'
                          : 'text-ink-700'
                      }`}
                    >
                      Descartados ({eliminatedCount})
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-[10px] font-sans w-full sm:w-auto min-w-0 max-w-full">
                    <Filter className="w-3 h-3 text-amber-900 shrink-0" />
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id)}
                        className={`px-2 py-0.5 rounded whitespace-nowrap transition border ${
                          categoryFilter === cat.id
                            ? 'bg-ink-900 text-gold-300 border-gold-600 font-bold'
                            : 'bg-parchment-100 text-ink-700 border-amber-900/20 hover:bg-parchment-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista en cuadrícula de los 74 sospechosos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto overflow-x-hidden pr-1 min-w-0">
                {filteredSuspects.map(s => {
                  const isEliminated = s.status.isEliminated;
                  const paddedNum = s.number < 10 ? `0${s.number}` : `${s.number}`;
                  const isExpanded = selectedSuspectId === s.id;
                  const alibiQuote = getAlibiQuote(s);
                  const showPortraitGif = Boolean(s.portraitGif && !failedPortraits[s.id]);

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSuspectId(isExpanded ? null : s.id)}
                      className={`group p-3 rounded-lg border-2 transition cursor-pointer min-w-0 ${
                        isExpanded ? 'ring-2 ring-gold-500 border-gold-600' : ''
                      } ${
                        isEliminated
                          ? 'bg-crimson-50/40 border-crimson-300/80 opacity-85 hover:opacity-100'
                          : 'bg-parchment-100 border-amber-900/35 hover:border-gold-600 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5 min-w-0">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {/* Retrato con fallback */}
                          <div
                            className={`relative w-12 h-14 rounded-sm overflow-hidden border shrink-0 shadow-inner flex flex-col items-center justify-center ${
                              isEliminated
                                ? 'bg-stone-200 border-stone-500 grayscale'
                                : 'bg-gradient-to-b from-amber-50 to-parchment-200 border-amber-900'
                            }`}
                          >
                            {showPortraitGif ? (
                              <img
                                src={s.portraitGif}
                                alt={`Retrato de ${s.name}`}
                                loading="eager"
                                decoding="async"
                                onError={() =>
                                  setFailedPortraits(prev => ({ ...prev, [s.id]: true }))
                                }
                                className={`w-full h-full object-cover object-top ${
                                  isEliminated
                                    ? 'grayscale contrast-90 opacity-75'
                                    : 'sepia-[0.2] contrast-105'
                                }`}
                              />
                            ) : (
                              <span className="text-lg pb-2.5">{s.avatarIcon}</span>
                            )}
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 font-mono text-[8px] font-black bg-amber-950/90 text-gold-300 px-1 rounded-sm leading-tight">
                              #{paddedNum}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4
                                className={`font-serif font-black text-xs text-ink-950 truncate ${
                                  isEliminated
                                    ? 'line-through decoration-crimson-800 decoration-2 text-ink-600'
                                    : ''
                                }`}
                              >
                                {s.name}
                              </h4>
                              <span className="text-[10px] font-sans text-ink-500">
                                ({s.age} años)
                              </span>
                              {isEliminated ? (
                                <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-crimson-800 text-white">
                                  {s.status.isVictim
                                    ? `FALLECIDO · ACTO ${s.status.victimAct}`
                                    : s.status.isManual
                                    ? 'TACHADO'
                                    : `EXCULPADO DÍA ${s.status.dayEliminated}`}
                                </span>
                              ) : (
                                <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-emerald-800 text-white">
                                  BAJO SOSPECHA
                                </span>
                              )}
                            </div>

                            <p className="text-[10px] text-amber-950 font-sans font-semibold truncate mt-0.5">
                              {s.role} •{' '}
                              <span className="font-normal italic text-ink-600">{s.relation}</span>
                            </p>
                            <p className="text-[10px] text-ink-600 font-sans truncate mt-0.5">
                              <strong>Rasgo:</strong> {s.trait}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleManualElimination(s.id);
                          }}
                          className={`p-1.5 rounded border transition shrink-0 ${
                            s.status.isManual
                              ? 'bg-crimson-100 border-crimson-400 text-crimson-800'
                              : 'bg-parchment-200/70 border-transparent text-ink-500 hover:text-ink-900'
                          }`}
                          title={
                            s.status.isManual
                              ? 'Quitar descarte manual'
                              : 'Tachar manualmente con lápiz'
                          }
                          aria-label={
                            s.status.isManual
                              ? `Quitar descarte manual de ${s.name}`
                              : `Tachar manualmente a ${s.name}`
                          }
                        >
                          {isEliminated ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Declaración expandible o visible */}
                      {(isExpanded || alibiQuote) && alibiQuote && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-[2px] bg-[#f4ecd8] border border-[#c8b282] text-[10px] font-serif italic text-ink-800 flex items-start gap-1.5 break-words">
                          <Quote className="w-3 h-3 text-amber-800 shrink-0 mt-0.5" />
                          <span>«{alibiQuote}»</span>
                        </div>
                      )}

                      {/* Motivo de descarte o estado */}
                      <div className="mt-2 pt-1.5 border-t border-amber-900/20 text-[10px] break-words">
                        {isEliminated ? (
                          <div className="flex items-start gap-1.5 text-crimson-900 font-sans font-semibold">
                            <XCircle className="w-3.5 h-3.5 text-crimson-700 mt-0.5 shrink-0" />
                            <span className="leading-snug">{s.status.reason}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-900 font-bold font-sans">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>Continúa bajo sospecha (Coartada aún no exculpada)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. ARMAS Y ESTANCIAS EN TIEMPO REAL */}
          {activeTab === 'weapons' && (
            <div className="space-y-4 min-w-0">
              {/* Resumen Superior de Armas y Escenarios */}
              <div className="bg-parchment-200/80 p-3 rounded-lg border border-amber-900/30 flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
                <div className="min-w-0">
                  <strong className="text-ink-950">
                    Catálogo en Tiempo Real de Armas y Estancias:
                  </strong>{' '}
                  <span className="text-ink-700">
                    Las armas y estancias descartadas por las pistas obtenidas se tachan automáticamente.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-crimson-100 text-crimson-900 border border-crimson-300 font-bold">
                    Armas compatibles: {clueEval.matchingWeaponIds.length}/{WEAPONS.length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-400 font-bold">
                    Estancias compatibles: {clueEval.matchingRoomIds.length}/{LOCATIONS.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                {/* 18 Armas */}
                <div className="space-y-3 min-w-0">
                  <h3 className="font-serif font-black text-sm uppercase tracking-wider text-crimson-950 border-b-2 border-crimson-800/40 pb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-crimson-800 shrink-0" /> Las{' '}
                      {WEAPONS.length} Armas Inventariadas
                    </span>
                    <span className="text-[10px] font-mono text-crimson-800">
                      5 categorías • 18 objetos únicos
                    </span>
                  </h3>

                  <div className="space-y-2.5">
                    {WEAPONS.map(w => {
                      const isCompatible = matchingWeaponSet.has(w.id);

                      return (
                        <div
                          key={w.id}
                          className={`p-2.5 rounded-lg border-2 transition text-xs flex items-start gap-3 shadow-sm min-w-0 ${
                            isCompatible
                              ? 'bg-parchment-100 border-amber-900/30 hover:border-crimson-700/60'
                              : 'bg-crimson-50/40 border-crimson-300/60 opacity-65'
                          }`}
                        >
                          {/* Fotografía instantánea del arma */}
                          <div className="relative w-14 h-14 bg-[#faf7f0] p-1 border border-ink-900/40 shadow-sm shrink-0 -rotate-1">
                            <div className="w-full h-full overflow-hidden bg-ink-950 border border-ink-800/50">
                              <img
                                src={`./portraits/weapon-${w.id}.png`}
                                alt={w.name}
                                loading="lazy"
                                draggable={false}
                                className={`w-full h-full object-cover ${
                                  !isCompatible ? 'grayscale opacity-75' : ''
                                }`}
                              />
                            </div>
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
                              <strong
                                className={`font-serif text-ink-950 text-sm ${
                                  !isCompatible
                                    ? 'line-through decoration-crimson-700 text-ink-600'
                                    : ''
                                }`}
                              >
                                {w.name}
                              </strong>
                              <span className="font-mono text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded border bg-parchment-200 text-ink-700 border-amber-900/20">
                                {w.category} • {w.material}
                              </span>
                            </div>
                            <p className="text-ink-700 font-sans leading-snug text-[11px]">
                              {w.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 9 Estancias */}
                <div className="space-y-3 min-w-0">
                  <h3 className="font-serif font-black text-sm uppercase tracking-wider text-amber-950 border-b-2 border-amber-800/40 pb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-800 shrink-0" /> Las {LOCATIONS.length}{' '}
                      Estancias de Villa Acebo
                    </span>
                    <span className="text-[10px] font-mono text-amber-900">
                      3 Planta Baja • 3 Planta Alta • 3 Sótano
                    </span>
                  </h3>

                  <div className="space-y-2.5">
                    {LOCATIONS.map(l => {
                      const isCompatible = matchingRoomSet.has(l.id);

                      return (
                        <div
                          key={l.id}
                          className={`p-3 rounded-lg border-2 transition text-xs space-y-1.5 shadow-sm min-w-0 ${
                            isCompatible
                              ? 'bg-parchment-100 border-amber-900/30 hover:border-amber-800/60'
                              : 'bg-crimson-50/40 border-crimson-300/60 opacity-65'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <strong
                                className={`font-serif text-ink-950 text-sm ${
                                  !isCompatible
                                    ? 'line-through decoration-crimson-700 text-ink-600'
                                    : ''
                                }`}
                              >
                                {l.name}
                              </strong>
                            </div>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-parchment-200 text-ink-700 border border-amber-900/20 shrink-0">
                              {l.floor}
                            </span>
                          </div>
                          <p className="text-ink-700 font-sans leading-relaxed">{l.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. PISTAS OBTENIDAS */}
          {activeTab === 'clues' && (
            <div className="space-y-3 min-w-0">
              {/* Barra de Resumen y Filtro de Pistas */}
              <div className="bg-parchment-200/80 p-3 rounded-lg border border-amber-900/30 flex flex-wrap items-center justify-between gap-2 text-xs font-sans min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-ink-950">
                    Pistas Periciales Desbloqueadas:{' '}
                    <strong>
                      {unlockedClues.length} de {totalDays}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1 text-[11px] max-w-full">
                  {(
                    [
                      { id: 'all', label: `Todas (${unlockedClues.length})` },
                      { id: 'suspect', label: 'Sospechosos' },
                      { id: 'weapon', label: 'Armas' },
                      { id: 'room', label: 'Habitaciones' },
                      { id: 'timeline', label: 'Cronología' },
                    ] as const
                  ).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setClueCategoryFilter(tab.id)}
                      className={`px-2.5 py-1 rounded transition ${
                        clueCategoryFilter === tab.id
                          ? 'bg-amber-950 text-gold-300 font-bold shadow-sm'
                          : 'bg-parchment-100 text-ink-700 hover:bg-parchment-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredClues.length === 0 ? (
                <div className="text-center py-12 bg-parchment-100/70 rounded-lg border border-dashed border-amber-900/40 text-ink-500 italic text-xs">
                  {unlockedClues.length === 0
                    ? 'Aún no has resuelto ningún capítulo diario. Resuelve los enigmas de cada día para registrar pistas verificadas en este archivo.'
                    : 'No hay pistas desbloqueadas en esta categoría específica todavía.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                  {filteredClues.map(clue => (
                    <div
                      key={clue.id}
                      className="p-3.5 rounded-lg border-2 border-gold-500/80 bg-gradient-to-b from-amber-50/70 to-parchment-100 shadow-sm space-y-1.5 flex flex-col justify-between min-w-0"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-amber-900/15 pb-1">
                          <span className="font-mono font-black text-[11px] uppercase text-crimson-900 bg-crimson-100/80 px-2 py-0.5 rounded border border-crimson-300">
                            Día {clue.day < 10 ? `0${clue.day}` : clue.day} • Pista Verificada
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-wider bg-amber-900 text-gold-200 px-2 py-0.5 rounded">
                            {clueCategoryLabels[clue.category] || clue.category}
                          </span>
                        </div>
                        <p className="font-serif text-xs sm:text-sm font-bold text-ink-950 leading-relaxed break-words">
                          «{clue.text}»
                        </p>
                      </div>

                      <div className="pt-1.5 border-t border-amber-900/15 text-[11px] font-sans text-emerald-950 bg-emerald-100/60 px-2.5 py-1 rounded border border-emerald-300/70 break-words">
                        <strong className="uppercase tracking-wider text-[10px] text-emerald-900">
                          Impacto deductivo:
                        </strong>{' '}
                        {clue.impact}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del Cuaderno de Cuero */}
        <div className="relative z-10 p-3 header-leather-bar border-t border-[#b79b65]/35 flex flex-wrap items-center justify-between gap-2 font-mono text-xs shrink-0 tabular-nums text-parchment-300">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span>
              Bajo sospecha: <strong className="text-emerald-300">{activeCount} / 74</strong>
            </span>
            <span className="text-[#b79b65]/40">•</span>
            <span>
              Descartados: <strong className="text-crimson-300">{eliminatedCount} / 74</strong>
            </span>
            <span className="text-[#b79b65]/40">•</span>
            <span>
              Pistas: <strong className="text-[#e5ca8f]">{unlockedClues.length} / {totalDays}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 btn-ledger text-[#e5ca8f] rounded-[3px] font-desc font-semibold shadow transition"
          >
            Cerrar Cuaderno
          </button>
        </div>
      </div>
    </div>
  );
};
