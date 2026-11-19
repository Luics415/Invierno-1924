import type {
  AccessLevel,
  AgeGroup,
  ForensicTrace,
  Handedness,
  MotiveTag,
  PresenceWing,
  SuspectCategory,
  VisualMarker,
  WeaponCategory,
  WeaponMaterial,
} from '../types/game';

/**
 * Etiquetas en español para convertir predicados estructurados en prosa legible.
 * Cada etiqueta está redactada para encajar en frases del tipo
 * «El culpable {etiqueta}» / «El culpable no {etiqueta}».
 */

export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  joven: 'tenía menos de treinta y cinco años',
  adulto: 'tenía entre treinta y cinco y cuarenta y nueve años',
  maduro: 'tenía entre cincuenta y cincuenta y nueve años',
  veterano: 'tenía sesenta años o más',
};

export const AGE_GROUP_SHORT: Record<AgeGroup, string> = {
  joven: 'menor de 35',
  adulto: 'de 35 a 49',
  maduro: 'de 50 a 59',
  veterano: '60 o más',
};

export const HANDEDNESS_LABEL: Record<Handedness, string> = {
  diestro: 'es diestro y golpea con la mano derecha',
  zurdo: 'es zurdo y golpea con la mano izquierda',
  ambidiestro: 'es ambidiestro y maneja ambas manos con igual destreza',
};

export const HANDEDNESS_SHORT: Record<Handedness, string> = {
  diestro: 'diestro',
  zurdo: 'zurdo',
  ambidiestro: 'ambidiestro',
};

export const VISUAL_MARKER_LABEL: Record<VisualMarker, string> = {
  lentes: 'llevaba lentes o quevedos',
  cicatriz: 'tenía una cicatriz visible en el rostro o las manos',
  joya: 'lucía una joya llamativa',
  guantes: 'vestía guantes durante la velada',
  tatuaje: 'tenía un tatuaje a la vista',
  vello_facial: 'llevaba barba, bigote o patillas pobladas',
  tocado: 'cubría su cabeza con un tocado, cofia, gorra o sombrero',
  ninguno: 'no tenía ningún rasgo distintivo a la vista',
};

export const VISUAL_MARKER_SHORT: Record<VisualMarker, string> = {
  lentes: 'lentes',
  cicatriz: 'cicatriz',
  joya: 'joya',
  guantes: 'guantes',
  tatuaje: 'tatuaje',
  vello_facial: 'barba o bigote',
  tocado: 'tocado o sombrero',
  ninguno: 'sin rasgo distintivo',
};

export const PRESENCE_WING_LABEL: Record<PresenceWing, string> = {
  ala_este: 'el ala este',
  ala_oeste: 'el ala oeste',
  planta_baja: 'los salones de la planta baja',
  sotano: 'el sótano de servicio',
  torre: 'la torre',
};

export const FORENSIC_TRACE_LABEL: Record<ForensicTrace, string> = {
  tinta: 'tinta ferrogálica',
  tabaco: 'hebras de tabaco',
  ceniza: 'ceniza de chimenea',
  polen: 'polen de invernadero',
  licor: 'gotas de licor añejo',
  metal: 'limaduras de metal',
  perfume: 'perfume de violeta',
  grasa: 'grasa mecánica',
  harina: 'harina de trigo',
  cera: 'cera de abeja',
  quimicos: 'residuos químicos',
  textil: 'fibras de tela e hilo',
};

export const MOTIVE_LABEL: Record<MotiveTag, string> = {
  herencia: 'la herencia y el nuevo testamento',
  deuda: 'una deuda ruinosa',
  chantaje: 'un chantaje',
  venganza: 'una venganza largamente incubada',
  secreto: 'proteger un secreto del pasado',
  despido: 'un despido o desahucio inminente',
  manuscrito: 'un manuscrito usurpado',
  encubrimiento: 'encubrir un fraude o una irregularidad',
};

export const ACCESS_LEVEL_LABEL: Record<AccessLevel, string> = {
  llave_maestra: 'disponía de una llave maestra',
  anfitrion: 'tenía acceso de anfitrión a todas las estancias nobles',
  servicio_interior: 'circulaba por los pasillos interiores del servicio',
  invitado_libre: 'se movía como invitado sin restricciones de paso',
  paso_restringido: 'tenía el paso restringido a zonas concretas',
};

