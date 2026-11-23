import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../utils/soundEffects';
import {
  Sparkles,
  PenTool,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Scale,
  X,
} from 'lucide-react';

interface GameModeModalProps {
  onClose?: () => void;
}

export const GameModeModal: React.FC<GameModeModalProps> = ({ onClose }) => {
  const { gameMode, hasSelectedGameMode, setGameMode } = useGameStore();
  const [selected, setSelected] = useState<'auto' | 'manual'>(gameMode);

  const handleConfirm = () => {
    sound.playWaxSeal();
    setGameMode(selected);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      onClick={() => {
        if (hasSelectedGameMode && onClose) {
          sound.playClick();
          onClose();
        }
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative book-cover-leather border-2 border-[#08090c] ring-1 ring-[#b79b65]/45 rounded-lg max-w-4xl w-full max-h-[94vh] flex flex-col shadow-[0_32px_85px_rgba(0,0,0,0.96)] overflow-hidden text-ink-900 font-reading animate-page-turn"
      >
        <div className="pointer-events-none absolute inset-0 book-arcane-wear z-0" />

        {/* Cabecera */}
        <div className="relative z-10 header-leather-bar p-3.5 sm:p-5 border-b border-[#b79b65]/35 text-gold-300 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-[#c5a059]/75 bg-[#08090c] flex items-center justify-center shadow-md shrink-0">
              <Scale className="w-5 h-5 text-[#e5ca8f]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#dec48c]/85 block">
                Protocolo de Investigación • Villa Acebo 1924
              </span>
              <h2 className="font-title text-2xl sm:text-3xl text-[#e5ca8f] leading-none pt-0.5 truncate">
                Elige tu Modo de Investigación
              </h2>
            </div>
          </div>

          {hasSelectedGameMode && onClose && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="text-parchment-300 hover:text-white p-1.5 rounded-[3px] hover:bg-white/10 transition shrink-0"
              title="Cerrar selector de modo"
              aria-label="Cerrar selector de modo"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Cuerpo sobre papel forense */}
        <div className="relative z-10 p-4 sm:p-6 overflow-y-auto flex-1 bg-[#efeade] space-y-4">
          <p className="text-xs sm:text-sm text-ink-900 leading-relaxed bg-[#e5decb] p-3.5 rounded-[3px] border border-[#b5ab96]">
            Antes de abrir el expediente de los <strong>74 sospechosos</strong> y enfrentarte a los{' '}
            <strong>14 tipos de acertijos</strong> de las 30 jornadas, elige cómo deseas registrar los
            hallazgos periciales de cada día. Puedes cambiar este modo en cualquier momento desde la barra
            superior.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OPCIÓN 1: MODO AUTOMÁTICO */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setSelected('auto');
              }}
              className={`text-left p-4 sm:p-5 rounded-md border-2 transition flex flex-col justify-between gap-3 shadow-sm ${
                selected === 'auto'
                  ? 'bg-[#faf6ec] border-crimson-800 ring-2 ring-gold-500 shadow-md'
                  : 'bg-[#f3ede0] border-[#bfb49d] hover:border-amber-900/60 opacity-90'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-emerald-900 text-parchment-50 font-mono text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-gold-300" />
                    Asistencia Forense
                  </span>
                  {selected === 'auto' && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-crimson-800">
                      <CheckCircle2 className="w-4 h-4 text-crimson-800" /> Seleccionado
                    </span>
                  )}
                </div>

                <h3 className="font-title text-2xl text-ink-950">
                  Modo Automático
                </h3>

                <p className="text-xs sm:text-[13px] text-ink-800 leading-relaxed">
                  Al completar el tablero de cualquiera de los 14 ejercicios, el sistema{' '}
                  <strong>valida y lacra automáticamente</strong> el resultado del día, revelando de
                  inmediato la deducción oficial en el expediente.
                </p>

                <ul className="space-y-1.5 text-xs text-ink-900 pt-1 border-t border-amber-900/20">
                  <li className="flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-800 shrink-0 mt-0.5" />
                    <span>
                      <strong>Confirmación instantánea:</strong> no necesitas transcribir a mano la palabra
                      o el código descubierto al terminar el tablero.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-800 shrink-0 mt-0.5" />
                    <span>
                      <strong>Ideal para ritmo fluido:</strong> concéntrate directamente en resolver cada
                      mecánica y analizar las coartadas del álbum.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-amber-900/15 text-[10px] font-mono uppercase tracking-wider text-ink-600">
                Recomendado para partida asistida
              </div>
            </button>

            {/* OPCIÓN 2: MODO MANUAL */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setSelected('manual');
              }}
              className={`text-left p-4 sm:p-5 rounded-md border-2 transition flex flex-col justify-between gap-3 shadow-sm ${
                selected === 'manual'
                  ? 'bg-[#faf6ec] border-crimson-800 ring-2 ring-gold-500 shadow-md'
                  : 'bg-[#f3ede0] border-[#bfb49d] hover:border-amber-900/60 opacity-90'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-crimson-900 text-gold-200 font-mono text-[10px] font-bold uppercase tracking-wider">
                    <PenTool className="w-3 h-3 text-gold-300" />
                    Control Total del Detective
                  </span>
                  {selected === 'manual' && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-crimson-800">
                      <CheckCircle2 className="w-4 h-4 text-crimson-800" /> Seleccionado
                    </span>
                  )}
                </div>

                <h3 className="font-title text-2xl text-ink-950">
                  Modo Manual
                </h3>

                <p className="text-xs sm:text-[13px] text-ink-800 leading-relaxed">
                  Tienes <strong>completo control y responsabilidad</strong> de escribir el resultado de
                  cada ejercicio. Una vez resuelto el tablero, deberás{' '}
                  <strong>transcribir manualmente el término o código descubierto</strong> en la parte
                  inferior y pulsar <strong>Confirmar</strong>.
                </p>

                <ul className="space-y-1.5 text-xs text-ink-900 pt-1 border-t border-amber-900/20">
                  <li className="flex items-start gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-crimson-800 shrink-0 mt-0.5" />
                    <span>
                      <strong>Lectura de casillas clave:</strong> lee las letras doradas sobrantes (1 a N),
                      las casillas sombreadas o los 4 dígitos con icono de llave en el tablero resuelto.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-crimson-800 shrink-0 mt-0.5" />
                    <span>
                      <strong>Confirmación por tu propia mano:</strong> escribe el término forense o código
                      de 4 cifras en el cajetín inferior para lacrar la prueba del día.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-amber-900/15 text-[10px] font-mono uppercase tracking-wider text-crimson-900 font-bold">
                Experiencia de libro de investigación físico
              </div>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center">
            <button
              type="button"
              onClick={handleConfirm}
              className="px-6 py-2.5 btn-crimson-wax text-parchment-50 rounded-[3px] font-serif font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition hover:scale-[1.01]"
            >
              <CheckCircle2 className="w-4 h-4 text-[#e5ca8f]" />
              <span>
                Confirmar {selected === 'manual' ? 'Modo Manual' : 'Modo Automático'} e Iniciar
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
