import React from 'react';
import { sound } from '../utils/soundEffects';
import { X, Compass, Snowflake, Users, DoorOpen, Scale, BookOpen, MapPin } from 'lucide-react';

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
        className="relative book-cover-leather border-2 border-[#08090c] ring-1 ring-[#b79b65]/45 rounded-lg max-w-4xl w-full max-h-[92vh] flex flex-col shadow-[0_32px_85px_rgba(0,0,0,0.96)] overflow-hidden text-ink-900 font-reading"
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

            {/* Historia general del sitio */}
            <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed text-ink-900 text-justify font-reading">
              <p>
                <span className="drop-cap-victorian">L</span>a tormenta de nieve más feroz en cuarenta años ha dejado{' '}
                <strong>Villa Acebo</strong> completamente aislada en lo alto del Paso de Sierra Blanca. El viejo
                puente de piedra que comunica la mansión con el valle ha quedado sepultado bajo el hielo, las líneas de
                telégrafo se han derrumbado y nadie podrá salir hasta que logren abrir paso los equipos de rescate.
              </p>
              <p className="indent-4">
                Entre familiares de Arturo Valdemar, invitados a la gala de invierno, personal de servicio y habitantes
                del valle que buscaron refugio antes de la nevada, hay exactamente{' '}
                <strong>74 personas atrapadas bajo el mismo techo</strong>. Sus nombres, retratos y coartadas figuran
                en el Álbum de Sospechosos en estricta igualdad de condiciones.
              </p>
              <p className="indent-4">
                Uno de ellos es el responsable de las muertes que están convirtiendo estas Navidades en una pesadilla.
                La detective <strong>Azlynn</strong> necesita tu ayuda durante las próximas{' '}
                <strong>30 jornadas</strong>, divididas tras <strong>5 Puertas</strong> selladas: cada puerta abre un
                nuevo acto y un nuevo crimen que estrecha el cerco sobre el único culpable.
              </p>
            </div>

            {/* Los 4 pilares de deducción */}
            <div className="p-4 rounded-sm bg-[#e6dfd0] border border-[#b5ab96] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-crimson-900">
                <Scale className="w-4 h-4 text-crimson-800 shrink-0" />
                <span>Qué deberás descubrir tras cada Puerta</span>
              </div>
              <ol className="space-y-1.5 text-xs sm:text-sm text-ink-900 list-decimal list-inside font-reading">
                <li>
                  <strong>La identidad del único asesino</strong> entre los <strong>74 sospechosos</strong> del censo.
                </li>
                <li>
                  <strong>El arma o método homicida</strong> entre las <strong>18 armas inventariadas</strong> en la mansión.
                </li>
                <li>
                  <strong>La estancia exacta del crimen</strong> entre las <strong>9 estancias</strong> (Planta Baja, Planta Alta y Sótano).
                </li>
                <li>
                  <strong>La secuencia de las 5 Puertas y 5 víctimas</strong>: tras cada acto encontrarás una nueva ficha forense que actualiza la situación del encierro.
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
                  <span className="block font-bold text-ink-950">5 Puertas · 5 Víctimas</span>
                  <span className="text-[10px] text-ink-600">30 jornadas de investigación</span>
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
                <span>Abrir Puerta I — Ver Primer Crimen</span>
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
