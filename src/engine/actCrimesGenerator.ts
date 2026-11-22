import { LOCATIONS, VICTIM } from '../data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../data/suspectsDirectory';
import type { ActCrimeFile, CaseConfig, DirectorySuspect, GameLocation } from '../types/game';
import { deriveSeed, mulberry32, shuffle } from './puzzles/prng';

const DOOR_META: ReadonlyArray<{
  act: 1 | 2 | 3 | 4 | 5;
  doorNumber: 1 | 2 | 3 | 4 | 5;
  doorRoman: 'I' | 'II' | 'III' | 'IV' | 'V';
  doorTitle: string;
  dayStart: number;
  dayEnd: number;
  dateStr: string;
  timeDiscovered: string;
}> = [
  {
    act: 1,
    doorNumber: 1,
    doorRoman: 'I',
    doorTitle: 'La Noche del Encierro',
    dayStart: 1,
    dayEnd: 6,
    dateStr: '1 de diciembre',
    timeDiscovered: '23:15 h',
  },
  {
    act: 2,
    doorNumber: 2,
    doorRoman: 'II',
    doorTitle: 'El Secreto del Pasillo',
    dayStart: 7,
    dayEnd: 12,
    dateStr: '7 de diciembre',
    timeDiscovered: '01:40 h',
  },
  {
    act: 3,
    doorNumber: 3,
    doorRoman: 'III',
    doorTitle: 'Sombras bajo la Ventisca',
    dayStart: 13,
    dayEnd: 18,
    dateStr: '13 de diciembre',
    timeDiscovered: '22:05 h',
  },
  {
    act: 4,
    doorNumber: 4,
    doorRoman: 'IV',
    doorTitle: 'La Cita de Medianoche',
    dayStart: 19,
    dayEnd: 24,
    dateStr: '19 de diciembre',
    timeDiscovered: '03:10 h',
  },
  {
    act: 5,
    doorNumber: 5,
    doorRoman: 'V',
    doorTitle: 'Última Campanada antes del Juicio',
    dayStart: 25,
    dayEnd: 30,
    dateStr: '25 de diciembre',
    timeDiscovered: '00:25 h',
  },
];

function getSceneImageForVictim(sceneId: string, gender: DirectorySuspect['gender']): string {
  const variant = gender === 'F' || gender === 'Trans F' ? 'f' : 'm';
  return `./portraits/scene-${sceneId}-${variant}.png`;
}