export const ACCESS_LEVEL_SHORT: Record<AccessLevel, string> = {
  llave_maestra: 'llave maestra',
  anfitrion: 'acceso de anfitrión',
  servicio_interior: 'pasillos de servicio',
  invitado_libre: 'invitado sin restricciones',
  paso_restringido: 'paso restringido',
};

export const CATEGORY_LABEL: Record<SuspectCategory, string> = {
  'Familia Valdemar': 'la Familia Valdemar',
  'Invitados de Gala': 'los Invitados de Gala',
  'Servicio de la Mansión': 'el Servicio de la Mansión',
  'Habitantes del Valle': 'los Habitantes del Valle',
};

export const WEAPON_CATEGORY_LABEL: Record<WeaponCategory, string> = {
  contundente: 'un objeto contundente',
  punzante: 'un objeto punzante',
  cortante: 'un arma de filo cortante',
  estrangulamiento: 'un lazo o cordón de estrangulamiento',
  veneno: 'un veneno',
};

export const WEAPON_MATERIAL_LABEL: Record<WeaponMaterial, string> = {
  metal: 'metal',
  cristal: 'cristal',
  madera: 'madera',
  fibra: 'fibra textil',
  quimico: 'sustancia química',
};

export const WEAPON_TRACE_LABEL: Record<string, string> = {
  grasa: 'grasa',
  ceniza: 'ceniza',
  licor: 'licor',
  cera: 'cera',
  tinta: 'tinta',
  polen: 'polen',
  textil: 'fibras textiles',
  quimicos: 'residuos químicos',
  harina: 'harina',
  perfume: 'perfume',
  almendras: 'olor a almendras amargas',
};

export const WOUND_PATTERN_LABEL: Record<string, string> = {
  fractura_hundida: 'una fractura craneal hundida y redondeada',
  traumatismo_lineal: 'un traumatismo lineal y alargado',
  laceracion_vitrea: 'laceraciones con esquirlas de vidrio',
  contusion_craneal: 'una contusión craneal de pomo pesado',
  puncion_doble_filo: 'una punción de doble filo',
  puncion_estrellada: 'una punción con bordes estrellados',
  puncion_estrecha_profunda: 'una punción estrecha y muy profunda',
  puncion_unica_fina: 'una punción única, finísima y limpia',
  incision_limpia: 'una incisión quirúrgica limpia',
  corte_profundo_ancho: 'un corte profundo y ancho',
  corte_doble_borde: 'un corte en pinza de doble borde',
  tajo_astillado: 'un tajo con astillas de madera',
  surco_trenzado_ancho: 'un surco ancho con marcas de trenzado',
  surco_fino_continuo: 'un surco fino y continuo en el cuello',
  compresion_difusa: 'una compresión difusa y sin surco nítido',
  fallo_cardiaco: 'un fallo cardíaco súbito sin heridas',
  asfixia_celular: 'una asfixia celular con labios rosados',
  paralisis_respiratoria: 'una parálisis respiratoria progresiva',
};

export const FLOOR_LABEL: Record<string, string> = {
  'Planta Baja': 'la planta baja',
  'Planta Alta': 'la planta alta',
  Sótano: 'el sótano',
};

export const LOCK_TYPE_LABEL: Record<string, string> = {
  sin_cerradura: 'una estancia sin cerradura',
  pestillo_interior: 'una estancia con pestillo interior',
  cerrojo_maestro: 'una estancia con cerrojo de llave maestra',
  combinacion_hierro: 'una estancia con cerradura de combinación de hierro',
};

export const SURFACE_LABEL: Record<string, string> = {
  roble: 'tarima de roble',
  marmol: 'mármol',
  piedra: 'piedra',
  ladrillo: 'ladrillo',
};

export const AMBIENT_TRACE_LABEL: Record<string, string> = {
  ceniza: 'ceniza',
  licor: 'licor',
  polen: 'polen',
  cera: 'cera',
  harina: 'harina',
};

/** Normaliza un texto a mayúsculas sin tildes (conserva la Ñ) para pasatiempos. */
export function toPuzzleText(input: string): string {
  return input
    .toUpperCase()
    .replace(/Ñ/g, 'ENYETOKEN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ENYETOKEN/g, 'Ñ')
    .replace(/[^A-ZÑ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
