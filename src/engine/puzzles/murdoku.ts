import { LOCATIONS, WEAPONS } from '../../data/narrativeBible';
import { SUSPECTS_DIRECTORY } from '../../data/suspectsDirectory';
import type {
  CaseConfig,
  Clue,
  MatrixCellState,
  MurdokuConfig,
  MurdokuEntity,
} from '../../types/game';
import { hashClueTag } from './clueIntegration';
import { deriveSeed, mulberry32, shuffle } from './prng';

interface Constraint {
  text: string;
  priority: number;
  matches: (perm: number[]) => boolean;
}

function generatePermutations(n: number): number[][] {
  const result: number[][] = [];
  const arr = Array.from({ length: n }, (_, i) => i);
  const permute = (start: number) => {
    if (start === n) {
      result.push([...arr]);
      return;
    }
    for (let i = start; i < n; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      permute(start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  };
  permute(0);
  return result;
}

function resolveCanonicalTruth(seed: number, caseConfig?: CaseConfig): {
  culpritId: string;
  weaponId: string;
  locationId: string;
} {
  if (caseConfig) {
    return {
      culpritId: caseConfig.culpritId,
      weaponId: caseConfig.weaponId,
      locationId: caseConfig.locationId,
    };
  }
  const cfgRng = mulberry32(deriveSeed(seed, 0, 'case-config'));
  const sIdx = Math.floor(cfgRng() * SUSPECTS_DIRECTORY.length);
  const wIdx = Math.floor(cfgRng() * WEAPONS.length);
  const rIdx = Math.floor(cfgRng() * LOCATIONS.length);
  return {
    culpritId: SUSPECTS_DIRECTORY[sIdx].id,
    weaponId: WEAPONS[wIdx].id,
    locationId: LOCATIONS[rIdx].id,
  };
}

export function generateMurdokuWithProof(
  seed: number,
  day = 1,
  clue?: Clue,
  caseConfig?: CaseConfig
): { config: MurdokuConfig; solutionCount: number } {
  const derived = deriveSeed(seed, day, `murdoku:${hashClueTag(clue)}`);
  const rng = mulberry32(derived);
  const size = day > 14 ? 5 : 4;

  const truth = resolveCanonicalTruth(seed, caseConfig);
  const useWeaponsB = clue?.category === 'weapon';

  const allSuspects: MurdokuEntity[] = SUSPECTS_DIRECTORY.map(s => ({
    id: s.id,
    name: s.name,
  }));
  const allPoolB: MurdokuEntity[] = useWeaponsB
    ? WEAPONS.map(w => ({ id: w.id, name: w.name }))
    : LOCATIONS.map(l => ({ id: l.id, name: l.name }));

  const culpritEntity =
    allSuspects.find(s => s.id === truth.culpritId) ?? allSuspects[0];
  const truthEntityB =
    allPoolB.find(b => b.id === (useWeaponsB ? truth.weaponId : truth.locationId)) ??
    allPoolB[0];

  const decoyA = shuffle(
    rng,
    allSuspects.filter(s => s.id !== culpritEntity.id)
  ).slice(0, size - 1);
  const decoyB = shuffle(
    rng,
    allPoolB.filter(b => b.id !== truthEntityB.id)
  ).slice(0, size - 1);

  const itemsA = shuffle(rng, [culpritEntity, ...decoyA]);
  const itemsB = shuffle(rng, [truthEntityB, ...decoyB]);

  const culpritIdxA = itemsA.findIndex(a => a.id === culpritEntity.id);
  const truthIdxB = itemsB.findIndex(b => b.id === truthEntityB.id);

  // Build truePerm so that itemsA[culpritIdxA] always maps to itemsB[truthIdxB]
  const remainingBIndices = shuffle(
    rng,
    Array.from({ length: size }, (_, i) => i).filter(i => i !== truthIdxB)
  );
  const truePerm: number[] = new Array<number>(size).fill(0);
  let remPtr = 0;
  for (let i = 0; i < size; i++) {
    if (i === culpritIdxA) {
      truePerm[i] = truthIdxB;
    } else {
      truePerm[i] = remainingBIndices[remPtr++];
    }
  }

  const targetMatches = itemsA.map((a, idx) => ({
    aId: a.id,
    bId: itemsB[truePerm[idx]].id,
  }));

  const candidates: Constraint[] = [];

  // 1. Cross-pair exclusions: neither A_i nor A_j matched B_k
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      for (let k = 0; k < size; k++) {
        if (truePerm[i] !== k && truePerm[j] !== k) {
          candidates.push({
            text: `Ni ${itemsA[i].name} ni ${itemsA[j].name} corresponden con ${itemsB[k].name}.`,
            priority: 1,
            matches: perm => perm[i] !== k && perm[j] !== k,
          });
        }
      }
    }
  }

  // 2. Disjunctive domains: A_i is either B_x or B_y (2 options)
  for (let i = 0; i < size; i++) {
    const actual = truePerm[i];
    const others = shuffle(
      rng,
      Array.from({ length: size }, (_, k) => k).filter(k => k !== actual)
    );
    const decoy = others[0];
    const pair = rng() < 0.5 ? [actual, decoy] : [decoy, actual];
    candidates.push({
      text: `${itemsA[i].name} solo pudo vincularse con ${itemsB[pair[0]].name} o con ${itemsB[pair[1]].name}.`,
      priority: 2,
      matches: perm => perm[i] === pair[0] || perm[i] === pair[1],
    });
  }

  // 3. Single negative exclusions
  for (let i = 0; i < size; i++) {
    for (let k = 0; k < size; k++) {
      if (truePerm[i] !== k) {
        candidates.push({
          text: `${itemsA[i].name} no estuvo asociado a ${itemsB[k].name}.`,
          priority: 3,
          matches: perm => perm[i] !== k,
        });
      }
    }
  }

  // 4. Fallback direct anchor (lowest priority, used only if needed)
  for (let i = 0; i < size; i++) {
    const k = truePerm[i];
    candidates.push({
      text: `Se confirmó por testigo directo que ${itemsA[i].name} coincide con ${itemsB[k].name}.`,
      priority: 4,
      matches: perm => perm[i] === k,
    });
  }

  const orderedCandidates = shuffle(rng, candidates).sort((a, b) => a.priority - b.priority);
  const allPerms = generatePermutations(size);
  let remaining = allPerms;
  const chosen: Constraint[] = [];

  for (const c of orderedCandidates) {
    if (remaining.length === 1) break;
    const filtered = remaining.filter(c.matches);
    if (filtered.length < remaining.length && filtered.length >= 1) {
      chosen.push(c);
      remaining = filtered;
    }
  }

  // Prune redundant constraints while preserving uniqueness === 1
  for (let idx = chosen.length - 1; idx >= 0; idx--) {
    const without = chosen.filter((_, i) => i !== idx);
    const survivors = allPerms.filter(p => without.every(c => c.matches(p)));
    if (survivors.length === 1) {
      chosen.splice(idx, 1);
    }
  }

  const finalSurvivors = allPerms.filter(p => chosen.every(c => c.matches(p)));
  const titleBBase = useWeaponsB ? 'Armas' : 'Estancias';
  const titleB = clue ? `${titleBBase} (${clue.impact})` : titleBBase;

  return {
    config: {
      groupA: { title: 'Sospechosos', items: itemsA },
      groupB: { title: titleB, items: itemsB },
      clues: chosen.map(c => c.text),
      targetMatches,
      resetOnMistake: true,
    },
    solutionCount: finalSurvivors.length,
  };
}

export function generateMurdoku(
  seed: number,
  day = 1,
  clue?: Clue,
  caseConfig?: CaseConfig
): MurdokuConfig {
  return generateMurdokuWithProof(seed, day, clue, caseConfig).config;
}

export function isMurdokuMoveMistake(
  config: MurdokuConfig,
  aId: string,
  bId: string,
  nextState: MatrixCellState
): boolean {
  if (nextState === 'neutral' || nextState === 'question') {
    return false;
  }
  const isTarget = config.targetMatches.some(m => m.aId === aId && m.bId === bId);
  if (nextState === 'check' && !isTarget) return true;
  if (nextState === 'cross' && isTarget) return true;
  return false;
}

export function validateMurdoku(
  config: MurdokuConfig,
  cells: Record<string, MatrixCellState>
): boolean {
  const targetKeys = new Set(config.targetMatches.map(m => `${m.aId}:${m.bId}`));
  for (const a of config.groupA.items) {
    for (const b of config.groupB.items) {
      const key = `${a.id}:${b.id}`;
      const state = cells[key] ?? 'neutral';
      if (targetKeys.has(key)) {
        if (state !== 'check') return false;
      } else {
        if (state === 'check') return false;
      }
    }
  }
  return true;
}
