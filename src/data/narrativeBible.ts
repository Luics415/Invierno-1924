import type { VictimProfile, Weapon, GameLocation } from '../types/game';

export type { VictimProfile, Weapon, GameLocation };

export const VICTIM: VictimProfile = {
  name: 'Arturo Valdemar',
  age: 68,
  title: 'Magnate editorial y terrateniente de Villa Acebo',
  description:
    'Despótico, frío y coleccionista implacable. Había retenido en Villa Acebo a familiares, invitados de gala, servidumbre y vecinos esenciales del valle para revelar un nuevo testamento que sacudía herencias, deudas y viejos secretos.',
  timeOfDeath: '23:15 h (23 de diciembre de 1924)',
  estate: 'Villa Acebo',
};

export const WEAPONS: Weapon[] = [
  {
    id: 'cascanueces',
    name: 'Cascanueces de Bronce',
    category: 'contundente',
    material: 'metal',
    concealable: false,
    woundPattern: 'fractura_hundida',
    forensicTrace: 'grasa',
    description:
      'Figura victoriana maciza de dos kilos de bronce fundido, usada habitualmente para partir frutos secos junto a las chimeneas.',
    icon: 'Hammer',
  },
  {
    id: 'atizador',
    name: 'Atizador de Hierro',
    category: 'contundente',
    material: 'metal',
    concealable: false,
    woundPattern: 'traumatismo_lineal',
    forensicTrace: 'ceniza',
    description:
      'Barra pesada de hierro forjado con empuñadura estriada y punta roma ennegrecida por brasas y hollín.',
    icon: 'Flame',
  },
  {
    id: 'oporto',
    name: 'Botella de Oporto (1920)',
    category: 'contundente',
    material: 'cristal',
    concealable: false,
    woundPattern: 'laceracion_vitrea',
    forensicTrace: 'licor',
    description:
      'Botella de vidrio grueso oscuro de añada añeja, de base pesada y cuello estrecho, conservada en las reservas de la casa.',
    icon: 'Wine',
  },
  {
    id: 'baston_ebano',
    name: 'Bastón de Ébano y Plomo',
    category: 'contundente',
    material: 'madera',
    concealable: false,
    woundPattern: 'contusion_craneal',
    forensicTrace: 'cera',
    description:
      'Vara señorial de madera de ébano maciza con pomo lastrado en plomo y contera metálica silenciosa.',
    icon: 'Award',
  },
  {
    id: 'abridor',
    name: 'Abridor de Cartas de Plata',
    category: 'punzante',
    material: 'metal',
    concealable: true,
    woundPattern: 'puncion_doble_filo',
    forensicTrace: 'tinta',
    description:
      'Estilete de escritorio de doble filo en plata labrada, guardado entre los legajos y tinteros de Villa Acebo.',
    icon: 'PenTool',
  },
  {
    id: 'estrella',
    name: 'Estrella de Cristal',
    category: 'punzante',
    material: 'cristal',
    concealable: true,
    woundPattern: 'puncion_estrellada',
    forensicTrace: 'polen',
    description:
      'Remate navideño de cristal tallado con vértices agudos y base estrecha que encaja fácilmente en un bolsillo.',
    icon: 'Sparkles',
  },
  {
    id: 'picahielo',
    name: 'Picahielo de la Cava',
    category: 'punzante',
    material: 'metal',
    concealable: true,
    woundPattern: 'puncion_estrecha_profunda',
    forensicTrace: 'licor',
    description:
      'Punzón de acero templado con mango de madera torneada para quebrar bloques de hielo en el servicio de bebidas.',
    icon: 'Crosshair',
  },
  {
    id: 'aguja_hueso',
    name: 'Aguja Larga de Tejer',
    category: 'punzante',
    material: 'madera',
    concealable: true,
    woundPattern: 'puncion_unica_fina',
    forensicTrace: 'textil',
    description:
      'Varilla rígida y afilada de boj pulido de treinta centímetros, ligera y fácil de ocultar entre pliegues de ropa.',
    icon: 'Feather',
  },
  {
    id: 'bisturi',
    name: 'Bisturí Quirúrgico de Acero',
    category: 'cortante',
    material: 'metal',
    concealable: true,
    woundPattern: 'incision_limpia',
    forensicTrace: 'quimicos',
    description:
      'Hoja quirúrgica de acero inoxidable alemán con filo rasante, propia de un maletín médico de emergencia.',
    icon: 'Scissors',
  },
  {
    id: 'cuchillo_chef',
    name: 'Cuchillo de Cocina de Solingen',
    category: 'cortante',
    material: 'metal',
    concealable: false,
    woundPattern: 'corte_profundo_ancho',
    forensicTrace: 'harina',
    description:
      'Hoja ancha de acero al carbono bien equilibrada para trinchar asados de Nochebuena en las mesas de preparación.',
    icon: 'Utensils',
  },
  {
    id: 'tijeras_podar',
    name: 'Tijeras de Podar de Invernadero',
    category: 'cortante',
    material: 'metal',
    concealable: false,
    woundPattern: 'corte_doble_borde',
    forensicTrace: 'polen',
    description:
      'Cizalla robusta de acero con muelle de retorno empleada para podar tallos leñosos y rosales bajo la cúpula.',
    icon: 'Scissors',
  },
  {
    id: 'hacha_lenador',
    name: 'Hacha Vizcaína del Pórtico',
    category: 'cortante',
    material: 'madera',
    concealable: false,
    woundPattern: 'tajo_astillado',
    forensicTrace: 'ceniza',
    description:
      'Herramienta de monte con astil largo de fresno y filo curvo bien templado para partir troncos de chimenea.',
    icon: 'Axe',
  },
  {
    id: 'guirnalda',
    name: 'Guirnalda Trenzada',
    category: 'estrangulamiento',
    material: 'fibra',
    concealable: true,
    woundPattern: 'surco_trenzado_ancho',
    forensicTrace: 'polen',
    description:
      'Cordón festivo de terciopelo verde reforzado interiormente con alambre fino y flexible de jardinería.',
    icon: 'Ribbon',
  },
  {
    id: 'cuerda_reloj',
    name: 'Cable de Péndulo del Reloj',
    category: 'estrangulamiento',
    material: 'metal',
    concealable: true,
    woundPattern: 'surco_fino_continuo',
    forensicTrace: 'grasa',
    description:
      'Cable acerado de suspensión extraído de un mecanismo de relojería antigua, tenso, delgado y engrasado.',
    icon: 'Cable',
  },
  {
    id: 'chal_seda',
    name: 'Bufanda de Seda y Cachemira',
    category: 'estrangulamiento',
    material: 'fibra',
    concealable: true,
    woundPattern: 'compresion_difusa',
    forensicTrace: 'perfume',
    description:
      'Prenda larga y resistente de seda trenzada con cachemira fina, suave al tacto pero capaz de ejercer gran torsión.',
    icon: 'Wind',
  },
  {
    id: 'digitalina',
    name: 'Tintura de Digitalina',
    category: 'veneno',
    material: 'quimico',
    concealable: true,
    woundPattern: 'fallo_cardiaco',
    forensicTrace: 'quimicos',
    description:
      'Frasco ámbar de gotero dosificador con extracto cardíaco concentrado de uso restringido en botiquines.',
    icon: 'FlaskConical',
  },
  {
    id: 'cianuro',
    name: 'Frasco de Almendras Amargas',
    category: 'veneno',
    material: 'quimico',
    concealable: true,
    woundPattern: 'asfixia_celular',
    forensicTrace: 'almendras',
    description:
      'Ampolla sellada de compuesto cianhídrico cristalino empleada en reactivos fotográficos y preparaciones químicas.',
    icon: 'Skull',
  },
  {
    id: 'aconito',
    name: 'Extracto Botánico de Acónito',
    category: 'veneno',
    material: 'quimico',
    concealable: true,
    woundPattern: 'paralisis_respiratoria',
    forensicTrace: 'polen',
    description:
      'Maceración alcaloide obtenida de raíces de acónito de montaña, incolora en infusiones calientes o licores oscuros.',
    icon: 'Droplets',
  },
];

