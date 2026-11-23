import React, { useState } from 'react';
import { isActUnlocked, useGameStore } from '../store/useGameStore';
import { sound } from '../utils/soundEffects';
import type { ActCrimeFile } from '../types/game';
import {
  X,
  DoorOpen,
  DoorClosed,
  Lock,
  MapPin,
  Clock,
  FileWarning,
  ChevronRight,
  CheckSquare,
  Feather,
  ShieldAlert,
  Paperclip,
} from 'lucide-react';

interface ActDoorModalProps {
  initialAct?: 1 | 2 | 3 | 4 | 5;
  startOpened?: boolean;
  onClose: () => void;
  onEnterActDay: (day: number) => void;
}

export const ActDoorModal: React.FC<ActDoorModalProps> = ({
  initialAct = 1,
  onClose,
  onEnterActDay,
}) => {
  const { activeCase, completedDays, openDoor, markDayCompleted } = useGameStore();
  const acts = activeCase.acts;

  const [selectedAct, setSelectedAct] = useState<1 | 2 | 3 | 4 | 5>(initialAct);
  const [failedDoorImgs, setFailedDoorImgs] = useState<Record<number, boolean>>({});

  const actFile: ActCrimeFile = acts.find(a => a.act === selectedAct) ?? acts[0];
  const isActOpenable = isActUnlocked(selectedAct, completedDays);

  const handleTestUnlockPreviousAct = () => {
    if (selectedAct <= 1) return;
    const prevActDays = activeCase.days.filter(d => d.act === selectedAct - 1);
    for (const d of prevActDays) {
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

  const prevActDone =
    selectedAct <= 1
      ? 6
      : completedDays.filter(
          d => d >= (selectedAct - 2) * 6 + 1 && d <= (selectedAct - 1) * 6
        ).length;

  const actCompletedCount = completedDays.filter(
    d => d >= actFile.dayStart && d <= actFile.dayEnd
  ).length;

  const handleCrossAndEnter = () => {
    if (!isActOpenable) {
      sound.playError();
      return;
    }
    openDoor(selectedAct);
    onEnterActDay(actFile.dayStart);
    onClose();
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
              {isActOpenable ? (
                <DoorOpen className="w-5 h-5 text-[#e5ca8f]" />
              ) : (
                <Lock className="w-5 h-5 text-[#e5ca8f]" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#dec48c]/85 block">
                Archivo de Puertas del Expediente • Villa Acebo 1924
              </span>
              <h2 className="font-title text-xl sm:text-3xl text-[#e5ca8f] leading-none pt-0.5 truncate">
                Puerta {actFile.doorRoman} —{' '}
                {isActOpenable ? actFile.doorTitle : 'Expediente Clasificado'}
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
            const unlocked = isActUnlocked(a.act, completedDays);
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
                <span className="text-[10px] opacity-80">
                  {unlocked ? `(${doneInAct}/6)` : 'Clasificada'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Cuerpo en doble pliego: Lado Izquierdo = Puerta | Lado Derecho = Mapa de Instantáneas (o Clasificado) */}
        <div className="relative z-10 p-4 sm:p-6 overflow-y-auto flex-1 bg-[#efeade]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            {/* ============================================================
                LADO IZQUIERDO: PUERTA FÍSICA CENTRADA SOBRE LA HOJA
               ============================================================ */}
            <div className="bg-[#f8f4ea] border-2 border-[#b5ab96] rounded-sm p-4 sm:p-5 shadow-inner flex flex-col items-center justify-center">
              <div
                onClick={handleCrossAndEnter}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCrossAndEnter();
                  }
                }}
                className={`group relative w-full max-w-[330px] sm:max-w-[360px] aspect-[4/5] rounded-sm overflow-hidden border-2 border-[#3d3a35] shadow-[0_18px_45px_rgba(0,0,0,0.42)] transition-transform ${
                  isActOpenable
                    ? 'cursor-pointer hover:scale-[1.01]'
                    : 'cursor-not-allowed grayscale-[0.45] brightness-75'
                }`}
                aria-label={
                  isActOpenable
                    ? `Cruzar Puerta ${actFile.doorNumber}`
                    : `Puerta ${actFile.doorNumber} clasificada`
                }
              >
                {!failedDoorImgs[actFile.doorNumber] ? (
                  <img
                    src={`./portraits/door-${actFile.doorNumber}.png`}
                    alt={`Puerta ${actFile.doorNumber}`}
                    draggable={false}
                    onError={() =>
                      setFailedDoorImgs(prev => ({ ...prev, [actFile.doorNumber]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-[#d8d3c8] via-[#ccc6b9] to-[#bab3a4] border-[8px] border-[#3d3a35] p-5 sm:p-6 flex flex-col justify-between relative">
                    <div className="relative flex-1 border-2 border-[#7b756a] bg-gradient-to-b from-[#e4dfd5]/80 to-[#cec8bb]/80 shadow-inner flex flex-col items-center justify-center p-4 mb-4">
                      <div className="px-7 py-2.5 rounded-[3px] bg-gradient-to-b from-[#e6e3dc] to-[#c4bfb4] border-2 border-[#5b564e] shadow text-center">
                        <span className="block text-[9px] font-mono uppercase tracking-[0.22em] text-ink-600">
                          Acto {actFile.doorRoman}
                        </span>
                        <span className="font-title text-4xl sm:text-5xl text-ink-950 leading-none">
                          {actFile.doorNumber}
                        </span>
                      </div>
                      <p className="mt-3 text-center font-serif font-bold text-sm text-ink-900">
                        {isActOpenable ? actFile.doorTitle : 'Expediente Clasificado'}
                      </p>
                    </div>
                  </div>
                )}

                {!isActOpenable && (
                  <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-ink-950/90 border border-gold-400/70 text-gold-300 flex items-center justify-center shadow-lg mb-2">
                      <Lock className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded bg-crimson-950/95 border border-gold-400/50 text-gold-200 text-[11px] font-mono font-bold uppercase tracking-wider">
                      Clasificada • Acto {selectedAct - 1} ({prevActDone}/6)
                    </span>
                  </div>
                )}
              </div>

              {isActOpenable ? (
                <button
                  type="button"
                  onClick={handleCrossAndEnter}
                  className="mt-4 px-5 py-2.5 btn-crimson-wax text-parchment-50 rounded-[3px] font-serif font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition"
                >
                  <DoorOpen className="w-4 h-4 text-[#e5ca8f]" />
                  <span>
                    Cruzar Puerta {actFile.doorNumber} (Ir al Día{' '}
                    {actFile.dayStart < 10 ? `0${actFile.dayStart}` : actFile.dayStart})
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#e5ca8f]" />
                </button>
              ) : (
                <p className="mt-3 text-xs font-mono text-crimson-900 font-bold text-center">
                  Puerta {actFile.doorNumber} sellada: completa los 6 acertijos del Acto{' '}
                  {selectedAct - 1} ({prevActDone}/6) para desclasificar.
                </p>
              )}
            </div>

            {/* ============================================================
                LADO DERECHO: MAPA DE EXPEDIENTE CON INSTANTÁNEAS (O CLASIFICADO)
               ============================================================ */}
            <div className="bg-[#f8f4ea] border-2 border-[#b5ab96] rounded-sm p-4 sm:p-5 shadow-inner flex flex-col justify-between space-y-3">
              {!isActOpenable ? (
                <div className="my-auto py-6 px-3 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-ink-950 text-gold-300 border-2 border-gold-500/65 flex items-center justify-center shadow-lg">
                    <ShieldAlert className="w-7 h-7 text-crimson-400" />
                  </div>
                  <span className="inline-block px-3 py-0.5 rounded-sm bg-crimson-900 text-parchment-50 border border-crimson-950 text-[10px] font-mono uppercase tracking-[0.24em] font-bold">
                    EXPEDIENTE CLASIFICADO • SECRETO SUMARIAL
                  </span>
                  <h3 className="font-title text-2xl sm:text-3xl text-ink-950">
                    Puerta {actFile.doorRoman} Bajo Custodia
                  </h3>

                  <div className="p-3.5 rounded-sm bg-[#ede6d6] border-2 border-dashed border-ink-800/35 text-left space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-ink-700 border-b border-[#c5baa4] pb-1">
                      <span>Archivo N.º 1924-P{actFile.doorNumber}</span>
                      <span className="text-crimson-900 font-bold">CLASIFICADO</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-ink-500 block">EXPEDIENTE:</span>
                        <span className="inline-block bg-ink-900/85 text-transparent select-none rounded-sm px-2 py-0.5 text-[11px]">
                          ██████████████
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 block">UBICACIÓN:</span>
                        <span className="inline-block bg-ink-900/85 text-transparent select-none rounded-sm px-2 py-0.5 text-[11px]">
                          ████████████
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div className="h-2.5 w-full bg-ink-900/20 rounded-sm" />
                      <div className="h-2.5 w-10/12 bg-ink-900/20 rounded-sm" />
                      <div className="h-2.5 w-4/5 bg-ink-900/20 rounded-sm" />
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-ink-800 max-w-md mx-auto leading-relaxed">
                    Toda la información de la <strong>Puerta {actFile.doorRoman}</strong> (Días{' '}
                    {actFile.dayStart}–{actFile.dayEnd}) se mantiene clasificada hasta que cumplas
                    los <strong>6 acertijos</strong> del Acto {selectedAct - 1}.
                  </p>

                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#ede6d6] border border-crimson-800/40 font-mono text-xs font-bold text-crimson-900">
                    <Lock className="w-3.5 h-3.5 text-crimson-800" />
                    <span>
                      Acertijos cumplidos del Acto {selectedAct - 1}: {prevActDone} / 6
                    </span>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleTestUnlockPreviousAct}
                      className="px-3.5 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-ink-950 font-mono text-xs font-black uppercase tracking-wider border-2 border-ink-900 shadow transition"
                    >
                      [TEST] Completar Acto {selectedAct - 1} y Desclasificar Puerta {actFile.doorNumber}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Cabecera con clip y fecha */}
                  <div className="flex items-center justify-between gap-2 border-b-2 border-ink-900/25 pb-1.5">
                    <span className="font-mono text-xs sm:text-sm font-black uppercase tracking-widest text-ink-950 inline-flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-ink-700 -rotate-12" />
                      <span>{actFile.dateStr}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-crimson-900 bg-crimson-100/80 px-2 py-0.5 rounded border border-crimson-300">
                      <Clock className="w-3 h-3" /> {actFile.timeDiscovered}
                    </span>
                  </div>

                  <h3 className="font-title text-xl sm:text-2xl text-crimson-950 leading-tight">
                    {actFile.headline}
                  </h3>

                  {/* NODO 1: Párrafo 1 + Flecha + Instantánea del Retrato */}
                  <div className="grid grid-cols-12 gap-2.5 items-center">
                    <div className="col-span-7 sm:col-span-8 space-y-1">
                      <p className="text-xs sm:text-[12.5px] leading-relaxed text-ink-900 text-justify font-reading">
                        {actFile.situationBrief[0]}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[10px] font-declaration italic text-crimson-900">
                        <span>ficha del censo</span>
                        <svg className="w-10 h-4 text-crimson-800/80 shrink-0" viewBox="0 0 48 18" fill="none">
                          <path
                            d="M2 12 C 16 14, 30 10, 43 5 M 37 2 L 44 5 L 39 11"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="col-span-5 sm:col-span-4 flex justify-center">
                      <div className="relative w-24 sm:w-28 bg-[#faf7f0] p-1.5 pb-2 border border-ink-900/45 shadow-md rotate-[1.8deg]">
                        <div className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-2.5 bg-[#e6dcc4]/90 border border-[#bfb399] -rotate-2 shadow-sm" />
                        <div className="w-full aspect-[4/4.5] overflow-hidden bg-ink-950 border border-ink-800/60">
                          <img
                            src={actFile.victimPortrait}
                            alt={`Instantánea de ${actFile.victimName}`}
                            draggable={false}
                            className="w-full h-full object-cover object-top grayscale contrast-115"
                          />
                        </div>
                        <div className="mt-1 space-y-0.5 text-[8.5px] font-mono leading-tight text-ink-900">
                          <div className="border-b border-ink-800/25 pb-0.5 font-bold uppercase truncate">
                            {actFile.victimNumber
                              ? `#${actFile.victimNumber < 10 ? `0${actFile.victimNumber}` : actFile.victimNumber} `
                              : ''}
                            {actFile.victimName}
                          </div>
                          <div className="border-b border-ink-800/20 pb-0.5 text-[8px] text-ink-700 truncate">
                            {actFile.victimAge} años · {actFile.victimRole}
                          </div>
                          <div className="text-[8px] text-crimson-900 font-semibold flex items-center gap-0.5 truncate">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{actFile.sceneFloor}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NODO 2: Instantánea de la Escena (Izquierda) + Flecha + Párrafo 2 (Derecha) */}
                  <div className="grid grid-cols-12 gap-2.5 items-center">
                    <div className="col-span-5 flex flex-col items-center">
                      <div className="relative w-32 sm:w-36 bg-[#faf7f0] p-1.5 pb-2 border border-ink-900/45 shadow-md -rotate-[1.6deg]">
                        <div className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 w-10 h-2.5 bg-[#e6dcc4]/90 border border-[#bfb399] rotate-1 shadow-sm" />
                        <div className="w-full aspect-[4/3] overflow-hidden bg-ink-950 border border-ink-800/60">
                          <img
                            src={actFile.sceneImage}
                            alt={`Instantánea de escena: ${actFile.sceneLocationName}`}
                            draggable={false}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[8px] font-mono text-ink-800">
                          <span className="truncate font-bold uppercase">{actFile.sceneLocationName}</span>
                          <span className="px-1 rounded-full border border-ink-700/50 text-[7.5px] font-bold shrink-0">
                            P{actFile.doorNumber}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-declaration italic text-crimson-900">
                        <span>¿por qué en esta estancia???</span>
                        <svg className="w-7 h-3.5 text-crimson-800/80 shrink-0" viewBox="0 0 36 16" fill="none">
                          <path
                            d="M2 12 C 12 14, 24 10, 32 3 M 26 2 L 33 3 L 30 9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="col-span-7 space-y-1.5">
                      <p className="text-xs sm:text-[12.5px] leading-relaxed text-ink-900 text-justify font-reading">
                        {actFile.situationBrief[1]}
                      </p>
                      <div className="torn-note-paper p-2 rounded-sm border border-[#c5baa4]">
                        <div className="flex items-center gap-1 text-[8.5px] font-mono uppercase tracking-widest font-bold text-crimson-900">
                          <Feather className="w-2.5 h-2.5" />
                          <span>Anotación de Azlynn</span>
                        </div>
                        <p className="font-declaration text-[11px] text-ink-950 italic leading-snug mt-0.5">
                          «{actFile.detectiveNote}»
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* NODO 3: Párrafo 3 + Flecha + Instantánea de Arma/Objeto */}
                  <div className="grid grid-cols-12 gap-2.5 items-center">
                    <div className="col-span-7 sm:col-span-8 space-y-1">
                      <p className="text-xs sm:text-[12.5px] leading-relaxed text-ink-900 text-justify font-reading">
                        {actFile.situationBrief[2]}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[10px] font-declaration italic text-crimson-900">
                        <span>indicio recolectado</span>
                        <svg className="w-9 h-3.5 text-crimson-800/80 shrink-0" viewBox="0 0 40 16" fill="none">
                          <path
                            d="M2 6 C 14 2, 26 4, 36 10 M 30 12 L 37 10 L 33 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="col-span-5 sm:col-span-4 flex justify-center">
                      <div className="relative w-24 sm:w-28 bg-[#faf7f0] p-1.5 pb-2 border border-ink-900/45 shadow-md rotate-[1.4deg]">
                        <div className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-[#e6dcc4]/90 border border-[#bfb399] -rotate-1 shadow-sm" />
                        <div className="w-full aspect-square overflow-hidden bg-ink-950 border border-ink-800/60">
                          <img
                            src={actFile.weaponImage}
                            alt={`Evidencia: ${actFile.weaponName}`}
                            draggable={false}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="mt-1 text-[8px] font-mono text-ink-900 leading-tight text-center">
                          <span className="block font-bold uppercase text-crimson-900">INDICIO</span>
                          <span className="block truncate text-ink-700" title={actFile.weaponName}>
                            {actFile.weaponName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloque PENDIENTE */}
                  <div className="bg-[#ede6d6] border border-crimson-900/35 rounded-sm p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between border-b border-crimson-900/20 pb-1">
                      <span className="font-mono text-[11px] uppercase tracking-widest font-black text-crimson-950 flex items-center gap-1.5">
                        <FileWarning className="w-3.5 h-3.5 text-crimson-800" />
                        <span>PENDIENTE EN EL ACTO {actFile.doorRoman}:</span>
                      </span>
                      <span className="text-[10px] font-mono text-ink-600">
                        Progreso: {actCompletedCount}/6 días
                      </span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-ink-900 font-reading">
                      {actFile.pendingItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckSquare className="w-3 h-3 text-crimson-800 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
