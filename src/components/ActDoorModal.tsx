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
  ShieldAlert,
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
  const { activeCase, completedDays, openDoor } = useGameStore();
  const acts = activeCase.acts;

  const [selectedAct, setSelectedAct] = useState<1 | 2 | 3 | 4 | 5>(initialAct);
  const [failedDoorImgs, setFailedDoorImgs] = useState<Record<number, boolean>>({});

  const actFile: ActCrimeFile = acts.find(a => a.act === selectedAct) ?? acts[0];
  const isActOpenable = isActUnlocked(selectedAct, completedDays);

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

        {/* Cuerpo en doble pliego: Lado Izquierdo = Puerta | Lado Derecho = Expediente (o Clasificado) */}
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
                LADO DERECHO: INFORMACIÓN DEL EXPEDIENTE (O SELLO CLASIFICADO)
               ============================================================ */}
            <div className="bg-[#f8f4ea] border-2 border-[#b5ab96] rounded-sm p-4 sm:p-5 shadow-inner flex flex-col justify-between space-y-4">
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
                </div>
              ) : (
                <div className="space-y-3.5">
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

                  {/* Ficha fotográfica */}
                  <div className="flex items-start gap-3.5 p-3 rounded-sm bg-[#ede6d6] border border-[#b8ab96] shadow-sm">
                    <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-[2px] overflow-hidden bg-ink-950 border-2 border-ink-800 shadow shrink-0">
                      <img
                        src={actFile.victimPortrait}
                        alt={`Retrato de ${actFile.victimName}`}
                        draggable={false}
                        className="w-full h-full object-cover object-top grayscale contrast-110"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider font-bold text-crimson-900">
                        <Skull className="w-3 h-3" /> Expediente • Acto {actFile.doorRoman}
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

                  {/* Fotografía forense */}
                  {actFile.sceneImage && (
                    <div className="p-1.5 bg-[#ede6d6] border border-[#b5ab96] rounded-sm shadow-sm">
                      <div className="relative w-full aspect-[4/3] overflow-hidden bg-ink-950 border border-ink-900">
                        <img
                          src={actFile.sceneImage}
                          alt={`Escena forense: ${actFile.sceneLocationName}`}
                          draggable={false}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-ink-950/85 border border-gold-400/40 text-[10px] font-mono uppercase tracking-wider text-gold-200">
                          Placa Forense • {actFile.sceneLocationName}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Crónica narrativa */}
                  <div className="space-y-2 text-xs sm:text-[13.5px] leading-relaxed text-ink-900 text-justify font-reading">
                    {actFile.situationBrief.map((p, idx) => (
                      <p key={idx} className={idx > 0 ? 'indent-4' : ''}>
                        {p}
                      </p>
                    ))}
                  </div>

                  {/* Nota manuscrita de Azlynn */}
                  <div className="torn-note-paper p-3 rounded-sm border border-[#c5baa4] space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest font-bold text-crimson-900">
                      <Feather className="w-3.5 h-3.5" />
                      <span>Anotación de la Detective Azlynn</span>
                    </div>
                    <p className="font-declaration text-xs sm:text-sm text-ink-950 italic leading-relaxed">
                      «{actFile.detectiveNote}»
                    </p>
                  </div>

                  {/* Bloque PENDIENTE */}
                  <div className="bg-[#ede6d6] border border-crimson-900/35 rounded-sm p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-crimson-900/20 pb-1">
                      <span className="font-mono text-xs uppercase tracking-widest font-black text-crimson-950 flex items-center gap-1.5">
                        <FileWarning className="w-3.5 h-3.5 text-crimson-800" />
                        <span>Pendiente en el Acto {actFile.doorRoman}</span>
                      </span>
                      <span className="text-[10px] font-mono text-ink-600">
                        Progreso: {actCompletedCount}/6 días
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs text-ink-900 font-reading">
                      {actFile.pendingItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckSquare className="w-3.5 h-3.5 text-crimson-800 shrink-0 mt-0.5" />
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
