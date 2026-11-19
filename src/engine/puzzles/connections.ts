import type { ConnectionsConfig, ConnectionsGroup } from '../../types/game';
import { deriveSeed, mulberry32 } from './prng';

const CONNECTIONS_BANKS: readonly {
  secretMeaning: string;
  groups: [ConnectionsGroup, ConnectionsGroup, ConnectionsGroup, ConnectionsGroup];
}[] = [
  {
    secretMeaning: 'Cuatro ejes de clasificación de pruebas en Villa Acebo',
    groups: [
      {
        id: 'g-venenos',
        category: 'Sustancias tóxicas de la botica',
        difficulty: 1,
        items: ['Digitalina', 'Cianuro', 'Acónito', 'Belladona'],
      },
      {
        id: 'g-estancias',
        category: 'Estancias del sótano y servicio',
        difficulty: 2,
        items: ['Bodega', 'Cocina', 'Calderas', 'Despensa'],
      },
      {
        id: 'g-rastros',
        category: 'Rastros hallados bajo el microscopio',
        difficulty: 3,
        items: ['Ceniza', 'Polen', 'Tinta', 'Cera'],
      },
      {
        id: 'g-cierres',
        category: 'Sistemas de cierre de la mansión',
        difficulty: 4,
        items: ['Pestillo', 'Cerrojo', 'Aldaba', 'Combinación'],
      },
    ],
  },
  {
    secretMeaning: 'Conexiones ocultas entre objetos, móviles y coartadas',
    groups: [
      {
        id: 'g-armas-filo',
        category: 'Instrumentos cortantes o punzantes',
        difficulty: 1,
        items: ['Bisturí', 'Abridor', 'Picahielo', 'Tijeras'],
      },
      {
        id: 'g-moviles',
        category: 'Móviles de un crimen premeditado',
        difficulty: 2,
        items: ['Herencia', 'Chantaje', 'Deuda', 'Venganza'],
      },
      {
        id: 'g-documentos',
        category: 'Documentos intervenidos en el despacho',
        difficulty: 3,
        items: ['Testamento', 'Pagaré', 'Telegrama', 'Manuscrito'],
      },
      {
        id: 'g-distintivos',
        category: 'Marcas visuales de identificación',
        difficulty: 4,
        items: ['Quevedos', 'Cicatriz', 'Tatuaje', 'Guantes'],
      },
    ],
  },
  {
    secretMeaning: 'Taxonomía de la noche del 23 de diciembre de 1924',
    groups: [
      {
        id: 'g-navidad',
        category: 'Elementos de la velada navideña',
        difficulty: 1,
        items: ['Abeto', 'Guirnalda', 'Estrella', 'Villancico'],
      },
      {
        id: 'g-materiales',
        category: 'Pavimentos y materiales de Villa Acebo',
        difficulty: 2,
        items: ['Roble', 'Mármol', 'Ladrillo', 'Sillería'],
      },
      {
        id: 'g-oficios',
        category: 'Oficios clave durante el encierro',
        difficulty: 3,
        items: ['Notario', 'Boticario', 'Sumiller', 'Telegrafista'],
      },
      {
        id: 'g-fenomenos',
        category: 'Sucesos críticos del apagón de las 23:15',
        difficulty: 4,
        items: ['Ventisca', 'Campanada', 'Relámpago', 'Penumbra'],
      },
    ],
  },
  {
    secretMeaning: 'Clasificación pericial de los indicios de la investigación',
    groups: [
      {
        id: 'g-bebidas',
        category: 'Reservas de la cava y mesa de gala',
        difficulty: 1,
        items: ['Oporto', 'Coñac', 'Jerez', 'Champán'],
      },
      {
        id: 'g-herramientas',
        category: 'Objetos contundentes o de labor',
        difficulty: 2,
        items: ['Cascanueces', 'Atizador', 'Bastón', 'Hacha'],
      },
      {
        id: 'g-sectores',
        category: 'Alas y zonas de vigilancia',
        difficulty: 3,
        items: ['Torre', 'Invernadero', 'Capilla', 'Biblioteca'],
      },
      {
        id: 'g-peritaje',
        category: 'Acciones del protocolo de Azlynn',
        difficulty: 4,
        items: ['Cotejo', 'Autopsia', 'Interrogatorio', 'Veredicto'],
      },
    ],
  },
];

export function generateConnections(seed: number, day = 1): ConnectionsConfig {
  const derived = deriveSeed(seed, day, 'connections');
  const rng = mulberry32(derived);
  const bank = CONNECTIONS_BANKS[(day + Math.floor(rng() * CONNECTIONS_BANKS.length)) % CONNECTIONS_BANKS.length];

  return {
    groups: bank.groups.map(g => ({
      ...g,
      items: [...g.items] as [string, string, string, string],
    })) as [ConnectionsGroup, ConnectionsGroup, ConnectionsGroup, ConnectionsGroup],
    maxMistakes: 4,
    secretMeaning: bank.secretMeaning,
  };
}

export function checkConnectionsSelection(
  config: ConnectionsConfig,
  selectedItems: string[]
): { matchedGroup: ConnectionsGroup | null; oneAway: boolean } {
  if (selectedItems.length !== 4) {
    return { matchedGroup: null, oneAway: false };
  }
  const selSet = new Set(selectedItems);
  let oneAway = false;

  for (const group of config.groups) {
    let overlap = 0;
    for (const item of group.items) {
      if (selSet.has(item)) overlap++;
    }
    if (overlap === 4) {
      return { matchedGroup: group, oneAway: false };
    }
    if (overlap === 3) {
      oneAway = true;
    }
  }
  return { matchedGroup: null, oneAway };
}

export function validateConnections(
  config: ConnectionsConfig,
  solvedGroupIds: string[]
): boolean {
  const solvedSet = new Set(solvedGroupIds);
  return config.groups.every(g => solvedSet.has(g.id));
}
