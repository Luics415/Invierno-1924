import { describe, expect, it } from 'vitest';
import { LOCATIONS, WEAPONS } from '../src/data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../src/data/suspectsDirectory';
import {
  CLUE_SCHEDULE,
  TOTAL_DAYS,
  evaluateCaseClues,
  generateCase,
  isWeaponPredicate,
  roomMatches,
  suspectMatches,
  weaponMatches,
} from '../src/engine/caseGenerator';
import { toPuzzleText } from '../src/engine/clueLabels';
import {
  describeRoomPredicate,
  describeSuspectPredicate,
  describeWeaponPredicate,
} from '../src/engine/clueWriter';
import { DAY_CALENDAR } from '../src/engine/narrativeGenerator';
import { mulberry32 } from '../src/engine/puzzles/prng';
import type {
  AccessLevel,
  AgeGroup,
  Clue,
  CluePredicate,
  ForensicTrace,
  Handedness,
  MotiveTag,
  PresenceWing,
  SuspectCategory,
  SuspectGender,
  VisualMarker,
  WeaponCategory,
  WeaponMaterial,
} from '../src/types/game';

const GENERIC_FALLBACKS = [
  'Filtro deductivo registrado',
  'Peritaje de arma registrado',
  'Estancia acotada en planos',
  'INDICIO DE VILLA ACEBO',
  'PERITAJE DE ARMA HOMICIDA',
  'ESCENA EN VILLA ACEBO',
];

const RAW_ENUM_LEAKS = [
  /\bquimicos\b/i,
  /\bcombinacion\s+hierro\b/i,
  /\banfitrion\b/i,
  /\blaceracion\b/i,
  /\bpuncion\b/i,
  /\bcardiaco\b/i,
  /\bsotano\b/i,
  /\bmarmol\b/i,
  /suelo de tarima de roble/i,
];

function assertClueClarity(
  text: string,
  impact: string,
  keyphrase: string,
  options?: { isHandedness?: boolean; isVisualNinguno?: boolean; isNegatedAge?: boolean }
) {
  for (const fallback of GENERIC_FALLBACKS) {
    expect(impact).not.toBe(fallback);
    expect(keyphrase).not.toBe(fallback);
  }
  expect(text.trim().length).toBeGreaterThan(15);
  expect(impact.trim().length).toBeGreaterThan(5);
  expect(keyphrase).toMatch(/^[A-ZÑ0-9 ]+$/);
  expect(keyphrase.length).toBeGreaterThanOrEqual(4);

  expect(text).not.toContain('_');
  expect(impact).not.toContain('_');
  expect(keyphrase).not.toContain('_');

  expect(keyphrase).not.toContain('SIN RASGO NINGUNO');
  expect(keyphrase).not.toContain('SIN CIERRE SIN CERRADURA');
  expect(keyphrase).not.toContain('EDAD ENTRE Y ANOS');
  expect(keyphrase).not.toMatch(/(?<=^|\s)([A-ZÑ0-9]+)\s+\1(?=\s|$)/);
  expect(text).not.toMatch(/(?<![\p{L}\p{N}])(de|a)\s+el(?![\p{L}\p{N}])/iu);
  expect(impact).not.toMatch(/(?<![\p{L}\p{N}])(de|a)\s+el(?![\p{L}\p{N}])/iu);

  for (const leak of RAW_ENUM_LEAKS) {
    // Allow unaccented ASCII in keyphrase only (since toPuzzleText intentionally strips accents),
    // but never in human-facing text or impact, and never "combinacion hierro" or "tarima de roble" anywhere.
    expect(text).not.toMatch(leak);
    expect(impact).not.toMatch(leak);
  }
  expect(keyphrase).not.toMatch(/TARIMA DE ROBLE/);
  expect(keyphrase).not.toMatch(/COMBINACION HIERRO/);

  if (options?.isHandedness) {
    expect(text.toLowerCase()).not.toContain('golpea');
    expect(text.toLowerCase()).not.toContain('golpe');
  }
  if (options?.isVisualNinguno) {
    expect(impact.toLowerCase()).not.toContain('ninguno');
    expect(keyphrase).not.toContain('NINGUNO');
  }
  if (options?.isNegatedAge) {
    expect(text.toLowerCase()).toContain('descarta');
    expect(impact.toLowerCase()).toContain('descartada');
    expect(keyphrase.startsWith('NO EDAD ')).toBe(true);
  }
}

