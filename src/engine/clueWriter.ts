import type {
  AccessLevel,
  AgeGroup,
  CluePredicate,
  ForensicTrace,
  Handedness,
  MotiveTag,
  PresenceWing,
  SuspectCategory,
  VisualMarker,
  WeaponCategory,
  WeaponMaterial,
} from '../types/game';
import { SUSPECTS_DIRECTORY } from '../data/suspectsDirectory';
import { LOCATIONS, WEAPONS } from '../data/narrativeBible';
import { pickOne, type Rng } from './puzzles/prng';
import {
  ACCESS_LEVEL_LABEL,
  AGE_GROUP_LABEL,
  AMBIENT_TRACE_LABEL,
  CATEGORY_LABEL,
  FLOOR_LABEL,
  FORENSIC_TRACE_LABEL,
  HANDEDNESS_LABEL,
  LOCK_TYPE_LABEL,
  MOTIVE_LABEL,
  PRESENCE_WING_LABEL,
  SURFACE_LABEL,
  VISUAL_MARKER_LABEL,
  WEAPON_CATEGORY_LABEL,
  WEAPON_MATERIAL_LABEL,
  WEAPON_TRACE_LABEL,
  WOUND_PATTERN_LABEL,
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

export function describeSuspectPredicate(pred: CluePredicate, rng: Rng): ClueDescription {
  if (pred.kind === 'suspectAttr') {
    const { field, op, value } = pred;
    const vals = asArray(value);

    switch (field) {
      case 'ageGroup': {
        if (op === 'eq') {
          const v = vals[0] as AgeGroup;
          const text = pickOne(rng, [
            `El estudio biomecánico y los testimonios confirman que el culpable ${AGE_GROUP_LABEL[v]}.`,
            `Las marcas de fuerza en la escena corresponden a una persona que ${AGE_GROUP_LABEL[v]}.`,
          ]);
          return {
            text,
            impact: `Franja de edad confirmada: ${v.toUpperCase()}`,
            keyphrase: toPuzzleText(`CULPABLE ${AGE_GROUP_LABEL[v]}`),
            evidenceType: 'autopsy',
          };
        }
        if (op === 'neq') {
          const v = vals[0] as AgeGroup;
          return {
            text: `La reconstrucción horaria descarta por completo a cualquier sospechoso que ${AGE_GROUP_LABEL[v]}.`,
            impact: `Descartada franja de edad: ${v.toUpperCase()}`,
            keyphrase: toPuzzleText(`NO ${AGE_GROUP_LABEL[v]}`),
            evidenceType: 'diary',
          };
        }
        const [a, b] = vals as [AgeGroup, AgeGroup];
        return {
          text: `Dos testigos aseguran que la silueta avistada ${AGE_GROUP_LABEL[a]} o bien ${AGE_GROUP_LABEL[b]}.`,
          impact: `Franja acotada: ${a} o ${b}`,
          keyphrase: toPuzzleText(`EDAD ENTRE ${a} Y ${b}`),
          evidenceType: 'photo',
        };
      }

      case 'handedness': {
        if (op === 'eq') {
          const v = vals[0] as Handedness;
          return {
            text: `El ángulo del ataque y el desplazamiento de los objetos prueban que el culpable ${HANDEDNESS_LABEL[v]}.`,
            impact: `Lateralidad confirmada: ${v.toUpperCase()}`,
            keyphrase: toPuzzleText(`EL ASESINO ES ${v}`),
            evidenceType: 'autopsy',
          };
        }
        if (op === 'neq') {
          const v = vals[0] as Handedness;
          return {
            text: `La trayectoria del golpe resulta anatómicamente incompatible con alguien que ${HANDEDNESS_LABEL[v]}.`,
            impact: `Lateralidad descartada: ${v.toUpperCase()}`,
            keyphrase: toPuzzleText(`DESCARTE LATERALIDAD ${v}`),
            evidenceType: 'autopsy',
          };
        }
        const [a, b] = vals as [Handedness, Handedness];
        return {
          text: `El informe forense acota la mano ejecutora: el autor solo puede ser ${a} o ${b}.`,
          impact: `Lateralidad posible: ${a} / ${b}`,
          keyphrase: toPuzzleText(`MANO ${a} O ${b}`),
          evidenceType: 'autopsy',
        };
      }

      case 'visualMarker': {
        if (op === 'eq') {
          const v = vals[0] as VisualMarker;
          return {
            text: `Un reflejo en el pasillo bajo la luz de las velas confirmó que el culpable ${VISUAL_MARKER_LABEL[v]}.`,
            impact: `Rasgo visual confirmado: ${v.replace('_', ' ')}`,
            keyphrase: toPuzzleText(`RASGO ${v.replace('_', ' ')}`),
            evidenceType: 'photo',
          };
        }
        if (op === 'neq') {
          const v = vals[0] as VisualMarker;
          return {
            text: `El testimonio del vestíbulo descarta a quien ${VISUAL_MARKER_LABEL[v]}.`,
            impact: `Rasgo descartado: ${v.replace('_', ' ')}`,
            keyphrase: toPuzzleText(`SIN RASGO ${v.replace('_', ' ')}`),
            evidenceType: 'photo',
          };
        }
        const [a, b] = vals as [VisualMarker, VisualMarker];
        return {
          text: `La placa fotográfica borrosa limita el rasgo exterior del autor: ${VISUAL_MARKER_LABEL[a]}, o bien ${VISUAL_MARKER_LABEL[b]}.`,
          impact: `Rasgo acotado: ${a.replace('_', ' ')} / ${b.replace('_', ' ')}`,
          keyphrase: toPuzzleText(`RASGO ${a.replace('_', ' ')} O ${b.replace('_', ' ')}`),
          evidenceType: 'photo',
        };
      }

      case 'presenceWing': {
        if (op === 'eq') {
          const v = vals[0] as PresenceWing;
          return {
            text: `Las pisadas húmedas en la alfombra confirman que el culpable operó desde ${PRESENCE_WING_LABEL[v]} durante el apagón.`,
            impact: `Sector de presencia: ${PRESENCE_WING_LABEL[v]}`,
            keyphrase: toPuzzleText(`SECTOR ${PRESENCE_WING_LABEL[v]}`),
            evidenceType: 'map',
          };
        }
        if (op === 'neq') {
          const v = vals[0] as PresenceWing;
          return {
            text: `El cierre temporal de los corredores impidió que nadie ubicado en ${PRESENCE_WING_LABEL[v]} llegara a tiempo al crimen.`,
            impact: `Sector exculpado: ${PRESENCE_WING_LABEL[v]}`,
            keyphrase: toPuzzleText(`NO DESDE ${PRESENCE_WING_LABEL[v]}`),
            evidenceType: 'map',
          };
        }
        const [a, b] = vals as [PresenceWing, PresenceWing];
        return {
          text: `El croquis de tiempos de desplazamiento demuestra que el atacante partió desde ${PRESENCE_WING_LABEL[a]} o desde ${PRESENCE_WING_LABEL[b]}.`,
          impact: `Sectores posibles: ${PRESENCE_WING_LABEL[a]} / ${PRESENCE_WING_LABEL[b]}`,
          keyphrase: toPuzzleText(`RUTA ${a.replace('_', ' ')} O ${b.replace('_', ' ')}`),
          evidenceType: 'map',
        };
      }

      case 'forensicTrace': {
        if (op === 'eq') {
          const v = vals[0] as ForensicTrace;
          return {
            text: `El análisis microscópico recogió restos inequívocos de ${FORENSIC_TRACE_LABEL[v]} en las solapas de Don Arturo.`,
            impact: `Rastro forense hallado: ${FORENSIC_TRACE_LABEL[v]}`,
            keyphrase: toPuzzleText(`RASTRO DE ${FORENSIC_TRACE_LABEL[v]}`),
            evidenceType: 'autopsy',
          };
        }
        if (op === 'neq') {
          const v = vals[0] as ForensicTrace;
          return {
            text: `Los reactivos químicos confirman la ausencia total de ${FORENSIC_TRACE_LABEL[v]} en el cadáver; quedan descartados quienes portan ese rastro.`,
            impact: `Rastro ausente: ${FORENSIC_TRACE_LABEL[v]}`,
            keyphrase: toPuzzleText(`SIN RASTRO DE ${FORENSIC_TRACE_LABEL[v]}`),
            evidenceType: 'autopsy',
          };
        }
        const [a, b] = vals as [ForensicTrace, ForensicTrace];
        return {
          text: `El residuo recolectado bajo las uñas de la víctima corresponde a ${FORENSIC_TRACE_LABEL[a]} o a ${FORENSIC_TRACE_LABEL[b]}.`,
          impact: `Rastro acotado: ${a} / ${b}`,
          keyphrase: toPuzzleText(`RESIDUO ${a} O ${b}`),
          evidenceType: 'autopsy',
        };
      }

      case 'motiveTag': {
        if (op === 'eq') {
          const v = vals[0] as MotiveTag;
          return {
            text: `Una carta quemada a medias en el secreter revela que el homicidio fue impulsado por ${MOTIVE_LABEL[v]}.`,
            impact: `Móvil acreditado: ${MOTIVE_LABEL[v]}`,
            keyphrase: toPuzzleText(`MOVIL POR ${v}`),
            evidenceType: 'letter',
          };
        }
        if (op === 'neq') {
          const v = vals[0] as MotiveTag;
          return {
            text: `Los legajos de la notaría descartan que el crimen guardara relación con ${MOTIVE_LABEL[v]}.`,
            impact: `Móvil descartado: ${v}`,
            keyphrase: toPuzzleText(`NO FUE POR ${v}`),
            evidenceType: 'letter',
          };
        }
        const [a, b] = vals as [MotiveTag, MotiveTag];
        return {
          text: `El borrador del nuevo testamento señala que el ataque responde únicamente a ${MOTIVE_LABEL[a]} o a ${MOTIVE_LABEL[b]}.`,
          impact: `Móviles posibles: ${a} / ${b}`,
          keyphrase: toPuzzleText(`MOVIL ${a} O ${b}`),
          evidenceType: 'letter',
        };
      }

      case 'accessLevel': {
        if (op === 'eq') {
          const v = vals[0] as AccessLevel;
          return {
            text: `El registro de llaves y cerraduras acredita que el autor ${ACCESS_LEVEL_LABEL[v]}.`,
            impact: `Nivel de acceso: ${v.replace('_', ' ')}`,
            keyphrase: toPuzzleText(`ACCESO ${v.replace('_', ' ')}`),
            evidenceType: 'map',
          };
        }
        if (op === 'neq') {
          const v = vals[0] as AccessLevel;
          return {
            text: `Las puertas de servicio cerradas por dentro excluyen a cualquiera que ${ACCESS_LEVEL_LABEL[v]}.`,
            impact: `Acceso descartado: ${v.replace('_', ' ')}`,
            keyphrase: toPuzzleText(`NO ACCESO ${v.replace('_', ' ')}`),
            evidenceType: 'map',
          };
        }
        const [a, b] = vals as [AccessLevel, AccessLevel];
        return {
          text: `Solo alguien que ${ACCESS_LEVEL_LABEL[a]} o que ${ACCESS_LEVEL_LABEL[b]} pudo atravesar el corredor sin activar las alertas.`,
          impact: `Accesos posibles: ${a.replace('_', ' ')} / ${b.replace('_', ' ')}`,
          keyphrase: toPuzzleText(`PASO ${a.replace('_', ' ')} O ${b.replace('_', ' ')}`),
          evidenceType: 'map',
        };
      }
    }
  }

  if (pred.kind === 'suspectIdentity') {
    if (pred.field === 'category') {
      const cat = asArray(pred.value)[0] as SuspectCategory;
      if (pred.op === 'eq') {
        return {
          text: `El cuaderno de registro nocturno limita al autor del crimen al círculo de ${CATEGORY_LABEL[cat]}.`,
          impact: `Grupo confirmado: ${cat}`,
          keyphrase: toPuzzleText(`GRUPO ${cat}`),
          evidenceType: 'diary',
        };
      }
      return {
        text: `Las declaraciones cruzadas de la velada exculpan en bloque a ${CATEGORY_LABEL[cat]}.`,
        impact: `Grupo exculpado: ${cat}`,
        keyphrase: toPuzzleText(`DESCARTE ${cat}`),
        evidenceType: 'newspaper',
      };
    }

    if (pred.field === 'id' && pred.op === 'neq') {
      const exonerated = SUSPECTS_DIRECTORY.find(s => s.id === pred.value);
      const name = exonerated ? exonerated.name : String(pred.value);
      return {
        text: `Una verificación independiente de testigos confirma la coartada de ${name} a las 23:15 h; queda libre de toda sospecha.`,
        impact: `Coartada verificada: ${name}`,
        keyphrase: toPuzzleText(`COARTADA CONFIRMADA ${name}`),
        evidenceType: 'telegram',
      };
    }
  }

  if (pred.kind === 'suspectAgeRange') {
    const min = pred.min ?? 18;
    const max = pred.max ?? 80;
    return {
      text: `La ficha antropométrica y las notas médicas acotan la edad del asesino entre los ${min} y los ${max} años.`,
      impact: `Edad acotada: ${min}–${max} años`,
      keyphrase: toPuzzleText(`EDAD ENTRE ${min} Y ${max} ANOS`),
      evidenceType: 'autopsy',
    };
  }

  return {
    text: 'El examen minucioso de los registros aporta un nuevo filtro decisivo sobre los presentes en Villa Acebo.',
    impact: 'Filtro deductivo registrado',
    keyphrase: 'INDICIO DE VILLA ACEBO',
    evidenceType: 'diary',
  };
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
    const val = asArray(pred.value)[0];
    if (pred.field === 'category') {
      const cat = val as WeaponCategory;
      if (pred.op === 'eq') {
        return {
          text: `La autopsia preliminar es categórica: Don Arturo murió por ${WEAPON_CATEGORY_LABEL[cat]}.`,
          impact: `Tipo de arma: ${cat.toUpperCase()}`,
          keyphrase: toPuzzleText(`ARMA TIPO ${cat}`),
          evidenceType: 'autopsy',
        };
      }
      return {
        text: `El examen forense descarta que la muerte fuera provocada por ${WEAPON_CATEGORY_LABEL[cat]}.`,
        impact: `Descartada categoría: ${cat.toUpperCase()}`,
        keyphrase: toPuzzleText(`NO FUE ARMA ${cat}`),
        evidenceType: 'autopsy',
      };
    }

    if (pred.field === 'material') {
      const mat = val as WeaponMaterial;
      if (pred.op === 'eq') {
        return {
          text: `Las partículas adheridas a la lesión confirman que el arma está compuesta de ${WEAPON_MATERIAL_LABEL[mat]}.`,
          impact: `Material del arma: ${WEAPON_MATERIAL_LABEL[mat]}`,
          keyphrase: toPuzzleText(`MATERIAL DEL ARMA ${WEAPON_MATERIAL_LABEL[mat]}`),
          evidenceType: 'autopsy',
        };
      }
      return {
        text: `El espectro químico descarta cualquier instrumento fabricado en ${WEAPON_MATERIAL_LABEL[mat]}.`,
        impact: `Material descartado: ${WEAPON_MATERIAL_LABEL[mat]}`,
        keyphrase: toPuzzleText(`SIN RASTRO DE ${WEAPON_MATERIAL_LABEL[mat]}`),
        evidenceType: 'autopsy',
      };
    }

    if (pred.field === 'forensicTrace') {
      const label = WEAPON_TRACE_LABEL[val] ?? val;
      if (pred.op === 'eq') {
        return {
          text: `En la herida se detectó un rastro característico de ${label} transferido directamente por el arma homicida.`,
          impact: `Residuo del arma: ${label}`,
          keyphrase: toPuzzleText(`ARMA CON ${label}`),
          evidenceType: 'autopsy',
        };
      }
      return {
        text: `Las muestras del cuerpo no presentan indicio alguno de ${label}, lo que descarta las armas impregnadas con esa sustancia.`,
        impact: `Residuo de arma descartado: ${label}`,
        keyphrase: toPuzzleText(`ARMA SIN ${label}`),
        evidenceType: 'autopsy',
      };
    }

    if (pred.field === 'woundPattern') {
      const label = WOUND_PATTERN_LABEL[val] ?? val;
      return {
        text: `El dictamen tanatológico definitivo identifica ${label}, firma inequívoca del instrumento letal.`,
        impact: `Lesión exacta: ${label}`,
        keyphrase: toPuzzleText(`LESION ${val.replace(/_/g, ' ')}`),
        evidenceType: 'autopsy',
      };
    }

    if (pred.field === 'id' && pred.op === 'neq') {
      const w = WEAPONS.find(item => item.id === val);
      const wName = w ? w.name : val;
      return {
        text: `El inventario nocturno halló ${wName} intacto y en su sitio habitual, descartándolo como arma homicida.`,
        impact: `Arma intacta: ${wName}`,
        keyphrase: toPuzzleText(`DESCARTADO ${wName}`),
        evidenceType: 'photo',
      };
    }
  }

  return {
    text: 'El peritaje de objetos de la mansión estrecha la lista de armas compatibles con el ataque.',
    impact: 'Peritaje de arma registrado',
    keyphrase: 'PERITAJE DE ARMA HOMICIDA',
    evidenceType: 'autopsy',
  };
}