function buildSecondaryActFile(
  meta: (typeof DOOR_META)[number],
  victim: DirectorySuspect,
  scene: GameLocation,
  prevVictimName: string
): ActCrimeFile {
  const numStr = victim.number < 10 ? `0${victim.number}` : `${victim.number}`;
  const sceneImage = getSceneImageForVictim(scene.id, victim.gender);

  if (meta.act === 2) {
    return {
      ...meta,
      victimId: victim.id,
      victimNumber: victim.number,
      victimName: victim.name,
      victimAge: victim.age,
      victimRole: victim.role,
      victimPortrait: victim.portraitGif,
      sceneLocationId: scene.id,
      sceneLocationName: scene.name,
      sceneFloor: scene.floor,
      sceneImage,
      headline: `Hallazgo al alba: ${victim.name} (#${numStr}) no llega a la mañana`,
      situationBrief: [
        `Tras cerrar las primeras seis jornadas sobre la muerte de ${prevVictimName}, el miedo se ha apoderado de los pasillos de Villa Acebo. Al abrir la Puerta II, la mansión despierta con una nueva tragedia inesperada.`,
        `${victim.name} (${victim.role}, ${victim.age} años) fue hallado sin vida en ${scene.name} (${scene.floor}) a las ${meta.timeDiscovered}. Un cajón forzado y una nota arrancada a medias confirman que había descubierto un detalle incómodo del caso.`,
        `La ventisca sigue bloqueando el Paso de Sierra Blanca. Quien mató a ${prevVictimName} está dispuesto a silenciar a cualquiera que se acerque demasiado a su rastro.`,
      ],
      detectiveNote: `¿Por qué ${victim.name} acudió a ${scene.name} a solas pasada la medianoche? El culpable conoce los horarios de la casa mejor que nosotros.`,
      pendingItems: [
        'Contrastar qué sospechosos siguen activos en el censo de 74',
        'Aislar el tipo de arma utilizada mediante los pasatiempos del Acto II',
        'Verificar el ala y nivel de acceso compatibles con el atacante',
      ],
    };
  }

  if (meta.act === 3) {
    return {
      ...meta,
      victimId: victim.id,
      victimNumber: victim.number,
      victimName: victim.name,
      victimAge: victim.age,
      victimRole: victim.role,
      victimPortrait: victim.portraitGif,
      sceneLocationId: scene.id,
      sceneLocationName: scene.name,
      sceneFloor: scene.floor,
      sceneImage,
      headline: `Suceso en la ventisca: el rastro helado en ${scene.name}`,
      situationBrief: [
        `Después de lo ocurrido con ${prevVictimName}, todos aseguran haber cerrado sus puertas con llave. Sin embargo, al desclasificar la Puerta III, un apagón parcial en la mansión revela un nuevo cuerpo.`,
        `${victim.name} (#${numStr}, ${victim.role}) aparece en ${scene.name} (${scene.floor}). No hay signos claros de forcejeo prolongado: fue sorprendido por alguien en quien confiaba o a quien esperaba encontrar.`,
        `Las prendas ligeramente alteradas y un objeto personal desaparecido sugieren que el autor volvió a mover o limpiar parte de la escena antes de marcharse.`,
      ],
      detectiveNote: `La escena fue alterada con frialdad quirúrgica: el culpable está protegiendo un secreto concreto de su pasado.`,
      pendingItems: [
        'Reducir las 18 armas candidatas con las pruebas forenses del Acto III',
        'Identificar la planta exacta de los hechos en el Cuaderno',
        'Cruzar móvil y rastro forense de los sospechosos restantes',
      ],
    };
  }

  if (meta.act === 4) {
    return {
      ...meta,
      victimId: victim.id,
      victimNumber: victim.number,
      victimName: victim.name,
      victimAge: victim.age,
      victimRole: victim.role,
      victimPortrait: victim.portraitGif,
      sceneLocationId: scene.id,
      sceneLocationName: scene.name,
      sceneFloor: scene.floor,
      sceneImage,
      headline: `Alerta nocturna: una cita mortal en ${scene.name}`,
      situationBrief: [
        `La tensión tras la pérdida de ${prevVictimName} ha fracturado todas las alianzas dentro de Villa Acebo. Al abrirse la Puerta IV, una llamada breve y entrecortada alerta a la detective Azlynn.`,
        `En ${scene.name} (${scene.floor}) yace ${victim.name} (#${numStr}, ${victim.role}). Junto al cuerpo solo queda un fragmento de papel quemado y el eco de unos pasos alejándose hacia las escaleras interiores.`,
        `El cerco sobre el asesino ya es muy estrecho: este golpe no fue calculado con calma, sino ejecutado con la urgencia de quien se sabe acorralado.`,
      ],
      detectiveNote: `Cada vez deja más errores. ${victim.name} intentó dejar una señal antes de caer: revisa las pistas del Acto IV con lupa.`,
      pendingItems: [
        'Descartar las últimas estancias incompatibles entre las 9 de Villa Acebo',
        'Confirmar la identidad del arma homicida entre las candidatas finales',
        'Revisar las coartadas rotas de los últimos sospechosos en pie',
      ],
    };
  }

  return {
    ...meta,
    victimId: victim.id,
    victimNumber: victim.number,
    victimName: victim.name,
    victimAge: victim.age,
    victimRole: victim.role,
    victimPortrait: victim.portraitGif,
    sceneLocationId: scene.id,
    sceneLocationName: scene.name,
    sceneFloor: scene.floor,
    sceneImage,
    headline: `Madrugada de Navidad: la última jugada antes de la Audiencia`,
    situationBrief: [
      `La nieve comienza por fin a amainar sobre el Paso de Sierra Blanca, pero al cruzar la Puerta V el asesino asesta un golpe desesperado tras la muerte de ${prevVictimName}.`,
      `${victim.name} (#${numStr}, ${victim.role}) es encontrado en ${scene.name} (${scene.floor}) durante la madrugada de Navidad. En su mano cerrada aún conserva el último hilo que conecta todos los indicios con una sola persona.`,
      `Quedan únicamente seis jornadas antes de convocar la Audiencia Formal de Acusación. Al completar el Acto V tendrás el 100% de las pruebas para señalar sin error al culpable, el arma y la estancia.`,
    ],
    detectiveNote: `Un solo cerebro detrás de todo. Con los seis últimos enigmas el cerco quedará cerrado al 100%.`,
    pendingItems: [
      'Completar las jornadas 25 a 30 para aislar un único sospechoso',
      'Confirmar 1 arma exacta y 1 estancia exacta en el Cuaderno',
      'Abrir la Audiencia Formal y proclamar el Veredicto Inapelable',
    ],
  };
}