describe('R3 Clarity — toPuzzleText, Exhaustive Predicates & 74x18x9 Completeness', () => {
  it('toPuzzleText preserves digits 0-9, preserves Ñ (NFC/NFD), strips accents, and avoids sentinel collisions', () => {
    expect(toPuzzleText('Edad menor de 35 años')).toBe('EDAD MENOR DE 35 AÑOS');
    expect(toPuzzleText('De 35 a 49 años — sótano')).toBe('DE 35 A 49 AÑOS SOTANO');
    expect(toPuzzleText('60 años o más')).toBe('60 AÑOS O MAS');
    expect(toPuzzleText('N\u0303a\u0301o 1924')).toBe('ÑAO 1924');
    expect(toPuzzleText('__ENYE__')).toBe('ENYE');
    expect(toPuzzleText('test __ENYE__ val')).toBe('TEST ENYE VAL');
    expect(toPuzzleText('test\u0000n\u0303')).toBe('TEST Ñ');
  });

  it('covers every CluePredicate variant (eq, neq, in, gender, negate, ninguno) without raw leaks or fallbacks', () => {
    const rng = mulberry32(42);

    const ageGroups: AgeGroup[] = ['joven', 'adulto', 'maduro', 'veterano'];
    const handednesses: Handedness[] = ['diestro', 'zurdo', 'ambidiestro'];
    const visualMarkers: VisualMarker[] = [
      'lentes',
      'cicatriz',
      'joya',
      'guantes',
      'tatuaje',
      'vello_facial',
      'tocado',
      'ninguno',
    ];
    const wings: PresenceWing[] = ['ala_este', 'ala_oeste', 'planta_baja', 'sotano', 'torre'];
    const traces: ForensicTrace[] = [
      'tinta',
      'tabaco',
      'ceniza',
      'polen',
      'licor',
      'metal',
      'perfume',
      'grasa',
      'harina',
      'cera',
      'quimicos',
      'textil',
    ];
    const motives: MotiveTag[] = [
      'herencia',
      'deuda',
      'chantaje',
      'venganza',
      'secreto',
      'despido',
      'manuscrito',
      'encubrimiento',
    ];
    const accesses: AccessLevel[] = [
      'llave_maestra',
      'anfitrion',
      'servicio_interior',
      'invitado_libre',
      'paso_restringido',
    ];
    const categories: SuspectCategory[] = [
      'Familia Valdemar',
      'Invitados de Gala',
      'Servicio de la Mansión',
      'Habitantes del Valle',
    ];
    const genders: SuspectGender[] = ['M', 'F', 'Trans M', 'Trans F', 'NB'];

    const suspectFieldValues: Array<[CluePredicate & { kind: 'suspectAttr' } extends infer U ? U extends { field: infer F } ? F : never : never, string[]]> = [
      ['ageGroup', ageGroups],
      ['handedness', handednesses],
      ['visualMarker', visualMarkers],
      ['presenceWing', wings],
      ['forensicTrace', traces],
      ['motiveTag', motives],
      ['accessLevel', accesses],
    ];

    for (const [field, values] of suspectFieldValues) {
      for (const v of values) {
        for (const op of ['eq', 'neq'] as const) {
          const desc = describeSuspectPredicate({ kind: 'suspectAttr', field, op, value: v }, rng);
          assertClueClarity(desc.text, desc.impact, desc.keyphrase, {
            isHandedness: field === 'handedness',
            isVisualNinguno: field === 'visualMarker' && v === 'ninguno',
          });
        }
      }
      const inDesc = describeSuspectPredicate(
        { kind: 'suspectAttr', field, op: 'in', value: [values[0], values[values.length - 1]] },
        rng
      );
      assertClueClarity(inDesc.text, inDesc.impact, inDesc.keyphrase, {
        isHandedness: field === 'handedness',
      });
    }

    for (const cat of categories) {
      for (const op of ['eq', 'neq'] as const) {
        const desc = describeSuspectPredicate({ kind: 'suspectIdentity', field: 'category', op, value: cat }, rng);
        assertClueClarity(desc.text, desc.impact, desc.keyphrase);
      }
    }
    const catIn = describeSuspectPredicate(
      { kind: 'suspectIdentity', field: 'category', op: 'in', value: [categories[0], categories[1]] },
      rng
    );
    assertClueClarity(catIn.text, catIn.impact, catIn.keyphrase);

    for (const g of genders) {
      for (const op of ['eq', 'neq'] as const) {
        const desc = describeSuspectPredicate({ kind: 'suspectIdentity', field: 'gender', op, value: g }, rng);
        assertClueClarity(desc.text, desc.impact, desc.keyphrase);
      }
    }
    const genderIn = describeSuspectPredicate(
      { kind: 'suspectIdentity', field: 'gender', op: 'in', value: ['F', 'Trans F'] },
      rng
    );
    assertClueClarity(genderIn.text, genderIn.impact, genderIn.keyphrase);

    for (const op of ['eq', 'neq'] as const) {
      const desc = describeSuspectPredicate(
        { kind: 'suspectIdentity', field: 'id', op, value: SUSPECTS_DIRECTORY[0].id },
        rng
      );
      assertClueClarity(desc.text, desc.impact, desc.keyphrase);
    }
    const idIn = describeSuspectPredicate(
      { kind: 'suspectIdentity', field: 'id', op: 'in', value: [SUSPECTS_DIRECTORY[0].id, SUSPECTS_DIRECTORY[1].id] },
      rng
    );
    assertClueClarity(idIn.text, idIn.impact, idIn.keyphrase);

    // suspectAgeRange bounded, open-ended, and negated
    const agePreds: CluePredicate[] = [
      { kind: 'suspectAgeRange', min: 35, max: 49, negate: false },
      { kind: 'suspectAgeRange', min: 35, max: 49, negate: true },
      { kind: 'suspectAgeRange', min: 50 },
      { kind: 'suspectAgeRange', max: 34, negate: true },
    ];
    for (const p of agePreds) {
      const desc = describeSuspectPredicate(p, rng);
      assertClueClarity(desc.text, desc.impact, desc.keyphrase, {
        isNegatedAge: p.kind === 'suspectAgeRange' && Boolean(p.negate),
      });
      expect(desc.keyphrase).toMatch(/\d/);
    }

    // Weapons
    for (const concealVal of [true, false]) {
      const desc = describeWeaponPredicate({ kind: 'weaponConcealable', value: concealVal }, rng);
      assertClueClarity(desc.text, desc.impact, desc.keyphrase);
    }
    const weaponCats: WeaponCategory[] = ['contundente', 'punzante', 'cortante', 'estrangulamiento', 'veneno'];
    const weaponMats: WeaponMaterial[] = ['metal', 'cristal', 'madera', 'fibra', 'quimico'];
    const weaponTraces = Array.from(new Set(WEAPONS.map(w => w.forensicTrace)));
    const weaponWounds = WEAPONS.map(w => w.woundPattern);

    const weaponFieldValues: Array<['category' | 'material' | 'forensicTrace' | 'woundPattern', string[]]> = [
      ['category', weaponCats],
      ['material', weaponMats],
      ['forensicTrace', weaponTraces],
      ['woundPattern', weaponWounds],
    ];

    for (const [field, values] of weaponFieldValues) {
      for (const v of values) {
        for (const op of ['eq', 'neq'] as const) {
          const desc = describeWeaponPredicate({ kind: 'weaponAttr', field, op, value: v }, rng);
          assertClueClarity(desc.text, desc.impact, desc.keyphrase);
          if (field === 'woundPattern' && op === 'neq') {
            expect(desc.text.toLowerCase()).toContain('descarta');
            expect(desc.impact.toLowerCase()).toContain('descartada');
          }
        }
      }
      const inDesc = describeWeaponPredicate(
        { kind: 'weaponAttr', field, op: 'in', value: [values[0], values[1]] },
        rng
      );
      assertClueClarity(inDesc.text, inDesc.impact, inDesc.keyphrase);
    }
    for (const op of ['eq', 'neq'] as const) {
      const desc = describeWeaponPredicate({ kind: 'weaponAttr', field: 'id', op, value: WEAPONS[0].id }, rng);
      assertClueClarity(desc.text, desc.impact, desc.keyphrase);
    }

    // Rooms
    const floors = Array.from(new Set(LOCATIONS.map(l => l.floor)));
    const locks = Array.from(new Set(LOCATIONS.map(l => l.lockType)));
    const surfaces = Array.from(new Set(LOCATIONS.map(l => l.surfaceMaterial)));
    const ambients = Array.from(new Set(LOCATIONS.map(l => l.ambientTrace)));

    const roomFieldValues: Array<['floor' | 'lockType' | 'surfaceMaterial' | 'ambientTrace', string[]]> = [
      ['floor', floors],
      ['lockType', locks],
      ['surfaceMaterial', surfaces],
      ['ambientTrace', ambients],
    ];
    for (const [field, values] of roomFieldValues) {
      for (const v of values) {
        for (const op of ['eq', 'neq'] as const) {
          const desc = describeRoomPredicate({ kind: 'roomAttr', field, op, value: v }, rng);
          assertClueClarity(desc.text, desc.impact, desc.keyphrase);
        }
      }
      const inDesc = describeRoomPredicate(
        { kind: 'roomAttr', field, op: 'in', value: [values[0], values[1]] },
        rng
      );
      assertClueClarity(inDesc.text, inDesc.impact, inDesc.keyphrase);
    }
    for (const op of ['eq', 'neq'] as const) {
      const desc = describeRoomPredicate({ kind: 'roomAttr', field: 'id', op, value: LOCATIONS[0].id }, rng);
      assertClueClarity(desc.text, desc.impact, desc.keyphrase);
    }
    const roomIdIn = describeRoomPredicate(
      { kind: 'roomAttr', field: 'id', op: 'in', value: [LOCATIONS[0].id, LOCATIONS[3].id] },
      rng
    );
    assertClueClarity(roomIdIn.text, roomIdIn.impact, roomIdIn.keyphrase);
    expect(roomIdIn.text).toContain('al Gran Salón');

    // Specific Regression & Defensive Edge Cases (Iteration 2 & 3)
    const servicioEq = describeSuspectPredicate(
      { kind: 'suspectIdentity', field: 'category', op: 'eq', value: 'Servicio de la Mansión' },
      rng
    );
    expect(servicioEq.text).toContain('del Servicio de la Mansión');
    assertClueClarity(servicioEq.text, servicioEq.impact, servicioEq.keyphrase);

    const servicioNeq = describeSuspectPredicate(
      { kind: 'suspectIdentity', field: 'category', op: 'neq', value: 'Servicio de la Mansión' },
      rng
    );
    expect(servicioNeq.text).toContain('al Servicio de la Mansión');
    assertClueClarity(servicioNeq.text, servicioNeq.impact, servicioNeq.keyphrase);

    const servicioInFirst = describeSuspectPredicate(
      {
        kind: 'suspectIdentity',
        field: 'category',
        op: 'in',
        value: ['Servicio de la Mansión', 'Familia Valdemar'],
      },
      rng
    );
    expect(servicioInFirst.text).toContain('al Servicio de la Mansión');
    assertClueClarity(servicioInFirst.text, servicioInFirst.impact, servicioInFirst.keyphrase);

    const servicioInSecond = describeSuspectPredicate(
      {
        kind: 'suspectIdentity',
        field: 'category',
        op: 'in',
        value: ['Familia Valdemar', 'Servicio de la Mansión'],
      },
      rng
    );
    assertClueClarity(servicioInSecond.text, servicioInSecond.impact, servicioInSecond.keyphrase);

    const salonNeq = describeRoomPredicate(
      { kind: 'roomAttr', field: 'id', op: 'neq', value: 'salon' },
      rng
    );
    expect(salonNeq.text).toContain('la estancia «El Gran Salón» permaneció cerrada');
    assertClueClarity(salonNeq.text, salonNeq.impact, salonNeq.keyphrase);

    const nyuDesc = describeSuspectPredicate(
      { kind: 'suspectAttr', field: 'forensicTrace', op: 'eq', value: 'ñu_ñu' },
      rng
    );
    expect(nyuDesc.keyphrase).toBe('RASTRO DE ÑU');
    assertClueClarity(nyuDesc.text, nyuDesc.impact, nyuDesc.keyphrase);

    const nyonyoDesc = describeSuspectPredicate(
      { kind: 'suspectAttr', field: 'forensicTrace', op: 'eq', value: 'ñoño_ñoño' },
      rng
    );
    expect(nyonyoDesc.keyphrase).toBe('RASTRO DE ÑOÑO');
    assertClueClarity(nyonyoDesc.text, nyonyoDesc.impact, nyonyoDesc.keyphrase);

    const panyDesc = describeSuspectPredicate(
      { kind: 'suspectAttr', field: 'forensicTrace', op: 'eq', value: 'pañ_pañ' },
      rng
    );
    expect(panyDesc.keyphrase).toBe('RASTRO DE PAÑ');
    assertClueClarity(panyDesc.text, panyDesc.impact, panyDesc.keyphrase);
    const lockNeq = describeRoomPredicate(
      { kind: 'roomAttr', field: 'lockType', op: 'neq', value: 'sin_cerradura' },
      rng
    );
    expect(lockNeq.keyphrase).toBe('ESTANCIA CON CERRADURA');
    expect(lockNeq.impact).toBe('Cierre confirmado: con cerradura');

    const lockIn = describeRoomPredicate(
      { kind: 'roomAttr', field: 'lockType', op: 'in', value: ['sin_cerradura', 'pestillo_interior'] },
      rng
    );
    assertClueClarity(lockIn.text, lockIn.impact, lockIn.keyphrase);

    const anfitrionEq = describeSuspectPredicate(
      { kind: 'suspectAttr', field: 'accessLevel', op: 'eq', value: 'anfitrion' },
      rng
    );
    const anfitrionNeq = describeSuspectPredicate(
      { kind: 'suspectAttr', field: 'accessLevel', op: 'neq', value: 'anfitrion' },
      rng
    );
    expect(anfitrionEq.keyphrase).toBe('ACCESO PERMISO DE ANFITRION');
    expect(anfitrionNeq.keyphrase).toBe('NO ACCESO PERMISO DE ANFITRION');

    const basementNeq = describeRoomPredicate(
      { kind: 'roomAttr', field: 'floor', op: 'neq', value: 'Sótano' },
      rng
    );
    expect(basementNeq.text).not.toContain('de el sótano');
    expect(basementNeq.text).toContain('del sótano');

    const portoNeq = describeWeaponPredicate(
      { kind: 'weaponAttr', field: 'id', op: 'neq', value: 'oporto' },
      rng
    );
    assertClueClarity(portoNeq.text, portoNeq.impact, portoNeq.keyphrase);
    expect(portoNeq.text).not.toContain('descartándolo');
  });

  it('handles defensive edge cases: empty op:in arrays, unbounded suspectAgeRange, and unknown enum/string keys', () => {
    const rng = mulberry32(77);

    const emptyInPreds: CluePredicate[] = [
      { kind: 'suspectAttr', field: 'ageGroup', op: 'in', value: [] },
      { kind: 'suspectAttr', field: 'handedness', op: 'in', value: [] },
      { kind: 'suspectAttr', field: 'visualMarker', op: 'in', value: [] },
      { kind: 'suspectAttr', field: 'presenceWing', op: 'in', value: [] },
      { kind: 'suspectAttr', field: 'forensicTrace', op: 'in', value: [] },
      { kind: 'suspectAttr', field: 'motiveTag', op: 'in', value: [] },
      { kind: 'suspectAttr', field: 'accessLevel', op: 'in', value: [] },
      { kind: 'suspectIdentity', field: 'category', op: 'in', value: [] },
      { kind: 'suspectIdentity', field: 'gender', op: 'in', value: [] },
      { kind: 'suspectIdentity', field: 'id', op: 'in', value: [] },
      { kind: 'weaponAttr', field: 'category', op: 'in', value: [] },
      { kind: 'weaponAttr', field: 'material', op: 'in', value: [] },
      { kind: 'weaponAttr', field: 'forensicTrace', op: 'in', value: [] },
      { kind: 'weaponAttr', field: 'woundPattern', op: 'in', value: [] },
      { kind: 'weaponAttr', field: 'id', op: 'in', value: [] },
      { kind: 'roomAttr', field: 'floor', op: 'in', value: [] },
      { kind: 'roomAttr', field: 'lockType', op: 'in', value: [] },
      { kind: 'roomAttr', field: 'surfaceMaterial', op: 'in', value: [] },
      { kind: 'roomAttr', field: 'ambientTrace', op: 'in', value: [] },
      { kind: 'roomAttr', field: 'id', op: 'in', value: [] },
    ];

    for (const p of emptyInPreds) {
      const desc =
        p.kind === 'weaponAttr'
          ? describeWeaponPredicate(p, rng)
          : p.kind === 'roomAttr'
            ? describeRoomPredicate(p, rng)
            : describeSuspectPredicate(p, rng);
      expect(desc.text).not.toContain(' .');
      expect(desc.text).not.toContain('undefined');
      expect(desc.impact).not.toContain('undefined');
      expect(desc.keyphrase).not.toContain('UNDEFINED');
      expect(desc.keyphrase).not.toMatch(/(?<=^|\s)([A-ZÑ0-9]+)\s+\1(?=\s|$)/);
      expect(desc.text).not.toMatch(/(?<![\p{L}\p{N}])(de|a)\s+el(?![\p{L}\p{N}])/iu);
    }

    // Underscore-only inputs ('___') across op: 'in', 'eq', 'neq' cleanly hit dimension fallback
    for (const p of emptyInPreds) {
      for (const op of ['in', 'eq', 'neq'] as const) {
        const pred = { ...p, op, value: op === 'in' ? ['___', '  _  '] : '___' } as CluePredicate;
        const desc =
          pred.kind === 'weaponAttr'
            ? describeWeaponPredicate(pred, rng)
            : pred.kind === 'roomAttr'
              ? describeRoomPredicate(pred, rng)
              : describeSuspectPredicate(pred, rng);
        expect(desc.text).not.toContain(' .');
        expect(desc.text).not.toContain('  ');
        expect(desc.text).not.toContain('undefined');
        expect(desc.impact).not.toContain('undefined');
        expect(desc.keyphrase).not.toMatch(/(?<=^|\s)([A-ZÑ0-9]+)\s+\1(?=\s|$)/);
        expect(GENERIC_FALLBACKS).toContain(desc.impact);
      }
    }

    const mixedUnderscore = describeSuspectPredicate(
      { kind: 'suspectAttr', field: 'ageGroup', op: 'in', value: ['___', 'joven'] },
      rng
    );
    expect(mixedUnderscore.keyphrase).toBe('EDAD MENOR DE 35 AÑOS');
    assertClueClarity(mixedUnderscore.text, mixedUnderscore.impact, mixedUnderscore.keyphrase);

    // Unbounded suspectAgeRange
    const unboundedPos = describeSuspectPredicate({ kind: 'suspectAgeRange', negate: false }, rng);
    const unboundedNeg = describeSuspectPredicate({ kind: 'suspectAgeRange', negate: true }, rng);
    expect(unboundedPos.text).not.toContain('adulta verificada');
    expect(unboundedPos.keyphrase).toBe('EDAD REGISTRADA');
    expect(unboundedNeg.keyphrase).toBe('NO EDAD REGISTRADA');
    assertClueClarity(unboundedPos.text, unboundedPos.impact, unboundedPos.keyphrase);
    assertClueClarity(unboundedNeg.text, unboundedNeg.impact, unboundedNeg.keyphrase, {
      isNegatedAge: true,
    });

    // Unknown enum/string keys — zero "undefined" and zero "_"
    const unknownSuspectPreds: CluePredicate[] = [
      { kind: 'suspectAttr', field: 'ageGroup', op: 'eq', value: 'desconocido_x' },
      { kind: 'suspectAttr', field: 'handedness', op: 'eq', value: 'ambas_manos' },
      { kind: 'suspectAttr', field: 'visualMarker', op: 'eq', value: 'marca_desconocida' },
      { kind: 'suspectAttr', field: 'presenceWing', op: 'eq', value: 'ala_norte' },
      { kind: 'suspectAttr', field: 'forensicTrace', op: 'eq', value: 'rastro_nuevo' },
      { kind: 'suspectAttr', field: 'motiveTag', op: 'eq', value: 'motivo_oculto' },
      { kind: 'suspectAttr', field: 'accessLevel', op: 'eq', value: 'acceso_vip' },
      { kind: 'suspectIdentity', field: 'category', op: 'eq', value: 'invitado_especial' },
      { kind: 'suspectIdentity', field: 'gender', op: 'eq', value: 'X' },
      { kind: 'suspectIdentity', field: 'id', op: 'eq', value: 'sospechoso_fantasma' },
    ];
    for (const p of unknownSuspectPreds) {
      const desc = describeSuspectPredicate(p, rng);
      expect(desc.text.toLowerCase()).not.toContain('undefined');
      expect(desc.impact.toLowerCase()).not.toContain('undefined');
      expect(desc.keyphrase).not.toContain('UNDEFINED');
      assertClueClarity(desc.text, desc.impact, desc.keyphrase);
    }

    const unknownWeaponPreds: CluePredicate[] = [
      { kind: 'weaponAttr', field: 'category', op: 'eq', value: 'desconocido_w' },
      { kind: 'weaponAttr', field: 'material', op: 'eq', value: 'piedra_caliza' },
      { kind: 'weaponAttr', field: 'forensicTrace', op: 'eq', value: 'polvo_blanco' },
      { kind: 'weaponAttr', field: 'woundPattern', op: 'eq', value: 'unknown_wound' },
      { kind: 'weaponAttr', field: 'id', op: 'eq', value: 'arma_x' },
    ];
    for (const p of unknownWeaponPreds) {
      const desc = describeWeaponPredicate(p, rng);
      expect(desc.text.toLowerCase()).not.toContain('undefined');
      expect(desc.impact.toLowerCase()).not.toContain('undefined');
      expect(desc.keyphrase).not.toContain('UNDEFINED');
      assertClueClarity(desc.text, desc.impact, desc.keyphrase);
    }

    const unknownRoomPreds: CluePredicate[] = [
      { kind: 'roomAttr', field: 'floor', op: 'eq', value: 'atico_norte' },
      { kind: 'roomAttr', field: 'lockType', op: 'eq', value: 'unknown_lock' },
      { kind: 'roomAttr', field: 'surfaceMaterial', op: 'eq', value: 'granito_pulido' },
      { kind: 'roomAttr', field: 'ambientTrace', op: 'eq', value: 'incienso_antiguo' },
      { kind: 'roomAttr', field: 'id', op: 'eq', value: 'sala_oculta' },
    ];
    for (const p of unknownRoomPreds) {
      const desc = describeRoomPredicate(p, rng);
      expect(desc.text.toLowerCase()).not.toContain('undefined');
      expect(desc.impact.toLowerCase()).not.toContain('undefined');
      expect(desc.keyphrase).not.toContain('UNDEFINED');
      assertClueClarity(desc.text, desc.impact, desc.keyphrase);
    }
  });

  it('maintains Day 17 & Day 24 narrative coherence and avoids pre-solve evidenceContent spoilers', () => {
    expect(DAY_CALENDAR[16].title.toLowerCase()).not.toContain('golpe');
    expect(DAY_CALENDAR[23].subtitle.toLowerCase()).not.toContain('el último');

    const generated = generateCase(19241224);
    for (const dayData of generated.days) {
      expect(dayData.narrative.evidenceContent).not.toContain(dayData.unlockedClue.impact);
      expect(dayData.narrative.evidenceContent.toLowerCase()).not.toContain(
        dayData.unlockedClue.impact.toLowerCase()
      );
      expect(dayData.narrative.evidenceContent).toContain(`[CLASIFICADO · JORNADA ${dayData.day}]`);
    }
  });

  it('enforces progressive deduction funnel, zero duplicates/post-eq redundancies, and autoEliminations across all 74 suspects, 18 weapons, and 9 rooms', () => {
    const lastSuspectDay = CLUE_SCHEDULE.lastIndexOf('S') + 1; // 30
    const lastWeaponDay = CLUE_SCHEDULE.lastIndexOf('W') + 1; // 26
    const lastRoomDay = CLUE_SCHEDULE.lastIndexOf('R') + 1; // 28

    expect(lastSuspectDay).toBe(30);
    expect(lastWeaponDay).toBe(26);
    expect(lastRoomDay).toBe(28);

    const suspectClueSets: Clue[][] = [];
    const weaponClueSets: Clue[][] = [];
    const roomClueSets: Clue[][] = [];

    for (let k = 0; k < SUSPECTS_DIRECTORY.length; k++) {
      const seed = 200000 + k * 7919;
      const wIdx = k % WEAPONS.length;
      const rIdx = k % LOCATIONS.length;
      const c = generateCase(seed, k, wIdx, rIdx);

      // Extract dimension clue sets for the 74 x 18 x 9 cross-product check
      suspectClueSets.push(c.days.filter((_, idx) => CLUE_SCHEDULE[idx] === 'S').map(d => d.unlockedClue));
      if (k < WEAPONS.length) {
        weaponClueSets.push(c.days.filter((_, idx) => CLUE_SCHEDULE[idx] === 'W').map(d => d.unlockedClue));
      }
      if (k < LOCATIONS.length) {
        roomClueSets.push(c.days.filter((_, idx) => CLUE_SCHEDULE[idx] === 'R').map(d => d.unlockedClue));
      }

      // Check progressive funnel, no duplicates, no post-eq redundancies, autoEliminations, clarity
      const seenPredicates = new Set<string>();
      const confirmedByDim = {
        S: new Set<string>(),
        W: new Set<string>(),
        R: new Set<string>(),
      };

      const unlocked: Clue[] = [];
      let prevS = SUSPECTS_DIRECTORY.length;
      let prevW = WEAPONS.length;
      let prevR = LOCATIONS.length;

      for (let i = 0; i < TOTAL_DAYS; i++) {
        const day = i + 1;
        const dim = CLUE_SCHEDULE[i];
        const dayData = c.days[i];
        const clue = dayData.unlockedClue;
        const preds = clue.predicates ?? [];
        expect(preds).toHaveLength(1);
        const pred = preds[0];

        // No op: 'in' or suspectAgeRange emitted in progressive funnel
        expect(pred.kind).not.toBe('suspectAgeRange');
        if ('op' in pred) {
          expect(pred.op).not.toBe('in');
        }

        // Zero duplicates
        const predKey = JSON.stringify(pred);
        expect(seenPredicates.has(predKey), `Duplicate predicate on day ${day} for suspect #${k + 1}`).toBe(false);
        seenPredicates.add(predKey);

        // Zero post-eq redundancies on same (dim, field)
        const field =
          pred.kind === 'weaponConcealable'
            ? 'concealable'
            : 'field' in pred
              ? pred.field
              : undefined;
        if (field) {
          expect(
            confirmedByDim[dim].has(field),
            `Redundant predicate on confirmed field ${dim}.${field} at day ${day}`
          ).toBe(false);
          if (pred.kind === 'weaponConcealable' || ('op' in pred && pred.op === 'eq')) {
            confirmedByDim[dim].add(field);
          }
        }

        // Clarity & non-spoiler checks
        assertClueClarity(clue.text, clue.impact, clue.keyphrase ?? '', {
          isHandedness: pred.kind === 'suspectAttr' && pred.field === 'handedness',
          isVisualNinguno:
            pred.kind === 'suspectAttr' && pred.field === 'visualMarker' && pred.value === 'ninguno',
        });
        expect(dayData.narrative.evidenceContent).not.toContain(clue.impact);

        // autoEliminations exactness
        const expectedElimS = SUSPECTS_DIRECTORY.filter(s => !suspectMatches(pred, s)).map(s => s.id);
        const expectedElimW = isWeaponPredicate(pred)
          ? WEAPONS.filter(w => !weaponMatches(pred, w)).map(w => w.id)
          : [];
        const expectedElimR =
          pred.kind === 'roomAttr' ? LOCATIONS.filter(r => !roomMatches(pred, r)).map(r => r.id) : [];

        expect(clue.autoEliminations?.suspectsEliminated).toEqual(expectedElimS);
        expect(clue.autoEliminations?.weaponsEliminated).toEqual(expectedElimW);
        expect(clue.autoEliminations?.roomsEliminated).toEqual(expectedElimR);

        // Progressive funnel evaluation
        unlocked.push(clue);
        const evalNow = evaluateCaseClues(unlocked);
        const sLen = evalNow.matchingSuspectIds.length;
        const wLen = evalNow.matchingWeaponIds.length;
        const rLen = evalNow.matchingRoomIds.length;

        if (dim === 'S') {
          expect(sLen).toBeLessThan(prevS);
          prevS = sLen;
        }
        if (dim === 'W') {
          expect(wLen).toBeLessThan(prevW);
          prevW = wLen;
        }
        if (dim === 'R') {
          expect(rLen).toBeLessThan(prevR);
          prevR = rLen;
        }

        if (day < lastSuspectDay) expect(sLen).toBeGreaterThan(1);
        else expect(evalNow.matchingSuspectIds).toEqual([c.config.culpritId]);

        if (day < lastWeaponDay) expect(wLen).toBeGreaterThan(1);
        else expect(evalNow.matchingWeaponIds).toEqual([c.config.weaponId]);

        if (day < lastRoomDay) expect(rLen).toBeGreaterThan(1);
        else expect(evalNow.matchingRoomIds).toEqual([c.config.locationId]);
      }
    }

    // Multi-seed progressive funnel check across additional seeds
    for (const extraSeed of [19241224, 987654321, 135792468]) {
      for (let k = 0; k < SUSPECTS_DIRECTORY.length; k += 5) {
        const c = generateCase(extraSeed + k * 31, k, (k * 3) % WEAPONS.length, (k * 5) % LOCATIONS.length);
        const evalEnd = evaluateCaseClues(c.days.map(d => d.unlockedClue));
        expect(evalEnd.matchingSuspectIds).toEqual([c.config.culpritId]);
        expect(evalEnd.matchingWeaponIds).toEqual([c.config.weaponId]);
        expect(evalEnd.matchingRoomIds).toEqual([c.config.locationId]);

        const beforeLastS = evaluateCaseClues(c.days.slice(0, lastSuspectDay - 1).map(d => d.unlockedClue));
        const beforeLastW = evaluateCaseClues(c.days.slice(0, lastWeaponDay - 1).map(d => d.unlockedClue));
        const beforeLastR = evaluateCaseClues(c.days.slice(0, lastRoomDay - 1).map(d => d.unlockedClue));
        expect(beforeLastS.matchingSuspectIds.length).toBeGreaterThan(1);
        expect(beforeLastW.matchingWeaponIds.length).toBeGreaterThan(1);
        expect(beforeLastR.matchingRoomIds.length).toBeGreaterThan(1);
      }
    }

    // Full 74 x 18 x 9 = 11,988 cross-product verification
    let combosChecked = 0;
    for (let sIdx = 0; sIdx < SUSPECTS_DIRECTORY.length; sIdx++) {
      for (let wIdx = 0; wIdx < WEAPONS.length; wIdx++) {
        for (let rIdx = 0; rIdx < LOCATIONS.length; rIdx++) {
          const evalResult = evaluateCaseClues([
            ...suspectClueSets[sIdx],
            ...weaponClueSets[wIdx],
            ...roomClueSets[rIdx],
          ]);
          expect(evalResult.matchingSuspectIds).toEqual([SUSPECTS_DIRECTORY[sIdx].id]);
          expect(evalResult.matchingWeaponIds).toEqual([WEAPONS[wIdx].id]);
          expect(evalResult.matchingRoomIds).toEqual([LOCATIONS[rIdx].id]);
          combosChecked++;
        }
      }
    }
    expect(combosChecked).toBe(74 * 18 * 9);
  });
});
