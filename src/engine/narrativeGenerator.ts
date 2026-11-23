import type {
  Clue,
  CluePredicate,
  DayData,
  DirectorySuspect,
  GameLocation,
  GeneratedCase,
  Weapon,
} from '../types/game';
import { SUSPECTS_DIRECTORY } from '../data/suspectsDirectory';
import { deriveSeed, mulberry32, pickOne } from './puzzles/prng';
import type { ClueDescription } from './clueWriter';
import {
  FLOOR_LABEL,
  FORENSIC_TRACE_LABEL,
  MOTIVE_LABEL,
  PRESENCE_WING_LABEL,
  WEAPON_CATEGORY_LABEL,
  WOUND_PATTERN_LABEL,
} from './clueLabels';

export interface DayCalendarMeta {
  title: string;
  subtitle: string;
  dateStr: string;
  hourStr: string;
}

export const DAY_CALENDAR: readonly DayCalendarMeta[] = [
  // Acto I: El Encierro de Invierno (Días 1–6)
  { title: 'El Apagón de las Once', subtitle: 'Primer levantamiento en Villa Acebo', dateStr: '1 de diciembre', hourStr: '23:15 h' },
  { title: 'El Inventario de Armas', subtitle: 'Registro de objetos fuera de lugar', dateStr: '2 de diciembre', hourStr: '23:25 h' },
  { title: 'Sombras en la Escalera', subtitle: 'Primeras contradicciones en los testimonios', dateStr: '3 de diciembre', hourStr: '23:35 h' },
  { title: 'Planos del Aislamiento', subtitle: 'Cierre de plantas y accesos bloqueados', dateStr: '4 de diciembre', hourStr: '23:45 h' },
  { title: 'El Testamento de Invierno', subtitle: 'Papeles rasgados junto a la chimenea', dateStr: '5 de diciembre', hourStr: '23:55 h' },
  { title: 'Censo Bajo Sospecha', subtitle: 'Nadie sale de la mansión hasta el alba', dateStr: '6 de diciembre', hourStr: '00:10 h' },

  // Acto II: Peritaje y Coartadas (Días 7–12)
  { title: 'Protocolo Tanatológico', subtitle: 'El cuerpo habla donde callan los testigos', dateStr: '7 de diciembre', hourStr: '00:25 h' },
  { title: 'Rastros en las Solapas', subtitle: 'Polvo, fibras y residuos microscópicos', dateStr: '8 de diciembre', hourStr: '00:40 h' },
  { title: 'Las Cerraduras Forzadas', subtitle: 'Herrajes, pestillos y llaves maestras', dateStr: '9 de diciembre', hourStr: '00:55 h' },
  { title: 'Silencio en los Corredores', subtitle: 'Tiempos de recorrido medidos con cronómetro', dateStr: '10 de diciembre', hourStr: '01:10 h' },
  { title: 'Voces tras el Tapiz', subtitle: 'Lo que el servicio oyó antes del grito', dateStr: '11 de diciembre', hourStr: '01:25 h' },
  { title: 'El Peso del Instrumento', subtitle: 'Cotejo de dimensiones y ocultamiento', dateStr: '12 de diciembre', hourStr: '01:40 h' },

  // Acto III: Secretos de Sangre y Deuda (Días 13–18)
  { title: 'Pagarés de Medianoche', subtitle: 'Cuentas ocultas de la editorial Valdemar', dateStr: '13 de diciembre', hourStr: '01:55 h' },
  { title: 'Placas Reveladas', subtitle: 'Fotografías del vestíbulo bajo luz de magnesio', dateStr: '14 de diciembre', hourStr: '02:10 h' },
  { title: 'Análisis de Residuos', subtitle: 'Reactivos sobre la herida mortal', dateStr: '15 de diciembre', hourStr: '02:25 h' },
  { title: 'Polvo en las Suelas', subtitle: 'El pavimento delata la habitación exacta', dateStr: '16 de diciembre', hourStr: '02:40 h' },
  { title: 'Indicios Biométricos', subtitle: 'Dominancia, postura y rastros físicos', dateStr: '17 de diciembre', hourStr: '02:55 h' },
  { title: 'Cartas sin Franqueo', subtitle: 'Correspondencia interceptada antes de la cena', dateStr: '18 de diciembre', hourStr: '03:10 h' },

  // Acto IV: El Cerco se Estrecha (Días 19–24)
  { title: 'Materiales en Conflicto', subtitle: 'Cotejo metalúrgico y químico del arma', dateStr: '19 de diciembre', hourStr: '03:25 h' },
  { title: 'Pasillos del Servicio', subtitle: 'Rutas invisibles que conectan las alas', dateStr: '20 de diciembre', hourStr: '03:40 h' },
  { title: 'El Testigo de la Ventisca', subtitle: 'Una confesión arrancada bajo presión', dateStr: '21 de diciembre', hourStr: '03:55 h' },
  { title: 'Aromas del Crimen', subtitle: 'Humo, cera, licor y humedad en las ropas', dateStr: '22 de diciembre', hourStr: '04:10 h' },
  { title: 'La Coartada Quebrada', subtitle: 'El reloj de la galería desmiente una declaración', dateStr: '23 de diciembre', hourStr: '04:25 h' },
  { title: 'Inventario Definitivo', subtitle: 'Penúltimo cribado del arsenal de Villa Acebo', dateStr: '24 de diciembre', hourStr: '04:40 h' },

  // Acto V: La Verdad de las 30 Jornadas (Días 25–30)
  { title: 'Cruce de Expedientes', subtitle: 'Azlynn ordena las pruebas sobre el escritorio', dateStr: '25 de diciembre', hourStr: '04:55 h' },
  { title: 'Firma de la Lesión', subtitle: 'El dictamen forense señala un solo objeto', dateStr: '26 de diciembre', hourStr: '05:10 h' },
  { title: 'Rastros Convergentes', subtitle: 'Solo un puñado de nombres resiste el filtro', dateStr: '27 de diciembre', hourStr: '05:25 h' },
  { title: 'La Estancia Sellada', subtitle: 'Confirmación absoluta del escenario del crimen', dateStr: '28 de diciembre', hourStr: '05:40 h' },
  { title: 'Desenmascarando el Móvil', subtitle: 'El motivo oculto que detonó la noche', dateStr: '29 de diciembre', hourStr: '05:55 h' },
  { title: 'La Campanada Final', subtitle: 'Cierre de instrucción: un solo culpable posible', dateStr: '30 de diciembre', hourStr: '06:15 h' },
];

