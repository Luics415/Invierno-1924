import React, { useEffect, useState } from 'react';
import { sound } from '../utils/soundEffects';

type ParanormalEventType = 'flicker' | 'glass' | 'creak' | 'whisper' | 'hands' | 'breathing' | null;

const AMBIENT_EVENTS: Exclude<ParanormalEventType, null | 'hands'>[] = [
  'flicker',
  'glass',
  'creak',
  'whisper',
  'breathing',
];

// Probabilidad reducida para la animación de las manos (~6%) y enfriamiento mínimo entre apariciones
const HANDS_TRIGGER_PROBABILITY = 0.06;
const MIN_NON_HANDS_BETWEEN = 3;

export const ParanormalEngine: React.FC = () => {
  const [activeEvent, setActiveEvent] = useState<ParanormalEventType>(null);

  useEffect(() => {
    let timeoutId: number;
    let clearId: number;
    let eventsSinceLastHands = 1; // Evita que las manos salgan en los primeros minutos de partida

    const scheduleNext = () => {
      // Intervalo extendido para que los sucesos sean raros, impredecibles y no saturen (entre 85 y 195 segundos)
      const delay = 85000 + Math.floor(Math.random() * 110000);
      timeoutId = window.setTimeout(() => {
        const canTriggerHands = eventsSinceLastHands >= MIN_NON_HANDS_BETWEEN;
        const chosen: Exclude<ParanormalEventType, null> =
          canTriggerHands && Math.random() < HANDS_TRIGGER_PROBABILITY
            ? 'hands'
            : AMBIENT_EVENTS[Math.floor(Math.random() * AMBIENT_EVENTS.length)];

        if (chosen === 'hands') {
          eventsSinceLastHands = 0;
        } else {
          eventsSinceLastHands += 1;
        }

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
