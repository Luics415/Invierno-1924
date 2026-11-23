/**
 * Videos animados (.mp4 silenciosos en bucle) disponibles por número de sospechoso (#01–#74).
 * Cada video en 9:16 (720×1280) se encuadra automáticamente con object-cover para coincidir
 * con las tarjetas y fichas 4:5 sin barras negras ni deformación.
 */
export const SUSPECT_PORTRAIT_VIDEOS: Record<number, string> = {
  1: './portraits/01 Elena.mp4',
  2: './portraits/02 Mateo.mp4',
  3: './portraits/03 Beatriz.mp4',
  4: './portraits/04 Gonzalo.mp4',
  5: './portraits/05 Carlos.mp4',
  6: './portraits/06 Ines.mp4',
  7: './portraits/07 Felipe.mp4',
  8: './portraits/08 Leonor.mp4',
  9: './portraits/09 Hugo.mp4',
  10: './portraits/10 Valentina.mp4',
  11: './portraits/11 Ramiro.mp4',
  12: './portraits/12 Diana.mp4',
  13: './portraits/13 Clara.mp4',
  14: './portraits/14 Sofia.mp4',
  15: './portraits/15 Tomas.mp4',
  16: './portraits/16 Alvaro.mp4',
  17: './portraits/17 Ernesto.mp4',
  18: './portraits/18 Klaus.mp4',
  19: './portraits/19 Maria.mp4',
  20: './portraits/20 Sebastian.mp4',
};

export function getSuspectPortraitVideo(suspectNumber: number): string | undefined {
  return SUSPECT_PORTRAIT_VIDEOS[suspectNumber];
}
