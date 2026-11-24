import React, { useState } from 'react';
import type { ActCrimeFile } from '../types/game';
import { VictimAnimatedPortrait } from './VictimAnimatedPortrait';
import { sound } from '../utils/soundEffects';
import {
  DoorOpen,
  Lock,
  Clock,
  MapPin,
  Feather,
  FileWarning,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Paperclip,
} from 'lucide-react';

interface BookDoorSpreadProps {
  actFile: ActCrimeFile;
  isUnlocked: boolean;
  prevActCompletedCount: number;
  mobilePage: 'left' | 'right';
  onCrossDoor: () => void;
  onGoBack: () => void;
  onTestUnlockDoor?: () => void;
}

export const BookDoorSpread: React.FC<BookDoorSpreadProps> = ({
  actFile,
  isUnlocked,
  prevActCompletedCount,
  mobilePage,
  onCrossDoor,
  onGoBack,
  onTestUnlockDoor,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const doorImageSrc = `./portraits/door-${actFile.doorNumber}.png`;

  return (
    <div className="landscape-two-page-spread w-full h-full flex flex-col lg:flex-row flex-1 min-h-0">
      {/* ====================================================================
          PÁGINA IZQUIERDA (VERSO): IMAGEN DE LA PUERTA CENTRADA CON BORDE DE HOJA
          ==================================================================== */}
      <section
        className={`landscape-show-page page-verso flex-1 h-full lg:w-1/2 p-3 sm:p-4 lg:p-5 lg:pr-7 flex flex-col items-center justify-between font-reading min-w-0 min-h-0 relative overflow-hidden ${
          mobilePage === 'left' ? 'flex animate-mobile-flip-3d lg:animate-none' : 'hidden lg:flex'
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
          PÁGINA DERECHA (RECTO): EXPEDIENTE TIPO MAPA CON FOTOGRAFÍAS INSTANTÁNEAS
          ==================================================================== */}
      <section
        className={`landscape-show-page page-recto flex-1 h-full lg:w-1/2 p-3.5 sm:p-5 lg:p-6 lg:pl-8 flex flex-col justify-between font-reading border-t lg:border-t-0 border-parchment-400/70 relative min-w-0 min-h-0 overflow-hidden ${
          mobilePage === 'right' ? 'flex animate-mobile-flip-3d lg:animate-none' : 'hidden lg:flex'
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto mobile-scroll-page pr-1 pb-6 lg:pb-3 space-y-2.5 flex flex-col">
          {/* Cabecera estilo hoja de diario con clip */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-600 border-b border-parchment-400/70 pb-1 shrink-0">
            <span className="inline-flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5 text-ink-700 -rotate-12" />
              <span>
                Puerta {actFile.doorRoman} • Acto {actFile.doorRoman} (Días {actFile.dayStart}–
                {actFile.dayEnd})
              </span>
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

                {onTestUnlockDoor && (
                  <button
                    type="button"
                    onClick={onTestUnlockDoor}
                    className="px-3.5 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-ink-950 font-mono text-xs font-black uppercase tracking-wider border-2 border-ink-900 shadow transition"
                  >
                    [TEST] Completar Acto {actFile.act - 1} y Desclasificar Puerta {actFile.doorNumber}
                  </button>
                )}

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
               DISEÑO ESTILO MAPA DE INVESTIGACIÓN CON FOTOGRAFÍAS INSTANTÁNEAS
               ================================================================ */
            <div className="space-y-2.5">
              {/* Encabezado de fecha estilo libreta manuscrita */}
              <div className="border-b border-ink-900/25 pb-1.5 flex items-baseline justify-between gap-2">
                <h1 className="font-title text-xl sm:text-2xl text-ink-950 leading-tight">
                  {actFile.dateStr.toUpperCase()} — {actFile.headline}
                </h1>
              </div>

              {/* NODO 1 DEL MAPA: Párrafo 1 + Flecha curva + Fotografía Instantánea del Retrato */}
              <div className="flex flex-col sm:grid sm:grid-cols-12 gap-2.5 items-center">
                <div className="w-full sm:col-span-8 space-y-1">
                  <p className="text-xs sm:text-[12.5px] leading-[1.42] text-ink-900 text-justify font-reading">
                    <span className="drop-cap-victorian">{actFile.situationBrief[0]?.charAt(0)}</span>
                    {actFile.situationBrief[0]?.slice(1)}
                  </p>
                  {/* Flecha manuscrita conectando el texto con la instantánea del personaje */}
                  <div className="flex items-center justify-end gap-1 text-[10px] font-declaration italic text-crimson-900 pr-1">
                    <span>identificación en registro</span>
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

                {/* Instantánea #1: Retrato compacto con cinta adhesiva y líneas de ficha */}
                <div className="col-span-5 sm:col-span-4 flex justify-center">
                  <div className="relative w-24 sm:w-28 bg-[#faf7f0] p-1.5 pb-2 border border-ink-900/45 shadow-[0_6px_14px_rgba(0,0,0,0.22)] rotate-[1.8deg]">
                    {/* Cinta adhesiva superior */}
                    <div className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-2.5 bg-[#e6dcc4]/90 border border-[#bfb399] -rotate-2 shadow-sm" />
                    <div className="w-full aspect-[4/4.5] overflow-hidden bg-ink-950 border border-ink-800/60">
                      {actFile.victimId === 'arturo-valdemar' ? (
                        <VictimAnimatedPortrait
                          src={actFile.victimPortrait}
                          alt={`Instantánea de ${actFile.victimName}`}
                        />
                      ) : (
                        <img
                          src={actFile.victimPortrait}
                          alt={`Instantánea de ${actFile.victimName}`}
                          draggable={false}
                          className="w-full h-full object-cover object-top grayscale contrast-115"
                        />
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5 text-[8.5px] sm:text-[9px] font-mono leading-tight text-ink-900">
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

              {/* NODO 2 DEL MAPA: Instantánea de la Escena (Izquierda) + Flecha curva + Párrafo 2 (Derecha) */}
              <div className="flex flex-col-reverse sm:grid sm:grid-cols-12 gap-2.5 items-center pt-0.5">
                {/* Instantánea #2: Escena del crimen achicada estilo Polaroid con cinta */}
                <div className="w-full sm:col-span-5 flex flex-col items-center">
                  <div className="relative w-32 sm:w-36 bg-[#faf7f0] p-1.5 pb-2 border border-ink-900/45 shadow-[0_6px_14px_rgba(0,0,0,0.22)] -rotate-[1.6deg]">
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
                  {/* Anotación manuscrita con flecha curva bajo la foto */}
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-declaration italic text-crimson-900">
                    <span>¿quién alteró la escena???</span>
                    <svg className="w-8 h-3.5 text-crimson-800/80 shrink-0" viewBox="0 0 36 16" fill="none">
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

                <div className="col-span-7 sm:col-span-7 space-y-1.5">
                  <p className="text-xs sm:text-[12.5px] leading-[1.42] text-ink-900 text-justify font-reading">
                    {actFile.situationBrief[1]}
                  </p>
                  <div className="torn-note-paper p-2 rounded-sm border border-parchment-400">
                    <div className="flex items-center gap-1 text-[8.5px] font-mono uppercase tracking-widest font-bold text-crimson-900">
                      <Feather className="w-2.5 h-2.5" />
                      <span>Apunte de Azlynn</span>
                    </div>
                    <p className="font-declaration text-[11px] text-ink-950 italic leading-snug mt-0.5">
                      «{actFile.detectiveNote}»
                    </p>
                  </div>
                </div>
              </div>

              {/* NODO 3 DEL MAPA: Párrafo 3 (Izquierda) + Flecha + Instantánea de Arma/Objeto (Derecha) */}
              <div className="flex flex-col sm:grid sm:grid-cols-12 gap-2.5 items-center pt-0.5">
                <div className="w-full sm:col-span-8 space-y-1">
                  <p className="text-xs sm:text-[12.5px] leading-[1.42] text-ink-900 text-justify font-reading">
                    {actFile.situationBrief[2]}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[10px] font-declaration italic text-crimson-900 pr-1">
                    <span>pieza bajo peritaje forense</span>
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

                {/* Instantánea #3: Arma / Objeto inspeccionado */}
                <div className="col-span-5 sm:col-span-4 flex justify-center">
                  <div className="relative w-24 sm:w-28 bg-[#faf7f0] p-1.5 pb-2 border border-ink-900/45 shadow-[0_6px_14px_rgba(0,0,0,0.22)] rotate-[1.4deg]">
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

              {/* Bloque inferior: PENDIENTE */}
              <div className="p-2 rounded-sm bg-parchment-200/75 border border-crimson-800/35 space-y-1">
                <div className="flex items-center gap-1.5 text-[9.5px] font-mono uppercase tracking-wider font-bold text-crimson-950">
                  <FileWarning className="w-3 h-3 text-crimson-800" />
                  <span>PENDIENTE EN EL ACTO {actFile.doorRoman}:</span>
                </div>
                <ul className="grid grid-cols-1 gap-0.5 text-[10.5px] text-ink-900 font-reading">
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

        <div className="mt-1.5 pt-1.5 border-t border-parchment-400/70 flex items-center justify-between text-xs font-desc text-ink-600 shrink-0">
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