export const LOCATIONS: GameLocation[] = [
  {
    id: 'salon',
    name: 'El Gran Salón',
    floor: 'Planta Baja',
    lockType: 'sin_cerradura',
    surfaceMaterial: 'roble',
    ambientTrace: 'ceniza',
    description:
      'Amplia estancia de recibo presidida por el abeto navideño de cuatro metros, chimenea encendida y piano de cola.',
    icon: 'Flame',
  },
  {
    id: 'comedor',
    name: 'El Comedor de Gala',
    floor: 'Planta Baja',
    lockType: 'sin_cerradura',
    surfaceMaterial: 'marmol',
    ambientTrace: 'licor',
    description:
      'Salón formal de mármol veteado con larga mesa vestida de lino, candelabros de tres brazos y copas de cristal.',
    icon: 'UtensilsCrossed',
  },
  {
    id: 'invernadero',
    name: 'El Invernadero de Invierno',
    floor: 'Planta Baja',
    lockType: 'pestillo_interior',
    surfaceMaterial: 'piedra',
    ambientTrace: 'polen',
    description:
      'Cúpula acristalada de hierro forjado con suelo de piedra húmeda, orquídeas exóticas y aroma denso a musgo.',
    icon: 'Trees',
  },
  {
    id: 'biblioteca',
    name: 'La Biblioteca Privada',
    floor: 'Planta Alta',
    lockType: 'cerrojo_maestro',
    surfaceMaterial: 'roble',
    ambientTrace: 'cera',
    description:
      'Estancia reservada del piso noble con estanterías de roble hasta el techo, secreter y caja fuerte empotrada.',
    icon: 'BookOpen',
  },
  {
    id: 'torre',
    name: 'El Despacho de la Torre',
    floor: 'Planta Alta',
    lockType: 'pestillo_interior',
    surfaceMaterial: 'roble',
    ambientTrace: 'ceniza',
    description:
      'Mirador circular elevado sobre el temporal de nieve, presidido por un gran reloj de péndulo y hogar de esquina.',
    icon: 'Clock',
  },
  {
    id: 'capilla',
    name: 'La Capilla del Segundo Piso',
    floor: 'Planta Alta',
    lockType: 'sin_cerradura',
    surfaceMaterial: 'piedra',
    ambientTrace: 'cera',
    description:
      'Oratorio privado de bóveda pétrea en la planta superior, iluminado por cirios de abeja e incensarios antiguos.',
    icon: 'Church',
  },
  {
    id: 'bodega',
    name: 'La Bodega de Vinos',
    floor: 'Sótano',
    lockType: 'combinacion_hierro',
    surfaceMaterial: 'piedra',
    ambientTrace: 'licor',
    description:
      'Cava subterránea abovedada en sillería fría donde reposan barricas de roble y reservas históricas bajo llave.',
    icon: 'Wine',
  },
  {
    id: 'cocina',
    name: 'La Cocina y Antecocina',
    floor: 'Sótano',
    lockType: 'cerrojo_maestro',
    surfaceMaterial: 'ladrillo',
    ambientTrace: 'harina',
    description:
      'Corazón de servicio del sótano con fogones de carbón, mesadas enharinadas, despensa y montacargas de servicio.',
    icon: 'Utensils',
  },
  {
    id: 'caldera',
    name: 'La Sala de Calderas y Lavandería',
    floor: 'Sótano',
    lockType: 'combinacion_hierro',
    surfaceMaterial: 'ladrillo',
    ambientTrace: 'ceniza',
    description:
      'Cámara técnica de ladrillo refractario que alberga la caldera central de vapor, cuadros eléctricos y pilas de lavado.',
    icon: 'Cog',
  },
];
