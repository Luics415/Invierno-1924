import {
  GENDER_LABELS,
  type AccessLevel,
  type AgeGroup,
  type CluePredicate,
  type ForensicTrace,
  type Handedness,
  type MotiveTag,
  type PresenceWing,
  type SuspectCategory,
  type SuspectGender,
  type VisualMarker,
  type WeaponCategory,
  type WeaponMaterial,
} from '../types/game';
import { SUSPECTS_DIRECTORY } from '../data/suspectsDirectory';
import { LOCATIONS, WEAPONS } from '../data/narrativeBible';
import { pickOne, type Rng } from './puzzles/prng';
import {
  ACCESS_LEVEL_LABEL,
  ACCESS_LEVEL_SHORT,
  AGE_GROUP_LABEL,
  AGE_GROUP_SHORT,
  AMBIENT_TRACE_LABEL,
  CATEGORY_LABEL,
  FLOOR_LABEL,
  FORENSIC_TRACE_LABEL,
  GENDER_CLAUSE_LABEL,
  GENDER_SHORT,
  HANDEDNESS_LABEL,
  HANDEDNESS_SHORT,
  LOCK_TYPE_LABEL,
  LOCK_TYPE_SHORT,
  MOTIVE_LABEL,
  MOTIVE_SHORT,
  PRESENCE_WING_LABEL,
  PRESENCE_WING_SHORT,
  SURFACE_LABEL,
  SURFACE_SHORT,
  VISUAL_MARKER_LABEL,
  VISUAL_MARKER_SHORT,
  WEAPON_CATEGORY_LABEL,
  WEAPON_CATEGORY_SHORT,
  WEAPON_MATERIAL_LABEL,
  WEAPON_TRACE_LABEL,
  WOUND_PATTERN_LABEL,
  WOUND_PATTERN_SHORT,
  toPuzzleText,
} from './clueLabels';

export interface ClueDescription {
  text: string;
  impact: string;
  keyphrase: string;
  evidenceType: 'letter' | 'newspaper' | 'telegram' | 'autopsy' | 'diary' | 'map' | 'photo';
}

function asArray(v: string | string[]): string[] {
  return Array.isArray(v) ? v : [v];
}

