import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as LucideIcons from 'lucide-react';
import * as NarrativeBible from '../src/data/narrativeBible';
import { LOCATIONS, VICTIM, WEAPONS } from '../src/data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../src/data/suspectsDirectory';
import type { MotiveTag, PresenceWing, SuspectGender, WeaponCategory } from '../src/types/game';

const WORKSPACE_ROOT = process.cwd();

const HONORIFIC_PREFIXES = [
  'Dra. ',
  'Dr. ',
  'Don ',
  'Doña ',
  'Padre ',
  'Barón ',
  'Condesa ',
  'Prof. ',
  'Sargento ',
  'Cabo ',
];

function extractFirstName(fullName: string): string {
  let cleaned = fullName.trim();
  for (const prefix of HONORIFIC_PREFIXES) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
      break;
    }
  }
  return cleaned.split(/\s+/)[0] ?? '';
}

function expectedAgeGroup(age: number): 'joven' | 'adulto' | 'maduro' | 'veterano' {
  if (age < 35) return 'joven';
  if (age < 50) return 'adulto';
  if (age < 60) return 'maduro';
  return 'veterano';
}

const WING_PATTERNS: Record<PresenceWing, RegExp[]> = {
  planta_baja: [/\bplanta baja\b/i, /\bgran salón\b/i, /\bsalón\b/i, /\binvernadero\b/i, /\bvestíbulo\b/i, /\bsalones\b/i],
  ala_este: [/\bala este\b/i, /\bcapilla\b/i, /\beste de la\b/i],
  ala_oeste: [/\bala oeste\b/i, /\boeste\b/i],
  torre: [/\btorre\b/i],
  sotano: [/\bsótano\b/i, /\bbodega\b/i, /\bcocina\b/i, /\bcaldera\b/i, /\blavandería\b/i, /\bantecocina\b/i, /\bsubsuelo\b/i],
};

function computeMinHamming(tuples: readonly (readonly unknown[])[]): number {
  let minHamming = Number.POSITIVE_INFINITY;
  for (let i = 0; i < tuples.length; i++) {
    for (let j = i + 1; j < tuples.length; j++) {
      let dist = 0;
      for (let k = 0; k < tuples[i].length; k++) {
        if (tuples[i][k] !== tuples[j][k]) dist++;
      }
      if (dist < minHamming) minHamming = dist;
    }
  }
  return minHamming;
}

const MOTIVE_KEYWORDS: Record<MotiveTag, string[]> = {
  herencia: ['herencia', 'testamento', 'pensión', 'deshered'],
  deuda: ['deuda', 'deudas', 'pagaré', 'embargo', 'quiebra', 'arruinad', 'ruina', 'préstamo'],
  chantaje: ['chantaje', 'chantajeaba', 'extors', 'coacción'],
  venganza: ['venganza', 'vengar', 'rencor', 'odio', 'injusta', 'explotación'],
  secreto: ['secreto', 'identidad', 'ocult', 'pasado'],
  despido: ['despido', 'despedir', 'despedirme', 'desahucio', 'sustento'],
  manuscrito: ['manuscrito', 'novela', 'códice', 'texto', 'verso', 'legajo'],
  encubrimiento: ['encubrir', 'irregularidad', 'sustracción', 'soborno', 'alteracion', 'forcejeo', 'fraude'],
};

