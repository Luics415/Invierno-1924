import React, { useEffect, useState } from 'react';
import { sound } from '../utils/soundEffects';

type ParanormalEventType = 'flicker' | 'glass' | 'creak' | 'whisper' | 'hands' | 'breathing' | null;

export const ParanormalEngine: React.FC = () => {
  const [activeEvent, setActiveEvent] = useState<ParanormalEventType>(null);

  useEffect(() => {
    let timeoutId: number;
    let clearId: number;

    const scheduleNext = () => {
      // Intervalo extendido para que los sucesos sean raros, impredecibles y no saturen (entre 75 y 180 segundos)
      const delay = 75000 + Math.floor(Math.random() * 105000);
      timeoutId = window.setTimeout(() => {
        const events: ParanormalEventType[] = ['flicker', 'glass', 'creak', 'whisper', 'hands', 'breathing'];
        const chosen = events[Math.floor(Math.random() * events.length)];

        setActiveEvent(chosen);

        if (chosen === 'glass') {
          sound.playGlassShatter();
        } else if (chosen === 'creak') {
          sound.playWoodCreak();
        } else if (chosen === 'whisper') {
          sound.playConspiracyWhisper();
        } else if (chosen === 'breathing') {
          sound.playHeavyBreathing();
        } else if (chosen === 'hands') {
          sound.playWoodCreak();
          const side = Math.random() > 0.5 ? 'left' : 'right';
          window.dispatchEvent(new CustomEvent('paranormal-hands', { detail: { side } }));
        }

        clearId = window.setTimeout(() => {
          setActiveEvent(null);
          scheduleNext();
        }, chosen === 'hands' ? 2100 : 1400);
      }, delay);
    };

    scheduleNext();

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(clearId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" aria-hidden="true">
      {/* Parpadeo inquietante de las luces / velas de la habitación */}
      {activeEvent === 'flicker' && (
        <div className="absolute inset-0 bg-[#050608] animate-paranormal-flicker" />
      )}
    </div>
  );
};