function sanitizeRawValue(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function asNonEmptyArray(v: string | string[]): string[] {
  return asArray(v)
    .map(item => item.trim())
    .filter(item => sanitizeRawValue(item).length > 0);
}

function stripLeadingAcceso(label: string): string {
  return label.replace(/^acceso\s+/i, '').trim() || label;
}

function toClueKeyphrase(raw: string): string {
  return toPuzzleText(raw).replace(/(?<=^|\s)([A-ZÑ0-9]+)(?:\s+\1)+(?=\s|$)/g, '$1');
}

function suspectFallback(): ClueDescription {
  return {
    text: 'El examen minucioso de los registros aporta un nuevo filtro decisivo sobre los presentes en Villa Acebo.',
    impact: 'Filtro deductivo registrado',
    keyphrase: 'INDICIO DE VILLA ACEBO',
    evidenceType: 'diary',
  };
}

function weaponFallback(): ClueDescription {
  return {
    text: 'El peritaje de objetos de la mansión estrecha la lista de armas compatibles con el ataque.',
    impact: 'Peritaje de arma registrado',
    keyphrase: 'PERITAJE DE ARMA HOMICIDA',
    evidenceType: 'autopsy',
  };
}

function roomFallback(): ClueDescription {
  return {
    text: 'Los planos de la mansión acotan con precisión las habitaciones compatibles con la escena del crimen.',
    impact: 'Estancia acotada en planos',
    keyphrase: 'ESCENA EN VILLA ACEBO',
    evidenceType: 'map',
  };
}

function joinSpanishOr(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} o ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} o ${items[items.length - 1]}`;
}

function deArticle(label: string): string {
  if (label.startsWith('el ') || label.startsWith('El ')) {
    return `del ${label.slice(3)}`;
  }
  return `de ${label}`;
}

function aArticle(label: string): string {
  if (label.startsWith('el ') || label.startsWith('El ')) {
    return `al ${label.slice(3)}`;
  }
  return `a ${label}`;
}

export function describeSuspectPredicate(pred: CluePredicate, rng: Rng): ClueDescription {
  if (pred.kind === 'suspectAttr') {
    const { field, op, value } = pred;
    const vals = asNonEmptyArray(value);
    if (vals.length === 0) return suspectFallback();

    switch (field) {
      case 'ageGroup': {
        const labelOf = (v: string) =>
          AGE_GROUP_LABEL[v as AgeGroup] ?? `tenía el perfil de edad ${sanitizeRawValue(v)}`;
        const shortOf = (v: string) => AGE_GROUP_SHORT[v as AgeGroup] ?? sanitizeRawValue(v);
        if (op === 'eq') {
          const v = vals[0];
          const text = pickOne(rng, [
            `El estudio biomecánico y los testimonios confirman que el culpable ${labelOf(v)}.`,
            `Las marcas de fuerza en la escena corresponden a una persona que ${labelOf(v)}.`,
          ]);
          return {
            text,
            impact: `Edad confirmada: ${shortOf(v)}`,
            keyphrase: toClueKeyphrase(`EDAD ${shortOf(v)}`),
            evidenceType: 'autopsy',
          };
        }
        if (op === 'neq') {
          const v = vals[0];
          return {
            text: `La reconstrucción horaria descarta por completo a cualquier sospechoso que ${labelOf(v)}.`,
            impact: `Edad descartada: ${shortOf(v)}`,
            keyphrase: toClueKeyphrase(`NO EDAD ${shortOf(v)}`),
            evidenceType: 'diary',
          };
        }
        return {
          text: `Dos testigos aseguran que la silueta avistada ${joinSpanishOr(vals.map(labelOf))}.`,
          impact: `Edad acotada: ${vals.map(shortOf).join(' / ')}`,
          keyphrase: toClueKeyphrase(`EDAD ${vals.map(shortOf).join(' O ')}`),
          evidenceType: 'photo',
        };
      }

      case 'handedness': {
        const labelOf = (v: string) =>
          HANDEDNESS_LABEL[v as Handedness] ?? `presenta lateralidad ${sanitizeRawValue(v)}`;
        const shortOf = (v: string) => HANDEDNESS_SHORT[v as Handedness] ?? sanitizeRawValue(v);
        if (op === 'eq') {
          const v = vals[0];
          return {
            text: `La disposición de los objetos y las marcas de manipulación en la escena prueban que el culpable ${labelOf(v)}.`,
            impact: `Lateralidad confirmada: ${shortOf(v)}`,
            keyphrase: toClueKeyphrase(`EL ASESINO ES ${shortOf(v)}`),
            evidenceType: 'autopsy',
          };
        }
        if (op === 'neq') {
          const v = vals[0];
          return {
            text: `El análisis de manipulación y rastros físicos descarta a cualquiera que ${labelOf(v)}.`,
            impact: `Lateralidad descartada: ${shortOf(v)}`,
            keyphrase: toClueKeyphrase(`DESCARTE LATERALIDAD ${shortOf(v)}`),
            evidenceType: 'autopsy',
          };
        }
        return {
          text: `El informe forense acota la mano dominante: el autor solo puede ser ${joinSpanishOr(vals.map(shortOf))}.`,
          impact: `Lateralidad posible: ${vals.map(shortOf).join(' / ')}`,
          keyphrase: toClueKeyphrase(`MANO ${vals.map(shortOf).join(' O ')}`),
          evidenceType: 'autopsy',
        };
      }

      case 'visualMarker': {
        const labelOf = (v: string) =>
          VISUAL_MARKER_LABEL[v as VisualMarker] ?? `llevaba el rasgo distintivo ${sanitizeRawValue(v)}`;
        const shortOf = (v: string) => VISUAL_MARKER_SHORT[v as VisualMarker] ?? sanitizeRawValue(v);
        if (op === 'eq') {
          const v = vals[0];
          if (v === 'ninguno') {
            return {
              text: 'La observación en el corredor confirmó que el culpable no llevaba ningún rasgo distintivo visible (sin lentes, cicatriz, joya, guantes, tatuaje, barba ni tocado).',
              impact: 'Sin rasgo distintivo visible',
              keyphrase: toClueKeyphrase('SIN RASGO DISTINTIVO'),
              evidenceType: 'photo',
            };
          }
          return {
            text: `Un reflejo en el pasillo bajo la luz de las velas confirmó que el culpable ${labelOf(v)}.`,
            impact: `Rasgo visual confirmado: ${shortOf(v)}`,
            keyphrase: toClueKeyphrase(`RASGO ${shortOf(v)}`),
            evidenceType: 'photo',
          };
        }
        if (op === 'neq') {
          const v = vals[0];
          if (v === 'ninguno') {
            return {
              text: 'El testigo del vestíbulo distingue con claridad que el culpable portaba algún rasgo distintivo visible (lentes, cicatriz, joya, guantes, tatuaje, barba o tocado).',
              impact: 'Presenta rasgo distintivo visible',
              keyphrase: toClueKeyphrase('CON RASGO DISTINTIVO'),
              evidenceType: 'photo',
            };
          }
          return {
            text: `El testimonio del vestíbulo descarta a quien ${labelOf(v)}.`,
            impact: `Rasgo descartado: ${shortOf(v)}`,
            keyphrase: toClueKeyphrase(`SIN ${shortOf(v)}`),
            evidenceType: 'photo',
          };
        }
        const clauses = vals.map(m =>
          m === 'ninguno' ? 'no tenía ningún rasgo distintivo a la vista' : labelOf(m)
        );
        return {
          text: `La placa fotográfica borrosa limita el rasgo exterior del autor: ${joinSpanishOr(clauses)}.`,
          impact: `Rasgo acotado: ${vals.map(shortOf).join(' / ')}`,
          keyphrase: toClueKeyphrase(`RASGO ${vals.map(shortOf).join(' O ')}`),
          evidenceType: 'photo',
        };
      }

      case 'presenceWing': {
        const labelOf = (v: string) =>
          PRESENCE_WING_LABEL[v as PresenceWing] ?? `el sector ${sanitizeRawValue(v)}`;
        const shortOf = (v: string) => PRESENCE_WING_SHORT[v as PresenceWing] ?? sanitizeRawValue(v);
        if (op === 'eq') {
          const v = vals[0];
          return {
            text: `Las pisadas húmedas en la alfombra confirman que el culpable operó desde ${labelOf(v)} durante el apagón.`,
            impact: `Sector de presencia: ${shortOf(v)}`,
            keyphrase: toClueKeyphrase(`SECTOR ${labelOf(v)}`),
            evidenceType: 'map',
          };
        }
        if (op === 'neq') {
          const v = vals[0];
          return {
            text: `El cierre temporal de los corredores impidió que nadie ubicado en ${labelOf(v)} llegara a tiempo al crimen.`,
            impact: `Sector exculpado: ${shortOf(v)}`,
            keyphrase: toClueKeyphrase(`NO DESDE ${labelOf(v)}`),
            evidenceType: 'map',
          };
        }
        return {
          text: `El croquis de tiempos de desplazamiento demuestra que el atacante partió desde ${joinSpanishOr(vals.map(labelOf))}.`,
          impact: `Sectores posibles: ${vals.map(shortOf).join(' / ')}`,
          keyphrase: toClueKeyphrase(`RUTA ${vals.map(shortOf).join(' O ')}`),
          evidenceType: 'map',
        };
      }

      case 'forensicTrace': {
        const labelOf = (v: string) => FORENSIC_TRACE_LABEL[v as ForensicTrace] ?? sanitizeRawValue(v);
        if (op === 'eq') {
          const v = vals[0];
          return {
            text: `El análisis microscópico recogió restos inequívocos ${deArticle(labelOf(v))} en las solapas de Don Arturo.`,
            impact: `Rastro forense hallado: ${labelOf(v)}`,
            keyphrase: toClueKeyphrase(`RASTRO DE ${labelOf(v)}`),
            evidenceType: 'autopsy',
          };
        }
        if (op === 'neq') {
          const v = vals[0];
          return {
            text: `Los reactivos químicos confirman la ausencia total ${deArticle(labelOf(v))} en el cadáver; quedan descartados quienes portan ese rastro.`,
            impact: `Rastro ausente: ${labelOf(v)}`,
            keyphrase: toClueKeyphrase(`SIN RASTRO DE ${labelOf(v)}`),
            evidenceType: 'autopsy',
          };
        }
        return {
          text: `El residuo recolectado bajo las uñas de la víctima corresponde ${aArticle(joinSpanishOr(vals.map(labelOf)))}.`,
          impact: `Rastro acotado: ${vals.map(labelOf).join(' / ')}`,
          keyphrase: toClueKeyphrase(`RESIDUO ${vals.map(labelOf).join(' O ')}`),
          evidenceType: 'autopsy',
        };
      }

      case 'motiveTag': {
        const labelOf = (v: string) =>
          MOTIVE_LABEL[v as MotiveTag] ?? `un móvil vinculado ${aArticle(sanitizeRawValue(v))}`;
        const shortOf = (v: string) => MOTIVE_SHORT[v as MotiveTag] ?? sanitizeRawValue(v);
        if (op === 'eq') {
          const v = vals[0];
          return {
            text: `Una carta quemada a medias en el secreter revela que el homicidio fue impulsado por ${labelOf(v)}.`,
            impact: `Móvil acreditado: ${shortOf(v)}`,
            keyphrase: toClueKeyphrase(`MOVIL POR ${shortOf(v)}`),
            evidenceType: 'letter',
          };
        }
        if (op === 'neq') {
          const v = vals[0];
          return {
            text: `Los legajos de la notaría descartan que el crimen guardara relación con ${labelOf(v)}.`,
            impact: `Móvil descartado: ${shortOf(v)}`,
            keyphrase: toClueKeyphrase(`NO FUE POR ${shortOf(v)}`),
            evidenceType: 'letter',
          };
        }
        return {
          text: `El borrador del nuevo testamento señala que el ataque responde únicamente ${aArticle(joinSpanishOr(vals.map(labelOf)))}.`,
          impact: `Móviles posibles: ${vals.map(shortOf).join(' / ')}`,
          keyphrase: toClueKeyphrase(`MOVIL ${vals.map(shortOf).join(' O ')}`),
          evidenceType: 'letter',
        };
      }

      case 'accessLevel': {
        const labelOf = (v: string) =>
          ACCESS_LEVEL_LABEL[v as AccessLevel] ?? `disponía de permiso de acceso ${sanitizeRawValue(v)}`;
        const shortOf = (v: string) => ACCESS_LEVEL_SHORT[v as AccessLevel] ?? sanitizeRawValue(v);
        if (op === 'eq') {
          const v = vals[0];
          const short = shortOf(v);
          return {
            text: `El registro de llaves y cerraduras acredita que el autor ${labelOf(v)}.`,
            impact: `Nivel de acceso: ${short}`,
            keyphrase: toClueKeyphrase(`ACCESO ${stripLeadingAcceso(short)}`),
            evidenceType: 'map',
          };
        }
        if (op === 'neq') {
          const v = vals[0];
          const short = shortOf(v);
          return {
            text: `Las puertas de servicio cerradas por dentro excluyen a cualquiera que ${labelOf(v)}.`,
            impact: `Acceso descartado: ${short}`,
            keyphrase: toClueKeyphrase(`NO ACCESO ${stripLeadingAcceso(short)}`),
            evidenceType: 'map',
          };
        }
        return {
          text: `Solo alguien que ${joinSpanishOr(vals.map(labelOf))} pudo atravesar el corredor sin activar las alertas.`,
          impact: `Accesos posibles: ${vals.map(shortOf).join(' / ')}`,
          keyphrase: toClueKeyphrase(`PASO ${vals.map(shortOf).join(' O ')}`),
          evidenceType: 'map',
        };
      }
    }
  }

  if (pred.kind === 'suspectIdentity') {
    const vals = asNonEmptyArray(pred.value);
    if (vals.length === 0) return suspectFallback();

    if (pred.field === 'category') {
      const labelOf = (v: string) => CATEGORY_LABEL[v as SuspectCategory] ?? sanitizeRawValue(v);
      const displayOf = (v: string) => (v in CATEGORY_LABEL ? v : sanitizeRawValue(v));
      const cat = vals[0];
      if (pred.op === 'eq') {
        return {
          text: `El cuaderno de registro nocturno limita al autor del crimen al círculo ${deArticle(labelOf(cat))}.`,
          impact: `Grupo confirmado: ${displayOf(cat)}`,
          keyphrase: toClueKeyphrase(`GRUPO ${displayOf(cat)}`),
          evidenceType: 'diary',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `Las declaraciones cruzadas de la velada exculpan en bloque ${aArticle(labelOf(cat))}.`,
          impact: `Grupo exculpado: ${displayOf(cat)}`,
          keyphrase: toClueKeyphrase(`DESCARTE ${displayOf(cat)}`),
          evidenceType: 'newspaper',
        };
      }
      return {
        text: `El cuaderno nocturno restringe al autor del crimen ${aArticle(joinSpanishOr(vals.map(labelOf)))}.`,
        impact: `Grupos posibles: ${vals.map(displayOf).join(' / ')}`,
        keyphrase: toClueKeyphrase(`GRUPO ${vals.map(displayOf).join(' O ')}`),
        evidenceType: 'diary',
      };
    }

    if (pred.field === 'gender') {
      const clauseOf = (v: string) =>
        GENDER_CLAUSE_LABEL[v as SuspectGender] ?? `consta como ${sanitizeRawValue(v)} en el censo`;
      const labelOf = (v: string) => GENDER_LABELS[v as SuspectGender] ?? sanitizeRawValue(v);
      const shortOf = (v: string) => GENDER_SHORT[v as SuspectGender] ?? sanitizeRawValue(v);
      const g = vals[0];
      if (pred.op === 'eq') {
        return {
          text: `Los testimonios cruzados confirman que el culpable ${clauseOf(g)}.`,
          impact: `Género confirmado: ${labelOf(g)}`,
          keyphrase: toClueKeyphrase(`GENERO ${shortOf(g)}`),
          evidenceType: 'diary',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `Las declaraciones de la velada descartan a cualquier persona que ${clauseOf(g)}.`,
          impact: `Género descartado: ${labelOf(g)}`,
          keyphrase: toClueKeyphrase(`NO GENERO ${shortOf(g)}`),
          evidenceType: 'diary',
        };
      }
      return {
        text: `Los testigos acotan el perfil censal del culpable ${aArticle(joinSpanishOr(vals.map(v => labelOf(v).toLowerCase())))}.`,
        impact: `Género acotado: ${vals.map(labelOf).join(' / ')}`,
        keyphrase: toClueKeyphrase(`GENERO ${vals.map(shortOf).join(' O ')}`),
        evidenceType: 'diary',
      };
    }

    if (pred.field === 'id') {
      const names = vals.map(id => SUSPECTS_DIRECTORY.find(s => s.id === id)?.name ?? sanitizeRawValue(id));
      if (pred.op === 'eq') {
        const name = names[0];
        return {
          text: `El cotejo final de pruebas señala sin sombra de duda ${aArticle(name)} como autor del crimen.`,
          impact: `Sospechoso identificado: ${name}`,
          keyphrase: toClueKeyphrase(`CULPABLE ${name}`),
          evidenceType: 'telegram',
        };
      }
      if (pred.op === 'neq') {
        const name = names[0];
        return {
          text: `Una verificación independiente de testigos confirma la coartada ${deArticle(name)} a las 23:15 h; queda libre de toda sospecha.`,
          impact: `Coartada verificada: ${name}`,
          keyphrase: toClueKeyphrase(`COARTADA CONFIRMADA ${name}`),
          evidenceType: 'telegram',
        };
      }
      return {
        text: `Las coartadas sin confirmar reducen la autoría ${aArticle(joinSpanishOr(names))}.`,
        impact: `Sospechosos posibles: ${names.join(' / ')}`,
        keyphrase: toClueKeyphrase(`ENTRE ${names.join(' O ')}`),
        evidenceType: 'telegram',
      };
    }
  }

  if (pred.kind === 'suspectAgeRange') {
    let rangeText: string;
    let rangeImpact: string;
    let rangeKey: string;

    if (pred.min !== undefined && pred.max !== undefined) {
      rangeText = `entre los ${pred.min} y los ${pred.max} años`;
      rangeImpact = `${pred.min}–${pred.max} años`;
      rangeKey = `ENTRE ${pred.min} Y ${pred.max} AÑOS`;
    } else if (pred.min !== undefined) {
      rangeText = `de ${pred.min} años o más`;
      rangeImpact = `${pred.min} años o más`;
      rangeKey = `${pred.min} AÑOS O MAS`;
    } else if (pred.max !== undefined) {
      rangeText = `de ${pred.max} años o menos`;
      rangeImpact = `${pred.max} años o menos`;
      rangeKey = `HASTA ${pred.max} AÑOS`;
    } else {
      rangeText = 'dentro del perfil registrado';
      rangeImpact = 'edad registrada';
      rangeKey = 'REGISTRADA';
    }

    if (pred.negate) {
      return {
        text: `El peritaje médico descarta que el culpable tenga una edad ${rangeText}.`,
        impact: `Edad descartada: ${rangeImpact}`,
        keyphrase: toClueKeyphrase(`NO EDAD ${rangeKey}`),
        evidenceType: 'autopsy',
      };
    }

    return {
      text: `La ficha antropométrica y las notas médicas sitúan la edad del culpable ${rangeText}.`,
      impact: `Edad acotada: ${rangeImpact}`,
      keyphrase: toClueKeyphrase(`EDAD ${rangeKey}`),
      evidenceType: 'autopsy',
    };
  }

  return suspectFallback();
}

export function describeWeaponPredicate(pred: CluePredicate, rng: Rng): ClueDescription {
  if (pred.kind === 'weaponConcealable') {
    if (pred.value) {
      return {
        text: pickOne(rng, [
          'Ningún testigo vio al atacante portar objetos voluminosos: el arma homicida pudo ocultarse bajo un abrigo o bolsillo.',
          'El tamaño reducido de la funda improvisada demuestra que el arma empleada es fácilmente ocultable.',
        ]),
        impact: 'Arma ocultable confirmada',
        keyphrase: 'ARMA OCULTABLE EN ABRIGO',
        evidenceType: 'photo',
      };
    }
    return {
      text: pickOne(rng, [
        'Las marcas de arrastre junto al umbral prueban que el arma era pesada o voluminosa e imposible de ocultar en un bolsillo.',
        'El arma homicida tuvo que transportarse a la vista o esconderse en un mueble: no es un objeto ocultable.',
      ]),
      impact: 'Arma no ocultable (voluminosa)',
      keyphrase: 'ARMA PESADA NO OCULTABLE',
      evidenceType: 'photo',
    };
  }

  if (pred.kind === 'weaponAttr') {
    const vals = asNonEmptyArray(pred.value);
    if (vals.length === 0) return weaponFallback();

    if (pred.field === 'category') {
      const labelOf = (v: string) =>
        WEAPON_CATEGORY_LABEL[v as WeaponCategory] ?? `un arma de categoría ${sanitizeRawValue(v)}`;
      const shortOf = (v: string) => WEAPON_CATEGORY_SHORT[v as WeaponCategory] ?? sanitizeRawValue(v);
      const cat = vals[0];
      if (pred.op === 'eq') {
        return {
          text: `La autopsia preliminar es categórica: Don Arturo murió por ${labelOf(cat)}.`,
          impact: `Tipo de arma: ${shortOf(cat)}`,
          keyphrase: toClueKeyphrase(`ARMA TIPO ${shortOf(cat)}`),
          evidenceType: 'autopsy',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `El examen forense descarta que la muerte fuera provocada por ${labelOf(cat)}.`,
          impact: `Categoría descartada: ${shortOf(cat)}`,
          keyphrase: toClueKeyphrase(`NO FUE ARMA ${shortOf(cat)}`),
          evidenceType: 'autopsy',
        };
      }
      return {
        text: `La autopsia preliminar acota el arma mortal ${aArticle(joinSpanishOr(vals.map(labelOf)))}.`,
        impact: `Categorías posibles: ${vals.map(shortOf).join(' / ')}`,
        keyphrase: toClueKeyphrase(`ARMA ${vals.map(shortOf).join(' O ')}`),
        evidenceType: 'autopsy',
      };
    }

    if (pred.field === 'material') {
      const labelOf = (v: string) => WEAPON_MATERIAL_LABEL[v as WeaponMaterial] ?? sanitizeRawValue(v);
      const mat = vals[0];
      if (pred.op === 'eq') {
        return {
          text: `Las partículas adheridas a la lesión confirman que el arma está compuesta ${deArticle(labelOf(mat))}.`,
          impact: `Material del arma: ${labelOf(mat)}`,
          keyphrase: toClueKeyphrase(`MATERIAL DEL ARMA ${labelOf(mat)}`),
          evidenceType: 'autopsy',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `El espectro químico descarta cualquier instrumento fabricado en ${labelOf(mat)}.`,
          impact: `Material descartado: ${labelOf(mat)}`,
          keyphrase: toClueKeyphrase(`SIN RASTRO DE ${labelOf(mat)}`),
          evidenceType: 'autopsy',
        };
      }
      return {
        text: `El espectro químico restringe el material del arma ${aArticle(joinSpanishOr(vals.map(labelOf)))}.`,
        impact: `Materiales posibles: ${vals.map(labelOf).join(' / ')}`,
        keyphrase: toClueKeyphrase(`MATERIAL ${vals.map(labelOf).join(' O ')}`),
        evidenceType: 'autopsy',
      };
    }

    if (pred.field === 'forensicTrace') {
      const labels = vals.map(v => WEAPON_TRACE_LABEL[v] ?? sanitizeRawValue(v));
      const label = labels[0];
      if (pred.op === 'eq') {
        return {
          text: `En la herida se detectó un rastro característico ${deArticle(label)} transferido directamente por el arma homicida.`,
          impact: `Residuo del arma: ${label}`,
          keyphrase: toClueKeyphrase(`ARMA CON ${label}`),
          evidenceType: 'autopsy',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `Las muestras del cuerpo no presentan indicio alguno ${deArticle(label)}, lo que descarta las armas impregnadas con esa sustancia.`,
          impact: `Residuo de arma descartado: ${label}`,
          keyphrase: toClueKeyphrase(`ARMA SIN ${label}`),
          evidenceType: 'autopsy',
        };
      }
      return {
        text: `Los reactivos sobre la lesión acotan el residuo del arma ${aArticle(joinSpanishOr(labels))}.`,
        impact: `Residuos posibles del arma: ${labels.join(' / ')}`,
        keyphrase: toClueKeyphrase(`RESIDUO ARMA ${labels.join(' O ')}`),
        evidenceType: 'autopsy',
      };
    }

    if (pred.field === 'woundPattern') {
      const labels = vals.map(v => WOUND_PATTERN_LABEL[v] ?? `lesiones compatibles con ${sanitizeRawValue(v)}`);
      const shorts = vals.map(v => WOUND_PATTERN_SHORT[v] ?? sanitizeRawValue(v));
      if (pred.op === 'eq') {
        return {
          text: `El dictamen tanatológico definitivo identifica ${labels[0]}, firma inequívoca del instrumento letal.`,
          impact: `Lesión exacta: ${shorts[0]}`,
          keyphrase: toClueKeyphrase(`LESION ${shorts[0]}`),
          evidenceType: 'autopsy',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `El examen tanatológico descarta cualquier arma que produzca ${labels[0]}.`,
          impact: `Lesión descartada: ${shorts[0]}`,
          keyphrase: toClueKeyphrase(`SIN LESION ${shorts[0]}`),
          evidenceType: 'autopsy',
        };
      }
      return {
        text: `El dictamen forense acota el patrón de lesión ${aArticle(joinSpanishOr(labels))}.`,
        impact: `Lesiones posibles: ${shorts.join(' / ')}`,
        keyphrase: toClueKeyphrase(`LESION ${shorts.join(' O ')}`),
        evidenceType: 'autopsy',
      };
    }

    if (pred.field === 'id') {
      const names = vals.map(id => WEAPONS.find(item => item.id === id)?.name ?? sanitizeRawValue(id));
      if (pred.op === 'eq') {
        return {
          text: `El peritaje del arsenal identifica sin margen de error ${names[0]} como el arma homicida.`,
          impact: `Arma identificada: ${names[0]}`,
          keyphrase: toClueKeyphrase(`ARMA ${names[0]}`),
          evidenceType: 'photo',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `El inventario nocturno confirmó que el objeto «${names[0]}» permanecía intacto en su sitio habitual, por lo que queda descartado como arma homicida.`,
          impact: `Arma intacta: ${names[0]}`,
          keyphrase: toClueKeyphrase(`DESCARTADO ${names[0]}`),
          evidenceType: 'photo',
        };
      }
      return {
        text: `El inventario del arsenal limita el arma empleada ${aArticle(joinSpanishOr(names))}.`,
        impact: `Armas posibles: ${names.join(' / ')}`,
        keyphrase: toClueKeyphrase(`ARMA ${names.join(' O ')}`),
        evidenceType: 'photo',
      };
    }
  }

  return weaponFallback();
}

export function describeRoomPredicate(pred: CluePredicate, rng: Rng): ClueDescription {
  if (pred.kind === 'roomAttr') {
    const vals = asNonEmptyArray(pred.value);
    if (vals.length === 0) return roomFallback();
    const val = vals[0];

    if (pred.field === 'floor') {
      const labels = vals.map(v => FLOOR_LABEL[v] ?? sanitizeRawValue(v));
      const displayVals = vals.map(v => (v in FLOOR_LABEL ? v : sanitizeRawValue(v)));
      const label = labels[0];
      if (pred.op === 'eq') {
        return {
          text: pickOne(rng, [
            `El eco de las pisadas y la temperatura del cuerpo sitúan el crimen en ${label}.`,
            `Las pruebas acústicas confirman que el ataque se perpetró en ${label} de Villa Acebo.`,
          ]),
          impact: `Planta confirmada: ${displayVals[0]}`,
          keyphrase: toClueKeyphrase(`CRIMEN EN ${label}`),
          evidenceType: 'map',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `El cordón de testigos que vigilaba las escaleras descarta por completo cualquier estancia ${deArticle(label)}.`,
          impact: `Planta descartada: ${displayVals[0]}`,
          keyphrase: toClueKeyphrase(`NO OCURRIO EN ${label}`),
          evidenceType: 'map',
        };
      }
      return {
        text: `Las pruebas de circulación sitúan el crimen en ${joinSpanishOr(labels)}.`,
        impact: `Plantas posibles: ${displayVals.join(' / ')}`,
        keyphrase: toClueKeyphrase(`EN ${labels.join(' O ')}`),
        evidenceType: 'map',
      };
    }

    if (pred.field === 'lockType') {
      const labels = vals.map(v => LOCK_TYPE_LABEL[v] ?? `una estancia con cierre ${deArticle(sanitizeRawValue(v))}`);
      const shorts = vals.map(v => LOCK_TYPE_SHORT[v] ?? sanitizeRawValue(v));
      if (pred.op === 'eq') {
        return {
          text: `Las marcas en el marco de la puerta demuestran que el crimen ocurrió en ${labels[0]}.`,
          impact: `Cierre confirmado: ${shorts[0]}`,
          keyphrase: toClueKeyphrase(`PUERTA ${shorts[0]}`),
          evidenceType: 'map',
        };
      }
      if (pred.op === 'neq') {
        if (val === 'sin_cerradura') {
          return {
            text: `El estado de los herrajes excluye que el ataque sucediera en ${labels[0]}.`,
            impact: 'Cierre confirmado: con cerradura',
            keyphrase: toClueKeyphrase('ESTANCIA CON CERRADURA'),
            evidenceType: 'map',
          };
        }
        return {
          text: `El estado de los herrajes excluye que el ataque sucediera en ${labels[0]}.`,
          impact: `Cierre descartado: ${shorts[0]}`,
          keyphrase: toClueKeyphrase(`SIN CIERRE ${shorts[0]}`),
          evidenceType: 'map',
        };
      }
      return {
        text: `La inspección de los herrajes acota la escena ${aArticle(joinSpanishOr(labels))}.`,
        impact: `Cierres posibles: ${shorts.join(' / ')}`,
        keyphrase: toClueKeyphrase(`CIERRE ${shorts.join(' O ')}`),
        evidenceType: 'map',
      };
    }

    if (pred.field === 'surfaceMaterial') {
      const labels = vals.map(v => SURFACE_LABEL[v] ?? sanitizeRawValue(v));
      const shorts = vals.map(v => SURFACE_SHORT[v] ?? sanitizeRawValue(v));
      if (pred.op === 'eq') {
        return {
          text: `En las suelas de Don Arturo aparecieron partículas ${deArticle(labels[0])}, el pavimento exacto de la escena del crimen.`,
          impact: `Suelo confirmado: ${shorts[0]}`,
          keyphrase: toClueKeyphrase(`SUELO DE ${shorts[0]}`),
          evidenceType: 'photo',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `La inspección de los zapatos de la víctima descarta cualquier estancia con suelo ${deArticle(shorts[0])}.`,
          impact: `Suelo descartado: ${shorts[0]}`,
          keyphrase: toClueKeyphrase(`NO FUE EN SUELO DE ${shorts[0]}`),
          evidenceType: 'photo',
        };
      }
      return {
        text: `Las partículas adheridas a las suelas acotan el pavimento de la escena ${aArticle(joinSpanishOr(shorts))}.`,
        impact: `Suelos posibles: ${shorts.join(' / ')}`,
        keyphrase: toClueKeyphrase(`SUELO DE ${shorts.join(' O ')}`),
        evidenceType: 'photo',
      };
    }

    if (pred.field === 'ambientTrace') {
      const labels = vals.map(v => AMBIENT_TRACE_LABEL[v] ?? sanitizeRawValue(v));
      const label = labels[0];
      if (pred.op === 'eq') {
        return {
          text: `La ropa de Don Arturo impregnó un inconfundible rastro ambiental ${deArticle(label)}, propio de la estancia del homicidio.`,
          impact: `Ambiente confirmado: ${label}`,
          keyphrase: toClueKeyphrase(`ESTANCIA CON ${label}`),
          evidenceType: 'autopsy',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `La ausencia total de partículas ${deArticle(label)} en la víctima descarta las salas dominadas por ese ambiente.`,
          impact: `Ambiente descartado: ${label}`,
          keyphrase: toClueKeyphrase(`ESTANCIA SIN ${label}`),
          evidenceType: 'autopsy',
        };
      }
      return {
        text: `Los rastros ambientales recogidos en la ropa acotan la estancia ${aArticle(joinSpanishOr(labels))}.`,
        impact: `Ambientes posibles: ${labels.join(' / ')}`,
        keyphrase: toClueKeyphrase(`AMBIENTE ${labels.join(' O ')}`),
        evidenceType: 'autopsy',
      };
    }

    if (pred.field === 'id') {
      const names = vals.map(id => LOCATIONS.find(l => l.id === id)?.name ?? sanitizeRawValue(id));
      if (pred.op === 'eq') {
        return {
          text: `Los indicios físicos convergen de forma inequívoca en ${names[0]} como escenario del homicidio.`,
          impact: `Estancia identificada: ${names[0]}`,
          keyphrase: toClueKeyphrase(`ESCENA ${names[0]}`),
          evidenceType: 'map',
        };
      }
      if (pred.op === 'neq') {
        return {
          text: `La inspección ocular confirma que la estancia «${names[0]}» permaneció cerrada sin alteraciones durante todo el apagón.`,
          impact: `Estancia descartada: ${names[0]}`,
          keyphrase: toClueKeyphrase(`DESCARTADA ${names[0]}`),
          evidenceType: 'map',
        };
      }
      return {
        text: `La inspección de los planos reduce la escena del crimen ${aArticle(joinSpanishOr(names))}.`,
        impact: `Estancias posibles: ${names.join(' / ')}`,
        keyphrase: toClueKeyphrase(`ESCENA ${names.join(' O ')}`),
        evidenceType: 'map',
      };
    }
  }

  return roomFallback();
}
