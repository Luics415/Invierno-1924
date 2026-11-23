import React, { useEffect, useRef } from 'react';
import { sound } from '../utils/soundEffects';

interface ParanormalHandsVideoProps {
  active: boolean;
  onComplete: () => void;
}

/**
 * Reproduce /portraits/hands-creappy-movie.mp4 eliminando el fondo verde
 * en tiempo real mediante chroma-key en canvas, conservando el audio del video.
 */
export const ParanormalHandsVideo: React.FC<ParanormalHandsVideoProps> = ({
  active,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!active || !video || !canvas) {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let rafId = 0;
    let cancelled = false;

    video.currentTime = 0;
    video.muted = sound.getMuted();

    const MAX_CHROMA_WIDTH = 640;

    const renderFrame = () => {
      if (cancelled || video.paused || video.ended) return;

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const scale = Math.min(1, MAX_CHROMA_WIDTH / video.videoWidth);
        const targetW = Math.max(1, Math.round(video.videoWidth * scale));
        const targetH = Math.max(1, Math.round(video.videoHeight * scale));
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        ctx.drawImage(video, 0, 0, targetW, targetH);
        const frame = ctx.getImageData(0, 0, targetW, targetH);
        const d = frame.data;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];

          // Dominancia de verde respecto a rojo y azul (chroma key + despill)
          const maxRB = r > b ? r : b;
          const greenDiff = g - maxRB;

          if (g > 72 && greenDiff > 22) {
            if (greenDiff > 58) {
              d[i + 3] = 0;
            } else {
              // Suavizado de bordes para evitar halo verde
              const alphaFactor = 1 - (greenDiff - 22) / 36;
              d[i + 3] = Math.max(0, Math.min(255, Math.round(d[i + 3] * alphaFactor)));
              d[i + 1] = Math.min(g, maxRB + 12);
            }
          }
        }

        ctx.putImageData(frame, 0, 0);
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    const handlePlay = () => {
      rafId = window.requestAnimationFrame(renderFrame);
    };

    const handleEnded = () => {
      onCompleteRef.current();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);

    video.play().catch(() => {
      onCompleteRef.current();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
      video.pause();
      video.currentTime = 0;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src="./portraits/hands-creappy-movie.mp4"
        playsInline
        preload="auto"
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="w-screen h-screen object-fill opacity-95 drop-shadow-[0_14px_26px_rgba(0,0,0,0.85)]"
      />
    </div>
  );
};
