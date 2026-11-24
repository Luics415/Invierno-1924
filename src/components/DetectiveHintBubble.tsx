import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, Sparkles, MessageSquare, Users, RotateCcw } from 'lucide-react';
import type { Clue, DayData, PuzzleType } from '../types/game';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../utils/soundEffects';

type AzlynnMood = 'angustiada' | 'asustada' | 'pensando' | 'enojada' | 'feliz';

interface AzlynnDialogueExchange {
  title: string;
  mood: AzlynnMood;
  lines: Array<{ speaker: 'Azlynn' | 'Detective'; text: string }>;
}

const AZLYNN_DIALOGUES: AzlynnDialogueExchange[] = [
  {
    title: 'Sospecha en el Salón',
    mood: 'asustada',
    lines: [
      { speaker: 'Azlynn', text: 'No me siento segura aquí dentro.' },
      { speaker: 'Detective', text: '¿Por qué lo dices?' },
      { speaker: 'Azlynn', text: 'Alguien quiere deshacerse de mí antes de que terminemos el expediente.' },
      { speaker: 'Detective', text: '¿Alguien? Lamento decirte que... nos vigilan todos.' },
      { speaker: 'Azlynn', text: 'No somos bienvenidos aquí. Mantente cerca de mí.' },
    ],
  },
  {
    title: 'No Estoy Sola Aquí',
    mood: 'feliz',
    lines: [
      { speaker: 'Azlynn', text: 'No lo digas en voz alta, pero... me alegro mucho de no estar sola en esta mansión.' },
      { speaker: 'Detective', text: '¿La imperturbable inspectora Azlynn bajando la guardia un segundo?' },
      { speaker: 'Azlynn', text: 'Solo un segundo. Si tuviera que dormir sola entre setenta y cuatro mentirosos, ya habría saltado por la ventana a la nieve.' },
      { speaker: 'Detective', text: 'Tranquila. Yo cubro tu espalda y tú cubres la mía.' },
      { speaker: 'Azlynn', text: 'Hecho. Al menos en este lugar hay una persona en la que sí puedo confiar.' },
    ],
  },
  {
    title: 'La Taza de Té Intacta',
    mood: 'enojada',
    lines: [
      { speaker: 'Azlynn', text: 'No pruebes ese té. Ni el oporto, ni el caldo que dejaron en la bandeja.' },
      { speaker: 'Detective', text: '¿Sospechas del servicio de cocina?' },
      { speaker: 'Azlynn', text: 'Sospecho de cualquiera que tenga acceso a una tetera y una sonrisa demasiado educada. En Villa Acebo el veneno se sirve caliente.' },
      { speaker: 'Detective', text: 'Entendido: nada de cortesías hasta que el culpable tenga esposas.' },
    ],
  },
  {
    title: 'Pasos Detrás de la Puerta',
    mood: 'asustada',
    lines: [
      { speaker: 'Azlynn', text: '¿Oíste eso hace un momento en el pasillo?' },
      { speaker: 'Detective', text: 'Podría ser la madera crujiendo por la helada.' },
      { speaker: 'Azlynn', text: 'La madera no se detiene justo frente a la cerradura ni aguanta la respiración cuando me acerco a la mirilla.' },
      { speaker: 'Detective', text: 'Pasa el pestillo dos veces esta noche. No abras a nadie sin mi voz.' },
      { speaker: 'Azlynn', text: 'Ya coloqué una silla bajo el picaporte. Aquí no pienso bajar la guardia ni dormida.' },
    ],
  },
  {
    title: 'El Imperio de Don Arturo',
    mood: 'pensando',
    lines: [
      { speaker: 'Azlynn', text: 'Mira estas paredes, estos cuadros, estas tierras... Arturo Valdemar era dueño de todo lo que alcanza la vista.' },
      { speaker: 'Detective', text: 'Un poder y unas riquezas inimaginables, demasiado como para una sola persona.' },
      { speaker: 'Azlynn', text: 'Cuando un solo hombre concentra tanto oro y tantos secretos, no hace falta buscar un enemigo: basta con sacudir el salón y caen setenta y cuatro.' },
      { speaker: 'Detective', text: 'Y cada uno de ellos cree que la tormenta les regala impunidad.' },
    ],
  },
  {
    title: 'Espalda Contra la Pared',
    mood: 'angustiada',
    lines: [
      { speaker: 'Detective', text: '¿Por qué te sientas siempre en la esquina del fondo cuando interrogamos?' },
      { speaker: 'Azlynn', text: 'Porque desde aquí veo las dos puertas, las cortinas y quién mete la mano en el bolsillo.' },
      { speaker: 'Detective', text: 'Estás tensa como la cuerda de un reloj.' },
      { speaker: 'Azlynn', text: 'Quien se relaja en una casa con un asesino suelto termina convirtiéndose en el siguiente expediente.' },
    ],
  },
  {
    title: 'Un Respiro Entre Sombras',
    mood: 'feliz',
    lines: [
      { speaker: 'Detective', text: 'Toma, te traje mi bufanda extra. Tienes las manos heladas.' },
      { speaker: 'Azlynn', text: '¿De verdad? Gracias... vaya, por un instante casi olvidé lo que se siente recibir un gesto sin segundas intenciones.' },
      { speaker: 'Detective', text: 'No todo en Villa Acebo está podrido mientras sigamos aquí los dos.' },
      { speaker: 'Azlynn', text: 'Tienes razón. Contigo al lado, hasta este caserón maldito parece un poco menos oscuro.' },
    ],
  },
  {
    title: 'Silencio Incómodo al Entrar',
    mood: 'enojada',
    lines: [
      { speaker: 'Azlynn', text: '¿Notaste cómo dejaron de hablar en seco en cuanto crucé el umbral del comedor?' },
      { speaker: 'Detective', text: 'Todos fingieron admirar la chimenea al mismo tiempo.' },
      { speaker: 'Azlynn', text: 'Nos miran como si fuéramos intrusos arruinando su cena de Nochebuena, cuando hay un cadáver enfriándose bajo este mismo techo.' },
      { speaker: 'Detective', text: 'Que nos odien si quieren. El odio vuelve impaciente al culpable.' },
    ],
  },
  {
    title: 'El Temporal y el Encierro',
    mood: 'angustiada',
    lines: [
      { speaker: 'Azlynn', text: 'El temporal de nieve derribó los postes telefónicos de la montaña.' },
      { speaker: 'Detective', text: 'Significa que nadie entra ni sale de Villa Acebo hasta que despejen el paso.' },
      { speaker: 'Azlynn', text: 'Y que el asesino de Arturo Valdemar respira el mismo aire helado que nosotros en este salón.' },
      { speaker: 'Detective', text: 'Mantén la libreta abierta. No podemos permitirnos un solo descuido.' },
    ],
  },
  {
    title: 'Alguien Revisó Mi Abrigo',
    mood: 'asustada',
    lines: [
      { speaker: 'Azlynn', text: 'Dejé mi abrigo colgado junto a la entrada hace media hora y el bolsillo interior estaba abierto.' },
      { speaker: 'Detective', text: '¿Te falta algo? ¿Llaves, notas?' },
      { speaker: 'Azlynn', text: 'Por suerte llevo el cuaderno siempre encima. Pero alguien está midiendo qué tanto sabemos ya.' },
      { speaker: 'Detective', text: 'Entonces estamos pisándole los talones. Quédate a la vista en todo momento.' },
    ],
  },
  {
    title: 'Las Gemelas Marín',
    mood: 'angustiada',
    lines: [
      { speaker: 'Azlynn', text: 'Hablé con Silvia Marín en la cocina. La pobre chica temblaba al sostener la bandeja.' },
      { speaker: 'Detective', text: '¿Y su hermana gemela Sonia?' },
      { speaker: 'Azlynn', text: 'Sonia es de hielo. Una manipuladora egocéntrica que domina a Silvia y vigila cada puerta de servicio.' },
      { speaker: 'Detective', text: 'No las pierdas de vista. La servidumbre sabe secretos que la familia jamás admitirá.' },
    ],
  },
  {
    title: 'Cuando Encajan las Piezas',
    mood: 'feliz',
    lines: [
      { speaker: 'Azlynn', text: 'Espera... vuelve a leer esa pista. ¡Encaja a la perfección con lo que descartamos ayer!' },
      { speaker: 'Detective', text: 'Esa sonrisa te delata, Azlynn. Te encanta cuando acorralamos una mentira.' },
      { speaker: 'Azlynn', text: 'Es que pensé que nos estaban ganando la partida, pero contigo analizando cada detalle siento que sí vamos a salir de esta.' },
      { speaker: 'Detective', text: 'Y saldremos con el nombre exacto lacrado en el expediente.' },
    ],
  },
  {
    title: 'Ojos Desde la Galería',
    mood: 'asustada',
    lines: [
      { speaker: 'Azlynn', text: 'No mires arriba todavía... hay alguien observándonos desde la barandilla del segundo piso.' },
      { speaker: 'Detective', text: 'Ya se retiró hacia la sombra en cuanto moví la lámpara.' },
      { speaker: 'Azlynn', text: 'Me pone los pelos de punta. En esta casa los retratos parecen seguirnos, y los vivos son aún peores.' },
      { speaker: 'Detective', text: 'Déjalos mirar. Cuanto más nerviosos estén, antes cometerán un error.' },
    ],
  },
  {
    title: 'Setenta y Cuatro Sospechosos Iguales',
    mood: 'pensando',
    lines: [
      { speaker: 'Detective', text: 'Aquí nadie tiene privilegios ni coartada intocable. Los setenta y cuatro presentes tenían motivos para odiar a Arturo.' },
      { speaker: 'Azlynn', text: 'Exacto. Familiares, invitados, servidumbre y vecinos del valle atrapados por la tormenta: cualquiera pudo haberlo hecho.' },
      { speaker: 'Detective', text: 'Con dieciocho armas inventariadas y nueve estancias distintas, no podemos fiarnos de corazonadas.' },
      { speaker: 'Azlynn', text: 'Solo el cruce frío de las treinta jornadas forenses nos dará un único nombre.' },
    ],
  },
  {
    title: 'Cero Margen de Error',
    mood: 'enojada',
    lines: [
      { speaker: 'Azlynn', text: 'Setenta y cuatro coartadas ensayadas y ni una sola cara honesta. Me crispa cómo mienten sin parpadear.' },
      { speaker: 'Detective', text: 'Por eso nos llamaron a homicidios, colega. Uno de ellos va a tropezar.' },
      { speaker: 'Azlynn', text: 'Más vale que sea antes de que se apaguen las luces otra vez. No pienso dejarme sorprender.' },
    ],
  },
  {
    title: 'Guardia Compartida',
    mood: 'feliz',
    lines: [
      { speaker: 'Azlynn', text: 'Sé que hoy estuve muy a la defensiva contigo y con todo el mundo... perdón si soné brusca.' },
      { speaker: 'Detective', text: 'No tienes nada de qué disculparte. Tu instinto es lo que nos mantiene vivos en Villa Acebo.' },
      { speaker: 'Azlynn', text: 'Aun así, gracias por quedarte despierto conmigo revisando las pruebas. Este lugar me da escalofríos, pero saber que estás aquí me devuelve la calma.' },
      { speaker: 'Detective', text: 'Terminemos este caso juntos y salgamos de la tormenta.' },
    ],
  },
  {
    title: 'Lectura Fría del Cuaderno',
    mood: 'pensando',
    lines: [
      { speaker: 'Detective', text: '¿Qué ves en este expediente que se me esté escapando?' },
      { speaker: 'Azlynn', text: 'Mira los rastros físicos y los horarios, no las excusas. Todos mienten sobre dónde estaban durante el apagón.' },
      { speaker: 'Detective', text: 'El corte eléctrico a las 23:15 h les dio minutos de oscuridad absoluta.' },
      { speaker: 'Azlynn', text: 'Ese minuto exacto es nuestra única ancla con la verdad.' },
    ],
  },
];

