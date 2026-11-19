import React, { useEffect, useState } from 'react';
import { BookLayout } from './components/BookLayout';
import { AdventCalendar } from './components/AdventCalendar';
import { DetectiveDossier } from './components/DetectiveDossier';
import { FinalVerdictModal } from './components/FinalVerdictModal';
import { ParanormalEngine } from './components/ParanormalEngine';

const ROOM_BACKGROUNDS = [
  './portraits/background-1.png',
  './portraits/background-2.png',
  './portraits/background-3.png',
  './portraits/background-4.png',
];

export const App: React.FC = () => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isVerdictOpen, setIsVerdictOpen] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(true);
  const [bgIndex, setBgIndex] = useState(0);

  // Cambiar de fondo de vez en cuando solo mientras el libro está abierto (jugador distraído)
  useEffect(() => {
    if (!isBookOpen) return;

    const timer = window.setInterval(() => {
      setBgIndex(prev => {
        const candidates = ROOM_BACKGROUNDS.map((_, idx) => idx).filter(idx => idx !== prev);
        return candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
      });
    }, 32000);

    return () => window.clearInterval(timer);
  }, [isBookOpen]);

  return (
    <div className="relative h-screen w-full font-serif overflow-hidden flex flex-col justify-center items-center">
      {/* Fondos de la mansión intercambiables sutilmente mientras el jugador lee */}
      {ROOM_BACKGROUNDS.map((bgUrl, idx) => (
        <div
          key={bgUrl}
          className={`fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-[1600ms] ease-in-out ${
            idx === bgIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url('${bgUrl}')` }}
        />
      ))}

      {/* Viñeta oscura fría para que el libro de cuero resalte sobre la habitación */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#090a0c]/55 via-[#090a0c]/25 to-[#090a0c]/70" />

      {/* Sucesos paranormales ocasionales de fondo (sombra rápida, parpadeo de luces, sonidos) */}
      <ParanormalEngine />

      {/* Partículas sutiles de nieve invernal */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-1 opacity-20">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="snow-particle"
            style={{
              left: `${(i * 5) % 100}%`,
              animationDuration: `${6 + (i % 6) * 2}s`,
              animationDelay: `${(i * 0.5) % 5}s`,
              width: `${2.5 + (i % 3) * 1.5}px`,
              height: `${2.5 + (i % 3) * 1.5}px`,
            }}
          />
        ))}
      </div>

      {/* Visor del Libro — Centrado geométricamente */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-center items-center">
        <BookLayout
          onOpenCalendar={() => setIsCalendarOpen(true)}
          onOpenDossier={() => setIsDossierOpen(true)}
          onOpenVerdict={() => setIsVerdictOpen(true)}
          onBookOpenChange={setIsBookOpen}
        />
      </div>

      {/* Modales e Interfaces flotantes */}
      {isCalendarOpen && (
        <AdventCalendar onClose={() => setIsCalendarOpen(false)} />
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
    </div>
  );
};

export default App;