describe('M1 Data Universe — 74 Suspects, 18 Weapons, 9 Rooms', () => {
  it('contains exactly 74 suspects with contiguous numbers, unique ids, names, and disambiguated first names', () => {
    expect(SUSPECTS_DIRECTORY).toHaveLength(74);
    expect(new Set(SUSPECTS_DIRECTORY.map(s => s.id)).size).toBe(74);
    expect(new Set(SUSPECTS_DIRECTORY.map(s => s.name)).size).toBe(74);

    const sortedNumbers = SUSPECTS_DIRECTORY.map(s => s.number).sort((a, b) => a - b);
    expect(sortedNumbers).toEqual(Array.from({ length: 74 }, (_, i) => i + 1));

    const firstNames = SUSPECTS_DIRECTORY.map(s => extractFirstName(s.name));
    expect(new Set(firstNames).size).toBe(74);
  });

  it('verifies every suspect portraitGif points to an existing file in public/', () => {
    for (const suspect of SUSPECTS_DIRECTORY) {
      expect(suspect.portraitGif.startsWith('./portraits/')).toBe(true);
      const relativePath = suspect.portraitGif.replace(/^\/+/, '');
      const fullPath = path.join(WORKSPACE_ROOT, 'public', relativePath);
      expect(fs.existsSync(fullPath), `Missing portrait file: ${fullPath}`).toBe(true);
    }
  });

  it('supports inclusive gender identities with non-binary and transgender representation', () => {
    const allowedGenders: SuspectGender[] = ['M', 'F', 'Trans M', 'Trans F', 'NB'];
    let diverseCount = 0;
    for (const suspect of SUSPECTS_DIRECTORY) {
      expect(allowedGenders).toContain(suspect.gender);
      if (suspect.gender === 'Trans M' || suspect.gender === 'Trans F' || suspect.gender === 'NB') {
        diverseCount++;
      }
    }
    expect(diverseCount).toBeGreaterThanOrEqual(3);
  });

  it('enforces equal-probability anti-hierarchy invariants on suspects, victim, and narrativeBible', () => {
    for (const suspect of SUSPECTS_DIRECTORY) {
      expect('isCulprit' in suspect).toBe(false);
      expect('eliminatedAtDay' in suspect).toBe(false);
      expect('eliminationReason' in suspect).toBe(false);
    }

    expect('SUSPECTS' in NarrativeBible).toBe(false);

    expect(VICTIM).toHaveProperty('name');
    expect(VICTIM).toHaveProperty('age');
    expect(VICTIM).toHaveProperty('title');
    expect(VICTIM).toHaveProperty('description');
    expect(VICTIM).toHaveProperty('timeOfDeath');
    expect(VICTIM).toHaveProperty('estate');
    expect('locationOfDeath' in VICTIM).toBe(false);
    expect('causeOfDeath' in VICTIM).toBe(false);
    expect('weapon' in VICTIM).toBe(false);
  });

  it('contains zero Justo Segura remnants and zero emojis across M1 source files', () => {
    const m1Files = [
      'src/types/game.ts',
      'src/data/suspectsDirectory.ts',
      'src/data/narrativeBible.ts',
    ];
    for (const relPath of m1Files) {
      const raw = fs.readFileSync(path.join(WORKSPACE_ROOT, relPath), 'utf8');
      expect(raw).not.toMatch(/justo\s+segura/i);
      expect(/\p{Extended_Pictographic}/u.test(raw), `Emoji found in ${relPath}`).toBe(false);
    }
  });

  it('proves all 74 suspect 7-tuples are pairwise unique with minimum Hamming distance >= 2 and coherent prose', () => {
    const tuples: string[][] = [];
    const alibiHoles = new Set<string>();

    for (const suspect of SUSPECTS_DIRECTORY) {
      const a = suspect.attributes;
      expect(a.ageGroup).toBe(expectedAgeGroup(suspect.age));
      expect(a.alibiHole.trim().length).toBeGreaterThan(10);
      expect(suspect.backstory.trim().length).toBeGreaterThan(20);
      expect(suspect.motiveSummary.trim().length).toBeGreaterThan(15);
      expect(suspect.alibiQuote.trim().length).toBeGreaterThan(15);
      alibiHoles.add(a.alibiHole);

      const wingText = `${suspect.alibiQuote} ${a.alibiHole} ${suspect.relation}`;
      expect(
        WING_PATTERNS[a.presenceWing].some(pattern => pattern.test(wingText)),
        `Suspect #${suspect.number} (${suspect.name}) prose does not match presenceWing=${a.presenceWing}`
      ).toBe(true);

      const motiveText = `${suspect.motiveSummary} ${suspect.backstory}`.toLowerCase();
      expect(
        MOTIVE_KEYWORDS[a.motiveTag].some(kw => motiveText.includes(kw)),
        `Suspect #${suspect.number} (${suspect.name}) motiveSummary does not match motiveTag=${a.motiveTag}`
      ).toBe(true);

      tuples.push([
        a.ageGroup,
        a.handedness,
        a.visualMarker,
        a.presenceWing,
        a.forensicTrace,
        a.motiveTag,
        a.accessLevel,
      ]);
    }

    expect(alibiHoles.size).toBe(74);
    expect(new Set(tuples.map(t => JSON.stringify(t))).size).toBe(74);
    expect(computeMinHamming(tuples)).toBeGreaterThanOrEqual(2);

    const elena = SUSPECTS_DIRECTORY.find(s => s.id === 'elena');
    expect(elena?.attributes.handedness).toBe('diestro');
  });

  it('defines 18 weapons across all 5 categories with pairwise-unique 5-tuples and valid lucide-react icons', () => {
    expect(WEAPONS).toHaveLength(18);
    expect(new Set(WEAPONS.map(w => w.id)).size).toBe(18);
    expect(new Set(WEAPONS.map(w => w.name)).size).toBe(18);

    const categoryCounts: Record<WeaponCategory, number> = {
      contundente: 0,
      punzante: 0,
      cortante: 0,
      estrangulamiento: 0,
      veneno: 0,
    };

    const weaponTuples: (readonly [string, string, boolean, string, string])[] = [];
    const iconRegistry = LucideIcons as Record<string, unknown>;

    for (const weapon of WEAPONS) {
      expect('isMurderWeapon' in weapon).toBe(false);
      categoryCounts[weapon.category]++;
      weaponTuples.push([
        weapon.category,
        weapon.material,
        weapon.concealable,
        weapon.woundPattern,
        weapon.forensicTrace,
      ]);
      expect(iconRegistry[weapon.icon], `Invalid lucide-react icon on weapon ${weapon.id}: ${weapon.icon}`).toBeTruthy();
    }

    for (const cat of Object.keys(categoryCounts) as WeaponCategory[]) {
      expect(categoryCounts[cat]).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(weaponTuples.map(t => JSON.stringify(t))).size).toBe(18);
    expect(computeMinHamming(weaponTuples)).toBeGreaterThanOrEqual(2);
  });

  it('defines 9 rooms balanced 3x3x3 across floors with pairwise-unique 4-tuples and valid lucide-react icons', () => {
    expect(LOCATIONS).toHaveLength(9);
    expect(new Set(LOCATIONS.map(l => l.id)).size).toBe(9);
    expect(new Set(LOCATIONS.map(l => l.name)).size).toBe(9);

    const floorCounts = {
      'Planta Baja': 0,
      'Planta Alta': 0,
      Sótano: 0,
    };

    const roomTuples: (readonly [string, string, string, string])[] = [];
    const iconRegistry = LucideIcons as Record<string, unknown>;

    for (const loc of LOCATIONS) {
      expect('isCrimeScene' in loc).toBe(false);
      floorCounts[loc.floor]++;
      roomTuples.push([loc.floor, loc.lockType, loc.surfaceMaterial, loc.ambientTrace]);
      expect(iconRegistry[loc.icon], `Invalid lucide-react icon on location ${loc.id}: ${loc.icon}`).toBeTruthy();
    }

    expect(floorCounts['Planta Baja']).toBe(3);
    expect(floorCounts['Planta Alta']).toBe(3);
    expect(floorCounts['Sótano']).toBe(3);
    expect(new Set(roomTuples.map(t => JSON.stringify(t))).size).toBe(9);
    expect(computeMinHamming(roomTuples)).toBeGreaterThanOrEqual(2);
  });
});