const MOOD_LABELS: Record<AzlynnMood, string> = {
  angustiada: 'Angustiada',
  asustada: 'Asustada',
  pensando: 'Pensando',
  enojada: 'Enojada',
  feliz: 'Aliviada',
};

const AZLYNN_EMOTION_IMAGES: Record<AzlynnMood, string> = {
  feliz: './portraits/detective-happy.png',
  angustiada: './portraits/detective-worried.png',
  enojada: './portraits/detective-angry.png',
  pensando: './portraits/detective-thinking.png',
  asustada: './portraits/detective-scared.png',
};

export interface DetectiveSuspectFunnelSummary {
  total: number;
  remaining: number;
  eliminated: number;
}

export interface DetectiveHintBubbleProps {
  currentDay: number;
  isAlbum: boolean;
  dayData: DayData;
  isDayCompleted: boolean;
  completedDays: number[];
  unlockedClues: Clue[];
  suspectFunnel: DetectiveSuspectFunnelSummary;
  isHeaderCollapsed?: boolean;
}

interface HintEntry {
  tag: string;
  text: string;
}

interface DesktopBubblePos {
  top: number;
  left: number;
  width: number;
  caretLeft: number;
}

const PUZZLE_STRATEGY_TIPS: Record<PuzzleType, string> = {
  wordsearch:
    'Estrategia: busca primero las letras menos comunes de cada término (como Z, K, Ñ o Q) en horizontal, vertical y diagonal; las letras sobrantes revelan el mensaje.',
  syllables:
    'Estrategia: lee la definición de cada palabra clave y fija cuántas sílabas pide; empieza por las palabras más claras para despejar el banco de sílabas.',
  cryptogram:
    'Estrategia: localiza los números más repetidos (suelen ser E, A, O o S) y apóyate en palabras de dos o tres letras para deducir artículos y preposiciones.',
  sudoku:
    'Estrategia: usa el modo Lápiz para anotar candidatos en filas, columnas o bloques 3x3 casi completos; presta especial atención a las casillas clave doradas.',
  murdoku:
    'Estrategia: marca primero los descartes seguros (X) a partir de cada declaración antes de confirmar; un solo fallo reinicia el tablero por completo.',
  crossword:
    'Estrategia: resuelve primero las definiciones horizontales o verticales más cortas y usa las letras cruzadas para validar los términos más largos.',
  futoshiki:
    'Estrategia: empieza por las cadenas de desigualdades (< o >) más largas para acotar valores mínimos y máximos en cada fila y columna.',
  connections:
    'Estrategia: busca el vínculo específico y excluyente entre cuatro conceptos antes de confirmar, evitando agrupaciones superficiales o ambiguas.',
  nonogram:
    'Estrategia: marca primero las filas y columnas con bloques grandes que se solapan en el centro y señala con X los espacios vacíos seguros.',
  minesweeper:
    'Estrategia: deduce qué casillas adyacentes a los números descubiertos contienen minas seguras usando banderas antes de revelar celdas vecinas.',
  septagrama:
    'Estrategia: todas las palabras usan las 7 letras de la flor e incluyen obligatoriamente la letra central; las casillas sombreadas revelan la palabra clave inferior.',
  codificados:
    'Estrategia: tacha primero las cifras de la pista donde ninguna pertenece al código y luego cruza las pistas con cifras bien colocadas.',
  ecuaciones:
    'Estrategia: despeja primero la ecuación con un solo icono repetido y sustituye su valor en las siguientes filas hasta hallar los 4 iconos del marcador.',
  encajados:
    'Estrategia: comienza por las palabras cuya longitud sea única o que coincidan con las letras ya reveladas en el tablero.',
};