export function buildMurderNarrative(
  seed: number,
  culprit: DirectorySuspect,
  weapon: Weapon,
  room: GameLocation
): GeneratedCase['murderNarrative'] {
  const rng = mulberry32(deriveSeed(seed, 99, `murder:${culprit.id}:${weapon.id}:${room.id}`));

  const approachVerb =
    weapon.category === 'veneno'
      ? `administró en sigilo ${weapon.name}`
      : weapon.category === 'estrangulamiento'
        ? `sorprendió a Don Arturo por la espalda con ${weapon.name}`
        : `atacó sin titubeos a Don Arturo empleando ${weapon.name}`;

  const headline = pickOne(rng, [
    `Expediente Cerrado: ${culprit.name} en ${room.name}`,
    `Sentencia de Villa Acebo: El crimen de ${culprit.name}`,
    `Resolución Forense: ${culprit.name} — ${weapon.name} en ${room.name}`,
  ]);

  const summary =
    `Aprovechando el apagón de las 23:15 h y la tormenta que incomunicaba la finca, ` +
    `${culprit.name} (${culprit.role}) abandonó ${PRESENCE_WING_LABEL[culprit.attributes.presenceWing]} ` +
    `para citar a Arturo Valdemar en ${room.name} (${FLOOR_LABEL[room.floor]}). ` +
    `Allí, movido por ${MOTIVE_LABEL[culprit.attributes.motiveTag]}, ${approachVerb}, ` +
    `provocando ${WOUND_PATTERN_LABEL[weapon.woundPattern]}.`;

  const motiveDetail =
    `${culprit.motiveSummary} ${culprit.backstory} ` +
    `El vacío de su coartada resultó determinante: ${culprit.attributes.alibiHole}`;

  const epilogue =
    `Con las treinta pruebas lacradas sobre la mesa del Gran Salón, la detective Azlynn confrontó a ${culprit.name} ` +
    `ante los otros setenta y tres aislados. El rastro de ${FORENSIC_TRACE_LABEL[culprit.attributes.forensicTrace]}, ` +
    `el cotejo de ${weapon.name} y las evidencias de ${room.name} no dejaron escapatoria posible. ` +
    `Al amanecer, cuando el paso de montaña quedó despejado, la Guardia Civil escoltó al culpable fuera de Villa Acebo.`;

  const reconstruction: string[] = [
    `22:50 h — ${culprit.name} prepara la coartada desde ${PRESENCE_WING_LABEL[culprit.attributes.presenceWing]} y asegura el acceso a ${weapon.name}.`,
    `23:10 h — Se interrumpe el suministro eléctrico en toda la mansión; ${culprit.attributes.alibiHole}`,
    `23:15 h — En ${room.name} (${room.floor}), ${culprit.name} confronta a Arturo Valdemar por ${MOTIVE_LABEL[culprit.attributes.motiveTag]} y ejecuta el ataque con ${weapon.name} (${WEAPON_CATEGORY_LABEL[weapon.category]}).`,
    `23:19 h — El asesino regresa a su sector dejando tras de sí rastros de ${FORENSIC_TRACE_LABEL[culprit.attributes.forensicTrace]} y el rastro ambiental propio de ${room.name}.`,
  ];

  const discovery: string[] = [
    '23 de diciembre de 1924, 23:15 h. La ventisca más feroz del invierno sella todos los caminos de Villa Acebo.',
    'Tras un apagón de cinco minutos, el cuerpo sin vida de Arturo Valdemar es hallado dentro de la mansión. Setenta y cuatro personas —familiares, invitados de gala, servidumbre y habitantes del valle atrapados por el temporal— comparten el mismo techo.',
    'Nadie goza de inmunidad ni existen sospechosos privilegiados: cualquiera de los 74 presentes pudo ser el autor, cualquiera de las 18 armas inventariadas pudo causar la muerte y cualquiera de las 9 estancias pudo servir de escenario.',
  ];

  return {
    headline,
    summary,
    motiveDetail,
    epilogue,
    reconstruction,
    discovery,
  };
}

