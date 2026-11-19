import type { DayData } from '../types/game';
import { TOTAL_DAYS, getCaseForSeed } from '../engine/caseGenerator';

export { TOTAL_DAYS };

/**
 * Puente de compatibilidad para componentes o herramientas que consultan
 * los 30 días de una semilla dada. En tiempo de ejecución la interfaz
 * lee siempre `useGameStore.getState().activeCase.days`.
 */
export const DEFAULT_PREVIEW_SEED = 19241224;
export const DAYS_DATA: DayData[] = getCaseForSeed(DEFAULT_PREVIEW_SEED).days;

export function getDaysForSeed(seed: number): DayData[] {
  return getCaseForSeed(seed).days;
}