export const DetectiveHintBubble: React.FC<DetectiveHintBubbleProps> = ({
  currentDay,
  isAlbum,
  dayData,
  isDayCompleted,
  completedDays,
  unlockedClues,
  suspectFunnel,
  isHeaderCollapsed = false,
}) => {
  const totalDays = useGameStore(state => state.totalDays);
  const caseSeed = useGameStore(state => state.caseSeed);
  const gameMode = useGameStore(state => state.gameMode);
  const startNewCase = useGameStore(state => state.startNewCase);
  const resetGame = useGameStore(state => state.resetGame);
  const [isRadialOpen, setIsRadialOpen] = useState(false);
  const [tabState, setTabState] = useState<{
    tab: 'hints' | 'dialogue' | 'status';
    wasAlbum: boolean;
  } | null>(null);
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [hintState, setHintState] = useState<{ day: number; completed: boolean; index: number }>({
    day: currentDay,
    completed: isDayCompleted,
    index: 0,
  });
  const hintIndex =
    hintState.day === currentDay && hintState.completed === isDayCompleted ? hintState.index : 0;
  const [desktopPos, setDesktopPos] = useState<DesktopBubblePos | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hidePuzzleHints = gameMode === 'manual' && !isAlbum;
  const activeTab =
    tabState &&
    !(hidePuzzleHints && tabState.tab === 'hints') &&
    !(tabState.tab === 'hints' && tabState.wasAlbum !== isAlbum)
      ? tabState.tab
      : null;
  const setActiveTab = (tab: 'hints' | 'dialogue' | 'status' | null) => {
    setTabState(tab ? { tab, wasAlbum: isAlbum } : null);
  };
  const effectiveActiveTab = hidePuzzleHints && activeTab === 'hints' ? null : activeTab;
  const isOpen = isRadialOpen || effectiveActiveTab !== null;

  const hints = useMemo<HintEntry[]>(() => {
    if (isAlbum) {
      const albumHints: HintEntry[] = [];

      if (completedDays.length >= totalDays) {
        albumHints.push({
          tag: 'Veredicto Listo',
          text: `Las ${totalDays} jornadas han concluido y todas las pruebas están sobre la mesa. Abre «Veredicto» en la barra superior para dictar tu acusación final.`,
        });
      }

      albumHints.push(
        {
          tag: 'Álbum de Sospechosos',
          text: 'Examina cada ficha del censo de Villa Acebo para revisar coartadas, parentescos y motivos antes de abrir el primer capítulo.',
        },
        {
          tag: 'Embudo de Deducción',
          text: `Actualmente siguen ${suspectFunnel.remaining} de ${suspectFunnel.total} invitados bajo sospecha. Cada día resuelto cerrará el cerco sobre el culpable.`,
        },
        {
          tag: 'Cuaderno del Detective',
          text: 'Usa el botón «Cuaderno» para cruzar sospechosos, armas y estancias en tu Matriz Murdoku conforme reúnas pruebas.',
        },
        {
          tag: 'Prólogo del Caso',
          text: 'Cuando estés listo para la primera investigación, pulsa «Comenzar la Investigación» o avanza al Día 01 con la flecha superior.',
        }
      );

      return albumHints;
    }

    if (gameMode === 'manual') {
      return [];
    }

    if (!isDayCompleted) {
      const chapterHints: HintEntry[] = dayData.puzzle.hints.map(hint => ({
        tag: `Pista del Día ${dayData.day}`,
        text: hint,
      }));

      chapterHints.push({
        tag: 'Consejo de Gabinete',
        text: PUZZLE_STRATEGY_TIPS[dayData.puzzle.type],
      });

      chapterHints.push({
        tag: 'Cotejo Documental',
        text: `No pases por alto «${dayData.narrative.evidenceTitle}» en el pliego izquierdo; suele confirmar nombres, horas o estancias clave.`,
      });

      return chapterHints;
    }

    const rawImpact = dayData.unlockedClue.impact.trim();
    const formattedImpact = /[.!?…]$/.test(rawImpact) ? rawImpact : `${rawImpact}.`;

    const solvedHints: HintEntry[] = [
      {
        tag: `Día ${dayData.day} Lacrado`,
        text: `Deducción asegurada: ${formattedImpact}`,
      },
      {
        tag: 'Estado del Caso',
        text: `Quedan ${suspectFunnel.remaining} de ${suspectFunnel.total} sospechosos activos con ${unlockedClues.length} pistas reunidas en tu expediente.`,
      },
    ];

    if (currentDay < totalDays && completedDays.length < totalDays) {
      solvedHints.push({
        tag: 'Siguiente Pesquisas',
        text: `Capítulo completado con éxito. Puedes avanzar al Día ${dayData.day + 1} para continuar estrechando el embudo.`,
      });
    } else {
      solvedHints.push({
        tag: 'Acusación Final',
        text: 'Con este expediente completo ya puedes pulsar «Veredicto» para señalar al culpable, el arma y la estancia del crimen.',
      });
    }

    return solvedHints;
  }, [
    isAlbum,
    gameMode,
    isDayCompleted,
    dayData,
    completedDays.length,
    totalDays,
    suspectFunnel.remaining,
    suspectFunnel.total,
    unlockedClues.length,
    currentDay,
  ]);

  const safeIndex = hints.length > 0 ? hintIndex % hints.length : 0;
  const activeHint = hints[safeIndex] ?? {
    tag: 'Inspector',
    text: 'Observa cada detalle del expediente antes de emitir tu juicio.',
  };

  const updateDesktopPosition = useCallback(() => {
    if (typeof window === 'undefined' || window.innerWidth < 640) {
      setDesktopPos(null);
      return;
    }

    const btn = buttonRef.current;
    if (!btn) {
      return;
    }

    const btnRect = btn.getBoundingClientRect();
    const headerRect = btn.closest('header')?.getBoundingClientRect();
    const bubbleWidth = Math.min(440, window.innerWidth - 28);
    const top = Math.max(btnRect.bottom + 18, (headerRect?.bottom ?? btnRect.bottom) + 16);
    const left = Math.max(
      24,
      Math.min(btnRect.right - bubbleWidth, window.innerWidth - bubbleWidth - 12)
    );
    const caretLeft = Math.max(
      16,
      Math.min(btnRect.left + btnRect.width / 2 - left - 8, bubbleWidth - 28)
    );

    setDesktopPos({ top, left, width: bubbleWidth, caretLeft });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const rafId = window.requestAnimationFrame(updateDesktopPosition);
    const midTimer = window.setTimeout(updateDesktopPosition, 160);
    const settleTimer = window.setTimeout(updateDesktopPosition, 340);

    window.addEventListener('resize', updateDesktopPosition);
    window.addEventListener('scroll', updateDesktopPosition, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(midTimer);
      window.clearTimeout(settleTimer);
      window.removeEventListener('resize', updateDesktopPosition);
      window.removeEventListener('scroll', updateDesktopPosition);
    };
  }, [isOpen, isHeaderCollapsed, currentDay, updateDesktopPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsRadialOpen(false);
        setTabState(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleDetectiveClick = () => {
    sound.playClick();
    updateDesktopPosition();
    if (isRadialOpen || effectiveActiveTab !== null) {
      setIsRadialOpen(false);
      setActiveTab(null);
    } else {
      setIsRadialOpen(true);
    }
  };

  const handleNextHint = () => {
    if (hints.length === 0) return;
    sound.playClick();
    setHintState(prev => {
      const currentIdx =
        prev.day === currentDay && prev.completed === isDayCompleted ? prev.index : 0;
      return {
        day: currentDay,
        completed: isDayCompleted,
        index: (currentIdx + 1) % hints.length,
      };
    });
  };

  const handleClose = () => {
    sound.playClick();
    setIsRadialOpen(false);
    setActiveTab(null);
  };

  const activeDialogue = AZLYNN_DIALOGUES[dialogueIdx % AZLYNN_DIALOGUES.length];

  const currentMood: AzlynnMood =
    effectiveActiveTab === 'dialogue'
      ? activeDialogue.mood
      : effectiveActiveTab === 'status'
      ? completedDays.length >= totalDays
        ? 'feliz'
        : 'angustiada'
      : completedDays.length >= totalDays
      ? 'feliz'
      : 'pensando';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-testid="detective-hint-button"
        aria-expanded={isOpen}
        aria-label="Menú radial de Detective Azlynn"
        title="Detective de Homicidios Azlynn — Abrir menú 3D"
        onClick={handleDetectiveClick}
        className={`azlynn-medallion-3d relative z-30 -my-1.5 sm:-my-2 flex items-center justify-center rounded-full overflow-hidden shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${
          isHeaderCollapsed
            ? 'w-11 h-11 sm:w-12 sm:h-12'
            : 'w-12 h-12 sm:w-14 sm:h-14 lg:w-[62px] lg:h-[62px]'
        } ${
          isOpen
            ? 'bg-crimson-950 ring-2 ring-gold-300/85 scale-105'
            : 'bg-ink-900'
        }`}
      >
        <img
          src={AZLYNN_EMOTION_IMAGES[currentMood]}
          alt={`Detective Azlynn (${MOOD_LABELS[currentMood]})`}
          draggable={false}
          className="pointer-events-none w-full h-full object-cover object-center scale-[1.07]"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent py-[1px] text-[7px] sm:text-[8px] font-mono font-black uppercase tracking-[0.14em] text-gold-200 text-center leading-tight">
          Azlynn
        </span>
      </button>

      {/* Menú Radial 3D inmersivo de Detective Azlynn */}
      {isRadialOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="landscape-radial-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-center sm:justify-start sm:items-end items-center p-4 sm:pt-16 sm:pr-14 lg:pr-24 transition-all duration-300"
            onClick={() => setIsRadialOpen(false)}
          >
            <div
              data-testid="detective-radial-menu"
              onClick={e => e.stopPropagation()}
              className="landscape-radial-wheel relative w-[332px] h-[332px] sm:w-[460px] sm:h-[460px] flex items-center justify-center"
            >
              {/* Anillos giratorios 3D estilo brújula / Arcane */}
              <div className="pointer-events-none absolute inset-2 rounded-full border-2 border-[#b79b65]/40 shadow-[0_0_95px_rgba(124,25,37,0.45),inset_0_0_40px_rgba(0,0,0,0.85)] bg-[radial-gradient(circle,rgba(26,14,18,0.45)_0%,rgba(6,7,10,0.82)_72%,transparent_100%)]" />
              <div className="pointer-events-none absolute inset-7 rounded-full border border-dashed border-[#d4b354]/45 animate-radial-ring" />
              <div className="pointer-events-none absolute inset-[58px] sm:inset-[82px] rounded-full border border-crimson-700/60" />

              {/* Retrato central GRANDE en relieve 3D de Detective Azlynn */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsRadialOpen(false);
                }}
                title="Cerrar menú radial"
                className="landscape-radial-center animate-azlynn-float relative z-10 w-44 h-44 sm:w-60 sm:h-60 rounded-full border-[4px] border-[#e5ca8f] ring-4 ring-[#090a0d] overflow-hidden shadow-[0_18px_46px_rgba(0,0,0,0.95),0_0_60px_rgba(140,24,38,0.75)] bg-ink-950 hover:scale-[1.03] active:scale-[0.98] transition-transform duration-300"
              >
                <img
                  src={AZLYNN_EMOTION_IMAGES[currentMood]}
                  alt={`Detective Azlynn (${MOOD_LABELS[currentMood]})`}
                  draggable={false}
                  className="pointer-events-none w-full h-full object-cover object-center scale-[1.07]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 pt-5 pb-2 bg-gradient-to-t from-black/95 via-black/75 to-transparent text-center">
                  <span className="block text-xs sm:text-sm font-title tracking-wider text-gold-200 leading-none">
                    Detective Azlynn
                  </span>
                  <span className="block text-[9px] font-mono uppercase tracking-[0.2em] text-crimson-300 mt-0.5">
                    {MOOD_LABELS[currentMood]}
                  </span>
                </div>
              </button>

              {/* Nodos táctiles 3D orbitando alrededor del retrato grande */}
              {[
                {
                  id: 'hints' as const,
                  label: 'Pistas',
                  posClass: 'top-1 left-1/2 -translate-x-1/2',
                  toneClass: 'btn-3d-tile',
                  icon: <Sparkles className="w-5 h-5 text-gold-300" />,
                  onClick: () => {
                    sound.playClick();
                    setIsRadialOpen(false);
                    setActiveTab('hints');
                  },
                },
                {
                  id: 'dialogue' as const,
                  label: 'Diálogo',
                  posClass: 'right-1 top-1/2 -translate-y-1/2',
                  toneClass: 'btn-3d-tile',
                  icon: <MessageSquare className="w-5 h-5 text-gold-300" />,
                  onClick: () => {
                    sound.playClick();
                    setIsRadialOpen(false);
                    setActiveTab('dialogue');
                  },
                },
                {
                  id: 'status' as const,
                  label: 'Caso',
                  posClass: 'bottom-1 left-1/2 -translate-x-1/2',
                  toneClass: 'btn-3d-tile',
                  icon: <Users className="w-5 h-5 text-gold-300" />,
                  onClick: () => {
                    sound.playClick();
                    setIsRadialOpen(false);
                    setActiveTab('status');
                  },
                },
                {
                  id: 'reset' as const,
                  label: 'Reiniciar',
                  posClass: 'left-1 top-1/2 -translate-y-1/2',
                  toneClass: 'btn-3d-crimson',
                  icon: <RotateCcw className="w-5 h-5 text-gold-200" />,
                  onClick: () => {
                    sound.playClick();
                    resetGame();
                    setIsRadialOpen(false);
                    setActiveTab(null);
                  },
                },
              ]
                .filter(node => !(hidePuzzleHints && node.id === 'hints'))
                .map(node => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={node.onClick}
                    className={`landscape-radial-node absolute ${node.posClass} ${node.toneClass} w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center gap-0.5 text-parchment-100`}
                    title={node.label}
                  >
                    {node.icon}
                    <span className="text-[8.5px] sm:text-[9.5px] font-mono uppercase tracking-wider leading-tight font-bold text-center px-0.5">
                      {node.label}
                    </span>
                  </button>
                ))}
            </div>

            <p className="mt-4 sm:hidden text-[11px] font-mono uppercase tracking-[0.18em] text-gold-200/80 text-center">
              Elige una opción o toca a Azlynn para cerrar
            </p>
          </div>,
          document.body
        )}

      {/* Panel activo elegido desde el Menú Radial con retrato grande de Azlynn */}
      {effectiveActiveTab !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={
              desktopPos
                ? { top: desktopPos.top, left: desktopPos.left, width: desktopPos.width }
                : undefined
            }
            className={
              desktopPos
                ? 'landscape-azlynn-portal fixed z-40 pointer-events-none flex justify-center sm:block'
                : 'landscape-azlynn-portal fixed inset-x-2.5 bottom-3 pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-28 z-40 pointer-events-none flex justify-center sm:justify-end'
            }
          >
            <div
              data-testid="detective-hint-bubble"
              role="status"
              aria-live="polite"
              className={`landscape-azlynn-card pointer-events-auto relative overflow-visible w-full mt-9 ml-3 sm:mt-7 sm:ml-0 ${
                desktopPos ? 'sm:w-full' : 'max-w-md sm:w-96 md:w-[440px]'
              } bg-gradient-to-br from-[#faf6ec] via-[#f2ead9] to-[#e4d9c2] border-2 border-gold-600/90 rounded-xl p-3.5 shadow-[0_22px_52px_rgba(0,0,0,0.88),0_4px_0_#3f2f12] text-ink-950 animate-page-turn`}
            >
              <div
                aria-hidden="true"
                style={desktopPos ? { left: desktopPos.caretLeft } : undefined}
                className={`hidden sm:block absolute -top-2 ${
                  desktopPos ? '' : 'right-12'
                } w-3.5 h-3.5 rotate-45 bg-[#faf6ec] border-t-2 border-l-2 border-gold-600/90`}
              />

              <div className="flex items-start justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-parchment-300/90">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Medallón circular 3D sobresaliendo por fuera del borde superior izquierdo */}
                  <div className="landscape-azlynn-popout-wrap relative -mt-12 -ml-5 sm:-mt-14 sm:-ml-6 shrink-0 z-20 select-none">
                    {/* Halo cálido 3D detrás del medallón */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(212,179,84,0.55)_0%,rgba(124,25,37,0.28)_52%,transparent_76%)] blur-md"
                    />
                    {/* Sombra proyectada sobre el pergamino */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-[82%] h-3.5 rounded-full bg-black/45 blur-[4px]"
                    />
                    {/* Disco 3D con bisel dorado y carmesí (recorte circular limpio sin esquinas blancas) */}
                    <div className="landscape-azlynn-popout azlynn-popout-3d relative w-24 h-24 sm:w-[114px] sm:h-[114px] rounded-full overflow-hidden border-[3.5px] border-[#ecd399] ring-[3px] ring-[#4b0c12] bg-ink-950">
                      <img
                        src={AZLYNN_EMOTION_IMAGES[currentMood]}
                        alt={`Azlynn ${MOOD_LABELS[currentMood]}`}
                        draggable={false}
                        className="pointer-events-none w-full h-full object-cover object-center scale-[1.07]"
                      />
                      {/* Brillo especular curvo de medallón 3D */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,250,235,0.26)_0%,transparent_42%,rgba(0,0,0,0.34)_100%)]"
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 w-1/2 animate-victim-sheen"
                      />
                    </div>
                    {/* Listón 3D flotante de estado de ánimo sobresaliendo al frente */}
                    <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-gradient-to-b from-[#821b23] via-[#5c1016] to-[#3a070b] border border-[#ecd399] text-[8.5px] sm:text-[9px] font-mono font-black uppercase tracking-[0.14em] text-[#faecc6] shadow-[0_5px_12px_rgba(0,0,0,0.68),0_2px_0_#1e0305]">
                      {MOOD_LABELS[currentMood]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <span className="block font-title text-lg sm:text-xl text-crimson-950 leading-none">
                      Detective Azlynn
                    </span>
                    <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-gold-900 font-bold mt-1">
                      {effectiveActiveTab === 'hints'
                        ? activeHint.tag
                        : effectiveActiveTab === 'dialogue'
                        ? activeDialogue.title
                        : 'Estado del Cerco'}
                    </span>

                    {/* Pestañas rápidas 3D para cambiar sin volver a cerrar en móvil */}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {!hidePuzzleHints && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setActiveTab('hints');
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition border ${
                            effectiveActiveTab === 'hints'
                              ? 'bg-crimson-900 text-gold-200 border-crimson-950 shadow-sm'
                              : 'bg-parchment-200/80 text-ink-700 border-parchment-400 hover:bg-parchment-300'
                          }`}
                        >
                          Pistas
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setActiveTab('dialogue');
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition border ${
                          effectiveActiveTab === 'dialogue'
                            ? 'bg-crimson-900 text-gold-200 border-crimson-950 shadow-sm'
                            : 'bg-parchment-200/80 text-ink-700 border-parchment-400 hover:bg-parchment-300'
                        }`}
                      >
                        Diálogo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setActiveTab('status');
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition border ${
                          effectiveActiveTab === 'status'
                            ? 'bg-crimson-900 text-gold-200 border-crimson-950 shadow-sm'
                            : 'bg-parchment-200/80 text-ink-700 border-parchment-400 hover:bg-parchment-300'
                        }`}
                      >
                        Caso
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="detective-hint-close"
                  aria-label="Cerrar panel de Azlynn"
                  onClick={handleClose}
                  className="p-1.5 rounded-md text-ink-600 hover:text-crimson-900 hover:bg-parchment-200 transition shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {effectiveActiveTab === 'hints' && !hidePuzzleHints && (
                <>
                  <p className="font-reading text-xs sm:text-[13px] leading-snug text-ink-900 break-words">
                    {activeHint.text}
                  </p>
                  <div className="mt-2.5 pt-1.5 border-t border-parchment-300/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-ink-600">
                      Pista {safeIndex + 1}/{hints.length}
                    </span>
                    {hints.length > 1 && (
                      <button
                        type="button"
                        onClick={handleNextHint}
                        className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded bg-crimson-900 hover:bg-crimson-800 text-gold-100 text-[11px] font-serif font-bold transition shadow-sm"
                      >
                        <span>Otra pista</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </>
              )}

              {effectiveActiveTab === 'dialogue' && (
                <>
                  <div className="landscape-azlynn-scroll space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {activeDialogue.lines.map((line, i) => (
                      <p
                        key={i}
                        className={`text-xs leading-snug rounded px-2 py-1 ${
                          line.speaker === 'Azlynn'
                            ? 'bg-crimson-950/10 border-l-2 border-crimson-800 text-ink-950'
                            : 'bg-parchment-200/75 border-l-2 border-ink-700 text-ink-800'
                        }`}
                      >
                        <strong className="font-mono text-[10px] uppercase tracking-wider mr-1.5 text-crimson-900">
                          {line.speaker}:
                        </strong>
                        <span className="font-reading">{line.text}</span>
                      </p>
                    ))}
                  </div>
                  <div className="mt-2.5 pt-1.5 border-t border-parchment-300/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-ink-600">
                      Diálogo {(dialogueIdx % AZLYNN_DIALOGUES.length) + 1}/{AZLYNN_DIALOGUES.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setDialogueIdx(prev => (prev + 1) % AZLYNN_DIALOGUES.length);
                      }}
                      className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded bg-crimson-900 hover:bg-crimson-800 text-gold-100 text-[11px] font-serif font-bold transition shadow-sm"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}

              {effectiveActiveTab === 'status' && (
                <div className="space-y-2 text-xs font-reading text-ink-900">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-crimson-900">
                    Expediente activo #{caseSeed % 10000}
                  </p>
                  <p>
                    Quedan <strong>{suspectFunnel.remaining}</strong> de{' '}
                    <strong>{suspectFunnel.total}</strong> sospechosos bajo investigación.
                  </p>
                  <p>
                    Has completado <strong>{completedDays.length}/{totalDays}</strong> jornadas y reunido{' '}
                    <strong>{unlockedClues.length}</strong> pruebas en el cuaderno.
                  </p>
                  <div className="pt-2 border-t border-parchment-300 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        startNewCase();
                        setActiveTab(null);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded bg-crimson-900 hover:bg-crimson-800 text-gold-100 text-[11px] font-serif font-bold transition"
                    >
                      Nuevo Caso (74 opciones)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetGame();
                        setActiveTab(null);
                      }}
                      className="px-2.5 py-1.5 rounded bg-parchment-200 hover:bg-parchment-300 text-ink-800 text-[11px] font-mono transition"
                    >
                      Reiniciar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
