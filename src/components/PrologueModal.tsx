import React from 'react';
import { VICTIM } from '../data/narrativeBible';
import { VictimAnimatedPortrait } from './VictimAnimatedPortrait';
import { sound } from '../utils/soundEffects';
import {
  X,
  Compass,
  Snowflake,
  Users,
  DoorOpen,
  Scale,
  BookOpen,
  MapPin,
  Crown,
  Skull,
  Clock,
  Quote,
} from 'lucide-react';

interface PrologueModalProps {
  onClose: () => void;
  onOpenDoorOne: () => void;
}

export const PrologueModal: React.FC<PrologueModalProps> = ({ onClose, onOpenDoorOne }) => {
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
        className="relative book-cover-leather border-2 border-[#08090c] ring-1 ring-[#b79b65]/45 rounded-lg max-w-4xl w-full max-h-[94dvh] flex flex-col shadow-[0_32px_85px_rgba(0,0,0,0.96)] overflow-hidden text-ink-900 font-reading"
      >
        <div className="pointer-events-none absolute inset-0 book-arcane-wear z-0" />

        {/* Cabecera */}
        <div className="relative z-10 header-leather-bar p-3.5 sm:p-5 border-b border-[#b79b65]/35 text-gold-300 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-[#c5a059]/75 bg-[#08090c] flex items-center justify-center shadow-md shrink-0">
              <Compass className="w-5 h-5 text-[#e5ca8f]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#dec48c]/85 block">
                Prólogo del Expediente • Invierno de 1924
              </span>
              <h2 className="font-title text-2xl sm:text-3xl text-[#e5ca8f] leading-none pt-0.5 truncate">
                Bienvenido a Villa Acebo
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
            title="Cerrar Prólogo"
            aria-label="Cerrar Prólogo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pliego editorial estilo libro físico */}
        <div className="relative z-10 p-4 sm:p-6 overflow-y-auto flex-1 bg-[#efeade]">
          <div className="max-w-3xl mx-auto bg-[#f7f3e8] border-2 border-[#b5ab96] rounded-sm p-5 sm:p-8 shadow-inner space-y-5 relative">
            {/* Encabezado ilustrado del lugar */}
            <div className="text-center border-b-2 border-double border-ink-800/35 pb-4 space-y-1.5">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-crimson-900 font-bold">
                <MapPin className="w-3.5 h-3.5" />
                <span>Paso de Sierra Blanca • Altitud 1.840 metros</span>
              </div>
              <h3 className="font-title text-3xl sm:text-4xl text-ink-950 tracking-wide">
                Villa Acebo
              </h3>
              <p className="text-xs sm:text-sm italic font-desc text-ink-700">
                Residencia invernal de la familia Valdemar — Aislada por la gran ventisca de diciembre de 1924
              </p>
            </div>

            {/* Ficha Oficial del Personaje Principal — Primera Víctima */}
            <div className="p-4 sm:p-5 rounded-sm bg-[#ede5d2] border-2 border-[#7f6c4c] shadow-sm space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#8f7c5c]/45 pb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] font-black text-crimson-900">
                  <Skull className="w-3.5 h-3.5 text-crimson-800 shrink-0" />
                  <span>Expediente Principal • Primera Víctima</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-crimson-900 text-gold-200 font-mono text-[10px] font-bold">
                  <Clock className="w-3 h-3 shrink-0" />
                  {VICTIM.timeOfDeath}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                {/* Retrato oficial animado de Don Arturo Valdemar */}
                <div className="relative w-36 sm:w-44 shrink-0 bg-[#faf7f0] p-1.5 pb-2 border border-ink-900/50 shadow-[0_12px_28px_rgba(0,0,0,0.34)] -rotate-[1deg]">
                  <div className="w-full aspect-[3/4] overflow-hidden bg-ink-950 border border-ink-800/70">
                    <VictimAnimatedPortrait
                      src={VICTIM.portrait}
                      alt={`Retrato oficial de ${VICTIM.name}`}
                    />
                  </div>
                  <div className="mt-1.5 text-center font-mono leading-tight">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-crimson-900">
                      Víctima N.º 00 · {VICTIM.age} años
                    </span>
                    <span className="block text-[10px] font-bold text-ink-950 truncate">
                      {VICTIM.name}
                    </span>
                  </div>
                </div>

                {/* Perfil patrimonial y psicológico */}
                <div className="flex-1 min-w-0 space-y-2.5 text-left">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h4 className="font-title text-2xl sm:text-3xl text-ink-950 leading-none">
                        Don {VICTIM.name}
                      </h4>
                      <span className="text-xs font-mono text-ink-600">
                        ({VICTIM.age} años)
                      </span>
                    </div>
                    <p className="text-xs font-desc italic font-semibold text-crimson-900 mt-0.5">
                      {VICTIM.title}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-sm bg-[#faf6eb] border-l-4 border-l-gold-600 border border-[#c7b99a]">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-black text-amber-950 mb-0.5">
                      <Crown className="w-3.5 h-3.5 text-gold-700 shrink-0" />
                      <span>Poder y Fortuna</span>
                    </div>
                    <p className="text-xs sm:text-[13px] font-serif font-bold text-ink-950 leading-snug">
                      {VICTIM.epithet}.
                    </p>
                    <p className="text-xs text-ink-800 leading-relaxed mt-1">
                      {VICTIM.wealthAndPower}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-xs text-ink-900 font-reading">
                    <p>
                      <strong className="font-mono text-[10px] uppercase tracking-wider text-ink-700">
                        Carácter:
                      </strong>{' '}
                      {VICTIM.personality}
                    </p>
                    <p>
                      <strong className="font-mono text-[10px] uppercase tracking-wider text-crimson-900">
                        Última aparición:
                      </strong>{' '}
                      {VICTIM.lastKnownMovements}
                    </p>
                  </div>

                  <div className="torn-note-paper px-3 py-2 border-l-2 border-crimson-800 flex items-start gap-2">
                    <Quote className="w-3.5 h-3.5 text-crimson-800 shrink-0 mt-0.5" />
                    <p className="font-declaration italic text-xs text-ink-900 leading-snug">
                      {VICTIM.finalQuote}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Historia general del sitio (sin anticipar futuros crímenes) */}
            <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed text-ink-900 text-justify font-reading">
              <p>
                <span className="drop-cap-victorian">L</span>a tormenta de nieve más feroz en cuarenta años ha dejado{' '}
                <strong>Villa Acebo</strong> completamente aislada en lo alto del Paso de Sierra Blanca. Toda la finca,
                sus tierras y el destino económico del valle pertenecían a un solo hombre: <strong>Don Arturo Valdemar</strong>,
                dueño de un poder y unas riquezas inimaginables, demasiado como para una sola persona. El viejo puente
                de piedra ha quedado sepultado bajo el hielo, las líneas de telégrafo se han derrumbado y nadie podrá
                salir hasta que logren abrir paso los equipos de rescate.
              </p>
              <p className="indent-4">
                Entre familiares de Arturo Valdemar, invitados a la gala de invierno, personal de servicio y habitantes
                del valle que buscaron refugio antes de la nevada, hay exactamente{' '}
                <strong>74 personas atrapadas bajo el mismo techo</strong>. Sus nombres, retratos y coartadas figuran
                en el Álbum de Sospechosos en estricta igualdad de condiciones.
              </p>
              <p className="indent-4">
                Uno de ellos ha cometido un crimen a sangre fría dentro de la propiedad. La detective{' '}
                <strong>Azlynn</strong> necesita tu ayuda durante las próximas <strong>30 jornadas</strong>, divididas
                tras <strong>5 Puertas</strong> selladas en este libro: cada puerta custodia un tramo clasificado del
                expediente que solo podrá abrirse tras resolver todos los acertijos del acto anterior.
              </p>
            </div>

            {/* Los 4 pilares de deducción */}
            <div className="p-4 rounded-sm bg-[#e6dfd0] border border-[#b5ab96] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-crimson-900">
                <Scale className="w-4 h-4 text-crimson-800 shrink-0" />
                <span>Qué deberás descubrir en el expediente</span>
              </div>
              <ol className="space-y-1.5 text-xs sm:text-sm text-ink-900 list-decimal list-inside font-reading">
                <li>
                  <strong>La identidad del único culpable</strong> entre los <strong>74 sospechosos</strong> del censo.
                </li>
                <li>
                  <strong>El arma o método utilizado</strong> entre las <strong>18 armas inventariadas</strong> en la mansión.
                </li>
                <li>
                  <strong>La estancia exacta de los hechos</strong> entre las <strong>9 estancias</strong> (Planta Baja, Planta Alta y Sótano).
                </li>
                <li>
                  <strong>El secreto tras las 5 Puertas</strong>: la información de cada nueva puerta permanece estrictamente clasificada hasta cumplir los 6 acertijos del acto previo.
                </li>
              </ol>
            </div>

            {/* Datos de ambiente */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded bg-parchment-100 border border-[#c5baa4] flex items-center gap-2">
                <Users className="w-4 h-4 text-crimson-800 shrink-0" />
                <div>
                  <span className="block font-bold text-ink-950">74 Aislados</span>
                  <span className="text-[10px] text-ink-600">Todos igual de sospechosos</span>
                </div>
              </div>
              <div className="p-2.5 rounded bg-parchment-100 border border-[#c5baa4] flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-crimson-800 shrink-0" />
                <div>
                  <span className="block font-bold text-ink-950">5 Puertas Selladas</span>
                  <span className="text-[10px] text-ink-600">30 jornadas clasificadas</span>
                </div>
              </div>
              <div className="p-2.5 rounded bg-parchment-100 border border-[#c5baa4] flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-crimson-800 shrink-0" />
                <div>
                  <span className="block font-bold text-ink-950">Sin salida posible</span>
                  <span className="text-[10px] text-ink-600">Paso de Sierra Blanca, 1924</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  sound.playPageTurn();
                  onOpenDoorOne();
                }}
                className="px-5 py-2.5 btn-crimson-wax text-parchment-50 rounded-[3px] font-serif font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition"
              >
                <DoorOpen className="w-4 h-4 text-[#e5ca8f]" />
                <span>Abrir Puerta I — Iniciar Expediente</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="px-5 py-2.5 bg-ink-950 hover:bg-ink-900 text-gold-300 border border-gold-500/50 rounded-[3px] font-serif font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition"
              >
                <BookOpen className="w-4 h-4 text-gold-400" />
                <span>Ir al Álbum de 74 Sospechosos</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
