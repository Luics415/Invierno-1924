import type { EcuacionesConfig, EcuacionesRow, EcuacionesSymbol } from '../../types/game';
import { deriveSeed, mulberry32 } from './prng';

interface EcuacionesTemplate {
  symbols: EcuacionesSymbol[];
  equations: EcuacionesRow[];
  targetSymbols: [string, string, string, string];
  secretMeaning: string;
}

const ECUACIONES_TEMPLATES: readonly EcuacionesTemplate[] = [
  {
    // Fiel a la página "ECUACIONES" de la imagen de referencia:
    // 1) snowman (8) - venom (2) = 6
    // 2) ornament (10 -> use single digits: snowman=7, venom=1, ornament=8, boot=3, candle=5, dagger=2)
    // Verifiquemos con dígitos de 0 a 9 para cada icono:
    // snowman = 8, venom = 2, ornament = 9, boot = 4, candle = 6, dagger = 1
    // 1) snowman (8) - venom (2) = 6
    // 2) ornament (9) + snowman (8) + snowman (8) = 25
    // 3) venom (2) + boot (4) + boot (4) + candle (6) = 16
    // 4) candle (6) - snowman (8) + venom (2) + boot (4) = 4
    // 5) venom (2) + dagger (1) = 3
    // Código superior: [dagger][dagger] : [candle][boot] => 1 1 : 6 4
    symbols: [
      { id: 'snowman', label: 'Muñeco de Nieve', iconName: 'snowman', value: 8 },
      { id: 'venom', label: 'Frasco de Veneno', iconName: 'venom', value: 2 },
      { id: 'ornament', label: 'Esfera de Gala', iconName: 'ornament', value: 9 },
      { id: 'boot', label: 'Bota de Invierno', iconName: 'boot', value: 4 },
      { id: 'candle', label: 'Vela de Cera', iconName: 'candle', value: 6 },
      { id: 'dagger', label: 'Arma / Estilete', iconName: 'dagger', value: 1 },
    ],
    equations: [
      {
        id: 'eq-1',
        terms: [
          { symbolId: 'snowman', op: '+' },
          { symbolId: 'venom', op: '-' },
        ],
        result: 6,
      },
      {
        id: 'eq-2',
        terms: [
          { symbolId: 'ornament', op: '+' },
          { symbolId: 'snowman', op: '+' },
          { symbolId: 'snowman', op: '+' },
        ],
        result: 25,
      },
      {
        id: 'eq-3',
        terms: [
          { symbolId: 'venom', op: '+' },
          { symbolId: 'boot', op: '+' },
          { symbolId: 'boot', op: '+' },
          { symbolId: 'candle', op: '+' },
        ],
        result: 16,
      },
      {
        id: 'eq-4',
        terms: [
          { symbolId: 'candle', op: '+' },
          { symbolId: 'snowman', op: '-' },
          { symbolId: 'venom', op: '+' },
          { symbolId: 'boot', op: '+' },
        ],
        result: 4,
      },
      {
        id: 'eq-5',
        terms: [
          { symbolId: 'venom', op: '+' },
          { symbolId: 'dagger', op: '+' },
        ],
        result: 3,
      },
      {
        id: 'eq-6',
        terms: [
          { symbolId: 'snowman', op: '+' },
          { symbolId: 'candle', op: '+' },
          { symbolId: 'dagger', op: '-' },
        ],
        result: 13,
      },
    ],
    targetSymbols: ['dagger', 'dagger', 'candle', 'boot'],
    secretMeaning: 'Marcador horario deducido de las ecuaciones periciales (11:64 / código 1164)',
  },
  {
    // Segundo set con solución única directa:
    // key = 5, bell = 3, candle = 7, venom = 4, dagger = 2, ornament = 9
    symbols: [
      { id: 'key', label: 'Llave Maestra', iconName: 'key', value: 5 },
      { id: 'bell', label: 'Campana del Reloj', iconName: 'bell', value: 3 },
      { id: 'candle', label: 'Vela de Cera', iconName: 'candle', value: 7 },
      { id: 'venom', label: 'Frasco de Veneno', iconName: 'venom', value: 4 },
      { id: 'dagger', label: 'Estilete de Plata', iconName: 'dagger', value: 2 },
      { id: 'ornament', label: 'Esfera de Cristal', iconName: 'ornament', value: 9 },
    ],
    equations: [
      {
        id: 'eq-1',
        terms: [
          { symbolId: 'key', op: '+' },
          { symbolId: 'key', op: '+' },
        ],
        result: 10,
      },
      {
        id: 'eq-2',
        terms: [
          { symbolId: 'key', op: '+' },
          { symbolId: 'bell', op: '+' },
        ],
        result: 8,
      },
      {
        id: 'eq-3',
        terms: [
          { symbolId: 'candle', op: '+' },
          { symbolId: 'bell', op: '-' },
        ],
        result: 4,
      },
      {
        id: 'eq-4',
        terms: [
          { symbolId: 'candle', op: '+' },
          { symbolId: 'venom', op: '+' },
          { symbolId: 'bell', op: '+' },
        ],
        result: 14,
      },
      {
        id: 'eq-5',
        terms: [
          { symbolId: 'ornament', op: '+' },
          { symbolId: 'venom', op: '-' },
          { symbolId: 'dagger', op: '+' },
        ],
        result: 7,
      },
      {
        id: 'eq-6',
        terms: [
          { symbolId: 'ornament', op: '+' },
          { symbolId: 'dagger', op: '+' },
        ],
        result: 11,
      },
    ],
    targetSymbols: ['dagger', 'bell', 'venom', 'key'],
    secretMeaning: 'Hora clave reconstruida en el reloj de la torre (23:45)',
  },
  {
    // Tercer set:
    // snowman = 6, boot = 3, candle = 8, key = 2, venom = 5, dagger = 9
    symbols: [
      { id: 'snowman', label: 'Muñeco de Nieve', iconName: 'snowman', value: 6 },
      { id: 'boot', label: 'Bota de Invierno', iconName: 'boot', value: 3 },
      { id: 'candle', label: 'Vela de Cera', iconName: 'candle', value: 8 },
      { id: 'key', label: 'Llave Maestra', iconName: 'key', value: 2 },
      { id: 'venom', label: 'Frasco de Veneno', iconName: 'venom', value: 5 },
      { id: 'dagger', label: 'Estilete de Plata', iconName: 'dagger', value: 9 },
    ],
    equations: [
      {
        id: 'eq-1',
        terms: [
          { symbolId: 'snowman', op: '+' },
          { symbolId: 'snowman', op: '+' },
        ],
        result: 12,
      },
      {
        id: 'eq-2',
        terms: [
          { symbolId: 'snowman', op: '+' },
          { symbolId: 'boot', op: '-' },
        ],
        result: 3,
      },
      {
        id: 'eq-3',
        terms: [
          { symbolId: 'candle', op: '+' },
          { symbolId: 'boot', op: '+' },
        ],
        result: 11,
      },
      {
        id: 'eq-4',
        terms: [
          { symbolId: 'candle', op: '+' },
          { symbolId: 'key', op: '-' },
          { symbolId: 'boot', op: '+' },
        ],
        result: 9,
      },
      {
        id: 'eq-5',
        terms: [
          { symbolId: 'venom', op: '+' },
          { symbolId: 'key', op: '+' },
        ],
        result: 7,
      },
      {
        id: 'eq-6',
        terms: [
          { symbolId: 'dagger', op: '+' },
          { symbolId: 'venom', op: '-' },
          { symbolId: 'key', op: '+' },
        ],
        result: 6,
      },
    ],
    targetSymbols: ['key', 'boot', 'venom', 'candle'],
    secretMeaning: 'Registro numérico del casillero de servicio (23:58)',
  },
];

export function generateEcuaciones(seed: number, day = 1): EcuacionesConfig {
  const derived = deriveSeed(seed, day, 'ecuaciones');
  const rng = mulberry32(derived);
  const tpl =
    ECUACIONES_TEMPLATES[
      (day + Math.floor(rng() * ECUACIONES_TEMPLATES.length)) % ECUACIONES_TEMPLATES.length
    ];

  const valueMap = new Map(tpl.symbols.map(s => [s.id, s.value]));
  const targetCode = tpl.targetSymbols.map(id => valueMap.get(id) ?? 0) as [
    number,
    number,
    number,
    number,
  ];

  return {
    symbols: tpl.symbols,
    equations: tpl.equations,
    targetSymbols: tpl.targetSymbols,
    targetCode,
    secretMeaning: tpl.secretMeaning,
  };
}

export function validateEcuaciones(
  config: EcuacionesConfig,
  userDigits: readonly (number | null)[]
): boolean {
  if (userDigits.length !== 4) return false;
  return config.targetCode.every((digit, idx) => userDigits[idx] === digit);
}
