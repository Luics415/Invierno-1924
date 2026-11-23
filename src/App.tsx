import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BookLayout } from './components/BookLayout';
import { GameModeModal } from './components/GameModeModal';
import { ParanormalEngine } from './components/ParanormalEngine';
import { useGameStore } from './store/useGameStore';

// Carga diferida de modales pesados para reducir el bundle inicial en dispositivos móviles
const AdventCalendar = lazy(() =>
  import('./components/AdventCalendar').then(m => ({ default: m.AdventCalendar }))
);
const DetectiveDossier = lazy(() =>
  import('./components/DetectiveDossier').then(m => ({ default: m.DetectiveDossier }))
);
const FinalVerdictModal = lazy(() =>
  import('./components/FinalVerdictModal').then(m => ({ default: m.FinalVerdictModal }))
);
const PrologueModal = lazy(() =>
  import('./components/PrologueModal').then(m => ({ default: m.PrologueModal }))
);
const ActDoorModal = lazy(() =>
  import('./components/ActDoorModal').then(m => ({ default: m.ActDoorModal }))
);

const ROOM_BACKGROUNDS = [
  './portraits/background-1.png',
  './portraits/background-2.png',
  './portraits/background-3.png',
  './portraits/background-4.png',
  './portraits/background-5.webp',
];

const SNOW_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 5.6) % 100}%`,
  duration: `${6 + (i % 6) * 2}s`,
  delay: `${(i * 0.5) % 5}s`,
  size: `${2.5 + (i % 3) * 1.4}px`,
  desktopOnly: i >= 10,
}));

export const App: React.FC = () => {
  const setCurrentDay = useGameStore(s => s.setCurrentDay);
  const hasSelectedGameMode = useGameStore(s => s.hasSelectedGameMode);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isVerdictOpen, setIsVerdictOpen] = useState(false);
  const [isPrologueOpen, setIsPrologueOpen] = useState(false);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [actDoorState, setActDoorState] = useState<{
    act: 1 | 2 | 3 | 4 | 5;
    startOpened?: boolean;
  } | null>(null);
  // Al iniciar la app y tras seleccionar modo, la libreta empieza cerrada en la portada
  const [bookCoverMode, setBookCoverMode] = useState<'open' | 'front' | 'back'>('front');
  const effectiveBookCoverMode: 'open' | 'front' | 'back' = !hasSelectedGameMode
    ? 'front'
    : bookCoverMode;
  const isBookOpen = effectiveBookCoverMode === 'open';

  const [bgIndex, setBgIndex] = useState(0);
  const [mountedBgIndices, setMountedBgIndices] = useState<number[]>([0]);

  // Cambiar de fondo de vez en cuando solo mientras el libro está abierto (cargando fondos bajo demanda)
  useEffect(() => {
    if (!isBookOpen) return;

    const timer = window.setInterval(() => {
      setBgIndex(prev => {
        const candidates = ROOM_BACKGROUNDS.map((_, idx) => idx).filter(idx => idx !== prev);
        const nextIdx = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
        setMountedBgIndices(mounted => (mounted.includes(nextIdx) ? mounted : [...mounted, nextIdx]));
        return nextIdx;
      });
    }, 32000);

    return () => window.clearInterval(timer);
  }, [isBookOpen]);

  return (
    <div className="relative h-[100dvh] w-full font-serif overflow-hidden flex flex-col justify-center items-center">
      {/* Fondos de la mansión cargados progresivamente para rendimiento óptimo en móvil */}
      {ROOM_BACKGROUNDS.map((bgUrl, idx) =>
        mountedBgIndices.includes(idx) ? (
          <div
            key={bgUrl}
            className={`fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-[1600ms] ease-in-out ${
              idx === bgIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url('${bgUrl}')` }}
          />
        ) : null
      )}

      {/* Viñeta oscura fría para que el libro de cuero resalte sobre la habitación */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#090a0c]/55 via-[#090a0c]/25 to-[#090a0c]/70" />

      {/* Sucesos paranormales ocasionales de fondo (sombra rápida, parpadeo de luces, sonidos) */}
      <ParanormalEngine />

      {/* Partículas sutiles de nieve invernal (densidad optimizada en móvil) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-[1] opacity-20">
        {SNOW_PARTICLES.map(p => (
          <div
            key={p.id}
            className={`snow-particle ${p.desktopOnly ? 'hidden sm:block' : ''}`}
            style={{
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
              width: p.size,
              height: p.size,
            }}
          />
        ))}
      </div>

      {/* Visor del Libro — Centrado geométricamente */}
      <div className="relative z-10 w-full flex-1 min-h-0 flex flex-col justify-center items-center">
        <BookLayout
          bookCoverMode={effectiveBookCoverMode}
          onBookCoverModeChange={setBookCoverMode}
          onOpenCalendar={() => setIsCalendarOpen(true)}
          onOpenDossier={() => setIsDossierOpen(true)}
          onOpenVerdict={() => setIsVerdictOpen(true)}
          onOpenPrologue={() => setIsPrologueOpen(true)}
          onOpenGameMode={() => setIsModeModalOpen(true)}
          onOpenActDoor={(act, startOpened) => setActDoorState({ act, startOpened })}
        />
      </div>

      {/* Modales e Interfaces flotantes con carga diferida */}
      <Suspense fallback={null}>
        {isCalendarOpen && (
          <AdventCalendar
            onClose={() => setIsCalendarOpen(false)}
            onOpenActDoor={(act, startOpened) => {
              setIsCalendarOpen(false);
              setActDoorState({ act, startOpened });
            }}
          />
        )}

        {isDossierOpen && (
          <DetectiveDossier
            onClose={() => setIsDossierOpen(false)}
            onOpenVerdict={() => {
              setIsDossierOpen(false);
              setIsVerdictOpen(true);
            }}
          />
        )}

        {isVerdictOpen && (
          <FinalVerdictModal onClose={() => setIsVerdictOpen(false)} />
        )}

        {isPrologueOpen && (
          <PrologueModal
            onClose={() => setIsPrologueOpen(false)}
            onOpenDoorOne={() => {
              setIsPrologueOpen(false);
              setBookCoverMode('open');
              setActDoorState({ act: 1, startOpened: false });
            }}
          />
        )}

        {actDoorState && (
          <ActDoorModal
            initialAct={actDoorState.act}
            startOpened={actDoorState.startOpened}
            onClose={() => setActDoorState(null)}
            onEnterActDay={day => {
              setBookCoverMode('open');
              setCurrentDay(day);
            }}
          />
        )}
      </Suspense>

      {(!hasSelectedGameMode || isModeModalOpen) && (
        <GameModeModal
          onModeConfirmed={() => setBookCoverMode('front')}
          onClose={() => setIsModeModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
