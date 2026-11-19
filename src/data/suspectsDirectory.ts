import type { DirectorySuspect } from '../types/game';

export type { DirectorySuspect };

export const SUSPECTS_DIRECTORY: DirectorySuspect[] = [
  // ========================================================
  // GRUPO 1: FAMILIA VALDEMAR (12 Sospechosos)
  // ========================================================
  {
    id: 'elena',
    number: 1,
    name: 'Elena Valdemar',
    age: 42,
    gender: 'F',
    category: 'Familia Valdemar',
    role: 'Hija mayor y Directora Financiera',
    relation:
      'Primogénita de Don Arturo y administradora del sello editorial familiar en la planta baja durante la velada.',
    trait:
      'Diestra; sostiene una boquilla dorada con cigarrillos mentolados en la mano derecha, viste vestido esmeralda con ribete dorado y pendiente de perla en la oreja izquierda.',
    alibiQuote:
      '«Permanecí en el Gran Salón de la planta baja junto a la chimenea; si mi padre pretendía ajustar cuentas financieras, no necesité moverme de los salones principales.»',
    backstory:
      'Levantó la rentabilidad de Ediciones Valdemar durante quince años, pero acumuló deudas ruinosas en las mesas de bacará de Montecarlo y pignoró pagarés de la casa sin consentimiento paterno.',
    motiveSummary:
      'Arturo descubrió sus deudas de juego y los pagarés vencidos esa misma tarde, amenazando con ejecutar su ruina patrimonial antes de medianoche.',
    avatarIcon: '01',
    portraitGif: './portraits/01-elena.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'joya',
      presenceWing: 'planta_baja',
      forensicTrace: 'tabaco',
      motiveTag: 'deuda',
      accessLevel: 'anfitrion',
      alibiHole:
        'Salió diez minutos del Gran Salón en la planta baja para fumar sola cerca de la escalera de servicio.',
    },
  },
  {
    id: 'mateo',
    number: 2,
    name: 'Mateo Valdemar',
    age: 35,
    gender: 'M',
    category: 'Familia Valdemar',
    role: 'Hijo menor y Escritor inédito',
    relation:
      'Segundo hijo de Don Arturo; autor en la sombra que permaneció en el mirador superior de la torre durante la tormenta.',
    trait:
      'Barba incipiente, camisa blanca de puños arremangados manchados de tinta ferrogálica, chaleco marrón y corbata granate mientras aprieta hojas de su manuscrito.',
    alibiQuote:
      '«Subí al corredor de la torre para rescatar mis cuartillas antes de que el viento enfriara los despachos altos; el corte eléctrico me sorprendió revisando mis páginas.»',
    backstory:
      'Dedicó cinco años en silencio a redactar una novela que Arturo planeaba registrar bajo su propia firma como triunfo literario póstumo.',
    motiveSummary:
      'Quería impedir que Arturo usurpara y publicara su manuscrito inédito bajo nombre propio.',
    avatarIcon: '02',
    portraitGif: './portraits/02-mateo.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'torre',
      forensicTrace: 'tinta',
      motiveTag: 'manuscrito',
      accessLevel: 'anfitrion',
      alibiHole:
        'Ningún testigo lo vio en el sector de la torre durante el corte eléctrico de las 23:10 h.',
    },
  },
  {
    id: 'beatriz',
    number: 3,
    name: 'Beatriz Valdemar',
    age: 65,
    gender: 'F',
    category: 'Familia Valdemar',
    role: 'Hermana viuda de Arturo',
    relation:
      'Hermana mayor del patriarca; alojada en el ala este de Villa Acebo y dependiente del fideicomiso familiar.',
    trait:
      'Cabello plateado recogido en moño alto, vestido negro de luto con camafeo y abanico de plumas negras en la mano derecha.',
    alibiQuote:
      '«Me retiré a mi dormitorio del ala este con mis sales de lavanda antes del apagón; mi sordera parcial del oído izquierdo apenas me dejó oír pasos en el corredor.»',
    backstory:
      'Viuda de un brigadier sin fortuna propia, dependía de la pensión vitalicia estipulada en el testamento anterior que Arturo pensaba revocar.',
    motiveSummary:
      'El nuevo testamento suprimía su pensión hereditaria y la dejaba sin sustento en la vejez.',
    avatarIcon: '03',
    portraitGif: './portraits/03-beatriz.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'joya',
      presenceWing: 'ala_este',
      forensicTrace: 'perfume',
      motiveTag: 'herencia',
      accessLevel: 'anfitrion',
      alibiHole:
        'Su sordera parcial del oído izquierdo le impidió oír la campana y su cerradura podía abrirse desde dentro antes del apagón.',
    },
  },
  {
    id: 'gonzalo',
    number: 4,
    name: 'Gonzalo Valdemar',
    age: 38,
    gender: 'M',
    category: 'Familia Valdemar',
    role: 'Sobrino díscolo y jugador de polo',
    relation:
      'Sobrino paterno de Arturo alojado en las estancias del ala oeste de la mansión.',
    trait:
      'Cabello engominado, traje oscuro, antebrazo y mano derecha vendados con cabestrillo negro sobre una herida con cicatriz reciente tras una caída ecuestre, compensado con gran fuerza en la izquierda.',
    alibiQuote:
      '«Subí al corredor del ala oeste a descansar el brazo; aunque manejo todo con la zurda desde mi caída en el hipódromo, no tenía razón para cruzar pasillos a oscuras.»',
    backstory:
      'Empeñó caballos de pura sangre de la finca para saldar pagarés de clubes nocturnos, y Arturo había prometido denunciarlo esa noche.',
    motiveSummary:
      'Buscaba evitar que Arturo reclamara sus deudas de juego y lo denunciara por los caballos empeñados.',
    avatarIcon: '04',
    portraitGif: './portraits/04-gonzalo.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'zurdo',
      visualMarker: 'cicatriz',
      presenceWing: 'ala_oeste',
      forensicTrace: 'licor',
      motiveTag: 'deuda',
      accessLevel: 'anfitrion',
      alibiHole:
        'Su cabestrillo derecho no le impide actuar con fuerza usando la mano izquierda y nadie vigiló su salida del ala oeste.',
    },
  },
  {
    id: 'carlos',
    number: 5,
    name: 'Carlos Valdemar',
    age: 40,
    gender: 'M',
    category: 'Familia Valdemar',
    role: 'Primo y tasador de arte',
    relation:
      'Primo hermano de Arturo instalado en los gabinetes del ala este durante la reunión navideña.',
    trait:
      'Entradas marcadas, gafas gruesas de carey que limpia con un pañuelo blanco de batista y gesto tenso.',
    alibiQuote:
      '«En el ala este estaba limpiando mis lentes cuando saltaron los plomos; puedo ver de cerca sin dificultad aunque todos crean que soy ciego sin cristales.»',
    backstory:
      'Sustituyó dos grabados auténticos de Goya de la colección familiar por copias litográficas para saldar apuros propios, y Arturo halló los recibos.',
    motiveSummary:
      'Arturo lo chantajeaba con entregar a la policía las pruebas de los grabados sustituidos.',
    avatarIcon: '05',
    portraitGif: './portraits/05-carlos.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'lentes',
      presenceWing: 'ala_este',
      forensicTrace: 'tinta',
      motiveTag: 'chantaje',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Alegó limpiar sus gafas en el tocador del ala este mientras los tasadores seguían en la galería.',
    },
  },
  {
    id: 'ines',
    number: 6,
    name: 'Inés Valdemar',
    age: 28,
    gender: 'F',
    category: 'Familia Valdemar',
    role: 'Sobrina y compositora',
    relation:
      'Sobrina de Arturo que ensayaba piezas navideñas en los salones de la planta baja.',
    trait:
      'Melena oscura ondulada, vestido de satén verde oliva, broche camafeo de marfil y dedos con callos de arpa y clavicordio.',
    alibiQuote:
      '«Estuve ordenando mis partituras junto al piano de la planta baja antes del corte eléctrico; no quise permanecer junto a mi tío tras su última amenaza.»',
    backstory:
      'Arturo bloqueó su beca en el Conservatorio de París y la excluyó del reparto familiar tras negarse a un matrimonio concertado que ocultaba un pacto financiero secreto.',
    motiveSummary:
      'Temía que Arturo hiciera público un compromiso privado secreto y la dejara fuera de toda herencia.',
    avatarIcon: '06',
    portraitGif: './portraits/06-ines.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'ambidiestro',
      visualMarker: 'joya',
      presenceWing: 'planta_baja',
      forensicTrace: 'cera',
      motiveTag: 'secreto',
      accessLevel: 'anfitrion',
      alibiHole:
        'Dejó de tocar el arpa veinte minutos antes del apagón para recoger partituras sin testigos.',
    },
  },
  {
    id: 'felipe',
    number: 7,
    name: 'Felipe Valdemar',
    age: 52,
    gender: 'M',
    category: 'Familia Valdemar',
    role: 'Cuñado y albacea testamentario previo',
    relation:
      'Viudo de la hermana menor de Arturo, hospedado en la zona del ala oeste.',
    trait:
      'Cabello y barba entrecanos bien recortados, traje oscuro con chaleco gris y mirada pesada fatigada.',
    alibiQuote:
      '«Permanecí en el cuarto de lectura del ala oeste tomando coñac; aunque me falte el aliento al subir rápido, conozco cada recodo de esta planta.»',
    backstory:
      'Fue relevado como administrador agrario tras descubrirse desfalcos en las rentas del valle y perdería el control del fideicomiso con el nuevo testamento.',
    motiveSummary:
      'La lectura del nuevo testamento le arrebataba su última participación en la herencia familiar.',
    avatarIcon: '07',
    portraitGif: './portraits/07-felipe.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'vello_facial',
      presenceWing: 'ala_oeste',
      forensicTrace: 'licor',
      motiveTag: 'herencia',
      accessLevel: 'llave_maestra',
      alibiHole:
        'Su agitación y sudoración visibles tras el apagón delatan una carrera reciente por el pasillo del ala oeste.',
    },
  },
  {
    id: 'leonor',
    number: 8,
    name: 'Leonor Valdemar',
    age: 70,
    gender: 'F',
    category: 'Familia Valdemar',
    role: 'Tía abuela y matriarca emérita',
    relation:
      'Tía paterna de Arturo instalada en sus aposentos del ala este de la planta alta.',
    trait:
      'Cabello plateado cubierto por mantilla de encaje negro, vestido y chal oscuros, sosteniendo un impertinente de oro con la mano derecha.',
    alibiQuote:
      '«Caminé hasta el rellano del ala este para vigilar la casa como hago desde hace cincuenta años; la boda de Arturo con una extraña mancilla nuestro apellido.»',
    backstory:
      'Guardiana implacable del linaje Valdemar que conocía viejos secretos familiares ocultos en los baúles del ala este y se desplazaba sin dificultad por todas las escaleras.',
    motiveSummary:
      'Quería impedir que Arturo revelara un secreto de cuna que deshonraría el apellido Valdemar.',
    avatarIcon: '08',
    portraitGif: './portraits/08-leonor.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'tocado',
      presenceWing: 'ala_este',
      forensicTrace: 'textil',
      motiveTag: 'secreto',
      accessLevel: 'anfitrion',
      alibiHole:
        'Quedó momentáneamente sola en el rellano del ala este antes de que regresara su dama de compañía.',
    },
  },
  {
    id: 'hugo',
    number: 9,
    name: 'Hugo Valdemar',
    age: 33,
    gender: 'M',
    category: 'Familia Valdemar',
    role: 'Primo segundo y marino mercante',
    relation:
      'Primo segundo recién retornado de La Habana y las Antillas; bajó al sótano de Villa Acebo durante la noche.',
    trait:
      'Cabello revuelto, abrigo oscuro sobre camisa verde oliva, tatuaje de ancla azul visible en el antebrazo derecho y anillo de sello.',
    alibiQuote:
      '«Bajé al sótano a buscar una caja de ron de mi equipaje de La Habana; finjo más borrachera de la que tengo cuando los Valdemar empiezan a dar sermones.»',
    backstory:
      'Regresó de ultramar tras quebrar la naviera avalada por Arturo, quien exigía ejecución inmediata de sus pagarés personales antes de acabar el año.',
    motiveSummary:
      'Estaba acorralado por la ejecución de sus deudas navieras avaladas por Arturo.',
    avatarIcon: '09',
    portraitGif: './portraits/09-hugo.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'ambidiestro',
      visualMarker: 'tatuaje',
      presenceWing: 'sotano',
      forensicTrace: 'tabaco',
      motiveTag: 'deuda',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Bajó sin autorización al sótano supuestamente a buscar una caja de embarque y fingió ebriedad para espiar.',
    },
  },
  {
    id: 'valentina',
    number: 10,
    name: 'Valentina Valdemar',
    age: 22,
    gender: 'F',
    category: 'Familia Valdemar',
    role: 'Nieta mayor de Arturo',
    relation:
      'Hija de Elena y estudiante de Derecho alojada en el corredor del ala oeste.',
    trait:
      'Media melena oscura sujeta con dos horquillas plateadas a cada lado, chaqueta oscura y cuello de encaje con broche ovalado de amatista.',
    alibiQuote:
      '«Me quedé en el corredor del ala oeste repasando códigos civiles; mi abuelo pretendía dejarme sin tutela ni matrícula si no acataba sus órdenes.»',
    backstory:
      'Primera mujer de la familia en cursar Leyes contra la prohibición expresa de Arturo, quien amenazaba con desheredarla y cortar sus estudios en enero.',
    motiveSummary:
      'Defendía su derecho hereditario y su carrera jurídica frente a la desheredación inminente.',
    avatarIcon: '10',
    portraitGif: './portraits/10-valentina.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'zurdo',
      visualMarker: 'joya',
      presenceWing: 'ala_oeste',
      forensicTrace: 'perfume',
      motiveTag: 'herencia',
      accessLevel: 'anfitrion',
      alibiHole:
        'Nadie confirmó que permaneciera en su alcoba del ala oeste cuando se fundieron los plomos.',
    },
  },
  {
    id: 'ramiro',
    number: 11,
    name: 'Ramiro Valdemar',
    age: 45,
    gender: 'M',
    category: 'Familia Valdemar',
    role: 'Medio hermano desheredado',
    relation:
      'Hijo natural reconocido tardíamente y exrecluso; aguardó en las escaleras que conducen a la torre.',
    trait:
      'Cicatriz vertical pálida que cruza su ceja izquierda, párpado y pómulo izquierdo; viste camisa a cuadros bajo chaqueta oscura sin levita y gesto endurecido.',
    alibiQuote:
      '«Subí por la escalera trasera de la torre para hablar con Arturo sin testigos; la paz notarial de octubre era papel mojado frente a cuatro años de presidio injusto.»',
    backstory:
      'Exconvicto amnistiado que cumplió cuatro años en el penal de El Dueso tras ser incriminado por Arturo en un litigio maderero de juventud.',
    motiveSummary:
      'Buscaba venganza personal por los años de prisión injusta y la ruina a la que Arturo lo condenó.',
    avatarIcon: '11',
    portraitGif: './portraits/11-ramiro.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'cicatriz',
      presenceWing: 'torre',
      forensicTrace: 'tabaco',
      motiveTag: 'venganza',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Exconvicto recién amnistiado que subió por la escalera trasera hacia la torre sin permiso.',
    },
  },
  {
    id: 'diana',
    number: 12,
    name: 'Diana Valdemar',
    age: 31,
    gender: 'NB',
    category: 'Familia Valdemar',
    role: 'Pariente lejana y acompañante',
    relation:
      'Familiar empobrecida acogida como acompañante en el ala este de Villa Acebo.',
    trait:
      'Cabello castaño ceniza en moño bajo, vestido gris sobrio, tejiendo con agujas de hueso y lana oscura con expresión reservada.',
    alibiQuote:
      '«Tejía en silencio junto al rellano del ala este; en esta casa todos miran por encima del hombro y nadie repara en mis pasos por los pasillos.»',
    backstory:
      'Persona no binaria relegada por los Valdemar a labores domésticas encubiertas; ocultaba haber copiado cartas privadas de la caja familiar para ayudar a su madre enferma.',
    motiveSummary:
      'Temía ser acusada de sustraer correspondencia y documentos privados del ala este para encubrir a su familia.',
    avatarIcon: '12',
    portraitGif: './portraits/12-diana.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'zurdo',
      visualMarker: 'ninguno',
      presenceWing: 'ala_este',
      forensicTrace: 'textil',
      motiveTag: 'encubrimiento',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Dejó la labor en la mecedora del ala este y su discreta presencia le permitió cruzar pasillos sin ser notada.',
    },
  },

  // ========================================================
  // GRUPO 2: INVITADOS DE GALA Y CÍRCULO ÍNTIMO (18 Sospechosos)
  // ========================================================
  {
    id: 'clara',
    number: 13,
    name: 'Dra. Clara Mendoza',
    age: 50,
    gender: 'F',
    category: 'Invitados de Gala',
    role: 'Médica personal de Arturo',
    relation:
      'Facultativa de cabecera instalada en el gabinete médico del ala oeste durante la velada.',
    trait:
      'Lleva prominentes gafas ovaladas de montura dorada, moño plateado, traje sastre oscuro y se ajusta guantes negros con láminas anatómicas a su espalda.',
    alibiQuote:
      '«Estaba en el botiquín del ala oeste clasificando frascos clínicos cuando se apagaron las luces; salí al corredor diez minutos antes de las once y cuarto.»',
    backstory:
      'Médica brillante sometida durante una década al chantaje de Arturo, quien custodiaba un informe clínico de juventud que habría acabado con su licencia profesional.',
    motiveSummary:
      'Arturo la chantajeaba con un antiguo expediente clínico para obligarla a firmar dictámenes falsos.',
    avatarIcon: '13',
    portraitGif: './portraits/13-clara.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'ambidiestro',
      visualMarker: 'lentes',
      presenceWing: 'ala_oeste',
      forensicTrace: 'quimicos',
      motiveTag: 'chantaje',
      accessLevel: 'llave_maestra',
      alibiHole:
        'Salió del botiquín superior del ala oeste diez minutos antes de que sonara el reloj de las once y cuarto.',
    },
  },
  {
    id: 'sofia',
    number: 14,
    name: 'Sofía Rostova',
    age: 29,
    gender: 'F',
    category: 'Invitados de Gala',
    role: 'Prometida de Arturo y Pianista',
    relation:
      'Concertista rusa prometida a Arturo; animaba la velada al piano en la planta baja.',
    trait:
      'Melena ondulada oscura con peineta de perlas, vestido de terciopelo carmesí y broche de rubí engarzado en oro bajo una mirada melancólica.',
    alibiQuote:
      '«Estuve junto al piano de cola en el Gran Salón de la planta baja, aunque entre las 23:05 y las 23:25 h nadie podía distinguir quién permanecía en la banqueta a oscuras.»',
    backstory:
      'Émigré rusa que llegó a España tras la revolución; descubrió que es hija secreta del socio al que Arturo empujó a la ruina y al suicidio veinte años atrás.',
    motiveSummary:
      'Aceptó el compromiso solo para acercarse a Arturo y vengar el suicidio de su padre.',
    avatarIcon: '14',
    portraitGif: './portraits/14-sofia.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'ambidiestro',
      visualMarker: 'joya',
      presenceWing: 'planta_baja',
      forensicTrace: 'perfume',
      motiveTag: 'venganza',
      accessLevel: 'anfitrion',
      alibiHole:
        'El piano del Gran Salón en la planta baja guardó silencio entre las 23:05 y las 23:25 h y su broche cayó antes del apagón.',
    },
  },
  {
    id: 'tomas',
    number: 15,
    name: 'Padre Tomás',
    age: 61,
    gender: 'M',
    category: 'Invitados de Gala',
    role: 'Sacerdote y Restaurador de Archivo',
    relation:
      'Párroco y antiguo confesor alojado en las dependencias religiosas del ala este.',
    trait:
      'Cabello blanco peinado hacia atrás, sotana negra con alzacuello blanco y bastón de empuñadura dorada en la mano derecha.',
    alibiQuote:
      '«Me encerré en la capilla del ala este para orar antes de medianoche; solo Dios y las velas de cera ardían allí dentro durante el apagón.»',
    backstory:
      'Autorizó años atrás una tasación irregular de plata parroquial que Arturo compró a bajo precio, secreto que amenazaba con destruir su ministerio.',
    motiveSummary:
      'Necesitaba proteger el secreto del expolio parroquial antes de que Arturo entregara las actas.',
    avatarIcon: '15',
    portraitGif: './portraits/15-tomas.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'ala_este',
      forensicTrace: 'cera',
      motiveTag: 'secreto',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Rezó a puerta cerrada en la capilla del ala este sin acólito que acredite su presencia continua.',
    },
  },
  {
    id: 'alvaro_notario',
    number: 16,
    name: 'Don Álvaro Montero',
    age: 55,
    gender: 'M',
    category: 'Invitados de Gala',
    role: 'Notario Mayor de la provincia',
    relation:
      'Fedatario público alojado en el ala oeste para protocolizar la última voluntad de Arturo.',
    trait:
      'Cabello plateado, bigote imperial encerado y cartera de cuero con cierre de latón apretada bajo el brazo izquierdo.',
    alibiQuote:
      '«Permanecí en el corredor del ala oeste custodiando mis minutas selladas; cualquiera pudo dejar ceniza de cigarro en la galería para simular mi paso.»',
    backstory:
      'Manipuló cláusulas testamentarias anteriores a favor de acreedores locales y Arturo había amenazado con denunciarlo ante el Colegio Notarial.',
    motiveSummary:
      'Debía encubrir sus alteraciones en las escrituras previas antes de la denuncia notarial.',
    avatarIcon: '16',
    portraitGif: './portraits/16-alvaro.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'vello_facial',
      presenceWing: 'ala_oeste',
      forensicTrace: 'tinta',
      motiveTag: 'encubrimiento',
      accessLevel: 'llave_maestra',
      alibiHole:
        'Custodiaba las copias del testamento en su cartera cerrada tras discutir con Arturo en el ala oeste.',
    },
  },
  {
    id: 'ernesto_cirujano',
    number: 17,
    name: 'Dr. Ernesto Vega',
    age: 58,
    gender: 'M',
    category: 'Invitados de Gala',
    role: 'Cirujano jefe del Hospital Provincial',
    relation:
      'Antiguo mentor médico invitado a pasar la Nochebuena en las alcobas del ala este.',
    trait:
      'Cabello entrecano, bigote blanco, frac de etiqueta con pajarita blanca y la mano derecha resguardada en la solapa mientras opera con soltura con la izquierda.',
    alibiQuote:
      '«El temblor en mi diestra me retiró del quirófano, mas aprendí a valerme con precisión absoluta de la zurda; aguardaba en el salón del ala este durante el corte de luz.»',
    backstory:
      'Encubrió fallos quirúrgicos pasados en el hospital provincial gracias a la discreción de Arturo, quien ahora utilizaba esas actas para presionarlo.',
    motiveSummary:
      'Sufría chantaje directo de Arturo por las actas reservadas de sus errores quirúrgicos.',
    avatarIcon: '17',
    portraitGif: './portraits/17-ernesto.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'zurdo',
      visualMarker: 'vello_facial',
      presenceWing: 'ala_este',
      forensicTrace: 'quimicos',
      motiveTag: 'chantaje',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Aunque su mano derecha tiembla, compensa con destreza aprendida en la izquierda y se apartó del grupo en el ala este.',
    },
  },
  {
    id: 'klaus_baron',
    number: 18,
    name: 'Barón Klaus Von Berg',
    age: 63,
    gender: 'M',
    category: 'Invitados de Gala',
    role: 'Coleccionista de armas antiguas',
    relation:
      'Aristócrata prusiano subido a la zona de la torre para examinar piezas antiguas de armería y relojería.',
    trait:
      'Monóculo dorado con cadenilla sobre su ojo izquierdo blanquecino y ciego, cicatriz vertical en mejilla derecha y labio inferior, guerrera oscura con condecoración roja y dorada.',
    alibiQuote:
      '«Subí hacia la torre para inspeccionar piezas antiguas antes del apagón; pese a la herida de guerra en mi ojo izquierdo, me muevo en la penumbra mejor que cualquiera.»',
    backstory:
      'Veterano prusiano humillado públicamente por Arturo tras acusarlo ante coleccionistas madrileños de traficar con reliquias e incunables falsificados.',
    motiveSummary:
      'Buscaba vengar la afrenta pública contra su honor militar y su colección en Madrid.',
    avatarIcon: '18',
    portraitGif: './portraits/18-klaus.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'zurdo',
      visualMarker: 'lentes',
      presenceWing: 'torre',
      forensicTrace: 'metal',
      motiveTag: 'venganza',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Examinaba objetos metálicos antiguos sin escolta cerca de la torre durante el apagón.',
    },
  },
  {
    id: 'maria_condesa',
    number: 19,
    name: 'Condesa María De la Riva',
    age: 49,
    gender: 'F',
    category: 'Invitados de Gala',
    role: 'Mecenas y aristócrata',
    relation:
      'Dama de la alta sociedad alojada entre los invitados de la planta baja durante la velada.',
    trait:
      'Recogido plateado coronado por tiara brillante, collar de perlas, estola de armiño y mirada altiva.',
    alibiQuote:
      '«No abandoné los salones de la planta baja en toda la noche; y un pañuelo sin esencia explica que mi perfume no quedara adherido en cada rincón.»',
    backstory:
      'Detrás de su opulencia aristocrática, sus propiedades estaban hipotecadas en secreto por pagarés en poder de Arturo con vencimiento inminente en enero.',
    motiveSummary:
      'La ejecución de los pagarés de Arturo en enero la condenaba a perder todas sus fincas por deudas.',
    avatarIcon: '19',
    portraitGif: './portraits/19-maria.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'tocado',
      presenceWing: 'planta_baja',
      forensicTrace: 'perfume',
      motiveTag: 'deuda',
      accessLevel: 'invitado_libre',
      alibiHole:
        'La estela de violetas de Parma reveló un desplazamiento fuera del salón principal de la planta baja.',
    },
  },
  {
    id: 'sebastian_critico',
    number: 20,
    name: 'Sebastián Ortega',
    age: 44,
    gender: 'Trans M',
    category: 'Invitados de Gala',
    role: 'Crítico literario y rival editorial',
    relation:
      'Columnista de la vanguardia literaria madrileña alojado en el ala oeste de Villa Acebo.',
    trait:
      'Cabello engominado hacia atrás, traje oscuro con chaleco y corbata de brocado carmesí, gesto irónico y soltura con ambas manos.',
    alibiQuote:
      '«El pestillo del gabinete en el ala oeste cedía desde fuera cuando regresé; Arturo pretendía destruir mis páginas y mi nombre en la prensa.»',
    backstory:
      'Hombre trans que conquistó prestigio en la crítica literaria de Madrid; Arturo guardaba cartas de juventud y manuscritos suyos con los que amenazaba su carrera.',
    motiveSummary:
      'Quería recuperar sus textos comprometedores y frenar el libelo editorial con que Arturo lo amenazaba.',
    avatarIcon: '20',
    portraitGif: './portraits/20-sebastian.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'ambidiestro',
      visualMarker: 'ninguno',
      presenceWing: 'ala_oeste',
      forensicTrace: 'tabaco',
      motiveTag: 'manuscrito',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Quedó solo en el corredor del ala oeste y el pestillo del tocador podía cerrarse tras regresar.',
    },
  },
  {
    id: 'teresa_pintora',
    number: 21,
    name: 'Teresa Albarrán',
    age: 36,
    gender: 'F',
    category: 'Invitados de Gala',
    role: 'Retratista oficial de la familia',
    relation:
      'Pintora alojada en el estudio abuhardillado contiguo a la torre de Villa Acebo.',
    trait:
      'Cabello oscuro sujeto con lazo, guardapolvo negro, pincel sostenido con la mano derecha y dedos de la derecha manchados de azul de Prusia y rojo.',
    alibiQuote:
      '«Trabajaba en el estudio de la torre cuando faltó la luz; bajé al rellano buscando aguarrás antes de oír el alboroto.»',
    backstory:
      'Fue coaccionada por Arturo para pintar copias falsificadas de retratos clásicos vendidos como originales, hasta descubrir que él la utilizaría como única culpable.',
    motiveSummary:
      'Ansiaba vengarse del hombre que la explotó como falsificadora y planeaba delatarla.',
    avatarIcon: '21',
    portraitGif: './portraits/21-teresa.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'torre',
      forensicTrace: 'quimicos',
      motiveTag: 'venganza',
      accessLevel: 'invitado_libre',
      alibiHole:
        'El olor a trementina se detectó fuera de su estudio en el descansillo de la torre durante el apagón.',
    },
  },
  {
    id: 'ignacio_banquero',
    number: 22,
    name: 'Ignacio Quintana',
    age: 51,
    gender: 'M',
    category: 'Invitados de Gala',
    role: 'Director del Banco Mercantil',
    relation:
      'Banquero personal de Arturo presente en los salones principales de la planta baja.',
    trait:
      'Cabello plateado en las sienes, traje oscuro a rayas, cadena de reloj dorada en el chaleco y habano encendido en la mano derecha.',
    alibiQuote:
      '«Fumaba mi habano en un sillón de la planta baja; el silencio de mi reloj de repetición entre las once y las once y veinte no prueba ninguna ausencia.»',
    backstory:
      'Invirtió fondos del fideicomiso Valdemar en valores especulativos quebrados para cubrir pérdidas propias y Arturo exigió una auditoría inmediata en enero.',
    motiveSummary:
      'Afrontaba quiebra personal y cárcel por las deudas ocultas en el fideicomiso bancario.',
    avatarIcon: '22',
    portraitGif: './portraits/22-ignacio.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'joya',
      presenceWing: 'planta_baja',
      forensicTrace: 'tabaco',
      motiveTag: 'deuda',
      accessLevel: 'invitado_libre',
      alibiHole:
        'La repetición horaria de su reloj de oro no fue oída por nadie en la planta baja entre las 23:00 y las 23:20 h.',
    },
  },
  {
    id: 'lucia_secretaria',
    number: 23,
    name: 'Lucía Morales',
    age: 27,
    gender: 'Trans F',
    category: 'Invitados de Gala',
    role: 'Secretaria ejecutiva de la editorial',
    relation:
      'Taquígrafa de confianza retenida dentro del ala este de Villa Acebo al cerrarse el puerto por la gran ventisca.',
    trait:
      'Moño bajo oscuro, chaqueta gris sobre cuello vuelto blanco y bloc taquigráfico de espiral sujeto entre las manos.',
    alibiQuote:
      '«La ventisca sepultó la salida antes de las ocho y tuve que quedarme en el ala este; Arturo me obligaba a callar bajo amenaza constante sobre mi pasado.»',
    backstory:
      'Mujer trans que construyó una brillante carrera taquigráfica en Madrid; Arturo descubrió documentos de su anterior identidad y la chantajeaba para que guardara sus fraudes.',
    motiveSummary:
      'Sufría chantaje laboral y personal de Arturo, quien poseía las llaves de sus archivos reservados.',
    avatarIcon: '23',
    portraitGif: './portraits/23-lucia.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'ala_este',
      forensicTrace: 'tinta',
      motiveTag: 'chantaje',
      accessLevel: 'llave_maestra',
      alibiHole:
        'La tormenta impidió su partida a las 19:30 h; permaneció en el ala este con copias de las llaves maestras.',
    },
  },
  {
    id: 'daniel_vane',
    number: 24,
    name: 'Prof. Daniel Vane',
    age: 60,
    gender: 'M',
    category: 'Invitados de Gala',
    role: 'Arqueólogo y catalogador',
    relation:
      'Catedrático alojado en la torre para revisar códices y relojes antiguos de la colección.',
    trait:
      'Cabello blanco, gafas rectangulares de montura oscura subidas sobre la frente, chaqueta de tweed marrón y lupa plegable de platero entre las manos.',
    alibiQuote:
      '«Subí con mi lupa a la torre para examinar unos legajos; mi artritis en los nudillos apenas molesta cuando empuño un objeto con firmeza.»',
    backstory:
      'Validó como auténticos varios manuscritos medievales de origen ilícito adquiridos por Arturo y temía que el nuevo testamento revelara las falsificaciones.',
    motiveSummary:
      'Necesitaba recuperar y ocultar los códices y legajos alterados antes de perder su cátedra.',
    avatarIcon: '24',
    portraitGif: './portraits/24-daniel.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'lentes',
      presenceWing: 'torre',
      forensicTrace: 'tinta',
      motiveTag: 'manuscrito',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Subió con sus gafas en la frente y lupa hacia la torre alegando catalogar el reloj y los legajos superiores.',
    },
  },
  {
    id: 'matias_prado',
    number: 25,
    name: 'Matías Prado',
    age: 39,
    gender: 'M',
    category: 'Invitados de Gala',
    role: 'Agente bursátil',
    relation:
      'Corredor de comercio citado en la mansión y apostado en los corredores del ala oeste.',
    trait:
      'Cabello oscuro engominado, traje a rayas y corbata burdeos ajustada con mano derecha de dedos amarillentos por nicotina; boca cerrada en gesto sombrío y tenso sin sonreír.',
    alibiQuote:
      '«Esperaba en el pasillo del ala oeste un giro urgente para cubrir mis posiciones; Arturo ordenó liquidar esta noche las operaciones que me dejaban en la ruina.»',
    backstory:
      'Apostó capital propio y de clientes en las especulaciones de Elena; al interceptar la auditoría, Arturo decidió liquidar las cuentas dejando a Matías en bancarrota.',
    motiveSummary:
      'La liquidación bursátil ordenada por Arturo lo abocaba a la quiebra y a prisión por deudas.',
    avatarIcon: '25',
    portraitGif: './portraits/25-matias.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'ala_oeste',
      forensicTrace: 'tabaco',
      motiveTag: 'deuda',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Su gesto sombrío y dedos manchados de tabaco delataron una espera nerviosa tras la cortina del ala oeste.',
    },
  },
  {
    id: 'carmen_poetisa',
    number: 26,
    name: 'Carmen Figueroa',
    age: 46,
    gender: 'NB',
    category: 'Invitados de Gala',
    role: 'Poetisa laureada',
    relation:
      'Autora invitada a la lectura navideña en los salones principales de la planta baja.',
    trait:
      'Moño bajo oscuro, chal de terciopelo púrpura con encaje negro y taza de porcelana floral sostenida en la mano derecha.',
    alibiQuote:
      '«Dejé mi taza sobre el velador de la planta baja al empezar la oscuridad; mis versos y mis cartas jamás debieron caer en manos de Arturo.»',
    backstory:
      'Poetisa de identidad no binaria en círculos literarios íntimos; Arturo conservaba manuscritos y poemas dedicados sin seudónimo con los que amenazaba su prestigio.',
    motiveSummary:
      'Quería rescatar los manuscritos poéticos y cartas íntimas que Arturo guardaba bajo llave.',
    avatarIcon: '26',
    portraitGif: './portraits/26-carmen.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'planta_baja',
      forensicTrace: 'perfume',
      motiveTag: 'manuscrito',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Su taza de té floral quedó fría en el velador de la planta baja mientras desaparecía veinte minutos.',
    },
  },
  {
    id: 'lucas_periodista',
    number: 27,
    name: 'Lucas Bernabé',
    age: 32,
    gender: 'Trans M',
    category: 'Invitados de Gala',
    role: 'Cronista de ecos de sociedad',
    relation:
      'Redactor invitado a cubrir la velada desde las salas de prensa en la planta baja.',
    trait:
      'Cabello castaño algo desordenado, traje de tweed claro, cuaderno de tapas negras y lápiz de grafito entre los dedos.',
    alibiQuote:
      '«Tomaba apuntes tras las cortinas de la planta baja; Arturo prometió una exclusiva, pero en realidad planeaba exponer mis papeles antiguos.»',
    backstory:
      'Periodista trans que logró abrirse paso en la prensa provincial; Arturo había averiguado su historial previo y lo retenía en Villa Acebo bajo amenazas veladas.',
    motiveSummary:
      'Temía que Arturo filtrara su secreto biográfico si publicaba los escándalos financieros de la familia.',
    avatarIcon: '27',
    portraitGif: './portraits/27-lucas.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'zurdo',
      visualMarker: 'ninguno',
      presenceWing: 'planta_baja',
      forensicTrace: 'tinta',
      motiveTag: 'secreto',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Merodeó con su libreta tras los tapices de la planta baja sin testigo fijo durante el corte de luz.',
    },
  },
  {
    id: 'jaime_boticario',
    number: 28,
    name: 'Dr. Jaime Silvela',
    age: 53,
    gender: 'M',
    category: 'Invitados de Gala',
    role: 'Toxicólogo forense y químico',
    relation:
      'Perito químico que descendió al sótano técnico de Villa Acebo durante la velada.',
    trait:
      'Cabello oscuro engominado, gafas redondas de montura oscura sin cordón alguno, frasco de vidrio con tapón de corcho en el bolsillo izquierdo del pecho y media sonrisa sardónica.',
    alibiQuote:
      '«Bajé al sótano a comprobar los reactivos húmedos y el estado del botiquín auxiliar; mis gafas no llevan cordón y mi sonrisa solo responde a tanta hipocresía.»',
    backstory:
      'Asesoraba a Arturo en literatura policial mientras le suministraba sedantes sin receta ni registro oficial para varios miembros de la casa.',
    motiveSummary:
      'Buscaba encubrir la entrega ilegal de preparados tóxicos y sedantes sin receta.',
    avatarIcon: '28',
    portraitGif: './portraits/28-jaime.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'ambidiestro',
      visualMarker: 'lentes',
      presenceWing: 'sotano',
      forensicTrace: 'quimicos',
      motiveTag: 'encubrimiento',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Portaba un vial ambarino con corcho en el bolsillo cuando bajó al sótano sin avisar a nadie.',
    },
  },
  {
    id: 'adriana_cantante',
    number: 29,
    name: 'Adriana Castro',
    age: 38,
    gender: 'F',
    category: 'Invitados de Gala',
    role: 'Mezzosoprano invitada',
    relation:
      'Solista lírica contratada para el recital navideño en los salones de la planta baja.',
    trait:
      'Melena oscura ondulada, blusa color ciruela, chalina blanca de cachemira al cuello y porte sereno y reservado.',
    alibiQuote:
      '«Vocalizaba cerca del vestíbulo de la planta baja antes del apagón; el lacayo salió de la sala justo antes de que las arañas se extinguieran.»',
    backstory:
      'Alcanzó fama en el Teatro Lírico tras ocultar un antiguo proceso judicial de su juventud en provincias, expediente que Arturo compró para doblegar su voluntad.',
    motiveSummary:
      'Arturo la chantajeaba con entregar su antiguo expediente judicial a la prensa teatral.',
    avatarIcon: '29',
    portraitGif: './portraits/29-adriana.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'planta_baja',
      forensicTrace: 'cera',
      motiveTag: 'chantaje',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Se retiró a vocalizar cerca del vestíbulo de la planta baja justo antes del corte eléctrico sin compañía.',
    },
  },
  {
    id: 'aurelio_exsocio',
    number: 30,
    name: 'Aurelio Beltrán',
    age: 66,
    gender: 'M',
    category: 'Invitados de Gala',
    role: 'Exeditor retirado',
    relation:
      'Hermano del antiguo socio arruinado de Arturo; permaneció en las estancias del ala este.',
    trait:
      'Cabello y barba blanca poblada, abrigo oscuro y bastón con empuñadura de plata en forma de galgo.',
    alibiQuote:
      '«Las alfombras persas del ala este absorben cualquier ruido de mi bastón; vine fingiendo reconciliación para mirar cara a cara al destructor de mi hermano.»',
    backstory:
      'Su hermano se quitó la vida tras ser estafado por Arturo; Aurelio aceptó la invitación navideña para ajustar cuentas tras años de silencio.',
    motiveSummary:
      'Buscaba vengar la ruina y la muerte de su hermano provocadas por Arturo.',
    avatarIcon: '30',
    portraitGif: './portraits/30-aurelio.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'vello_facial',
      presenceWing: 'ala_este',
      forensicTrace: 'tinta',
      motiveTag: 'venganza',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Nadie vigilaba sus movimientos en el ala este y las alfombras amortiguan por completo su bastón.',
    },
  },

  // ========================================================
  // GRUPO 3: SERVICIO Y PERSONAL DE VILLA ACEBO (24 Sospechosos)
  // ========================================================
  {
    id: 'julian',
    number: 31,
    name: 'Julián Sosa',
    age: 58,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Mayordomo Jefe de Villa Acebo',
    relation:
      'Treinta años al frente del servicio; coordinaba candelabros y llaves entre la planta baja y el sótano.',
    trait:
      'Cabello blanco peinado atrás y patillas largas, frac de mayordomo, guante blanco y gran llavero de hierro en la mano derecha, con el brazo izquierdo tras la espalda.',
    alibiQuote:
      '«Supervisaba los candelabros de la planta baja antes de bajar a las válvulas; purgar la caldera lleva apenas tres minutos cuando se conoce el oficio.»',
    backstory:
      'Sirvió con lealtad absoluta durante tres décadas, hasta que Arturo anunció su despido inmediato en enero sin pensión acusándolo falsamente de hurto de platería.',
    motiveSummary:
      'Afrontaba un despido humillante y sin pensión tras treinta años de servicio.',
    avatarIcon: '31',
    portraitGif: './portraits/31-julian.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'guantes',
      presenceWing: 'planta_baja',
      forensicTrace: 'metal',
      motiveTag: 'despido',
      accessLevel: 'llave_maestra',
      alibiHole:
        'Su guante blanco y llavero maestro le daban paso absoluto por la planta baja y el resto de la mansión.',
    },
  },
  {
    id: 'rosaura_ama',
    number: 32,
    name: 'Rosaura Gil',
    age: 54,
    gender: 'F',
    category: 'Servicio de la Mansión',
    role: 'Ama de llaves mayor',
    relation:
      'Gobernanta del servicio instalada en el refectorio y pasillos del sótano durante la noche.',
    trait:
      'Moño gris en lo alto, vestido y delantal negro rígido con manojo de llaves de latón en la cadera izquierda y rostro austero.',
    alibiQuote:
      '«Bajé al sótano a comprobar las cerraduras de servicio tras dejar rezando a las doncellas; conozco cada puerta cerrada de esta casa.»',
    backstory:
      'Ocultó durante veinticinco años haber entregado un hijo recién nacido bajo presión familiar; Arturo conocía el secreto y lo usaba para someterla.',
    motiveSummary:
      'Necesitaba proteger el secreto de su pasado maternal antes de que Arturo lo divulgara.',
    avatarIcon: '32',
    portraitGif: './portraits/32-rosaura.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'sotano',
      forensicTrace: 'metal',
      motiveTag: 'secreto',
      accessLevel: 'llave_maestra',
      alibiHole:
        'Se ausentó del refectorio del sótano diez minutos para inspeccionar cerraduras dejando a las doncellas solas.',
    },
  },
  {
    id: 'bruno_cocinero',
    number: 33,
    name: 'Bruno Herrera',
    age: 48,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Chef ejecutivo de Nochebuena',
    relation:
      'Maestro de cocina en los fogones subterráneos del sótano de Villa Acebo.',
    trait:
      'Bigote oscuro espeso y rizado, amplia sonrisa segura, chaquetilla blanca cruzada, estuche enrollado de cuchillos bajo el brazo izquierdo y delantal salpicado de harina y manchas rojas oscuras.',
    alibiQuote:
      '«Sonríe quien sabe lo que vale su trabajo: estas manchas son de caza y harina en la cocina del sótano, aunque Arturo amenazó con no pagarme ni despedirme antes de los postres.»',
    backstory:
      'Contratado para el banquete tras abandonar un gran hotel por disputas laborales; Arturo lo humilló ante los invitados y amenazó con despedirlo sin liquidación.',
    motiveSummary:
      'Temía el despido inmediato sin paga tras sufrir humillaciones públicas en la cocina.',
    avatarIcon: '33',
    portraitGif: './portraits/33-bruno.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'ambidiestro',
      visualMarker: 'vello_facial',
      presenceWing: 'sotano',
      forensicTrace: 'harina',
      motiveTag: 'despido',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Custodia cuchillos de Solingen bajo el brazo y salió de los fogones del sótano hacia el montacargas.',
    },
  },
  {
    id: 'mateo_ruiz',
    number: 34,
    name: 'Martín Ruiz',
    age: 24,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Mozo de cuadras y carruajes',
    relation:
      'Mozo del servicio que se refugió dentro del sótano de la mansión antes de que arreciara el temporal.',
    trait:
      'Cabello castaño revuelto, camisa a cuadros bajo mandil de cuero y lona salpicado de escarcha y polvo blanco.',
    alibiQuote:
      '«Entré desde los pasadizos de servicio al sótano buscando agua caliente y mantas antes de que cerrara la tormenta; nadie me vio fichar en cocina.»',
    backstory:
      'Sufrió de niño la dureza de los capataces de Arturo y escondía haber vendido monturas viejas de la cuadra para costear medicinas de su hermana.',
    motiveSummary:
      'Buscaba encubrir la desaparición de guarniciones y monturas de las caballerizas.',
    avatarIcon: '34',
    portraitGif: './portraits/34-mateo.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'sotano',
      forensicTrace: 'grasa',
      motiveTag: 'encubrimiento',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Entró desde las cuadras al sótano para resguardarse de la ventisca sin fichar en la cocina.',
    },
  },
  {
    id: 'francisca_doncella',
    number: 35,
    name: 'Francisca Gómez',
    age: 33,
    gender: 'F',
    category: 'Servicio de la Mansión',
    role: 'Doncella de cámara de Elena',
    relation:
      'Camarera personal asignada a los cuartos del ala oeste de la planta alta.',
    trait:
      'Cabello oscuro recogido, cofia blanca de encaje, vestido negro con cuatro alfileres de costura prendidos en el pecho izquierdo y media sonrisa astuta.',
    alibiQuote:
      '«Subí al ala oeste con ropa planchada antes del corte de luz; mis escarpines silenciosos no hacen ruido ni cuando paso junto a las alcobas.»',
    backstory:
      'Recibía sobornos de acreedores madrileños para filtrar copias de la correspondencia privada de Elena, secreto que Arturo acababa de descubrir.',
    motiveSummary:
      'Guardaba el secreto de las cartas filtradas por soborno antes de ser entregada a la Guardia Civil.',
    avatarIcon: '35',
    portraitGif: './portraits/35-francisca.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'zurdo',
      visualMarker: 'tocado',
      presenceWing: 'ala_oeste',
      forensicTrace: 'textil',
      motiveTag: 'secreto',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Subió al ala oeste con ropa planchada antes del apagón y sus alfileres y escarpines pasan inadvertidos.',
    },
  },
  {
    id: 'evaristo_guardes',
    number: 36,
    name: 'Evaristo Campos',
    age: 62,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Guardés de la finca y cancela',
    relation:
      'Guardián veterano que cerró la verja exterior a las 20:00 h y entró a resguardarse en la planta baja de Villa Acebo.',
    trait:
      'Barba entrecana, zamarra de borrego, escopeta a la espalda y farol de tormenta encendido en la mano derecha.',
    alibiQuote:
      '«Tranquée la verja a las ocho y entré al vestíbulo de la planta baja a entregar el parte y secarme la nieve; Arturo planeaba derribar mi caseta y echarme sin techo.»',
    backstory:
      'Cuidó los lindes desde la época del padre de Arturo, pero el nuevo plano de la finca contemplaba jubilarlo sin vivienda y demoler la garita.',
    motiveSummary:
      'Se enfrentaba al despido y desahucio de su vivienda tras cuarenta años guardando la finca.',
    avatarIcon: '36',
    portraitGif: './portraits/36-evaristo.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'vello_facial',
      presenceWing: 'planta_baja',
      forensicTrace: 'ceniza',
      motiveTag: 'despido',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Entró por la puerta de servicio a la planta baja empapado de nieve antes de las 23:15 h.',
    },
  },
  {
    id: 'gaspar_chofer',
    number: 37,
    name: 'Gaspar Ortiz',
    age: 45,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Chófer particular del Hispano-Suiza',
    relation:
      'Conductor que encadenó el automóvil en el túnel y entró al oficio del sótano a tomar café caliente.',
    trait:
      'Gorra de plato de chófer, guerrera negra, guante de cuero marrón con remaches en la mano derecha y media sonrisa confiada.',
    alibiQuote:
      '«Tras asegurar las ruedas entré por el paso subterráneo del sótano a calentarme; nadie me vio regresar después de las once menos cinco.»',
    backstory:
      'Traficaba con repuestos y licores de contrabando en el maletero del Hispano-Suiza durante los viajes a la capital, y Arturo descubrió las facturas.',
    motiveSummary:
      'Estaba sometido a chantaje por el contrabando descubierto en el automóvil de la casa.',
    avatarIcon: '37',
    portraitGif: './portraits/37-gaspar.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'guantes',
      presenceWing: 'sotano',
      forensicTrace: 'grasa',
      motiveTag: 'chantaje',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Sus guantes de conducir dejaron el sector técnico del sótano a su alcance tras entrar por el túnel.',
    },
  },
  {
    id: 'emilia_ayudante',
    number: 38,
    name: 'Emilia Navarro',
    age: 26,
    gender: 'F',
    category: 'Servicio de la Mansión',
    role: 'Segunda ayudante de cocina',
    relation:
      'Auxiliar de cocina y repostería en los fogones del sótano.',
    trait:
      'Cabello cobrizo bajo pañuelo blanco anudado, rostro pecoso, delantal gris, gesto sobresaltado y dedo índice derecho vendado con lino.',
    alibiQuote:
      '«Con el índice derecho herido me valgo de la zurda en el sótano; cuando volqué la bandeja en el fregadero nadie reparó en los minutos que falté.»',
    backstory:
      'Su hermano menor ocultaba una deserción militar en la montaña mientras ella trabajaba sin descanso bajo amenazas de Arturo de denunciar el paradero familiar.',
    motiveSummary:
      'Ocultaba el secreto familiar de su hermano y temía que Arturo lo delatara a la Guardia Civil.',
    avatarIcon: '38',
    portraitGif: './portraits/38-emilia.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'zurdo',
      visualMarker: 'tocado',
      presenceWing: 'sotano',
      forensicTrace: 'harina',
      motiveTag: 'secreto',
      accessLevel: 'servicio_interior',
      alibiHole:
        'El ruido de la bandeja caída en la cocina del sótano sirvió para cubrir una ausencia de quince minutos.',
    },
  },
  {
    id: 'jacinto_fogonero',
    number: 39,
    name: 'Jacinto Soler',
    age: 50,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Fogonero de la caldera central',
    relation:
      'Encargado de la carbonera y la caldera de vapor en el sótano de Villa Acebo.',
    trait:
      'Complexión recia, camisa azul de faena abierta en el cuello, rostro y pecho tiznados de hollín espeso y ceño endurecido.',
    alibiQuote:
      '«Estuve junto a la caldera del sótano paleando antracita; pero los montacargas interiores llegan hasta arriba sin ensuciar un solo peldaño de alfombra.»',
    backstory:
      'Exrecluso rehabilitado que ocultó su condena juvenil para conseguir empleo; Arturo descubrió su ficha penitenciaria esa semana y lo humilló frente a los capataces.',
    motiveSummary:
      'Guardaba rencor y sed de venganza tras ser amenazado con exponer su pasado penal.',
    avatarIcon: '39',
    portraitGif: './portraits/39-jacinto.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'sotano',
      forensicTrace: 'ceniza',
      motiveTag: 'venganza',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Conocía los montacargas interiores que conectan la caldera del sótano con el piso noble.',
    },
  },
  {
    id: 'mercedes_costurera',
    number: 40,
    name: 'Mercedes Pardo',
    age: 39,
    gender: 'F',
    category: 'Servicio de la Mansión',
    role: 'Costurera de la casa',
    relation:
      'Modista encargada de arreglos urgentes en las alcobas del ala este.',
    trait:
      'Moño oscuro, anteojos ovalados estrechos calados bajo el puente de la nariz, cinta métrica al cuello, dedal plateado en el dedo corazón derecho y sonrisa astuta.',
    alibiQuote:
      '«Subí al ala este a devolver unos arreglos de terciopelo antes del apagón; por encima de mis gafas veo bastante más de lo que creen los señores.»',
    backstory:
      'Sustraía en secreto retales de seda y encajes antiguos de los baúles familiares para revenderlos en la capital junto a una cómplice del servicio.',
    motiveSummary:
      'Temía que descubrieran su secreto tráfico de encajes y telas de la mansión.',
    avatarIcon: '40',
    portraitGif: './portraits/40-mercedes.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'lentes',
      presenceWing: 'ala_este',
      forensicTrace: 'textil',
      motiveTag: 'secreto',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Abandonó la mesa de costura en el ala este con la excusa de buscar unas tijeras durante el apagón.',
    },
  },
  {
    id: 'anselmo_jardinero',
    number: 41,
    name: 'Anselmo Vidal',
    age: 57,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Jardinero mayor del invernadero',
    relation:
      'Cuidador de las orquídeas que entró dentro del invernadero acristalado de la planta baja conectado al pasillo interior.',
    trait:
      'Gorra de paño plana, delantal gris sobre camisa oscura, tijeras de podar al cinto y manos curtidas.',
    alibiQuote:
      '«Entré al invernadero de la planta baja por el pasillo interior para vigilar la calefacción de las orquídeas; con veinticinco años aquí me echan en enero.»',
    backstory:
      'Dedicó su vida a las plantas exóticas de Villa Acebo, pero Arturo ordenó derribar su vivienda del huerto y prescindir de sus servicios tras el invierno.',
    motiveSummary:
      'Afrontaba el despido inmediato y la pérdida de su huerto tras décadas de servicio.',
    avatarIcon: '41',
    portraitGif: './portraits/41-anselmo.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'zurdo',
      visualMarker: 'tocado',
      presenceWing: 'planta_baja',
      forensicTrace: 'polen',
      motiveTag: 'despido',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Tenía acceso directo desde el invernadero interior hacia los salones de la planta baja.',
    },
  },
  {
    id: 'clara_lozano',
    number: 42,
    name: 'Celia Lozano',
    age: 19,
    gender: 'F',
    category: 'Servicio de la Mansión',
    role: 'Fregaplatos y pinche',
    relation:
      'La empleada más joven de la antecocina en el sótano de Villa Acebo.',
    trait:
      'Trenzas oscuras, pañuelo blanco a la cabeza, delantal gris, manos enrojecidas apretadas con angustia y ojos llorosos.',
    alibiQuote:
      '«Me quedé junto a las pilas del sótano tiritando de miedo cuando se fue la luz; si nos echan de aquí el día uno de enero, mi familia entera va a la calle.»',
    backstory:
      'Hija de aparceros a quienes Arturo ordenó desahuciar en enero mientras amenazaba con despedirla sin referencias si su padre protestaba.',
    motiveSummary:
      'Desesperada por el despido anunciado y el desahucio inminente de sus padres.',
    avatarIcon: '42',
    portraitGif: './portraits/42-clara.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'diestro',
      visualMarker: 'tocado',
      presenceWing: 'sotano',
      forensicTrace: 'harina',
      motiveTag: 'despido',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Nadie vigiló el pasadizo de la antecocina del sótano durante los minutos del apagón.',
    },
  },
  {
    id: 'teodoro_sumiller',
    number: 43,
    name: 'Teodoro Sanz',
    age: 43,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Sumiller y bodeguero',
    relation:
      'Custodio de la cava de vinos en el sótano de Villa Acebo.',
    trait:
      'Cabello oscuro engominado, delantal oscuro de cuero de sumiller, tastevin de plata colgado de una cadena brillante al pecho y mirada fría.',
    alibiQuote:
      '«Bajé a lacrar las barricas de la bodega del sótano después de servir el oporto; las llaves de cava solo las llevo yo y el mayordomo.»',
    backstory:
      'Sustituía desde hacía dos años botellas de cosechas históricas por vinos corrientes para revender los originales en subastas clandestinas.',
    motiveSummary:
      'Necesitaba encubrir la sustracción continuada de reservas históricas antes del inventario navideño.',
    avatarIcon: '43',
    portraitGif: './portraits/43-teodoro.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'joya',
      presenceWing: 'sotano',
      forensicTrace: 'licor',
      motiveTag: 'encubrimiento',
      accessLevel: 'llave_maestra',
      alibiHole:
        'Subió desde el sótano por la escalera de servicio minutos antes de las 23:15 h.',
    },
  },
  {
    id: 'aurelia_lavandera',
    number: 44,
    name: 'Aurelia Prieto',
    age: 47,
    gender: 'NB',
    category: 'Servicio de la Mansión',
    role: 'Jefatura de lavandería',
    relation:
      'Responsable de las calderas de blanqueo y mantelería en el sótano.',
    trait:
      'Cabello oscuro recogido alto, mangas remangadas, delantal blanco sobre brazos recios y mirada acerada.',
    alibiQuote:
      '«Comprobaba los secaderos del sótano cuando faltó la luz; tras cumplir condena en Alcalá, nadie vuelve a pisotearme amenazándome con la calle.»',
    backstory:
      'Persona no binaria exconvicta que cumplió dos años en prisión en su juventud por defender a su hermana; Arturo amenazaba con despedirla tras averiguar su ficha penal.',
    motiveSummary:
      'Temía el despido inmediato tras descubrir Arturo su antigua condena penitenciaria.',
    avatarIcon: '44',
    portraitGif: './portraits/44-aurelia.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'ambidiestro',
      visualMarker: 'ninguno',
      presenceWing: 'sotano',
      forensicTrace: 'textil',
      motiveTag: 'despido',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Abandonó la lavandería del sótano en plena oscuridad bajo pretexto de comprobar los secaderos.',
    },
  },
  {
    id: 'vicente_peon',
    number: 45,
    name: 'Vicente Roldán',
    age: 31,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Peón de reparaciones eléctricas',
    relation:
      'Operario eléctrico que subió al cuadro de fusibles en la zona de la torre minutos antes del apagón.',
    trait:
      'Cabello oscuro, chaqueta con cuello de piel, tizne en ceja y mejilla izquierda, alicates y cables al cinto, lámpara de latón en mano derecha y sonrisa nerviosa.',
    alibiQuote:
      '«Subí al cuadro eléctrico interior junto a la torre cuando empezaron los chispazos; el apagón no fue casualidad si alguien ya me amenazaba por los cables.»',
    backstory:
      'Había cobrado comisiones de proveedores eléctricos por instalar material defectuoso en la mansión, fraude que Arturo acababa de descubrir.',
    motiveSummary:
      'Estaba chantajeado por Arturo a raíz de las facturas fraudulentas del tendido eléctrico.',
    avatarIcon: '45',
    portraitGif: './portraits/45-vicente.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'zurdo',
      visualMarker: 'ninguno',
      presenceWing: 'torre',
      forensicTrace: 'metal',
      motiveTag: 'chantaje',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Subió con su linterna de latón y alicates hacia el cuadro eléctrico de la torre minutos antes del apagón.',
    },
  },
  {
    id: 'manuela_doncella',
    number: 46,
    name: 'Manuela Casas',
    age: 35,
    gender: 'Trans F',
    category: 'Servicio de la Mansión',
    role: 'Doncella de noche',
    relation:
      'Encargada de la guardia nocturna y braseros en los dormitorios del ala oeste.',
    trait:
      'Moño bajo oscuro, blusa oscura sobria, sosteniendo una palmatoria de latón encendida con ambas manos y sonrisa melancólica.',
    alibiQuote:
      '«Recorría el corredor del ala oeste con mi palmatoria encendida cuando fallaron las bombillas; nadie se fija en una doncella con una vela en la mano.»',
    backstory:
      'Mujer trans que encontró refugio discreto en el servicio nocturno de Villa Acebo; Arturo conservaba cartas interceptadas que comprometían su identidad.',
    motiveSummary:
      'Necesitaba proteger el secreto de su identidad frente a la amenaza de expulsión.',
    avatarIcon: '46',
    portraitGif: './portraits/46-manuela.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'ala_oeste',
      forensicTrace: 'cera',
      motiveTag: 'secreto',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Recorría los cuartos superiores del ala oeste con su palmatoria encendida sin testigos en cada tramo.',
    },
  },
  {
    id: 'patricio_portero',
    number: 47,
    name: 'Patricio Muro',
    age: 53,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Portero de noche',
    relation:
      'Vigilante que cerró el portón norte y patrulló el vestíbulo de la planta baja durante la tormenta.',
    trait:
      'Barba espesa, capote verde encapuchado salpicado de nieve en los hombros, silbato en mano derecha y vara de madera en la izquierda.',
    alibiQuote:
      '«Entré al vestíbulo de la planta baja sacudiéndome la nieve tras echar los cerrojos; Arturo me acusó de robos en las cuadras para echarme sin paga.»',
    backstory:
      'Veinte años custodiando los portones hasta que Arturo lo responsabilizó injustamente de sustracciones menores para rescindir su contrato tras Navidad.',
    motiveSummary:
      'Afrontaba el despido injusto con acusación falsa de robo al concluir las fiestas.',
    avatarIcon: '47',
    portraitGif: './portraits/47-patricio.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'vello_facial',
      presenceWing: 'planta_baja',
      forensicTrace: 'tabaco',
      motiveTag: 'despido',
      accessLevel: 'llave_maestra',
      alibiHole:
        'Tenía llaves de toda la planta baja y patrulló solo el vestíbulo interior tras trancar el portón.',
    },
  },
  {
    id: 'eulalia_repostera',
    number: 48,
    name: 'Eulalia Ramos',
    age: 60,
    gender: 'F',
    category: 'Servicio de la Mansión',
    role: 'Repostera de gala',
    relation:
      'Confitera mayor en la cocina del sótano de Villa Acebo.',
    trait:
      'Moño plateado, gafas redondas de alambre, manos crispadas sobre el pecho, expresión aterrorizada y grandes manchas oscuras rojizas sobre el delantal enharinado.',
    alibiQuote:
      '«¡Es glaseado de frutos rojos y harina, señor inspector, lo juro! Me quedé helada de terror en el sótano al oír pasos furiosos en la escalera antes de medianoche.»',
    backstory:
      'Sus manos manchadas y su espanto responden a las amenazas constantes de Arturo sobre el pagaré hipotecario de su hija viuda.',
    motiveSummary:
      'Arturo la chantajeaba con ejecutar la deuda hipotecaria de su hija viuda si no guardaba silencio.',
    avatarIcon: '48',
    portraitGif: './portraits/48-eulalia.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'lentes',
      presenceWing: 'sotano',
      forensicTrace: 'harina',
      motiveTag: 'chantaje',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Su rostro aterrorizado y las manchas rojizas en el delantal delatan un incidente ocurrido en el sótano antes del hallazgo.',
    },
  },
  {
    id: 'fernando_barman',
    number: 49,
    name: 'Fernando Blasco',
    age: 29,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Camarero del salón de billar',
    relation:
      'Encargado de la barra de licores en los salones recreativos de la planta baja.',
    trait:
      'Cabello engominado impecable, chaqueta blanca de camarero, pajarita burdeos ajustada al cuello y media sonrisa cortés.',
    alibiQuote:
      '«Atendía la barra de la planta baja; solo me ausenté unos minutos para reponer hielo cuando los caballeros discutían en la oscuridad.»',
    backstory:
      'Contrajo deudas clandestinas de apuestas deportivas y temía la auditoría del inventario de licores tras haber vendido botellas de reserva.',
    motiveSummary:
      'Estaba acorralado por deudas de apuestas que lo obligaron a sustraer botellas de la casa.',
    avatarIcon: '49',
    portraitGif: './portraits/49-fernando.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'ambidiestro',
      visualMarker: 'ninguno',
      presenceWing: 'planta_baja',
      forensicTrace: 'licor',
      motiveTag: 'deuda',
      accessLevel: 'servicio_interior',
      alibiHole:
        'El rincón de la barra en la planta baja quedó desatendido durante diez minutos en pleno apagón.',
    },
  },
  {
    id: 'silvia_marin',
    number: 50,
    name: 'Silvia Marín',
    age: 19,
    gender: 'F',
    category: 'Servicio de la Mansión',
    role: 'Camarera de salón',
    relation:
      'Hermana gemela de Sonia Marín; servía copas entre los salones de la planta baja cuando se fue la luz.',
    trait:
      'Gafas redondas con cristal izquierdo astillado, hematoma morado en la mejilla derecha, hemorragia nasal fresca, manchas de sangre en el tirante izquierdo del delantal y manos desnudas sin guantes sosteniendo su bandeja con gesto traumatizado.',
    alibiQuote:
      '«Alguien me empujó con violencia en el pasillo oscuro de la planta baja y me rompió las gafas contra el zócalo... Apenas pude sujetar la bandeja con mis manos desnudas.»',
    backstory:
      'Huérfana criada bajo tutela explotadora de la finca y hermana gemela de Sonia; intentaba ocultar un altercado ocurrido minutos antes del hallazgo del cuerpo.',
    motiveSummary:
      'Buscaba encubrir el forcejeo sufrido a oscuras y escapar de los abusos sufridos en la mansión.',
    avatarIcon: '50',
    portraitGif: './portraits/50-silvia.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'diestro',
      visualMarker: 'lentes',
      presenceWing: 'planta_baja',
      forensicTrace: 'textil',
      motiveTag: 'encubrimiento',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Las gafas rotas, el hematoma y la sangre fresca prueban que forcejeó con alguien en la planta baja instantes antes del crimen.',
    },
  },
  {
    id: 'sofia_marin',
    number: 51,
    name: 'Sonia Marín',
    age: 19,
    gender: 'F',
    category: 'Servicio de la Mansión',
    role: 'Camarera de planta alta',
    relation:
      'Hermana gemela de Silvia Marín; servía en el corredor del ala oeste la noche de autos.',
    trait:
      'Gafas redondas intactas, ojos pálidos y velados por una opacidad glaucomatosa, arañazos en mejilla izquierda y cuello, mano derecha ensangrentada sobre la bandeja plateada y una sonrisa amplia y helada.',
    alibiQuote:
      '«Subí al corredor del ala oeste tras caer la noche; cuando una crece entre cenizas de hospicio y servidumbre sin fin, aprende a sonreír aunque le tiemblen las manos manchadas.»',
    backstory:
      'Sobreviviente de un incendio en el hospicio financiado por los Valdemar que dejó secuelas en su vista; tras años de servidumbre forzada, acumuló un resentimiento profundo contra Arturo.',
    motiveSummary:
      'Buscaba venganza por el incendio encubierto del hospicio y años de explotación impune.',
    avatarIcon: '51',
    portraitGif: './portraits/51-sofia.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'zurdo',
      visualMarker: 'lentes',
      presenceWing: 'ala_oeste',
      forensicTrace: 'metal',
      motiveTag: 'venganza',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Deambulaba sola por el ala oeste al volver la luz con arañazos recientes y la mano derecha ensangrentada.',
    },
  },
  {
    id: 'benjamin_lampista',
    number: 52,
    name: 'Benjamín Cruz',
    age: 37,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Lampista y fontanero',
    relation:
      'Oficial de mantenimiento que trabajaba en las válvulas de vapor interiores del sótano.',
    trait:
      'Cabello oscuro, tizne y grasa en ceja y mejilla izquierda, camisa oscura de faena y llave inglesa Stillson colgada al cinto.',
    alibiQuote:
      '«Reparaba las tuberías interiores del sótano cuando saltó la luz; quien purgó cárcel por la huelga del 17 sabe cómo golpear una cañería sin hacer ruido.»',
    backstory:
      'Exconvicto sindicalista condenado tras la huelga de 1917; Arturo conoció su expediente y lo obligaba a trabajar jornadas abusivas bajo amenaza de delación.',
    motiveSummary:
      'Juró venganza tras años de explotación y humillaciones amparadas en su pasado sindical.',
    avatarIcon: '52',
    portraitGif: './portraits/52-benjamin.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'sotano',
      forensicTrace: 'grasa',
      motiveTag: 'venganza',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Trabajaba en las cañerías del sótano con su llave Stillson y podía subir por los conductos de servicio.',
    },
  },
  {
    id: 'rosario_platera',
    number: 53,
    name: 'Rosario Peña',
    age: 51,
    gender: 'F',
    category: 'Servicio de la Mansión',
    role: 'Limpiadora de platería y vajilla',
    relation:
      'Encargada de la cubertería que llevó candelabros hacia el ala este durante el apagón.',
    trait:
      'Cabello gris recogido bajo pañuelo oscuro, delantal gris y candelabro de plata de tres brazos sostenido con gesto preocupado.',
    alibiQuote:
      '«Llevaba el candelabro encendido por el pasillo del ala este justo antes de los gritos; me iban a despedir por unas piezas de plata que empeñé por necesidad.»',
    backstory:
      'Empeñó dos cubiertos menores para comprar medicinas y temía ser despedida e incriminada en el inventario navideño de platería.',
    motiveSummary:
      'Temía el despido inmediato y denuncia por las piezas de plata faltantes en el ajuar.',
    avatarIcon: '53',
    portraitGif: './portraits/53-rosario.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'zurdo',
      visualMarker: 'tocado',
      presenceWing: 'ala_este',
      forensicTrace: 'cera',
      motiveTag: 'despido',
      accessLevel: 'servicio_interior',
      alibiHole:
        'Llevaba un candelabro de tres brazos encendido por el ala este justo a la hora del crimen.',
    },
  },
  {
    id: 'cristobal_guarda',
    number: 54,
    name: 'Cristóbal Luque',
    age: 49,
    gender: 'M',
    category: 'Servicio de la Mansión',
    role: 'Guarda de montería',
    relation:
      'Guarda del coto que entregó piezas de caza y quedó alojado en el ala este junto a la armería interior.',
    trait:
      'Barba recortada, pelliza clara de caza con ribete de borrego, correa cruzada al pecho y mirada recelosa.',
    alibiQuote:
      '«Subí venado para la cena antes de la nevada y aguardé en el ala este junto a los armarios de caza; Arturo guardaba pruebas de mis disparos en coto vedado.»',
    backstory:
      'Tras un incidente armado en las lindes meses atrás, Arturo conservaba el parte secreto para chantajearlo y forzar su silencio.',
    motiveSummary:
      'Estaba sometido a chantaje por un tiroteo furtivo encubierto en el coto familiar.',
    avatarIcon: '54',
    portraitGif: './portraits/54-cristobal.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'vello_facial',
      presenceWing: 'ala_este',
      forensicTrace: 'metal',
      motiveTag: 'chantaje',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Acudió a la mansión con el parte de caza y aguardó sin vigilancia junto a la armería del ala este.',
    },
  },

  // ========================================================
  // GRUPO 4: HABITANTES DEL VALLE Y COMARCA (20 Sospechosos)
  // ========================================================
  {
    id: 'roman_guardia',
    number: 55,
    name: 'Sargento Román Díaz',
    age: 52,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Sargento de la Guardia Civil',
    relation:
      'Comandante comarcal que ascendió a Villa Acebo a las 19:30 h por aviso de amenazas y quedó aislado en la planta baja.',
    trait:
      'Bigote entrecano engominado, tricornio negro de charol reluciente, capote azul oscuro con vueltas rojas y mirada severa.',
    alibiQuote:
      '«Subí a la mansión antes de que el alud cerrara el puerto y me aposté en la planta baja; ningún agente permanece quieto si sospecha que alguien va a hablar de más.»',
    backstory:
      'Aceptó sobornos periódicos de Arturo para archivar denuncias laborales y forestales en el cuartelillo, expediente que amenazaba con salir en el testamento.',
    motiveSummary:
      'Necesitaba encubrir los expedientes de soborno archivados a favor de Arturo.',
    avatarIcon: '55',
    portraitGif: './portraits/55-roman.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'vello_facial',
      presenceWing: 'planta_baja',
      forensicTrace: 'metal',
      motiveTag: 'encubrimiento',
      accessLevel: 'llave_maestra',
      alibiHole:
        'Aislado dentro de Villa Acebo desde las 20:00 h como enlace de seguridad; se ausentó del salón diez minutos.',
    },
  },
  {
    id: 'hector_cabo',
    number: 56,
    name: 'Cabo Héctor Maroto',
    age: 34,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Cabo de la Benemérita',
    relation:
      'Segundo mando que escoltó al sargento hasta Villa Acebo antes del temporal y vigilaba la planta baja.',
    trait:
      'Gorra de cuartel reglamentaria, abrigo pesado con correajes apretados con ambos puños y rostro curtido y tenso.',
    alibiQuote:
      '«Escolté al sargento hasta el vestíbulo de la planta baja antes del cierre del camino; me separé unos minutos para revisar los postigos tras el apagón.»',
    backstory:
      'Había encubierto irregularidades en multas comarcales bajo presión de Arturo y temía que la revisión testamentaria expusiera su complicidad.',
    motiveSummary:
      'Buscaba encubrir irregularidades de servicio cometidas bajo coacción de los Valdemar.',
    avatarIcon: '56',
    portraitGif: './portraits/56-hector.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'diestro',
      visualMarker: 'tocado',
      presenceWing: 'planta_baja',
      forensicTrace: 'metal',
      motiveTag: 'encubrimiento',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Se separó del sargento en la planta baja para inspeccionar pasillos sin testigo durante el apagón.',
    },
  },
  {
    id: 'melchor_boticario',
    number: 57,
    name: 'Don Melchor Saavedra',
    age: 67,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Boticario titular del pueblo',
    relation:
      'Farmacéutico llamado a Villa Acebo por un cólico urgente y alojado en el ala este tras cerrarse el paso.',
    trait:
      'Cabello blanco, levita oscura de boticario, frasco de vidrio en el bolsillo izquierdo, quevedos con cordón negro a la derecha y expresión sombría.',
    alibiQuote:
      '«Acudí al ala este con el elixir cardíaco antes del temporal y me quedé incomunicado; mi botiquín guarda sustancias cuyos pagos me tenían acorralado.»',
    backstory:
      'Despachó compuestos restringidos fiados a crédito por la financiera de Arturo, cuyas letras vencidas amenazaban con clausurar su botica.',
    motiveSummary:
      'Estaba asfixiado por deudas farmacéuticas contraídas con la financiera de Arturo.',
    avatarIcon: '57',
    portraitGif: './portraits/57-melchor.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'lentes',
      presenceWing: 'ala_este',
      forensicTrace: 'quimicos',
      motiveTag: 'deuda',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Quedó solo en el ala este con su maletín farmacéutico repleto de compuestos fulminantes.',
    },
  },
  {
    id: 'casimiro_lenador',
    number: 58,
    name: 'Casimiro "El Viejo"',
    age: 71,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Leñador del paso alto',
    relation:
      'Leñador que descargó troncos de encina antes del anochecer y pernoctó en la leñera del sótano.',
    trait:
      'Larga barba blanca fluvial, abrigo forrado de piel, hacha vizcaína apoyada al hombro derecho y ceño feroz.',
    alibiQuote:
      '«Descargué la leña y me refugié en la carbonera del sótano cuando cerró la ventisca; subí un momento a buscar agua sin imaginar lo que ocultaban arriba.»',
    backstory:
      'Arturo le arrebató los derechos comunales de tala que habían alimentado a tres generaciones de su familia en el valle.',
    motiveSummary:
      'Albergaba un odio antiguo y sed de venganza por el robo de los montes comunales.',
    avatarIcon: '58',
    portraitGif: './portraits/58-casimiro.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'vello_facial',
      presenceWing: 'sotano',
      forensicTrace: 'ceniza',
      motiveTag: 'venganza',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Alojado en la leñera del sótano tras entregar carga; subió durante el apagón alegando buscar agua.',
    },
  },
  {
    id: 'nicanor_herrero',
    number: 59,
    name: 'Nicanor Fuentes',
    age: 44,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Herrero de la fragua',
    relation:
      'Maestro forjador llamado a reparar herrajes forzados en el sótano de la mansión y atrapado por la nieve.',
    trait:
      'Barba oscura espesa, mandil grueso de cuero, martillo de forja en la mano izquierda y mirada severa e imponente.',
    alibiQuote:
      '«Vine a ajustar las rejas interiores del sótano antes de la tormenta; Arturo me exigía el embargo de la fragua si no le entregaba copias de todas las llaves.»',
    backstory:
      'Fabricó las cerraduras originales de Villa Acebo, pero los atrasos en el préstamo de su fragua pusieron su taller al borde de la subasta.',
    motiveSummary:
      'Quería evitar la ejecución de sus deudas y el embargo inmediato de su herrería.',
    avatarIcon: '59',
    portraitGif: './portraits/59-nicanor.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'zurdo',
      visualMarker: 'vello_facial',
      presenceWing: 'sotano',
      forensicTrace: 'ceniza',
      motiveTag: 'deuda',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Reparaba herrajes en el sótano y conocía al detalle la mecánica de las llaves maestras de la casa.',
    },
  },
  {
    id: 'isidro_telegrafista',
    number: 60,
    name: 'Isidro Ballester',
    age: 38,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Telegrafista de la estación',
    relation:
      'Operador que subió a entregar despachos cifrados antes de caer las líneas y quedó aislado en la torre.',
    trait:
      'Cabello oscuro, visera verde translúcida de celuloide, manguitos negros en los brazos, dedos manchados de tinta y mirada tensa.',
    alibiQuote:
      '«Subí hasta el despacho de la torre para entregar los telegramas cifrados y revisar el tendido antes de que se partiera; conocía los secretos que Arturo recibía por Morse.»',
    backstory:
      'Interceptó despachos cifrados que revelaban quiebras ocultas de Arturo y temía represalias por haber copiado parte de las cintas telegráficas.',
    motiveSummary:
      'Necesitaba proteger el secreto de las cintas telegráficas cifradas interceptadas.',
    avatarIcon: '60',
    portraitGif: './portraits/60-isidro.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'ambidiestro',
      visualMarker: 'tocado',
      presenceWing: 'torre',
      forensicTrace: 'tinta',
      motiveTag: 'secreto',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Subió con su visera verde a la torre para entregar despachos urgentes y comprobar la línea caída.',
    },
  },
  {
    id: 'agueda_posadera',
    number: 61,
    name: 'Doña Águeda Valls',
    age: 64,
    gender: 'F',
    category: 'Habitantes del Valle',
    role: 'Posadera del mesón "La Nevisca"',
    relation:
      'Posadera que subió provisiones festivas tras hundirse parte de su tejado y quedó acogida en el sótano.',
    trait:
      'Moño gris, mantón tejido sobre delantal, llavero de bronce en la cadera izquierda, cucharón de madera en mano derecha y mirada astuta.',
    alibiQuote:
      '«Traje las ollas y provisiones hasta las cocinas del sótano antes del alud; conozco esta casa desde joven y Arturo pretendía comprarme el mesón por cuatro perras.»',
    backstory:
      'Arturo acaparó los pagarés de reconstrucción de su posada para forzarla a venderle la única fonda del valle a precio de ruina.',
    motiveSummary:
      'Luchaba por salvar su posada de las deudas acumuladas ante el acoso de Arturo.',
    avatarIcon: '61',
    portraitGif: './portraits/61-agueda.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'sotano',
      forensicTrace: 'licor',
      motiveTag: 'deuda',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Alojada en la cocina del sótano tras traer provisiones; conocía la distribución de toda la mansión.',
    },
  },
  {
    id: 'mauro_cartero',
    number: 62,
    name: 'Mauro Cifuentes',
    age: 29,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Mozo del correo y telégrafos',
    relation:
      'Cartero retenido en el vestíbulo de la planta baja esperando que Arturo firmara pliegos certificados.',
    trait:
      'Gorra de correo, esclavina impermeable cubierta de nieve, cartera postal con escudo real y gesto ansioso.',
    alibiQuote:
      '«Arturo me retuvo en la planta baja esperando sus cartas certificadas hasta que el puerto cerró; guardaba pruebas de un giro postal extraviado meses atrás.»',
    backstory:
      'Un giro postal perdido en verano cayó en manos de Arturo, quien utilizaba ese recibo para obligar al joven cartero a entregarle correspondencia ajena.',
    motiveSummary:
      'Sufría chantaje directo por una carta certificada y un giro extraviado meses atrás.',
    avatarIcon: '62',
    portraitGif: './portraits/62-mauro.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'diestro',
      visualMarker: 'tocado',
      presenceWing: 'planta_baja',
      forensicTrace: 'tinta',
      motiveTag: 'chantaje',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Esperó solo en el vestíbulo de la planta baja con su cartera postal a que Arturo firmara un certificado.',
    },
  },
  {
    id: 'faustino_maderero',
    number: 63,
    name: 'Faustino Barba',
    age: 56,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Transportista de carretas',
    relation:
      'Carretero cuyo eje se quebró tras descargar carbón en la mansión, quedando acogido en el sótano.',
    trait:
      'Barba incipiente entrecana, pelliza de oveja, bufanda oscura, vara de madera de fresno en mano izquierda y mirada fatigada.',
    alibiQuote:
      '«Tras quebrarse el eje cerca de la verja me acogieron en las carboneras del sótano; los aranceles de Arturo en el camino me tienen ahogado en deudas.»',
    backstory:
      'Transportaba leña y carbón para la casa, pero las tarifas abusivas de paso impuestas por Arturo lo habían llevado a la ruina total.',
    motiveSummary:
      'Estaba arruinado por los préstamos de acarreo y tarifas exigidas por Arturo.',
    avatarIcon: '63',
    portraitGif: './portraits/63-faustino.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'vello_facial',
      presenceWing: 'sotano',
      forensicTrace: 'grasa',
      motiveTag: 'deuda',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Acogido en el sótano tras volcar su carro en el acceso de descarga del subsuelo.',
    },
  },
  {
    id: 'severino_cochero',
    number: 64,
    name: 'Severino Ponce',
    age: 61,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Conductor de la diligencia postal',
    relation:
      'Cochero que subió a los últimos invitados y quedó resguardado en los pasillos de servicio de la planta baja.',
    trait:
      'Patillas blancas, gorra plana, abrigo de cochero con esclavina, manta escocesa sobre el brazo izquierdo y rostro cansado.',
    alibiQuote:
      '«Me sequé la manta escocesa en el pasillo inferior de la planta baja tras dejar a los invitados; Arturo mató a mi hijo en las obras del camino y encima me quitaba la ruta.»',
    backstory:
      'Perdió a su único hijo en un derrumbe de la carretera privada de Arturo sin indemnización alguna, mientras este tramitaba la retirada de su licencia.',
    motiveSummary:
      'Arrastraba una sed de venganza por la muerte impune de su hijo en las obras de la finca.',
    avatarIcon: '64',
    portraitGif: './portraits/64-severino.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'zurdo',
      visualMarker: 'tocado',
      presenceWing: 'planta_baja',
      forensicTrace: 'licor',
      motiveTag: 'venganza',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Aguardó en el pasillo inferior de la planta baja bebiendo de su petaca sin vigilancia desde las 22:30 h.',
    },
  },
  {
    id: 'gregoria_panadera',
    number: 65,
    name: 'Gregoria Calvo',
    age: 59,
    gender: 'F',
    category: 'Habitantes del Valle',
    role: 'Panadera del horno de leña',
    relation:
      'Tahonera contratada para hornear panes festivos en los hornos auxiliares del sótano de Villa Acebo.',
    trait:
      'Pañuelo blanco anudado a la cabeza, delantal enharinado, pala de madera de horno cruzada al pecho y gesto desafiante.',
    alibiQuote:
      '«Me trajeron a hornear en los hornos bajos del sótano cuando la nieve cerró la vuelta; Arturo ejecutaba el embargo de mi tahona comunal el primer día de enero.»',
    backstory:
      'Sostenía el único horno de pan del pueblo hasta que Arturo compró la hipoteca municipal para desahuciarla por atrasos.',
    motiveSummary:
      'Quería frenar la ejecución de deudas que cerraba su horno comunal en enero.',
    avatarIcon: '65',
    portraitGif: './portraits/65-gregoria.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'tocado',
      presenceWing: 'sotano',
      forensicTrace: 'harina',
      motiveTag: 'deuda',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Salió de los hornos del sótano durante el apagón alegando ir en busca de leña seca.',
    },
  },
  {
    id: 'herminio_caminero',
    number: 66,
    name: 'Herminio Soria',
    age: 47,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Caminero del puerto de montaña',
    relation:
      'Peón caminero refugiado en el corredor del ala oeste tras quedar sepultada su casilla del puerto.',
    trait:
      'Barba gris escarchada, gorro invernal con orejeras de piel, abrigo grueso, guantes de invierno, farol rojo encendido en la mano derecha y ojos alarmados.',
    alibiQuote:
      '«Me refugié en el corredor del ala oeste tras avisar del corte del camino; esta mirada espantada es de quien vio algo terrible en la oscuridad del pasillo.»',
    backstory:
      'Culpaba directamente a Arturo del cierre arbitrario de los refugios vecinales del paso alto, negligencia que costó la vida a su hermano la nevada anterior.',
    motiveSummary:
      'Buscaba venganza por el cierre criminal de los pasos vecinales que costó la vida a su hermano.',
    avatarIcon: '66',
    portraitGif: './portraits/66-herminio.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'guantes',
      presenceWing: 'ala_oeste',
      forensicTrace: 'ceniza',
      motiveTag: 'venganza',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Subió a secarse al corredor del ala oeste y su mirada espantada responde a lo que presenció en la penumbra.',
    },
  },
  {
    id: 'baltasar_cazador',
    number: 67,
    name: 'Baltasar Luengo',
    age: 35,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Cazador y trampero de la sierra',
    relation:
      'Exconvicto retenido dentro del ala este de Villa Acebo tras ser sorprendido cerca de la cerca antes del alud.',
    trait:
      'Rostro rasurado con sonrisa burlona, gorro de piel de raposo con orejeras, abrigo de cuero y cuchillo con mango de asta de ciervo en funda sobre el pecho.',
    alibiQuote:
      '«Me encerraron bajo techo cerca del ala este por cazar donde el cacique decía que mandaba él; tres inviernos en la cárcel no se olvidan en Nochebuena.»',
    backstory:
      'Purgó tres inviernos en prisión por furtivismo y contrabando tras una denuncia personal de Arturo, jurando ajustarle cuentas al recuperar la libertad.',
    motiveSummary:
      'Guardaba odio y sed de venganza tras tres inviernos de prisión por denuncia de Arturo.',
    avatarIcon: '67',
    portraitGif: './portraits/67-baltasar.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'zurdo',
      visualMarker: 'tocado',
      presenceWing: 'ala_este',
      forensicTrace: 'metal',
      motiveTag: 'venganza',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Retenido bajo techo en la mansión durante el temporal; burló la vigilancia interior en el ala este durante el apagón.',
    },
  },
  {
    id: 'enriqueta_maestra',
    number: 68,
    name: 'Enriqueta Rivas',
    age: 50,
    gender: 'F',
    category: 'Habitantes del Valle',
    role: 'Maestra de la escuela parroquial',
    relation:
      'Docente citada en el salón de estudio del ala este para revisar actas escolares y donaciones navideñas.',
    trait:
      'Moño entrecano, quevedos con cadenilla fina a la derecha, blusa alta de puntilla, puntero de madera en mano derecha y mirada dolida.',
    alibiQuote:
      '«Aguardaba en el salón de estudio del ala este con las actas escolares; Arturo descubrió un viejo secreto familiar de mi hermano y amenazó con cerrar mi escuela.»',
    backstory:
      'Hermana del boticario Don Melchor; luchó durante veinte años por sostener la escuela rural mientras Arturo ocultaba documentos comprometedores de la fundación local.',
    motiveSummary:
      'Temía la clausura de su escuela y la revelación de un secreto familiar custodiado por Arturo.',
    avatarIcon: '68',
    portraitGif: './portraits/68-enriqueta.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'diestro',
      visualMarker: 'lentes',
      presenceWing: 'ala_este',
      forensicTrace: 'tinta',
      motiveTag: 'secreto',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Buscó a Arturo en privado en el ala este antes de la cena y permaneció sin testigo tras el corte de luz.',
    },
  },
  {
    id: 'silvestre_sacristan',
    number: 69,
    name: 'Silvestre Royo',
    age: 63,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Sacristán y campanero',
    relation:
      'Sacristán que acompañó al Padre Tomás con los ornamentos sagrados y subió hacia la torre antes del temporal.',
    trait:
      'Cabello blanco escaso, abrigo oscuro sobre jersey grueso de lana acanalada sin sotana, silbato metálico colgado de un cordón, bastón en la mano derecha y aspecto frágil.',
    alibiQuote:
      '«Traje los cirios para la misa privada y subí hacia la torre y la capilla alta; llevo cuarenta años callando lo que Arturo robó a nuestra parroquia.»',
    backstory:
      'Ayudante fiel del Padre Tomás que conoció el expolio del cáliz parroquial y temía que Arturo destruyera cualquier prueba antes de restituirlo.',
    motiveSummary:
      'Custodiaba en silencio el secreto del expolio sacro perpetrado por Arturo.',
    avatarIcon: '69',
    portraitGif: './portraits/69-silvestre.png',
    attributes: {
      ageGroup: 'veterano',
      handedness: 'diestro',
      visualMarker: 'ninguno',
      presenceWing: 'torre',
      forensicTrace: 'cera',
      motiveTag: 'secreto',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Deambuló solo entre la capilla superior y las escaleras de la torre llevando cirios y un silbato.',
    },
  },
  {
    id: 'amparo_hilandera',
    number: 70,
    name: 'Amparo Godoy',
    age: 42,
    gender: 'F',
    category: 'Habitantes del Valle',
    role: 'Hilandera del molino fluvial',
    relation:
      'Artesana que entregó mantelería teñida en añil y quedó resguardada junto al cuarto de lencería del ala oeste.',
    trait:
      'Pañuelo negro atado bajo la barbilla, chal oscuro, huso de madera y ambas manos profundamente teñidas de añil oscuro con gesto suplicante.',
    alibiQuote:
      '«Entregué los paños teñidos y me acogieron en la lencería del ala oeste; Arturo desvió el agua de mi batán para ahogarme en deudas.»',
    backstory:
      'Tras desviar Arturo el caudal que movía su molino fluvial, quedó endeudada sin remedio y subió a Villa Acebo suplicando una prórroga de renta.',
    motiveSummary:
      'Estaba acorralada por las deudas de su molino y la pérdida del caudal de agua.',
    avatarIcon: '70',
    portraitGif: './portraits/70-amparo.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'ambidiestro',
      visualMarker: 'tocado',
      presenceWing: 'ala_oeste',
      forensicTrace: 'textil',
      motiveTag: 'deuda',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Quedó resguardada junto a la lencería del ala oeste y subió ropa blanca sin vigilancia durante el apagón.',
    },
  },
  {
    id: 'celso_ayudante',
    number: 71,
    name: 'Celso Palomar',
    age: 30,
    gender: 'Trans M',
    category: 'Habitantes del Valle',
    role: 'Oficial de la herrería',
    relation:
      'Oficial que acompañó a Nicanor a reparar fallebas y quedó atrapado en los pasillos del sótano.',
    trait:
      'Cabello oscuro revuelto, mandil grueso de herrero, mancha de hollín en la mejilla derecha, corte rojo reciente en el antebrazo derecho y martillo empuñado en la mano derecha.',
    alibiQuote:
      '«Bajé al sótano tras ajustar las fallebas con mi maestro Nicanor; este corte reciente en mi antebrazo derecho me lo hice con un herraje roto antes del apagón.»',
    backstory:
      'Hombre trans forjado en el oficio de herrería; sufría deudas médicas tras un accidente laboral que Arturo se negó a cubrir y amenazas sobre su identidad.',
    motiveSummary:
      'Arruinado por deudas médicas tras una lesión sin indemnizar y presionado por su pasado.',
    avatarIcon: '71',
    portraitGif: './portraits/71-celso.png',
    attributes: {
      ageGroup: 'joven',
      handedness: 'diestro',
      visualMarker: 'cicatriz',
      presenceWing: 'sotano',
      forensicTrace: 'ceniza',
      motiveTag: 'deuda',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Conocía todas las fallebas de la casa y se movió entre el sótano y las escaleras de servicio durante la tormenta.',
    },
  },
  {
    id: 'damian_aserrador',
    number: 72,
    name: 'Damián Carpio',
    age: 55,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Capataz del aserradero',
    relation:
      'Exconvicto y capataz que trajo vigas de refuerzo al sótano de Villa Acebo y discutió su jornal antes de la cena.',
    trait:
      'Cabello entrecano, camisa a cuadros bajo chaleco de faena claro, mano izquierda intacta apoyada en el cinturón y ceño duro.',
    alibiQuote:
      '«Traje las vigas al sótano antes del temporal; Arturo me amenazó con despedirme del aserradero sin liquidación tras descubrir mi condena antigua.»',
    backstory:
      'Exrecluso rehabilitado en el aserradero comarcal a quien Arturo amenazó con despedir de forma fulminante y embargar tras una agria discusión por jornales.',
    motiveSummary:
      'Afrontaba el despido fulminante y la pérdida del único sustento tras su rehabilitación.',
    avatarIcon: '72',
    portraitGif: './portraits/72-damian.png',
    attributes: {
      ageGroup: 'maduro',
      handedness: 'zurdo',
      visualMarker: 'ninguno',
      presenceWing: 'sotano',
      forensicTrace: 'ceniza',
      motiveTag: 'despido',
      accessLevel: 'paso_restringido',
      alibiHole:
        'Permaneció sin vigilancia cerca de las bodegas del sótano tras discutir su jornal con Arturo esa tarde.',
    },
  },
  {
    id: 'virginia_tabernera',
    number: 73,
    name: 'Virginia Solís',
    age: 36,
    gender: 'F',
    category: 'Habitantes del Valle',
    role: 'Tabernera de la estación',
    relation:
      'Prima de Aurelia que subió vino especiado antes de quedar varado el tren y permaneció en los salones de la planta baja.',
    trait:
      'Trenza cobriza recogida con peineta ornamental, mantón sobre delantal estampado, copa de vino tinto en la mano derecha y sonrisa cálida y perspicaz.',
    alibiQuote:
      '«Subí vino especiado y caldos calientes para el banquete en la planta baja; Arturo me exige atrasos imposibles para no clausurar la cantina del apeadero.»',
    backstory:
      'Sostenía con esfuerzo la cantina de la estación, cuya concesión dependía de alquileres e intereses que Arturo amenazaba con ejecutar en enero.',
    motiveSummary:
      'Acorralada por deudas de renta que amenazaban con clausurar su cantina ferroviaria.',
    avatarIcon: '73',
    portraitGif: './portraits/73-virginia.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'ambidiestro',
      visualMarker: 'tocado',
      presenceWing: 'planta_baja',
      forensicTrace: 'licor',
      motiveTag: 'deuda',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Llevó copas calientes por los salones de la planta baja sin coartada fija entre las 23:00 y las 23:20 h.',
    },
  },
  {
    id: 'roque_veterinario',
    number: 74,
    name: 'Roque Menéndez',
    age: 48,
    gender: 'M',
    category: 'Habitantes del Valle',
    role: 'Veterinario comarcal',
    relation:
      'Albeytar llamado de urgencia por una yegua herida y alojado después en el corredor del ala oeste con su maletín.',
    trait:
      'Barba entrecana recortada, gabardina verde oliva, maletín de cuero marrón con fórceps metálicos asomando, mancha oscura en el puño izquierdo y gesto cansado.',
    alibiQuote:
      '«Vine por la yegua herida y me dieron cuarto en el ala oeste; mi maletín lleva lancetas y el hombre que me obligaba a falsear certificados murió esta noche.»',
    backstory:
      'Arturo lo obligaba a firmar certificados veterinarios falsos para vender ganado enfermo de la finca y guardaba los originales para hundir su oficio.',
    motiveSummary:
      'Necesitaba proteger el secreto de los certificados veterinarios falsificados bajo presión.',
    avatarIcon: '74',
    portraitGif: './portraits/74-roque.png',
    attributes: {
      ageGroup: 'adulto',
      handedness: 'diestro',
      visualMarker: 'vello_facial',
      presenceWing: 'ala_oeste',
      forensicTrace: 'quimicos',
      motiveTag: 'secreto',
      accessLevel: 'invitado_libre',
      alibiHole:
        'Alojado en el corredor del ala oeste con su maletín veterinario repleto de lancetas sin inventariar.',
    },
  },
];
