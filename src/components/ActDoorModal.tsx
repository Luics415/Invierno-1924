import React, { useState } from 'react';
import { isActUnlocked, useGameStore } from '../store/useGameStore';
import { sound } from '../utils/soundEffects';
import type { ActCrimeFile } from '../types/game';
import {
  X,
  DoorOpen,
  DoorClosed,
  Lock,
  Skull,
  MapPin,
  Clock,
  FileWarning,
  ChevronRight,
  CheckSquare,
  Feather,
} from 'lucide-react';

interface ActDoorModalProps {
  initialAct?: 1 | 2 | 3 | 4 | 5;
  startOpened?: boolean;
  onClose: () => void;
  onEnterActDay: (day: number) => void;
}

export const ActDoorModal: React.FC<ActDoorModalProps> = ({
  initialAct = 1,
  startOpened = false,
  onClose,
  onEnterActDay,
}) => {
  const { activeCase, completedDays, freePlayMode, openDoor } = useGameStore();
  const acts = activeCase.acts;

  const [selectedAct, setSelectedAct] = useState<1 | 2 | 3 | 4 | 5>(initialAct);
  const [openedDoors, setOpenedDoors] = useState<Record<number, boolean>>(() =>
    startOpened ? { [initialAct]: true } : {}
  );
  const [failedDoorImgs, setFailedDoorImgs] = useState<Record<number, boolean>>({});

  const actFile: ActCrimeFile = acts.find(a => a.act === selectedAct) ?? acts[0];
  const isActOpenable = freePlayMode || isActUnlocked(selectedAct, completedDays);
  const isDoorOpened = isActOpenable && Boolean(openedDoors[selectedAct]);
  const prevActDone =
    selectedAct <= 1
      ? 6
      : completedDays.filter(
          d => d >= (selectedAct - 2) * 6 + 1 && d <= (selectedAct - 1) * 6
        ).length;

  const actCompletedCount = completedDays.filter(
    d => d >= actFile.dayStart && d <= actFile.dayEnd
  ).length;

  const handleOpenDoor = () => {
    if (!isActOpenable) {
      sound.playError();
      return;
    }
    openDoor(selectedAct);
    setOpenedDoors(prev => ({ ...prev, [selectedAct]: true }));
  };

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
        className="relative book-cover-leather border-2 border-[#08090c] ring-1 ring-[#b79b65]/45 rounded-lg max-w-5xl w-full max-h-[93vh] flex flex-col shadow-[0_32px_85px_rgba(0,0,0,0.96)] overflow-hidden text-ink-900 font-reading"
      >
        <div className="pointer-events-none absolute inset-0 book-arcane-wear z-0" />

        {/* Cabecera */}
        <div className="relative z-10 header-leather-bar p-3.5 sm:p-5 border-b border-[#b79b65]/35 text-gold-300 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full border border-[#c5a059]/75 bg-[#08090c] flex items-center justify-center shadow-md shrink-0">
              {isDoorOpened ? (
                <DoorOpen className="w-5 h-5 text-[#e5ca8f]" />
              ) : (
                <DoorClosed className="w-5 h-5 text-[#e5ca8f]" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#dec48c]/85 block">
                Archivo de Puertas y Víctimas • Villa Acebo 1924
              </span>
              <h2 className="font-title text-xl sm:text-3xl text-[#e5ca8f] leading-none pt-0.5 truncate">
                Puerta {actFile.doorRoman} — {actFile.doorTitle}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-parchment-300 hover:text-white p-1.5 rounded-[3px] hover:bg-white/10 transition shrink-0"
            title="Cerrar Archivo de Puertas"
            aria-label="Cerrar Archivo de Puertas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de las 5 Puertas */}
        <div className="relative z-10 flex items-center gap-1.5 px-3 py-2 bg-[#12141a] border-b border-[#b79b65]/30 overflow-x-auto shrink-0">
          {acts.map(a => {
            const active = a.act === selectedAct;
            const doneInAct = completedDays.filter(d => d >= a.dayStart && d <= a.dayEnd).length;
            const unlocked = freePlayMode || isActUnlocked(a.act, completedDays);
            return (
              <button
                key={a.act}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedAct(a.act);
                }}
                className={`px-3 py-1.5 rounded-[3px] text-xs font-mono transition whitespace-nowrap flex items-center gap-1.5 border ${
                  active
                    ? 'bg-[#6e171e] text-[#f4ead3] border-[#c5a059] shadow font-bold'
                    : unlocked
                    ? 'bg-[#1a1d26] text-parchment-300 border-[#2e323d] hover:border-[#b79b65]/60 hover:text-[#e5ca8f]'
                    : 'bg-[#14161d] text-parchment-300/55 border-[#252832] hover:border-crimson-800/60'
                }`}
              >
                {unlocked ? (
                  <DoorClosed className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-crimson-400 shrink-0" />
                )}
                <span>Puerta {a.doorNumber}</span>
                <span className="text-[10px] opacity-80">({doneInAct}/6)</span>
              </button>
            );
          })}
        </div>

        {/* Cuerpo: Puerta Física Cerrada o Expediente Forense de Víctima */}
        <div className="relative z-10 p-4 sm:p-6 overflow-y-auto flex-1 bg-[#efeade]">
          {!isDoorOpened ? (
            /* ============================================================
               VISTA DE PUERTA FÍSICA NUMERADA (1–5)
               ============================================================ */
            <div className="flex flex-col items-center justify-center py-2 sm:py-4">
              <div
                onClick={handleOpenDoor}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenDoor();
                  }
                }}
                className={`group relative w-full max-w-[340px] sm:max-w-[380px] aspect-[4/5] rounded-sm overflow-hidden border-2 border-[#3d3a35] shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition-transform ${
                  isActOpenable ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-not-allowed grayscale-[0.4]'
                }`}
                aria-label={
                  isActOpenable ? `Abrir Puerta ${actFile.doorNumber}` : `Puerta ${actFile.doorNumber} sellada`
                }
              >
                {!failedDoorImgs[actFile.doorNumber] ? (
                  <img
                    src={`./portraits/door-${actFile.doorNumber}.png`}
                    alt={`Puerta ${actFile.doorNumber} — ${actFile.doorTitle}`}
                    draggable={false}
                    onError={() =>
                      setFailedDoorImgs(prev => ({ ...prev, [actFile.doorNumber]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-[#d8d3c8] via-[#ccc6b9] to-[#bab3a4] border-[8px] border-[#3d3a35] p-5 sm:p-6 flex flex-col justify-between relative">
                    {/* Moldura superior */}
                    <div className="relative flex-1 border-2 border-[#7b756a] bg-gradient-to-b from-[#e4dfd5]/80 to-[#cec8bb]/80 shadow-inner flex flex-col items-center justify-center p-4 mb-4">
                      <div className="px-7 py-2.5 rounded-[3px] bg-gradient-to-b from-[#e6e3dc] to-[#c4bfb4] border-2 border-[#5b564e] shadow-[0_3px_8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.7)] text-center">
                        <span className="block text-[9px] font-mono uppercase tracking-[0.22em] text-ink-600">
                          Acto {actFile.doorRoman}
                        </span>
                        <span className="font-title text-4xl sm:text-5xl text-ink-950 leading-none">
                          {actFile.doorNumber}
                        </span>
                      </div>
                      <p className="mt-3 text-center font-serif font-bold text-sm text-ink-900">
                        {actFile.doorTitle}
                      </p>
                      <p className="text-[11px] font-mono text-ink-600 mt-0.5">
                        Días {actFile.dayStart}–{actFile.dayEnd} • {actFile.dateStr}
                      </p>
                    </div>

                    {/* Picaporte derecho */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center">
                      <div className="w-3.5 h-12 rounded-sm bg-gradient-to-b from-[#9a9488] to-[#5e5a52] border border-[#3d3a35] shadow" />
                      <div className="w-8 h-2.5 -mt-7 -ml-5 rounded-full bg-gradient-to-r from-[#b8b1a2] to-[#746e63] border border-[#3d3a35] shadow-md group-hover:rotate-[-8deg] transition-transform origin-right" />
                    </div>

                    {/* Moldura inferior */}
                    <div className="h-[34%] border-2 border-[#7b756a] bg-gradient-to-b from-[#dfd9ce]/75 to-[#c5bfb1]/75 shadow-inner flex flex-col items-center justify-center p-3 text-center gap-2">
                      <div className="w-9 h-9 rounded-full wax-seal-badge text-gold-200 flex items-center justify-center shadow">
                        {isActOpenable ? <Skull className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-crimson-950 font-bold">
                        {isActOpenable
                          ? `Víctima ${actFile.doorRoman}: ${actFile.victimName}`
                          : `Bloqueada (${prevActDone}/6 del Acto ${selectedAct - 1})`}
                      </span>
                    </div>
                  </div>
                )}

                {!isActOpenable && (
                  <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-ink-950/90 border border-gold-400/70 text-gold-300 flex items-center justify-center shadow-lg mb-2">
                      <Lock className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded bg-crimson-950/95 border border-gold-400/50 text-gold-200 text-[11px] font-mono font-bold uppercase tracking-wider">
                      Completa el Acto {selectedAct - 1} ({prevActDone}/6)
                    </span>
                  </div>
                )}
              </div>

              {isActOpenable ? (
                <button
                  type="button"
                  onClick={handleOpenDoor}
                  className="mt-5 px-6 py-2.5 btn-crimson-wax text-parchment-50 rounded-[3px] font-serif font-bold text-sm flex items-center gap-2 shadow-lg transition"
                >
                  <DoorOpen className="w-4 h-4 text-[#e5ca8f]" />
                  <span>Cruzar Puerta {actFile.doorNumber} y Leer Expediente</span>
                </button>
              ) : (
                <p className="mt-4 text-xs font-mono text-crimson-900 font-bold text-center">
                  Puerta {actFile.doorNumber} sellada: resuelve los 6 enigmas de la Puerta {selectedAct - 1} ({prevActDone}/6) para avanzar.
                </p>
              )}
            </div>
          ) : (
            /* ============================================================
               EXPEDIENTE FORENSE DE LA VÍCTIMA DEL ACTO (DOBLE PLIEGO)
               ============================================================ */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Pliego Izquierdo: Crónica y Retrato de la Víctima */}
              <div className="bg-[#f8f4ea] border-2 border-[#b5ab96] rounded-sm p-4 sm:p-5 shadow-inner space-y-4">
                <div className="flex items-center justify-between gap-2 border-b-2 border-ink-900/25 pb-2">
                  <span className="font-mono text-xs sm:text-sm font-black uppercase tracking-widest text-ink-950">
                    {actFile.dateStr}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-crimson-900 bg-crimson-100/80 px-2 py-0.5 rounded border border-crimson-300">
                    <Clock className="w-3 h-3" /> {actFile.timeDiscovered}
                  </span>
                </div>

                <h3 className="font-title text-2xl sm:text-[26px] text-crimson-950 leading-tight">
                  {actFile.headline}
                </h3>

                {/* Ficha fotográfica de la víctima estilo recorte de expediente */}
                <div className="flex items-start gap-3.5 p-3 rounded-sm bg-[#ede6d6] border border-[#b8ab96] shadow-sm">
                  <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-[2px] overflow-hidden bg-ink-950 border-2 border-ink-800 shadow shrink-0">
                    <img
                      src={actFile.victimPortrait}
                      alt={`Víctima ${actFile.victimName}`}
                      draggable={false}
                      className="w-full h-full object-cover object-top grayscale contrast-110"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider font-bold text-crimson-900">
                      <Skull className="w-3 h-3" /> Víctima {actFile.doorRoman} de 5
                    </span>
                    <div className="font-serif font-black text-base sm:text-lg text-ink-950 leading-tight">
                      {actFile.victimNumber
                        ? `#${actFile.victimNumber < 10 ? `0${actFile.victimNumber}` : actFile.victimNumber} `
                        : ''}
                      {actFile.victimName}
                    </div>
                    <p className="text-xs font-desc italic text-ink-700">
                      {actFile.victimRole} • {actFile.victimAge} años
                    </p>
                    <p className="text-[11px] font-mono text-ink-800 flex items-center gap-1 pt-0.5">
                      <MapPin className="w-3 h-3 text-crimson-800 shrink-0" />
                      <span className="truncate">
                        {actFile.sceneLocationName} ({actFile.sceneFloor})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Crónica narrativa del hallazgo */}
                <div className="space-y-2.5 text-xs sm:text-[13.5px] leading-relaxed text-ink-900 text-justify font-reading">
                  {actFile.situationBrief.map((p, idx) => (
                    <p key={idx} className={idx > 0 ? 'indent-4' : ''}>
                      {p}
                    </p>
                  ))}
                </div>
              </div>

              {/* Pliego Derecho: Fotografía Forense + Nota de Azlynn + PENDIENTE + Navegación */}
              <div className="space-y-4">
                {actFile.sceneImage && (
                  <div className="p-2 bg-[#f8f4ea] border-2 border-[#b5ab96] rounded-sm shadow-md">
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-ink-950 border border-ink-900">
                      <img
                        src={actFile.sceneImage}
                        alt={`Escena forense: ${actFile.sceneLocationName}`}
                        draggable={false}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-ink-950/85 border border-gold-400/40 text-[10px] font-mono uppercase tracking-wider text-gold-200">
                        Archivo Forense • {actFile.sceneLocationName}
                      </span>
                    </div>
                  </div>
                )}

                {/* Nota manuscrita de Azlynn */}
                <div className="torn-note-paper p-4 rounded-sm border border-[#c5baa4] space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest font-bold text-crimson-900">
                    <Feather className="w-3.5 h-3.5" />
                    <span>Anotación de la Detective Azlynn</span>
                  </div>
                  <p className="font-declaration text-sm text-ink-950 italic leading-relaxed">
                    «{actFile.detectiveNote}»
                  </p>
                </div>

                {/* Bloque PENDIENTE */}
                <div className="bg-[#f8f4ea] border-2 border-crimson-900/40 rounded-sm p-4 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between border-b border-crimson-900/20 pb-1.5">
                    <span className="font-mono text-xs uppercase tracking-widest font-black text-crimson-950 flex items-center gap-1.5">
                      <FileWarning className="w-4 h-4 text-crimson-800" />
                      <span>Pendiente en el Acto {actFile.doorRoman}</span>
                    </span>
                    <span className="text-[10px] font-mono text-ink-600">
                      Progreso: {actCompletedCount}/6 días
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs sm:text-[13px] text-ink-900 font-reading">
                    {actFile.pendingItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckSquare className="w-3.5 h-3.5 text-crimson-800 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Resumen de las 5 víctimas */}
                <div className="bg-[#e4decb] border border-[#b5ab96] rounded-sm p-3.5 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-ink-700 block">
                    Cadena de 5 Víctimas en Villa Acebo
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {acts.map(a => (
                      <button
                        key={a.act}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setSelectedAct(a.act);
                        }}
                        className={`px-2.5 py-1.5 rounded text-left text-[11px] font-mono border transition flex items-center justify-between gap-1 ${
                          a.act === selectedAct
                            ? 'bg-crimson-900 text-parchment-50 border-crimson-950 font-bold'
                            : 'bg-parchment-50 text-ink-800 border-[#c5baa4] hover:bg-white'
                        }`}
                      >
                        <span className="truncate">
                          P{a.doorNumber}: {a.victimName}
                        </span>
                        <span className="text-[9px] opacity-75 shrink-0">D.{a.dayStart}–{a.dayEnd}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botón para entrar a los días del Acto */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setOpenedDoors(prev => ({ ...prev, [selectedAct]: false }));
                    }}
                    className="px-3.5 py-2 rounded-[3px] bg-[#e4decb] hover:bg-[#d8d0bc] border border-[#b5ab96] text-xs font-mono font-semibold text-ink-800 transition"
                  >
                    Ver Puerta {actFile.doorNumber}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playPageTurn();
                      onEnterActDay(actFile.dayStart);
                      onClose();
                    }}
                    className="px-5 py-2.5 btn-crimson-wax text-parchment-50 rounded-[3px] font-serif font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition"
                  >
                    <span>Investigar Acto {actFile.doorRoman} (Día {actFile.dayStart < 10 ? `0${actFile.dayStart}` : actFile.dayStart})</span>
                    <ChevronRight className="w-4 h-4 text-[#e5ca8f]" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
