import type { Clue, CryptogramConfig } from '../../types/game';
import { hashClueTag, toAlphaOnlyPhrase } from './clueIntegration';
import { deriveSeed, mulberry32, shuffle } from './prng';

const CIPHER_PHRASES: readonly string[] = [
  'LA LLAVE DEL SOTANO NO ESTUVO EN LA RECEPCION',
  'EL TESTAMENTO FUE FIRMADO DESPUES DE MEDIANOCHE',
  'NINGUN INVITADO CRUZO EL JARDIN BAJO LA VENTISCA',
  'EL VENENO LLEGO EN UN FRASCO SIN ETIQUETA',
  'ALGUIEN ALTERO EL RELOJ DE LA GALERIA ORIENTAL',
  'LAS CARTAS DE CHANTAJE ARDIERON EN LA CHIMENEA',
  'LA PUERTA SECRETA COMUNICA CON EL INVERNADERO',
  'EL MEDICO OCULTO SU MALETIN ANTES DEL AMANECER',
  'DOS COPAS DE OPORTO QUEDARON INTACTAS EN LA MESA',
  'UNA HUELLA DE BARRO DELATA AL VISITANTE NOCTURNO',
  'EL TELEGRAMA CONFIRMA UNA DEUDA DE JUEGO ANTIGUA',
  'BUSCA EL SELLO CARMESI DETRAS DEL RETRATO MAYOR',
  'LA COARTADA DEL MAYORDOMO FALLO POR DIEZ MINUTOS',
  'EL BISTURI DESAPARECIO DURANTE EL APAGON ELECTRICO',
  'CADA TESTIGO ESCONDE UNA VERDAD SOBRE LA HERENCIA',
];

function buildClueCipherPhrase(clue: Clue, fallbackPhrase: string): string {
  const combined = toAlphaOnlyPhrase(
    `${clue.keyphrase ?? ''} ${clue.impact} ${clue.text}`
  );
  const words = combined.split(' ').filter(Boolean);
  if (words.length >= 4) {
    return words.slice(0, 12).join(' ');
  }
  return toAlphaOnlyPhrase(`${combined} ${fallbackPhrase}`).split(' ').slice(0, 12).join(' ');
}

export function generateCryptogram(seed: number, day = 1, clue?: Clue): CryptogramConfig {
  const derived = deriveSeed(seed, day, `cryptogram:${hashClueTag(clue)}`);
  const rng = mulberry32(derived);

  const fallbackPhrase =
    CIPHER_PHRASES[(day + Math.floor(rng() * CIPHER_PHRASES.length)) % CIPHER_PHRASES.length];
  const cipherText = clue ? buildClueCipherPhrase(clue, fallbackPhrase) : fallbackPhrase;
  const letterCounts = new Map<string, number>();

  for (const ch of cipherText) {
    if (/[A-ZÑ]/.test(ch)) {
      letterCounts.set(ch, (letterCounts.get(ch) ?? 0) + 1);
    }
  }

  const uniqueLetters = Array.from(letterCounts.keys());
  const codePool = shuffle(
    rng,
    Array.from({ length: 29 }, (_, idx) => 11 + idx) // 11..39
  );

  const cipherMap: Record<string, number> = {};
  uniqueLetters.forEach((letter, idx) => {
    cipherMap[letter] = codePool[idx];
  });

  // Strict F14: at most 1 initial revealed letter (0 on later acts)
  let initialRevealed: string[] = [];
  if (day <= 12) {
    const sortedByFreq = [...letterCounts.entries()].sort((a, b) => b[1] - a[1]);
    if (sortedByFreq.length > 0) {
      initialRevealed = [sortedByFreq[0][0]];
    }
  }

  return {
    cipherText,
    cipherMap,
    initialRevealed,
  };
}

export function validateCryptogram(
  config: CryptogramConfig,
  userMapping: Record<number, string>
): boolean {
  const entries = Object.entries(config.cipherMap);
  const assignedLetters = new Set<string>();

  for (const [letter, num] of entries) {
    const mapped = userMapping[num]?.toUpperCase();
    if (!mapped || mapped !== letter.toUpperCase()) {
      return false;
    }
    if (assignedLetters.has(mapped)) {
      return false; // Bijection violation
    }
    assignedLetters.add(mapped);
  }

  // Also ensure no extra numbers in userMapping reuse an assigned letter
  const allMappedValues = Object.values(userMapping)
    .filter(v => Boolean(v))
    .map(v => v.toUpperCase());
  if (new Set(allMappedValues).size !== allMappedValues.length) {
    return false;
  }

  return true;
}
