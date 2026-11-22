import React, { useState, useEffect, useMemo } from 'react';
import { WEAPONS, LOCATIONS } from '../data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../data/suspectsDirectory';
import { useGameStore } from '../store/useGameStore';
import { evaluateCaseClues } from '../engine/caseGenerator';
import { sound } from '../utils/soundEffects';
import type { VerdictResult } from '../types/game';
import {
  Gavel,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Scale,
  FileCheck,
  MapPin,
  Swords,
  UserCheck,
  X,
  Check,
  BookOpen,
  Sparkles,
  Search,
  RefreshCw,
} from 'lucide-react';

interface FinalVerdictModalProps {
  onClose: () => void;
}

export const FinalVerdictModal: React.FC<FinalVerdictModalProps> = ({ onClose }) => {
  const {
    totalDays,
    activeCase,
    completedDays,
    unlockedClues,
    verifyVerdict,
    startNewCase,
    getSuspectStatus,
  } = useGameStore();

  const [selectedSuspect, setSelectedSuspect] = useState<string>('');
  const [selectedWeapon, setSelectedWeapon] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [suspectSearch, setSuspectSearch] = useState<string>('');
  const [suspectCategory, setSuspectCategory] = useState<string>('all');
  const [onlyActiveSuspects, setOnlyActiveSuspects] = useState<boolean>(false);
  const [verdictResult, setVerdictResult] = useState<VerdictResult | null>(null);

  useEffect(() => {
    sound.startHeartbeatLoop();
    return () => {
      sound.stopHeartbeatLoop();
    };
  }, []);

  const clueEval = useMemo(() => evaluateCaseClues(unlockedClues), [unlockedClues]);
  const matchingSuspectSet = useMemo(() => new Set(clueEval.matchingSuspectIds), [clueEval]);
  const matchingWeaponSet = useMemo(() => new Set(clueEval.matchingWeaponIds), [clueEval]);
  const matchingRoomSet = useMemo(() => new Set(clueEval.matchingRoomIds), [clueEval]);

  const filteredSuspects = useMemo(() => {
    const q = suspectSearch.trim().toLowerCase();
    return SUSPECTS_DIRECTORY.filter(s => {
      if (suspectCategory !== 'all' && s.category !== suspectCategory) return false;
      if (onlyActiveSuspects && (!matchingSuspectSet.has(s.id) || getSuspectStatus(s).isEliminated)) {
        return false;
      }
      if (!q) return true;
      const numStr = s.number < 10 ? `0${s.number}` : `${s.number}`;
      return (
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        numStr.includes(q) ||
        `#${numStr}`.includes(q)
      );
    });
  }, [suspectSearch, suspectCategory, onlyActiveSuspects, matchingSuspectSet, getSuspectStatus]);

  const selectedSuspectObj = SUSPECTS_DIRECTORY.find(s => s.id === selectedSuspect);
  const selectedWeaponObj = WEAPONS.find(w => w.id === selectedWeapon);
  const selectedLocationObj = LOCATIONS.find(l => l.id === selectedLocation);

  const actualCulpritObj = SUSPECTS_DIRECTORY.find(s => s.id === activeCase.config.culpritId);
  const actualWeaponObj = WEAPONS.find(w => w.id === activeCase.config.weaponId);
  const actualRoomObj = LOCATIONS.find(l => l.id === activeCase.config.locationId);

  const selectionCount = [selectedSuspect, selectedWeapon, selectedLocation].filter(Boolean).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspect || !selectedWeapon || !selectedLocation) return;

    sound.playWaxSeal();
    const res = verifyVerdict(selectedSuspect, selectedWeapon, selectedLocation);
    setVerdictResult(res);

    if (res.isCorrect) {
      sound.playMysteryBell();
    } else {
      sound.playError();
    }
  };

  const handleRetry = () => {
    sound.playClick();
    setVerdictResult(null);
  };

  const handleStartNewCase = () => {
    startNewCase();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#160205]/92 backdrop-blur-md animate-verdict-heartbeat flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={() => {
        sound.playClick();
        onClose();
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative book-cover-leather border-2 border-[#08090c] ring-1 ring-[#b79b65]/45 rounded-lg max-w-4xl w-full max-h-[92vh] flex flex-col shadow-[0_34px_90px_rgba(0,0,0,0.96)] overflow-hidden font-reading animate-page-turn"
      >
        <div className="pointer-events-none absolute inset-0 book-arcane-wear z-0" />

        {/* Cabecera solemne del Tribunal */}
        <div className="relative z-10 header-leather-bar p-4 sm:p-5 border-b border-[#b79b65]/35 text-gold-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-[#c5a059]/75 bg-[#08090c] flex items-center justify-center shadow-lg shrink-0">
              <img
                src="./app-icon.jpg"
                alt="Emblema Tribunal Villa Acebo"
                draggable={false}
                className="pointer-events-none w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#dec48c]/85 block">
                Tribunal de Instrucción • Villa Acebo • Expediente #{activeCase.config.seed % 10000}
              </span>
              <h2 className="font-title text-2xl sm:text-3xl text-[#e5ca8f] leading-none pt-1">
                Audiencia Formal de Acusación
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-[#0b0d11] px-3 py-1.5 rounded-[3px] border border-[#b79b65]/35 text-xs font-mono tabular-nums">
              <span className="text-parchment-300">
                Pistas: <strong className="text-[#e5ca8f]">{unlockedClues.length}/{totalDays}</strong>
              </span>
              <span className="text-[#b79b65]/50">•</span>
              <span className="text-parchment-300">
                Días: <strong className="text-[#e5ca8f]">{completedDays.length}/{totalDays}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="text-parchment-300 hover:text-white p-1.5 rounded-[3px] hover:bg-white/10 transition"
              title="Cerrar audiencia"
              aria-label="Cerrar audiencia"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="relative z-10 p-4 sm:p-6 overflow-y-auto flex-1 bg-[#efeade]">
          {!verdictResult ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Introducción protocolaria */}
              <div className="text-xs sm:text-sm text-ink-900 bg-[#e4decb] p-3.5 rounded-[3px] border border-[#b5ab96] shadow-sm flex items-start gap-3">
                <Scale className="w-5 h-5 text-crimson-800 shrink-0 mt-0.5" />
                <div className="font-reading leading-relaxed">
                  Ante la detective Azlynn y todos los aislados en Villa Acebo, señala sin margen de duda
                  entre los <strong className="text-crimson-950">74 sospechosos en igualdad de condiciones</strong>,
                  las <strong className="text-crimson-950">18 armas inventariadas</strong> y las{' '}
                  <strong className="text-crimson-950">9 estancias</strong> la combinación exacta que explica el crimen.
                </div>
              </div>

              {/* Advertencia procesal cuando faltan pruebas */}
              {unlockedClues.length < totalDays && (
                <div className="p-3.5 rounded-[3px] bg-[#3d080e]/12 border-2 border-crimson-800/60 shadow-inner flex items-start gap-3 text-ink-950">
                  <AlertTriangle className="w-5 h-5 text-crimson-800 shrink-0 mt-0.5" />
                  <div className="font-reading text-xs sm:text-[13px] leading-snug">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-crimson-900 block mb-0.5">
                      Advertencia Sumarial • Pruebas Incompletas ({unlockedClues.length}/{totalDays})
                    </span>
                    Actualmente quedan compatibles{' '}
                    <strong>{clueEval.matchingSuspectIds.length} sospechosos</strong>,{' '}
                    <strong>{clueEval.matchingWeaponIds.length} armas</strong> y{' '}
                    <strong>{clueEval.matchingRoomIds.length} estancias</strong>. Acusar antes de reunir el 100% de las pruebas puede provocar un error judicial irreparable.
                  </div>
                </div>
              )}

              {/* 1. Selector igualitario de los 74 Sospechosos */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="flex items-center gap-1.5 text-xs uppercase font-mono font-bold tracking-wider text-ink-950">
                    <UserCheck className="w-4 h-4 text-crimson-800" />
                    <span>1. ¿Quién asesinó a Arturo Valdemar? (Censo completo: 74 sospechosos)</span>
                  </label>
                  {selectedSuspectObj && (
                    <span className="text-xs font-bold text-crimson-900 font-desc italic">
                      Acusado: #{selectedSuspectObj.number} {selectedSuspectObj.name}
                    </span>
                  )}
                </div>

                {/* Buscador y filtros para elegir cómodamente entre los 74 */}
                <div className="flex flex-wrap items-center gap-2 mb-2.5 p-2 rounded bg-[#e4decb] border border-[#b5ab96]">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-ink-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={suspectSearch}
                      onChange={e => setSuspectSearch(e.target.value)}
                      placeholder="Buscar entre los 74 por nombre, oficio o #..."
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded bg-parchment-50 border border-[#b5ab96] text-ink-950 focus:outline-none focus:border-crimson-700"
                    />
                  </div>
                  <select
                    value={suspectCategory}
                    onChange={e => setSuspectCategory(e.target.value)}
                    className="px-2 py-1.5 text-xs rounded bg-parchment-50 border border-[#b5ab96] text-ink-900"
                    aria-label="Filtrar sospechosos por grupo"
                  >
                    <option value="all">Todos los grupos (74)</option>
                    <option value="Familia Valdemar">Familia Valdemar (12)</option>
                    <option value="Invitados de Gala">Invitados de Gala (18)</option>
                    <option value="Servicio de la Mansión">Servicio de la Mansión (24)</option>
                    <option value="Habitantes del Valle">Habitantes del Valle (20)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setOnlyActiveSuspects(prev => !prev)}
                    className={`px-2.5 py-1.5 text-xs font-mono rounded border transition ${
                      onlyActiveSuspects
                        ? 'bg-crimson-800 text-white border-crimson-950'
                        : 'bg-parchment-50 text-ink-800 border-[#b5ab96] hover:bg-white'
                    }`}
                  >
                    Compatibles ({clueEval.matchingSuspectIds.length})
                  </button>
                </div>

                <div
                  data-testid="verdict-suspect-section"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1 p-1 rounded border border-[#c8bea6] bg-[#e9e3d2]/60"
                >
                  {filteredSuspects.map(s => {
                    const isSelected = selectedSuspect === s.id;
                    const isCompatible = matchingSuspectSet.has(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        data-verdict-suspect={s.id}
                        onClick={() => {
                          sound.playClick();
                          setSelectedSuspect(s.id);
                        }}
                        className={`p-2 rounded-[3px] border text-left transition-all flex items-center gap-2 relative ${
                          isSelected
                            ? 'border-2 border-crimson-800 bg-[#f6e8e8] text-crimson-950 shadow-md'
                            : !isCompatible
                            ? 'border-[#c5bca8] bg-[#ece6d8]/65 text-ink-600 opacity-70 hover:opacity-100'
                            : 'border-[#b5ab96] bg-[#f8f5ee] hover:bg-[#e8e2d3] hover:border-ink-800 text-ink-900'
                        }`}
                      >
                        <div className="w-9 h-11 rounded-[2px] overflow-hidden bg-ink-950 border border-ink-800 shrink-0">
                          <img
                            src={s.portraitGif}
                            alt={s.name}
                            loading="eager"
                            draggable={false}
                            className={`pointer-events-none w-full h-full object-cover object-top ${
                              !isCompatible ? 'grayscale' : ''
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-serif font-bold block truncate text-ink-950">
                            <span className="font-mono text-[10px] text-ink-500 mr-1">
                              #{s.number < 10 ? `0${s.number}` : s.number}
                            </span>
                            {s.name}
                          </span>
                          <span className="text-[10px] font-desc italic text-ink-700 block truncate">
                            {s.role}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7c1925] to-[#440910] border border-[#c5a059] text-gold-200 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Selector de las 18 Armas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-xs uppercase font-mono font-bold tracking-wider text-ink-950">
                    <Swords className="w-4 h-4 text-crimson-800" />
                    <span>2. ¿Qué instrumento se empleó? (18 armas inventariadas)</span>
                  </label>
                  {selectedWeaponObj && (
                    <span className="text-xs font-bold text-crimson-900 font-desc italic">
                      Arma: {selectedWeaponObj.name}
                    </span>
                  )}
                </div>
                <div data-testid="verdict-weapon-section" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WEAPONS.map(w => {
                    const isSelected = selectedWeapon === w.id;
                    const isCompatible = matchingWeaponSet.has(w.id);
                    return (
                      <button
                        type="button"
                        key={w.id}
                        data-verdict-weapon={w.id}
                        onClick={() => {
                          sound.playClick();
                          setSelectedWeapon(w.id);
                        }}
                        className={`p-2 rounded-[3px] border text-left transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'border-2 border-crimson-800 bg-[#f6e8e8] text-crimson-950 shadow-md font-bold'
                            : !isCompatible
                            ? 'border-[#c5bca8] bg-[#ece6d8]/65 text-ink-500 opacity-70 hover:opacity-100'
                            : 'border-[#b5ab96] bg-[#f8f5ee] hover:bg-[#e8e2d3] hover:border-ink-800 text-ink-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 bg-[#faf7f0] p-0.5 border border-ink-900/35 shadow-sm shrink-0">
                            <img
                              src={`./portraits/weapon-${w.id}.png`}
                              alt={w.name}
                              loading="lazy"
                              draggable={false}
                              className={`w-full h-full object-cover ${
                                !isCompatible && !isSelected ? 'grayscale opacity-75' : ''
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-serif font-bold block truncate text-ink-950">
                              {w.name}
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-600 block">
                              {w.category} • {w.material}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7c1925] to-[#440910] border border-[#c5a059] text-gold-200 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Selector de las 9 Estancias */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-xs uppercase font-mono font-bold tracking-wider text-ink-950">
                    <MapPin className="w-4 h-4 text-crimson-800" />
                    <span>3. ¿En qué estancia se perpetró el crimen? (9 estancias)</span>
                  </label>
                  {selectedLocationObj && (
                    <span className="text-xs font-bold text-crimson-900 font-desc italic">
                      Estancia: {selectedLocationObj.name}
                    </span>
                  )}
                </div>
                <div data-testid="verdict-room-section" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LOCATIONS.map(l => {
                    const isSelected = selectedLocation === l.id;
                    const isCompatible = matchingRoomSet.has(l.id);
                    return (
                      <button
                        type="button"
                        key={l.id}
                        data-verdict-location={l.id}
                        onClick={() => {
                          sound.playClick();
                          setSelectedLocation(l.id);
                        }}
                        className={`p-2 rounded-[3px] border text-left transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'border-2 border-crimson-800 bg-[#f6e8e8] text-crimson-950 shadow-md font-bold'
                            : !isCompatible
                            ? 'border-[#c5bca8] bg-[#ece6d8]/65 text-ink-500 opacity-70 hover:opacity-100'
                            : 'border-[#b5ab96] bg-[#f8f5ee] hover:bg-[#e8e2d3] hover:border-ink-800 text-ink-900'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-serif font-bold block truncate text-ink-950">
                            {l.name}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-600 block">
                            {l.floor}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7c1925] to-[#440910] border border-[#c5a059] text-gold-200 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resumen del Acta */}
              <div className="p-3 rounded-[3px] bg-[#e4decb] border border-[#b5ab96] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-reading text-ink-900">
                  <FileCheck className="w-4 h-4 text-crimson-800 shrink-0" />
                  <span>
                    <strong>Acta de Acusación ({selectionCount}/3):</strong>{' '}
                    {selectedSuspectObj ? selectedSuspectObj.name : '—'} •{' '}
                    {selectedWeaponObj ? selectedWeaponObj.name : '—'} •{' '}
                    {selectedLocationObj ? selectedLocationObj.name : '—'}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-crimson-900 font-bold">
                  {selectionCount === 3 ? 'Listo para lacrar' : 'Completa los 3 cargos'}
                </span>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  data-verdict-submit="true"
                  disabled={!selectedSuspect || !selectedWeapon || !selectedLocation}
                  className="w-full py-3.5 btn-crimson-wax disabled:opacity-40 text-parchment-50 font-serif font-bold text-sm sm:text-base rounded-[3px] shadow-lg transition uppercase tracking-wider flex items-center justify-center gap-2.5"
                >
                  <Gavel className="w-5 h-5 text-[#e5ca8f]" />
                  <span>Lacrar y Proclamar Veredicto Inapelable</span>
                </button>
              </div>
            </form>
          ) : verdictResult.isCorrect ? (
            /* ============================================================
               VICTORIA DINÁMICA PARA CUALQUIERA DE LOS 74 CASOS ÚNICOS
               ============================================================ */
            <div className="space-y-5" data-verdict-outcome="victory">
              <div className="p-5 bg-gradient-to-b from-gold-100 via-parchment-100 to-gold-100/90 border-2 border-gold-600 rounded-xl text-center space-y-2 shadow-md">
                <div className="w-16 h-16 mx-auto rounded-full wax-seal-badge text-gold-200 flex items-center justify-center shadow-lg animate-wax-pop">
                  <Scale className="w-7 h-7" />
                </div>
                <span className="inline-block text-[10px] font-mono uppercase tracking-[0.25em] text-crimson-900 font-bold">
                  Caso Resuelto • Expediente Judicial Cerrado • Villa Acebo 1924
                </span>
                <h3 className="font-title text-2xl sm:text-3xl text-crimson-950 pt-1">
                  {activeCase.murderNarrative.headline}
                </h3>
                <p className="text-xs sm:text-sm font-reading text-ink-900 max-w-2xl mx-auto leading-relaxed">
                  {activeCase.murderNarrative.summary}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 text-left">
                  <div className="p-2.5 rounded-lg bg-parchment-50/90 border border-gold-500/50">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-crimson-900 font-bold block">
                      Autor Material (#{actualCulpritObj?.number})
                    </span>
                    <span className="text-xs font-serif font-bold text-ink-950 flex items-center gap-1 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5 text-crimson-800 shrink-0" />
                      <span>{actualCulpritObj?.name}</span>
                    </span>
                    <span className="text-[11px] font-reading text-ink-700 block mt-0.5">
                      {actualCulpritObj?.role}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-parchment-50/90 border border-gold-500/50">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-crimson-900 font-bold block">
                      Arma Homicida
                    </span>
                    <span className="text-xs font-serif font-bold text-ink-950 flex items-center gap-1 mt-0.5">
                      <Swords className="w-3.5 h-3.5 text-crimson-800 shrink-0" />
                      <span>{actualWeaponObj?.name}</span>
                    </span>
                    <span className="text-[11px] font-reading text-ink-700 block mt-0.5">
                      {actualWeaponObj?.description}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-parchment-50/90 border border-gold-500/50">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-crimson-900 font-bold block">
                      Escena del Crimen
                    </span>
                    <span className="text-xs font-serif font-bold text-ink-950 flex items-center gap-1 mt-0.5">
                      <BookOpen className="w-3.5 h-3.5 text-crimson-800 shrink-0" />
                      <span>{actualRoomObj?.name} ({actualRoomObj?.floor})</span>
                    </span>
                    <span className="text-[11px] font-reading text-ink-700 block mt-0.5">
                      {actualRoomObj?.description}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reconstrucción y Epílogo propio de este caso */}
              <div className="p-5 sm:p-6 evidence-letter rounded-xl shadow-md font-reading text-xs sm:text-sm leading-relaxed space-y-3 text-ink-900">
                <div className="text-center border-b border-parchment-400 pb-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-crimson-900 font-bold block">
                    Reconstrucción Forense y Móvil
                  </span>
                  <h4 className="font-title text-xl sm:text-2xl text-ink-950 mt-0.5">
                    Así se perpetró el homicidio en Villa Acebo
                  </h4>
                </div>

                <p className="text-justify">{activeCase.murderNarrative.motiveDetail}</p>

                <ul className="space-y-1.5 bg-parchment-200/75 p-3 rounded border border-parchment-400 text-xs font-mono">
                  {activeCase.murderNarrative.reconstruction.map((step, idx) => (
                    <li key={idx} className="text-ink-900">
                      {step}
                    </li>
                  ))}
                </ul>

                <p className="text-justify italic">{activeCase.murderNarrative.epilogue}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleStartNewCase}
                  className="px-5 py-2.5 btn-crimson-wax text-parchment-50 rounded-md font-bold font-serif shadow-lg transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-[#e5ca8f]" />
                  <span>Iniciar Nuevo Caso (Otro de los 74 Sospechosos)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="px-5 py-2.5 bg-ink-950 hover:bg-ink-900 text-gold-300 border border-gold-500/50 rounded-md font-bold font-serif shadow-lg transition flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-gold-400" />
                  <span>Archivar Expediente</span>
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================
               ACUSACIÓN REFUTADA POR LAS PRUEBAS
               ============================================================ */
            <div
              className="space-y-4 text-center py-6 px-4 bg-parchment-100/90 rounded-xl border-2 border-crimson-800/40 animate-page-turn"
              data-verdict-outcome="rejected"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-crimson-100 text-crimson-800 border-2 border-crimson-300 flex items-center justify-center shadow">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-crimson-800 font-bold">
                  Objeción Forense • Acusación Desestimada
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-black text-crimson-950">
                  Contradicción en las Pruebas del Sumario
                </h3>
              </div>

              <p className="text-xs sm:text-sm font-reading text-ink-800 max-w-lg mx-auto leading-relaxed">
                Azlynn detiene el acta antes de firmarla: las pruebas forenses de esta ronda refutan
                al menos una parte de tu hipótesis.
              </p>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/10 border border-amber-800/30 text-xs font-mono text-crimson-950 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-gold-700" />
                <span>
                  Precisión del Acta: {verdictResult.correctCount} de 3 cargos coinciden con la evidencia
                </span>
              </div>

              <p className="text-xs italic font-reading text-ink-700 max-w-md mx-auto">
                Revisa tu Cuaderno del Detective y contrasta los descartes de los 74 sospechosos, las 18 armas y las 9 estancias antes de emitir un nuevo veredicto.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-5 py-2.5 bg-gradient-to-r from-crimson-800 to-crimson-900 hover:from-crimson-700 hover:to-crimson-800 text-gold-100 border border-gold-500/40 rounded-md font-bold font-serif shadow-md flex items-center gap-2 mx-auto transition"
                >
                  <RotateCcw className="w-4 h-4 text-gold-300" />
                  <span>Reexaminar Pruebas y Rectificar Acusación</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
