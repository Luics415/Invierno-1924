import type { MatrixCellState, MurdokuConfig, MurdokuEntity } from '../../types/game';
import { deriveSeed, mulberry32, sampleN, shuffle } from './prng';

interface DomainPair {
  titleA: string;
  itemsA: MurdokuEntity[];
  titleB: string;
  itemsB: MurdokuEntity[];
  orderedB: boolean;
}

const MURDOKU_DOMAINS: readonly DomainPair[] = [
  {
    titleA: 'Sospechosos',
    itemsA: [
      { id: 's-bea', name: 'Beatriz' },
      { id: 's-gas', name: 'Gastón' },
      { id: 's-ire', name: 'Irene' },
      { id: 's-dar', name: 'Darío' },
      { id: 's-noa', name: 'Noa' },
    ],
    titleB: 'Estancias',
    itemsB: [
      { id: 'r-bib', name: 'Biblioteca' },
      { id: 'r-inv', name: 'Invernadero' },
      { id: 'r-bod', name: 'Bodega' },
      { id: 'r-sal', name: 'Salón' },
      { id: 'r-des', name: 'Despacho' },
    ],
    orderedB: false,
  },
  {
    titleA: 'Testigos',
    itemsA: [
      { id: 't-clara', name: 'Clara' },
      { id: 't-mateo', name: 'Mateo' },
      { id: 't-sofia', name: 'Sofía' },
      { id: 't-bruno', name: 'Bruno' },
      { id: 't-elena', name: 'Elena' },
    ],
    titleB: 'Horas',
    itemsB: [
      { id: 'h-2000', name: '20:00 h' },
      { id: 'h-2045', name: '20:45 h' },
      { id: 'h-2130', name: '21:30 h' },
      { id: 'h-2215', name: '22:15 h' },
      { id: 'h-2300', name: '23:00 h' },
    ],
    orderedB: true,
  },
  {
    titleA: 'Sospechosos',
    itemsA: [
      { id: 'p-leo', name: 'Leopoldo' },
      { id: 'p-vera', name: 'Vera' },
      { id: 'p-omar', name: 'Omar' },
      { id: 'p-alba', name: 'Alba' },
      { id: 'p-hugo', name: 'Hugo' },
    ],
    titleB: 'Objetos',
    itemsB: [
      { id: 'o-lla', name: 'Llave' },
      { id: 'o-car', name: 'Carta' },
      { id: 'o-fri', name: 'Frasco' },
      { id: 'o-rel', name: 'Reloj' },
      { id: 'o-dag', name: 'Daga' },
    ],
    orderedB: false,
  },
];

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

export function generateMurdokuWithProof(
  seed: number,
  day = 1
): { config: MurdokuConfig; solutionCount: number } {
  const derived = deriveSeed(seed, day, 'murdoku');
  const rng = mulberry32(derived);
  const size = day > 14 ? 5 : 4;
  const domain = MURDOKU_DOMAINS[(day + Math.floor(rng() * MURDOKU_DOMAINS.length)) % MURDOKU_DOMAINS.length];

  const itemsA = sampleN(rng, domain.itemsA, size);
  const itemsB = domain.orderedB
    ? domain.itemsB.slice(0, size)
    : sampleN(rng, domain.itemsB, size);

  const truePerm = shuffle(
    rng,
    Array.from({ length: size }, (_, i) => i)
  );
  const targetMatches = itemsA.map((a, idx) => ({
    aId: a.id,
    bId: itemsB[truePerm[idx]].id,
  }));

  const candidates: Constraint[] = [];

  // 1. Cross-pair exclusions: neither A_i nor A_j matched B_k (harder than direct single exclusion)
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

  // 3. Ordering clues if domain is ordered (e.g. Hours)
  if (domain.orderedB) {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i !== j && truePerm[i] < truePerm[j]) {
          candidates.push({
            text: `${itemsA[i].name} fue registrado antes que ${itemsA[j].name}.`,
            priority: 1,
            matches: perm => perm[i] < perm[j],
          });
        }
      }
    }
  }

  // 4. Single negative exclusions
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

  // 5. Fallback direct anchor (lowest priority, used only if needed)
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

  return {
    config: {
      groupA: { title: domain.titleA, items: itemsA },
      groupB: { title: domain.titleB, items: itemsB },
      clues: chosen.map(c => c.text),
      targetMatches,
      resetOnMistake: true,
    },
    solutionCount: finalSurvivors.length,
  };
}

export function generateMurdoku(seed: number, day = 1): MurdokuConfig {
  return generateMurdokuWithProof(seed, day).config;
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