export function describeRoomPredicate(pred: CluePredicate, rng: Rng): ClueDescription {
  if (pred.kind === 'roomAttr') {
    const val = asArray(pred.value)[0];
    if (pred.field === 'floor') {
      const label = FLOOR_LABEL[val] ?? val;
      if (pred.op === 'eq') {
        return {
          text: pickOne(rng, [
            `El eco de las pisadas y la temperatura del cuerpo sitúan el crimen en ${label}.`,
            `Las pruebas acústicas confirman que el ataque se perpetró en ${label} de Villa Acebo.`,
          ]),
          impact: `Planta confirmada: ${val}`,
          keyphrase: toPuzzleText(`CRIMEN EN ${label}`),
          evidenceType: 'map',
        };
      }
      return {
        text: `El cordón de testigos que vigilaba las escaleras descarta por completo cualquier estancia de ${label}.`,
        impact: `Planta descartada: ${val}`,
        keyphrase: toPuzzleText(`NO OCURRIO EN ${label}`),
        evidenceType: 'map',
      };
    }

    if (pred.field === 'lockType') {
      const label = LOCK_TYPE_LABEL[val] ?? val;
      if (pred.op === 'eq') {
        return {
          text: `Las marcas en el marco de la puerta demuestran que el crimen ocurrió en ${label}.`,
          impact: `Cierre confirmado: ${val.replace(/_/g, ' ')}`,
          keyphrase: toPuzzleText(`PUERTA ${val.replace(/_/g, ' ')}`),
          evidenceType: 'map',
        };
      }
      return {
        text: `El estado de los herrajes excluye que el ataque sucediera en ${label}.`,
        impact: `Cierre descartado: ${val.replace(/_/g, ' ')}`,
        keyphrase: toPuzzleText(`DESCARTE ${val.replace(/_/g, ' ')}`),
        evidenceType: 'map',
      };
    }

    if (pred.field === 'surfaceMaterial') {
      const label = SURFACE_LABEL[val] ?? val;
      if (pred.op === 'eq') {
        return {
          text: `En las suelas de Don Arturo aparecieron partículas de ${label}, el pavimento exacto de la escena del crimen.`,
          impact: `Suelo confirmado: ${label}`,
          keyphrase: toPuzzleText(`SUELO DE ${label}`),
          evidenceType: 'photo',
        };
      }
      return {
        text: `La inspección de los zapatos de la víctima descarta cualquier estancia con suelo de ${label}.`,
        impact: `Suelo descartado: ${label}`,
        keyphrase: toPuzzleText(`NO FUE EN SUELO DE ${label}`),
        evidenceType: 'photo',
      };
    }

    if (pred.field === 'ambientTrace') {
      const label = AMBIENT_TRACE_LABEL[val] ?? val;
      if (pred.op === 'eq') {
        return {
          text: `La ropa de Don Arturo impregnó un inconfundible rastro ambiental de ${label}, propio de la estancia del homicidio.`,
          impact: `Ambiente confirmado: ${label}`,
          keyphrase: toPuzzleText(`ESTANCIA CON ${label}`),
          evidenceType: 'autopsy',
        };
      }
      return {
        text: `La ausencia total de partículas de ${label} en la víctima descarta las salas dominadas por ese ambiente.`,
        impact: `Ambiente descartado: ${label}`,
        keyphrase: toPuzzleText(`ESTANCIA SIN ${label}`),
        evidenceType: 'autopsy',
      };
    }

    if (pred.field === 'id' && pred.op === 'neq') {
      const loc = LOCATIONS.find(l => l.id === val);
      const name = loc ? loc.name : val;
      return {
        text: `La inspección ocular confirma que ${name} estuvo ocupada o sellada sin alteraciones durante todo el apagón.`,
        impact: `Estancia descartada: ${name}`,
        keyphrase: toPuzzleText(`DESCARTADA ${name}`),
        evidenceType: 'map',
      };
    }
  }

  return {
    text: 'Los planos de la mansión acotan con precisión las habitaciones compatibles con la escena del crimen.',
    impact: 'Estancia acotada en planos',
    keyphrase: 'ESCENA EN VILLA ACEBO',
    evidenceType: 'map',
  };
}
