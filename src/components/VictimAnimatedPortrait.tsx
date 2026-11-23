import React, { useState } from 'react';
import { VICTIM } from '../data/narrativeBible';

interface VictimAnimatedPortraitProps {
  src?: string;
  alt?: string;
  className?: string;
  interactive?: boolean;
  grayscale?: boolean;
}

/**
 * Retrato animado del expediente principal de Don Arturo Valdemar (68 años).
 * Combina movimiento orgánico de respiración aristocrática, parpadeo cálido de
 * candelabro sobre el perfil iluminado, destello de cristal antiguo e inclinación
 * 3D sutil al interactuar. Si existe /portraits/victim-arturo.mp4 lo reproduce en bucle.
 */
export const VictimAnimatedPortrait: React.FC<VictimAnimatedPortraitProps> = ({
  src = VICTIM.portrait,
  alt = `Retrato animado de Don ${VICTIM.name}`,
  className = '',
  interactive = true,
  grayscale = false,
}) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const isArturo = src === VICTIM.portrait || src.includes('victim-arturo');

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Number((-ny * 10).toFixed(2)),
      ry: Number((nx * 12).toFixed(2)),
    });
  };

  const handlePointerLeave = () => {
    if (tilt.rx !== 0 || tilt.ry !== 0) {
      setTilt({ rx: 0, ry: 0 });
    }
  };

  return (
    <div
      data-victim-animated-portrait="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        interactive
          ? {
              transform: `perspective(700px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            }
          : undefined
      }
      className={`relative w-full h-full overflow-hidden bg-ink-950 transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {/* Capa base: retrato pictórico con respiración y presencia viva 1924 */}
      <img
        src={src}
        alt={alt}
        decoding="async"
        draggable={false}
        className={`pointer-events-none select-none w-full h-full object-cover object-top animate-victim-living ${
          grayscale ? 'grayscale contrast-115' : ''
        }`}
      />

      {/* Video opcional de respaldo si el usuario añade /portraits/victim-arturo.mp4 */}
      {isArturo && !videoFailed && (
        <video
          src="./portraits/victim-arturo.mp4"
          poster={src}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoFailed(true)}
          className={`pointer-events-none select-none absolute inset-0 w-full h-full object-cover object-top ${
            grayscale ? 'grayscale contrast-115' : ''
          }`}
        />
      )}

      {/* Resplandor dinámico de candelabro sobre el borde dorado izquierdo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 animate-victim-candlelight mix-blend-screen"
      />

      {/* Destello sutil sobre el cristal del marco fotográfico */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 animate-victim-sheen"
      />

      {/* Viñeta cinematográfica fría en las esquinas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_38%_34%,transparent_38%,rgba(8,5,6,0.52)_100%)]"
      />
    </div>
  );
};