export function generateActCrimeFiles(config: CaseConfig): ActCrimeFile[] {
  const rng = mulberry32(deriveSeed(config.seed, 77, 'act-doors-victims'));

  // 4 víctimas secundarias distintas entre sí y NUNCA el culpable real
  const eligibleVictims = shuffle(
    rng,
    SUSPECTS_DIRECTORY.filter(s => s.id !== config.culpritId)
  ).slice(0, 4);

  // 5 escenas distintas para los actos I–V (evitando delatar la escena exacta del veredicto final)
  const otherScenes = shuffle(
    rng,
    LOCATIONS.filter(l => l.id !== config.locationId)
  ).slice(0, 5);

  const act1Meta = DOOR_META[0];
  const act1File: ActCrimeFile = {
    ...act1Meta,
    victimId: 'arturo-valdemar',
    victimName: VICTIM.name,
    victimAge: VICTIM.age,
    victimRole: VICTIM.title,
    victimPortrait: './app-icon.jpg',
    sceneLocationId: 'villa-acebo',
    sceneLocationName: 'Villa Acebo (Escena bajo secreto sumarial)',
    sceneFloor: 'Planta Baja',
    sceneImage: `./portraits/scene-${otherScenes[4]?.id ?? 'salon'}-m.png`,
    headline: `El patriarca ${VICTIM.name} aparece sin vida en Villa Acebo`,
    situationBrief: [
      `La ventisca de diciembre ha sepultado el único puente que comunica el Paso de Sierra Blanca con el valle. Nadie puede entrar ni salir de Villa Acebo hasta que lleguen los equipos de rescate.`,
      `A las ${act1Meta.timeDiscovered}, las campanadas del reloj de péndulo coinciden con el hallazgo de ${VICTIM.name} (${VICTIM.age} años, ${VICTIM.title}). El cuerpo fue hallado sin signos de robo común, pero con indicios de una emboscada premeditada.`,
      `Hay 74 personas atrapadas bajo este techo. Ninguna tiene privilegios ante la ley: cualquiera de ellas pudo perpetrar el crimen. Cruza la Puerta I para comenzar las seis primeras jornadas de investigación.`,
    ],
    detectiveNote: `No subestimes ningún detalle: la hora del hallazgo no siempre coincide con la hora real del ataque, ni el lugar del cuerpo con el del golpe mortal.`,
    pendingItems: [
      'Examinar el Álbum de los 74 Sospechosos en igualdad de condiciones',
      'Resolver las jornadas 1 a 6 para obtener las primeras pistas forenses',
      'Comenzar a descartar sospechosos, armas y estancias en el Cuaderno',
    ],
  };

  const act2File = buildSecondaryActFile(DOOR_META[1], eligibleVictims[0], otherScenes[0], VICTIM.name);
  const act3File = buildSecondaryActFile(DOOR_META[2], eligibleVictims[1], otherScenes[1], eligibleVictims[0].name);
  const act4File = buildSecondaryActFile(DOOR_META[3], eligibleVictims[2], otherScenes[2], eligibleVictims[1].name);
  const act5File = buildSecondaryActFile(DOOR_META[4], eligibleVictims[3], otherScenes[3], eligibleVictims[2].name);

  return [act1File, act2File, act3File, act4File, act5File];
}
