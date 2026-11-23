import type { Clue, EcuacionesConfig, EcuacionesRow, EcuacionesSymbol } from '../../types/game';
import { buildClueMeaning, hashClueTag } from './clueIntegration';
import { deriveSeed, mulberry32, shuffle } from './prng';

const SYMBOL_CATALOG: readonly Omit<EcuacionesSymbol, 'value'>[] = [
  { id: 'snowman', label: 'Muñeco de Nieve', iconName: 'snowman' },
  { id: 'venom', label: 'Frasco de Veneno', iconName: 'venom' },
  { id: 'ornament', label: 'Esfera de Gala', iconName: 'ornament' },
  { id: 'boot', label: 'Bota de Invierno', iconName: 'boot' },
  { id: 'candle', label: 'Vela de Cera', iconName: 'candle' },
  { id: 'dagger', label: 'Estilete de Plata', iconName: 'dagger' },
  { id: 'key', label: 'Llave Maestra', iconName: 'key' },
  { id: 'bell', label: 'Campana del Reloj', iconName: 'bell' },
];

const MEANING_TEMPLATES: readonly string[] = [
  'Marcador numérico deducido de las ecuaciones periciales',
  'Hora clave reconstruida en el mecanismo de la torre',
  'Registro numérico del casillero de servicio de Villa Acebo',
  'Cifra verificada en el inventario forense de Azlynn',
];

export function generateEcuaciones(seed: number, day = 1, clue?: Clue): EcuacionesConfig {
  const derived = deriveSeed(seed, day, `ecuaciones:${hashClueTag(clue)}`);
  const rng = mulberry32(derived);

  // Pick 6 symbols and assign distinct values in 0..9
  const chosenMeta = shuffle(rng, SYMBOL_CATALOG).slice(0, 6);
  const chosenValues = shuffle(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 6);

  const symbols: EcuacionesSymbol[] = chosenMeta.map((meta, idx) => ({
    ...meta,
    value: chosenValues[idx],
  }));

  const [s0, s1, s2, s3, s4, s5] = symbols;

  // Sistema triangular de 6 ecuaciones con términos '+' y '-' que determina
  // de forma única cada símbolo s0..s5 en el dominio 0..9:
  const equations: EcuacionesRow[] = [
    {
      id: 'eq-1',
      terms: [
        { symbolId: s0.id, op: '+' },
        { symbolId: s0.id, op: '+' },
      ],
      result: s0.value + s0.value,
    },
    {
      id: 'eq-2',
      terms: [
        { symbolId: s0.id, op: '+' },
        { symbolId: s1.id, op: '+' },
      ],
      result: s0.value + s1.value,
    },
    {
      id: 'eq-3',
      terms: [
        { symbolId: s2.id, op: '+' },
        { symbolId: s1.id, op: '-' },
      ],
      result: s2.value - s1.value,
    },
    {
      id: 'eq-4',
      terms: [
        { symbolId: s2.id, op: '+' },
        { symbolId: s3.id, op: '+' },
        { symbolId: s1.id, op: '+' },
      ],
      result: s2.value + s3.value + s1.value,
    },
    {
      id: 'eq-5',
      terms: [
        { symbolId: s4.id, op: '+' },
        { symbolId: s3.id, op: '-' },
        { symbolId: s0.id, op: '+' },
      ],
      result: s4.value - s3.value + s0.value,
    },
    {
      id: 'eq-6',
      terms: [
        { symbolId: s5.id, op: '+' },
        { symbolId: s4.id, op: '+' },
        { symbolId: s1.id, op: '-' },
      ],
      result: s5.value + s4.value - s1.value,
    },
  ];

  const targetSymbols: [string, string, string, string] = [
    s5.id,
    s3.id,
    s4.id,
    s2.id,
  ];
  const targetCode: [number, number, number, number] = [
    s5.value,
    s3.value,
    s4.value,
    s2.value,
  ];

  const hh = String((targetCode[0] * 10 + targetCode[1]) % 24).padStart(2, '0');
  const mm = String((targetCode[2] * 10 + targetCode[3]) % 60).padStart(2, '0');
  const tplText =
    MEANING_TEMPLATES[(day + Math.floor(rng() * MEANING_TEMPLATES.length)) % MEANING_TEMPLATES.length];
  const baseMeaning = `${tplText} (código ${targetCode.join('')} · ${hh}:${mm} h)`;

  return {
    symbols,
    equations,
    targetSymbols,
    targetCode,
    secretMeaning: buildClueMeaning(baseMeaning, clue),
  };
}

export function validateEcuaciones(
  config: EcuacionesConfig,
  userDigits: readonly (number | null)[]
): boolean {
  if (userDigits.length !== 4) return false;
  return config.targetCode.every((digit, idx) => userDigits[idx] === digit);
}
