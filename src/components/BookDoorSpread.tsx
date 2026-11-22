import React, { useState } from 'react';
import type { ActCrimeFile } from '../types/game';
import { sound } from '../utils/soundEffects';
import {
  DoorOpen,
  Lock,
  Skull,
  Clock,
  MapPin,
  Feather,
  FileWarning,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface BookDoorSpreadProps {
  actFile: ActCrimeFile;
  isUnlocked: boolean;
  prevActCompletedCount: number;
  mobilePage: 'left' | 'right';
  onCrossDoor: () => void;
  onGoBack: () => void;
}

export const BookDoorSpread: React.FC<BookDoorSpreadProps> = ({
  actFile,
  isUnlocked,
  prevActCompletedCount,
  mobilePage,
  onCrossDoor,
  onGoBack,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const doorImageSrc = `./portraits/door-${actFile.doorNumber}.png`;

  return (
    <div className="w-full h-full flex flex-col lg:flex-row flex-1 min-h-0">
      {/* ====================================================================
          PÁGINA IZQUIERDA (VERSO): IMAGEN DE LA PUERTA CENTRADA CON BORDE DE HOJA
          ==================================================================== */}
      <section
        className={`page-verso lg:w-1/2 p-3 sm:p-4 lg:p-5 lg:pr-7 flex flex-col items-center justify-between font-reading min-w-0 min-h-0 relative overflow-hidden ${
          mobilePage === 'left' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <div className="flex-1 w-full min-h-0 flex items-center justify-center">
          <div
            onClick={() => {
              if (isUnlocked) onCrossDoor();
              else sound.playError();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isUnlocked) onCrossDoor();
                else sound.playError();
              }
            }}
            aria-label={
              isUnlocked
                ? `Cruzar Puerta ${actFile.doorNumber}`
                : `Puerta ${actFile.doorNumber} clasificada`
            }
            className={`group relative w-full max-w-[92%] h-full max-h-[94%] rounded-sm border-2 border-ink-900/75 shadow-[0_14px_38px_rgba(0,0,0,0.42)] overflow-hidden ${
              isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
          >
            {!imgFailed ? (
              <img
                src={doorImageSrc}
                alt={`Puerta ${actFile.doorNumber}`}
                draggable={false}
                onError={() => setImgFailed(true)}
                className={`w-full h-full object-cover object-center transition-transform duration-500 ${
                  isUnlocked ? 'group-hover:scale-[1.015]' : 'grayscale-[0.45] brightness-75'
                }`}
              />
            ) : (
              /* Puerta arquitectónica 1924 de respaldo */
              <div className="w-full h-full bg-gradient-to-b from-[#d8d3c8] via-[#cac3b5] to-[#b5ae9e] border-[10px] border-[#3a3630] p-6 flex flex-col justify-between relative">
                <div className="flex-1 border-2 border-[#7b756a] bg-gradient-to-b from-[#e4dfd5]/85 to-[#ccc5b7]/85 shadow-inner flex flex-col items-center justify-center p-4 mb-4">
                  <div className="px-8 py-2.5 rounded-[2px] bg-gradient-to-b from-[#e6e3dc] to-[#c4bfb4] border-2 border-[#5b564e] shadow text-center">
                    <span className="block text-[9px] font-mono uppercase tracking-[0.22em] text-ink-600">
                      Puerta
                    </span>
                    <span className="font-title text-5xl text-ink-950 leading-none">
                      {actFile.doorNumber}
                    </span>
                  </div>
                  <p className="mt-3 text-center font-serif font-bold text-sm text-ink-900">
                    {isUnlocked ? actFile.doorTitle : 'Expediente Clasificado'}
                  </p>
                </div>
                <div className="h-[34%] border-2 border-[#7b756a] bg-gradient-to-b from-[#dfd9ce]/80 to-[#c5bfb1]/80 shadow-inner flex flex-col items-center justify-center p-3 text-center gap-2">
                  <div className="w-9 h-9 rounded-full wax-seal-badge text-gold-200 flex items-center justify-center shadow">
                    {isUnlocked ? <DoorOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-crimson-950 font-bold">
                    Días {actFile.dayStart}–{actFile.dayEnd}
                  </span>
                </div>
              </div>
            )}

            {/* Viñeta sutil inferior */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

            {/* Estado bloqueado / clasificado sobre la puerta */}
            {!isUnlocked && (
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center">
                <div className="w-14 h-14 rounded-full bg-ink-950/90 border-2 border-gold-400/75 text-gold-300 flex items-center justify-center shadow-2xl mb-2.5">
                  <Lock className="w-7 h-7" />
                </div>
                <span className="px-3.5 py-1.5 rounded bg-crimson-950/95 border border-gold-400/50 text-gold-200 text-xs font-mono font-bold uppercase tracking-wider shadow-lg">
                  Puerta {actFile.doorNumber} Clasificada • {prevActCompletedCount}/6 del Acto{' '}
                  {actFile.act - 1}
                </span>
              </div>
            )}

            {/* Barra flotante inferior de la puerta */}
            <div
              data-toolbar="true"
              className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 flex items-center justify-between gap-2 z-10"
            >
              <span className="font-mono text-[10px] tracking-widest uppercase text-gold-200/90 drop-shadow">
                Puerta {actFile.doorRoman}
              </span>

              {isUnlocked ? (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onCrossDoor();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-sm btn-crimson-wax text-gold-100 text-xs sm:text-sm font-desc font-semibold transition hover:scale-[1.03] shadow-xl"
                >
                  <DoorOpen className="w-4 h-4 text-gold-300" />
                  <span>
                    Cruzar Puerta {actFile.doorNumber} (Día{' '}
                    {actFile.dayStart < 10 ? `0${actFile.dayStart}` : actFile.dayStart})
                  </span>
                  <ChevronRight className="w-4 h-4 text-gold-300" />
                </button>
              ) : (
                <span className="px-3 py-1 rounded bg-black/75 border border-crimson-700/60 text-xs font-mono text-crimson-300 font-bold inline-flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Clasificada
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="w-full mt-1.5 pt-2 border-t border-parchment-400/70 flex items-center justify-between text-xs font-desc text-ink-600 shrink-0 px-1">
          <button
            type="button"
            onClick={() => {
              sound.playPageTurn();
              onGoBack();
            }}
            className="flex items-center gap-0.5 hover:text-crimson-800 transition font-semibold"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{actFile.act === 1 ? 'Álbum' : `Acto ${actFile.act - 1}`}</span>
          </button>
          <span className="font-mono text-[10px] tracking-widest uppercase">
            — Puerta {actFile.doorRoman} —
          </span>
          <span className="text-[11px] italic text-ink-500 hidden sm:inline">Villa Acebo, 1924</span>
        </div>
      </section>

      {/* ====================================================================
          PÁGINA DERECHA (RECTO): INFORMACIÓN DEL EXPEDIENTE (CLASIFICADA HASTA CUMPLIR ACERTIJOS)
          ==================================================================== */}
      <section
        className={`page-recto lg:w-1/2 p-4 sm:p-5 lg:p-6 lg:pl-8 flex flex-col justify-between font-reading border-t lg:border-t-0 border-parchment-400/70 relative min-w-0 min-h-0 ${
          mobilePage === 'right' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-600 border-b border-parchment-400/70 pb-1 shrink-0">
            <span>
              Expediente de la Puerta {actFile.doorRoman} • Acto {actFile.doorRoman} (Días{' '}
              {actFile.dayStart}–{actFile.dayEnd})
            </span>
            {isUnlocked ? (
              <span className="font-semibold text-crimson-800 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {actFile.dateStr} • {actFile.timeDiscovered}
              </span>
            ) : (
              <span className="font-bold text-crimson-900 inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> CLASIFICADO
              </span>
            )}
          </div>

          {!isUnlocked ? (
            /* ================================================================
               EXPEDIENTE CLASIFICADO (PUERTAS 2, 3, 4 Y 5 ANTES DE CUMPLIR LOS 6 ACERTIJOS)
               ================================================================ */
            <div className="my-auto py-4 px-3 sm:px-5 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-full bg-ink-950 text-gold-300 border-2 border-gold-500/65 flex items-center justify-center shadow-lg">
                  <ShieldAlert className="w-7 h-7 text-crimson-400" />
                </div>
                <span className="inline-block px-3 py-0.5 rounded-sm bg-crimson-900 text-parchment-50 border border-crimson-950 text-[10px] font-mono uppercase tracking-[0.24em] font-bold shadow-sm">
                  EXPEDIENTE CLASIFICADO • SECRETO SUMARIAL
                </span>
                <h2 className="font-title text-2xl sm:text-3xl text-ink-950">
                  Información Bajo Custodia Forense
                </h2>
              </div>

              {/* Ficha censurada para mantener anonimato absoluto */}
              <div className="p-3.5 rounded-sm bg-parchment-200/85 border-2 border-dashed border-ink-800/40 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-ink-700 border-b border-parchment-400 pb-1">
                  <span>Registro N.º 1924-P{actFile.doorNumber}</span>
                  <span className="text-crimson-900 font-bold">ACCESO DENEGADO</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-ink-800">
                  <div>
                    <span className="text-[10px] text-ink-500 block">SUJETO / EXPEDIENTE:</span>
                    <span className="inline-block bg-ink-900/85 text-transparent select-none rounded-sm px-2 py-0.5 text-[11px]">
                      ██████████████
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-500 block">UBICACIÓN / ESTANCIA:</span>
                    <span className="inline-block bg-ink-900/85 text-transparent select-none rounded-sm px-2 py-0.5 text-[11px]">
                      ████████████
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="h-2.5 w-full bg-ink-900/20 rounded-sm" />
                  <div className="h-2.5 w-11/12 bg-ink-900/20 rounded-sm" />
                  <div className="h-2.5 w-4/5 bg-ink-900/20 rounded-sm" />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-ink-800 text-center max-w-md mx-auto leading-relaxed">
                El contenido de la <strong>Puerta {actFile.doorRoman}</strong> (jornadas{' '}
                {actFile.dayStart} a {actFile.dayEnd}) permanece en anonimato absoluto y bajo llave
                hasta que resuelvas los <strong>6 acertijos</strong> del acto anterior.
              </p>

              <div className="flex flex-col items-center gap-3 pt-1">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-parchment-200 border border-crimson-800/40 font-mono text-xs font-bold text-crimson-900">
                  <Lock className="w-3.5 h-3.5 text-crimson-800" />
                  <span>
                    Acertijos cumplidos del Acto {actFile.act - 1}: {prevActCompletedCount} / 6
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playPageTurn();
                    onGoBack();
                  }}
                  className="px-4 py-2 btn-crimson-wax text-parchment-50 rounded-sm text-xs sm:text-sm font-desc font-semibold inline-flex items-center gap-1.5 shadow"
                >
                  <ChevronLeft className="w-4 h-4 text-gold-300" />
                  <span>Volver al Acto {actFile.act - 1}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================================================================
               EXPEDIENTE DESCLASIFICADO (SOLO CUANDO SE HAN CUMPLIDO LOS ACERTIJOS PREVIOS)
               ================================================================ */
            <>
              <div className="text-center">
                <span className="inline-block px-2 py-0.5 rounded-sm bg-crimson-900/10 border border-crimson-800/30 text-[9px] font-mono uppercase tracking-widest text-crimson-900 font-bold mb-1">
                  Expediente Forense • Acto {actFile.doorRoman}
                </span>
                <h1 className="font-title text-2xl sm:text-[28px] text-ink-950 leading-tight">
                  {actFile.headline}
                </h1>
              </div>

              {/* Ficha fotográfica de la víctima del acto actual */}
              <div className="flex items-start gap-3 p-2.5 rounded-sm bg-parchment-200/80 border border-parchment-400 shadow-sm">
                <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-[2px] overflow-hidden bg-ink-950 border-2 border-ink-800 shrink-0 shadow">
                  <img
                    src={actFile.victimPortrait}
                    alt={`Retrato de ${actFile.victimName}`}
                    draggable={false}
                    className="w-full h-full object-cover object-top grayscale contrast-110"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider font-bold text-crimson-900">
                    <Skull className="w-3 h-3" /> Expediente • Acto {actFile.doorRoman}
                  </span>
                  <div className="font-serif font-black text-sm sm:text-base text-ink-950 leading-tight">
                    {actFile.victimNumber
                      ? `#${actFile.victimNumber < 10 ? `0${actFile.victimNumber}` : actFile.victimNumber} `
                      : ''}
                    {actFile.victimName}
                  </div>
                  <p className="text-[11px] font-desc italic text-ink-700">
                    {actFile.victimRole} • {actFile.victimAge} años
                  </p>
                  <p className="text-[10px] font-mono text-ink-800 flex items-center gap-1 pt-0.5">
                    <MapPin className="w-3 h-3 text-crimson-800 shrink-0" />
                    <span className="truncate">
                      {actFile.sceneLocationName} ({actFile.sceneFloor})
                    </span>
                  </p>
                </div>
              </div>

              {/* Fotografía forense en blanco y negro de la escena */}
              {actFile.sceneImage && (
                <div className="p-1.5 bg-[#f4f1e8] border border-ink-800/50 rounded-[2px] shadow-md">
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-ink-950 border border-ink-900">
                    <img
                      src={actFile.sceneImage}
                      alt={`Escena del crimen: ${actFile.sceneLocationName}`}
                      draggable={false}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-ink-950/85 border border-gold-400/35 text-[9px] font-mono uppercase tracking-wider text-gold-200">
                      Placa Forense • Acto {actFile.doorRoman}
                    </span>
                  </div>
                </div>
              )}

              {/* Relato del expediente */}
              <div className="space-y-2 text-[13px] sm:text-[13.5px] leading-[1.45] text-ink-900 text-justify font-reading">
                {actFile.situationBrief.map((p, idx) => (
                  <p key={idx} className={idx === 0 ? 'clearfix' : 'indent-4'}>
                    {idx === 0 && <span className="drop-cap-victorian">{p.charAt(0)}</span>}
                    {idx === 0 ? p.slice(1) : p}
                  </p>
                ))}
              </div>

              {/* Nota de Azlynn */}
              <div className="torn-note-paper p-2.5 rounded-sm border border-parchment-400 space-y-1">
                <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest font-bold text-crimson-900">
                  <Feather className="w-3 h-3" />
                  <span>Nota de la Detective Azlynn</span>
                </div>
                <p className="font-declaration text-xs text-ink-950 italic leading-snug">
                  «{actFile.detectiveNote}»
                </p>
              </div>

              {/* Pendiente */}
              <div className="p-2.5 rounded-sm bg-parchment-200/70 border border-crimson-800/30 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-bold text-crimson-950">
                  <FileWarning className="w-3.5 h-3.5 text-crimson-800" />
                  <span>Pendiente tras cruzar esta puerta</span>
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
            </>
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-parchment-400/70 flex items-center justify-between text-xs font-desc text-ink-600 shrink-0">
          <span className="font-mono text-[10px] tracking-widest uppercase">
            — Expediente {actFile.doorRoman} —
          </span>
          {isUnlocked ? (
            <button
              type="button"
              onClick={onCrossDoor}
              className="flex items-center gap-1 text-crimson-900 hover:text-crimson-700 font-bold transition"
            >
              <span>
                Ir al Día {actFile.dayStart < 10 ? `0${actFile.dayStart}` : actFile.dayStart}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[11px] font-mono text-crimson-800 font-bold">Clasificado</span>
          )}
        </div>
      </section>
    </div>
  );
};