interface BuildDayNarrativeParams {
  seed: number;
  day: number;
  clue: Clue;
  description: ClueDescription;
  culprit: DirectorySuspect;
  weapon: Weapon;
  room: GameLocation;
}

const EVIDENCE_TITLES: Record<DayData['narrative']['evidenceType'], readonly string[]> = {
  autopsy: ['Informe Tanatológico Complementario', 'Nota del Laboratorio de Campo', 'Hoja de Peritaje Forense'],
  map: ['Croquis de Circulación Nocturna', 'Plano Anotado de Accesos', 'Registro de Llaves y Pestillos'],
  photo: ['Placa Fotográfica de Inspección', 'Ampliación de Escena N.º', 'Negativo Revelado en Cuarto Oscuro'],
  letter: ['Fragmento de Correspondencia', 'Nota Intervenida en el Secreter', 'Carta Parcialmente Quemada'],
  diary: ['Anotación del Cuaderno de Azlynn', 'Extracto de Declaraciones Cruzadas', 'Registro de Vigilancia Nocturna'],
  telegram: ['Despacho Telegráfico Verificado', 'Confirmación de Coartada Externa', 'Cinta de Telégrafo de la Estación'],
  newspaper: ['Recorte de Hemeroteca Local', 'Gacetilla de Sociedad Cotejada', 'Crónica Archivada del Valle'],
};

const AZLYNN_OBSERVATIONS: readonly string[] = [
  'La nieve acumulada contra los ventanales ahoga cualquier ruido del exterior. Azlynn extiende las hojas sobre la mesa de roble y comprueba que ninguna coartada aguanta un segundo examen.',
  'Con la lámpara de petróleo baja para no alertar a los curiosos del pasillo, Azlynn coteja las declaraciones recogidas durante la madrugada frente a los planos originales de 1898.',
  'El reloj de péndulo marca una nueva hora de encierro. Cuanto más silencio guardan los setenta y cuatro aislados, más elocuentes resultan los rastros físicos que dejaron atrás.',
  'Azlynn anota una nueva línea en su libreta encuadernada en cuero. Cada pieza que encaja reduce el cerco sin dejar margen a suposiciones infundadas.',
  'Una corriente helada atraviesa las rendijas de las galerías. El documento recién recuperado contradice abiertamente la versión oficial que circulaba en el Gran Salón.',
  'Entre las cenizas y los legajos cerrados con lacre, aparece una pista que enlaza directamente el momento del apagón con los movimientos previos a la cena de Nochebuena.',
];

