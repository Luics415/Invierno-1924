import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { PrologueModal } from '../src/components/PrologueModal';
import { SuspectsAlbum } from '../src/components/SuspectsAlbum';
import { CrosswordPuzzle } from '../src/components/puzzles/CrosswordPuzzle';
import { VICTIM } from '../src/data/narrativeBible';
import { getSuspectPortraitVideo } from '../src/data/portraitVideos';
import { generateCase } from '../src/engine/caseGenerator';
import { useGameStore } from '../src/store/useGameStore';
import type { CrosswordConfig } from '../src/types/game';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Release 1.0 — Libro Cerrado, Víctima Don Arturo, Azlynn, Manos y Móvil', () => {
  it('inicia con el libro cerrado en App tras seleccionar el modo de juego', () => {
    useGameStore.getState().resetGame();
    useGameStore.getState().setGameMode('manual');

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('./portraits/book-front.png');
    expect(html).toContain('Abrir Libreta del Detective');

    const appSrc = readFile('src/App.tsx');
    expect(appSrc).toContain("useState<'open' | 'front' | 'back'>('front')");
    expect(appSrc).toContain("onModeConfirmed={() => setBookCoverMode('front')}");
  });

  it('incluye retrato oficial y perfil patrimonial completo de Don Arturo Valdemar en Prólogo, Puerta I y Álbum', () => {
    const portraitFile = path.join(ROOT, 'public', VICTIM.portrait.replace(/^\//, ''));
    expect(fs.existsSync(portraitFile)).toBe(true);
    expect(VICTIM.portrait).toBe('./portraits/victim-arturo.png');
    expect(VICTIM.epithet.toLowerCase()).toContain('riquezas inimaginables');
    expect(VICTIM.epithet.toLowerCase()).toContain('una sola persona');

    const generated = generateCase(19241224);
    const act1 = generated.acts.find(a => a.act === 1)!;
    expect(act1.victimPortrait).toBe(VICTIM.portrait);

    const prologueHtml = renderToStaticMarkup(
      React.createElement(PrologueModal, {
        onClose: () => {},
        onOpenDoorOne: () => {},
      })
    );
    expect(prologueHtml).toContain(VICTIM.portrait);
    expect(prologueHtml).toContain('data-victim-animated-portrait="true"');
    expect(prologueHtml).toContain('animate-victim-living');
    expect(prologueHtml).toContain('Don Arturo Valdemar');
    expect(prologueHtml).toContain('riquezas inimaginables');
    expect(prologueHtml).toContain('Poder y Fortuna');

    const albumHtml = renderToStaticMarkup(
      React.createElement(SuspectsAlbum, { onStartAdventure: () => {} })
    );
    expect(albumHtml).toContain(VICTIM.portrait);
    expect(albumHtml).toContain('data-victim-animated-portrait="true"');
    expect(albumHtml).toContain('Ver perfil oficial');
  });

  it('muestra a Azlynn más grande con medallón 3D sobresaliendo y corrige scroll y cabecera móvil en BookLayout', () => {
    const azlynnSrc = readFile('src/components/DetectiveHintBubble.tsx');
    expect(azlynnSrc).toContain('azlynn-medallion-3d');
    expect(azlynnSrc).toContain('azlynn-popout-3d');
    expect(azlynnSrc).toContain('-mt-12 -ml-5 sm:-mt-14 sm:-ml-6');
    expect(azlynnSrc).toContain('w-12 h-12 sm:w-14 sm:h-14');
    expect(azlynnSrc).toContain('w-44 h-44 sm:w-60 sm:h-60');

    const bookSrc = readFile('src/components/BookLayout.tsx');
    expect(bookSrc).toContain('grid grid-cols-4 sm:flex');
    expect(bookSrc).toContain('flex-col sm:flex-row sm:items-start sm:justify-between');
    expect(bookSrc).toContain('page-verso flex-1 h-full');
    expect(bookSrc).toContain('page-recto flex-1 h-full');
    expect(bookSrc).toContain('mobile-scroll-page');
    expect(bookSrc).toContain('landscape-two-page-spread');
    expect(bookSrc).toContain('landscape-show-page');
    expect(bookSrc).toContain('pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+3.25rem))]');

    const albumSrc = readFile('src/components/SuspectsAlbum.tsx');
    expect(albumSrc).toContain('landscape-hide flex lg:hidden');
    expect(albumSrc).toContain('landscape-album-spread hidden lg:grid lg:grid-cols-2');

    const cssSrc = readFile('src/index.css');
    expect(cssSrc).toContain('@media (orientation: landscape) and (max-height: 540px) and (min-width: 560px)');
  });

  it('amplía diálogos de Azlynn con tono defensivo/inseguro y momentos de alivio por no estar sola', () => {
    const src = readFile('src/components/DetectiveHintBubble.tsx');
    const dialogueMatches = src.match(/title:\s*'[^']+'/g) ?? [];
    expect(dialogueMatches.length).toBeGreaterThanOrEqual(15);
    expect(src).toContain("mood: 'asustada'");
    expect(src).toContain("mood: 'angustiada'");
    expect(src).toContain("mood: 'enojada'");
    expect(src).toContain("mood: 'feliz'");
    expect(src).toContain('no estar sola');
    expect(src).toContain('No me siento segura');
  });

  it('reduce la probabilidad de aparición de hands-creappy-movie y aplica enfriamiento', () => {
    const engineSrc = readFile('src/components/ParanormalEngine.tsx');
    const probMatch = engineSrc.match(/HANDS_TRIGGER_PROBABILITY\s*=\s*([0-9.]+)/);
    expect(probMatch).not.toBeNull();
    expect(Number(probMatch![1])).toBeLessThanOrEqual(0.08);
    expect(engineSrc).toContain('MIN_NON_HANDS_BETWEEN');
  });

  it('incluye teclado táctil en Crucigrama para dispositivos móviles y videos #18-#20 registrados', () => {
    const generated = generateCase(19241224);
    const cwDay = generated.days.find(d => d.puzzle.type === 'crossword')!;
    const cwHtml = renderToStaticMarkup(
      React.createElement(CrosswordPuzzle, {
        config: cwDay.puzzle.config as CrosswordConfig,
        onSolve: () => {},
        isSolved: false,
        hints: cwDay.puzzle.hints,
        gameMode: 'manual',
      })
    );
    expect(cwHtml).toContain('data-crossword-key="A"');
    expect(cwHtml).toContain('data-crossword-key="Ñ"');

    expect(getSuspectPortraitVideo(18)).toBe('./portraits/18 Klaus.mp4');
    expect(getSuspectPortraitVideo(19)).toBe('./portraits/19 Maria.mp4');
    expect(getSuspectPortraitVideo(20)).toBe('./portraits/20 Sebastian.mp4');
  });
});