function describePredicateScope(pred: CluePredicate): string {
  switch (pred.kind) {
    case 'suspectAttr':
      switch (pred.field) {
        case 'ageGroup':
          return 'la franja de edad del autor';
        case 'handedness':
          return 'la lateralidad dominante del culpable';
        case 'visualMarker':
          return 'el rasgo visual distintivo';
        case 'presenceWing':
          return 'el sector de desplazamiento durante el apagón';
        case 'forensicTrace':
          return 'el rastro microscópico en las solapas';
        case 'motiveTag':
          return 'el móvil del homicidio';
        case 'accessLevel':
          return 'el nivel de acceso en la mansión';
      }
    case 'suspectIdentity':
      switch (pred.field) {
        case 'category':
          return 'el círculo del censo implicado';
        case 'gender':
          return 'el perfil censal de género';
        case 'id':
          return 'la verificación de una coartada individual';
      }
    case 'suspectAgeRange':
      return 'la horquilla cronológica de edad del culpable';
    case 'weaponConcealable':
      return 'el volumen y ocultamiento del arma';
    case 'weaponAttr':
      switch (pred.field) {
        case 'category':
          return 'la categoría del arma homicida';
        case 'material':
          return 'el material del instrumento';
        case 'forensicTrace':
          return 'los residuos adheridos a la lesión';
        case 'woundPattern':
          return 'la firma anatómica de la herida';
        case 'id':
          return 'el cotejo de un objeto del inventario';
      }
    case 'roomAttr':
      switch (pred.field) {
        case 'floor':
          return 'la planta de la mansión';
        case 'lockType':
          return 'el tipo de cerradura de la estancia';
        case 'surfaceMaterial':
          return 'el material del pavimento';
        case 'ambientTrace':
          return 'el rastro ambiental de la escena';
        case 'id':
          return 'la inspección de una estancia concreta';
      }
  }
}

export function buildDayNarrative(params: BuildDayNarrativeParams): DayData['narrative'] {
  const { seed, day, clue, description, culprit } = params;
  const rng = mulberry32(deriveSeed(seed, day, 'day-narrative'));
  const act = Math.floor((day - 1) / 6) + 1;

  // Testigo neutral (nunca nombra ni acusa al culpable)
  const witnesses = SUSPECTS_DIRECTORY.filter(s => s.id !== culprit.id);
  const witness = witnesses[(day * 7 + Math.floor(rng() * witnesses.length)) % witnesses.length];

  const intro = AZLYNN_OBSERVATIONS[(day - 1 + Math.floor(rng() * 2)) % AZLYNN_OBSERVATIONS.length];

  const focusSentence =
    clue.category === 'suspect'
      ? `Jornada ${day} (Acto ${act}): las pesquisas se concentran en estrechar el censo de los 74 presentes mediante pruebas verificables de perfil, rastro o coartada.`
      : clue.category === 'weapon'
        ? `Jornada ${day} (Acto ${act}): el peritaje se centra en el arsenal de 18 objetos inventariados en Villa Acebo para determinar con certeza el instrumento homicida.`
        : `Jornada ${day} (Acto ${act}): los planos de las 9 estancias permiten acotar en qué planta y bajo qué condiciones físicas se perpetró el crimen.`;

  const evidenceTitleBase = pickOne(rng, EVIDENCE_TITLES[description.evidenceType]);
  const evidenceTitle = `${evidenceTitleBase} — Expediente ${day < 10 ? `0${day}` : day}/30`;

  const topic = clue.predicates?.[0]
    ? describePredicateScope(clue.predicates[0])
    : 'un dato clave del sumario';
  const evidenceContent =
    `[CLASIFICADO · JORNADA ${day}] Registro en proceso de verificación forense. ` +
    `Al resolver el análisis lógico del pliego derecho, el expediente revelará la conclusión verificada sobre ${topic}.`;

  return {
    storyText: [intro, focusSentence],
    evidenceType: description.evidenceType,
    evidenceTitle,
    evidenceContent,
    characterQuote: {
      author: `${witness.name} (${witness.role})`,
      quote: witness.alibiQuote.replace(/^«|»$/g, ''),
    },
  };
}
