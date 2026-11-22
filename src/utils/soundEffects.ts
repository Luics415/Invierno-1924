// Web Audio API Procedural Sound Synthesizer
// Síntesis acústica multicapa de alta precisión para papel antiguo, marcatextos, mechas, explosiones leves y clics de juegos

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastHighlighterTime: number = 0;

  constructor() {
    // Lazy audio context init on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean): void {
    if (muted) {
      // R5: Los efectos de sonido del juego permanecen siempre activos
    }
    this.isMuted = false;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Sonido físico en 3 fases de pasar hoja de papel de libro antiguo (despegue de borde, arco de fricción de celulosa y asentamiento sobre el pliego)
  public playPageTurn() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 1. Fase 1 (0–60 ms): Roce agudo del borde de la hoja al levantarse con los dedos
      const edgeDur = 0.065;
      const edgeLen = Math.floor(ctx.sampleRate * edgeDur);
      const edgeBuf = ctx.createBuffer(1, edgeLen, ctx.sampleRate);
      const edgeData = edgeBuf.getChannelData(0);
      for (let i = 0; i < edgeLen; i++) {
        const env = Math.sin((i / edgeLen) * Math.PI);
        edgeData[i] = (Math.random() * 2 - 1) * env * (0.7 + 0.3 * Math.sin(i * 0.15));
      }
      const edgeSrc = ctx.createBufferSource();
      edgeSrc.buffer = edgeBuf;

      const edgeFilter = ctx.createBiquadFilter();
      edgeFilter.type = 'bandpass';
      edgeFilter.frequency.setValueAtTime(3400, now);
      edgeFilter.frequency.exponentialRampToValueAtTime(2100, now + edgeDur);
      edgeFilter.Q.setValueAtTime(2.0, now);

      const edgeGain = ctx.createGain();
      edgeGain.gain.setValueAtTime(0.005, now);
      edgeGain.gain.linearRampToValueAtTime(0.11, now + 0.018);
      edgeGain.gain.exponentialRampToValueAtTime(0.002, now + edgeDur);

      edgeSrc.connect(edgeFilter);
      edgeFilter.connect(edgeGain);
      edgeGain.connect(ctx.destination);
      edgeSrc.start(now);

      // 2. Fase 2 (30–270 ms): Deslizamiento y curvatura de la hoja de papel (fibra de celulosa texturizada)
      const sweepStart = now + 0.028;
      const sweepDur = 0.245;
      const sweepLen = Math.floor(ctx.sampleRate * sweepDur);
      const sweepBuf = ctx.createBuffer(1, sweepLen, ctx.sampleRate);
      const sweepData = sweepBuf.getChannelData(0);
      let pinkB0 = 0;
      let pinkB1 = 0;
      let pinkB2 = 0;
      for (let i = 0; i < sweepLen; i++) {
        const white = Math.random() * 2 - 1;
        pinkB0 = 0.99765 * pinkB0 + white * 0.099046;
        pinkB1 = 0.963 * pinkB1 + white * 0.2965164;
        pinkB2 = 0.57 * pinkB2 + white * 1.0526913;
        const pink = (pinkB0 + pinkB1 + pinkB2 + white * 0.1848) * 0.18;
        // Textura micro-granular de fibras de papel rozando entre sí
        const grain = 0.72 + 0.28 * Math.sin(i * 0.043) * Math.cos(i * 0.017);
        sweepData[i] = pink * grain;
      }

      const sweepSrc = ctx.createBufferSource();
      sweepSrc.buffer = sweepBuf;

      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(520, sweepStart);

      const bpFilter = ctx.createBiquadFilter();
      bpFilter.type = 'bandpass';
      bpFilter.frequency.setValueAtTime(1250, sweepStart);
      bpFilter.frequency.exponentialRampToValueAtTime(2650, sweepStart + 0.11);
      bpFilter.frequency.exponentialRampToValueAtTime(920, sweepStart + sweepDur);
      bpFilter.Q.setValueAtTime(1.35, sweepStart);

      const sweepGain = ctx.createGain();
      sweepGain.gain.setValueAtTime(0.008, sweepStart);
      sweepGain.gain.linearRampToValueAtTime(0.22, sweepStart + 0.075);
      sweepGain.gain.linearRampToValueAtTime(0.16, sweepStart + 0.16);
      sweepGain.gain.exponentialRampToValueAtTime(0.002, sweepStart + sweepDur);

      sweepSrc.connect(hpFilter);
      hpFilter.connect(bpFilter);
      bpFilter.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweepSrc.start(sweepStart);

      // 3. Fase 3 (225–335 ms): Asentamiento de la hoja sobre el pliego opuesto (leve flutter de papel)
      const settleStart = now + 0.225;
      const settleDur = 0.11;
      const settleLen = Math.floor(ctx.sampleRate * settleDur);
      const settleBuf = ctx.createBuffer(1, settleLen, ctx.sampleRate);
      const settleData = settleBuf.getChannelData(0);
      for (let i = 0; i < settleLen; i++) {
        settleData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (settleLen * 0.35));
      }
      const settleSrc = ctx.createBufferSource();
      settleSrc.buffer = settleBuf;

      const settleFilter = ctx.createBiquadFilter();
      settleFilter.type = 'bandpass';
      settleFilter.frequency.setValueAtTime(1650, settleStart);
      settleFilter.frequency.exponentialRampToValueAtTime(680, settleStart + settleDur);
      settleFilter.Q.setValueAtTime(1.6, settleStart);

      const settleGain = ctx.createGain();
      settleGain.gain.setValueAtTime(0.09, settleStart);
      settleGain.gain.exponentialRampToValueAtTime(0.001, settleStart + settleDur);

      settleSrc.connect(settleFilter);
      settleFilter.connect(settleGain);
      settleGain.connect(ctx.destination);
      settleSrc.start(settleStart);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  // Rasgueo nítido de lápiz de grafito al anotar o tachar sobre papel
  public playPencil() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;
      const dur = 0.085;
      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Doble micro-trazo de punta de grafito
        const strokeEnv = Math.sin((i / bufferSize) * Math.PI * 2) > -0.2 ? 1 : 0.35;
        data[i] = (Math.random() * 2 - 1) * strokeEnv * (0.65 + 0.35 * Math.sin(i / 6));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2450, now);
      filter.frequency.linearRampToValueAtTime(3250, now + dur);
      filter.Q.setValueAtTime(1.7, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
    } catch {}
  }

  // Sonido de marcatextos / rotulador de punta de fieltro deslizándose por una hoja de papel (Sopa de Letras)
  public playHighlighterStroke(stepIndex: number = 0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const nowMs = performance.now();
      if (nowMs - this.lastHighlighterTime < 28) return;
      this.lastHighlighterTime = nowMs;

      const ctx = this.ctx;
      const now = ctx.currentTime;
      const dur = 0.095;
      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        // Envolvente suave de punta de fieltro húmeda deslizando sobre papel poroso
        const env = Math.sin(t * Math.PI);
        const feltTexture = 0.75 + 0.25 * Math.sin(i * 0.28) * Math.cos(i * 0.09);
        data[i] = (Math.random() * 2 - 1) * env * feltTexture;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Filtro principal de fricción de punta de fieltro (agudo, sedoso y claro)
      const pitchShift = Math.min(stepIndex * 65, 650);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2750 + pitchShift, now);
      bp.frequency.linearRampToValueAtTime(3350 + pitchShift, now + dur);
      bp.Q.setValueAtTime(2.4, now);

      // Segundo filtro para el "chirrido" sutil de fibra húmeda de marcatextos
      const squeak = ctx.createOscillator();
      const squeakGain = ctx.createGain();
      squeak.type = 'sine';
      squeak.frequency.setValueAtTime(3650 + pitchShift * 0.5, now);
      squeak.frequency.linearRampToValueAtTime(3920 + pitchShift * 0.5, now + dur);
      squeakGain.gain.setValueAtTime(0.008, now);
      squeakGain.gain.exponentialRampToValueAtTime(0.0004, now + dur);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.005, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.002, now + dur);

      noise.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);

      squeak.connect(squeakGain);
      squeakGain.connect(ctx.destination);

      noise.start(now);
      squeak.start(now);
      squeak.stop(now + dur);
    } catch {}
  }

  // Sonido de mecha encendida apagándose al seleccionar una casilla segura en el Buscaminas ("pssshhh-t")
  public playFuseExtinguish() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 1. Toque agudo inicial al desactivar la casilla
      const tipOsc = ctx.createOscillator();
      const tipGain = ctx.createGain();
      tipOsc.type = 'triangle';
      tipOsc.frequency.setValueAtTime(2450, now);
      tipOsc.frequency.exponentialRampToValueAtTime(1350, now + 0.025);
      tipGain.gain.setValueAtTime(0.075, now);
      tipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
      tipOsc.connect(tipGain);
      tipGain.connect(ctx.destination);
      tipOsc.start(now);
      tipOsc.stop(now + 0.03);

      // 2. Chisporroteo de mecha apagándose en humedad (sizzle / hiss descendente)
      const sizzleDur = 0.19;
      const bufferSize = Math.floor(ctx.sampleRate * sizzleDur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        // Micro-chispas al inicio que se transforman en vapor suave al apagarse
        const sparkMod = progress < 0.35 ? (Math.random() > 0.25 ? 1.15 : 0.3) : 1.0;
        const decay = Math.pow(1 - progress, 1.45);
        data[i] = (Math.random() * 2 - 1) * sparkMod * decay;
      }

      const sizzle = ctx.createBufferSource();
      sizzle.buffer = buffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(5400, now + 0.01);
      bp.frequency.exponentialRampToValueAtTime(1850, now + sizzleDur);
      bp.Q.setValueAtTime(1.5, now + 0.01);

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1500, now + 0.01);

      const sizzleGain = ctx.createGain();
      sizzleGain.gain.setValueAtTime(0.005, now);
      sizzleGain.gain.linearRampToValueAtTime(0.16, now + 0.022);
      sizzleGain.gain.exponentialRampToValueAtTime(0.0008, now + sizzleDur);

      sizzle.connect(hp);
      hp.connect(bp);
      bp.connect(sizzleGain);
      sizzleGain.connect(ctx.destination);
      sizzle.start(now + 0.008);
    } catch {}
  }

  // Sonido de explosión leve al pisar una mina y perder en el Buscaminas
  public playMildExplosion() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 1. Chispazo corto de detonador / fulminante (0–25 ms)
      const sparkOsc = ctx.createOscillator();
      const sparkGain = ctx.createGain();
      sparkOsc.type = 'sawtooth';
      sparkOsc.frequency.setValueAtTime(2800, now);
      sparkOsc.frequency.exponentialRampToValueAtTime(420, now + 0.032);
      sparkGain.gain.setValueAtTime(0.09, now);
      sparkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      sparkOsc.connect(sparkGain);
      sparkGain.connect(ctx.destination);
      sparkOsc.start(now);
      sparkOsc.stop(now + 0.038);

      // 2. Onda expansiva grave contenida ("boom" sordo de pólvora)
      const boomOsc = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boomOsc.type = 'sine';
      boomOsc.frequency.setValueAtTime(135, now + 0.012);
      boomOsc.frequency.exponentialRampToValueAtTime(28, now + 0.36);
      boomGain.gain.setValueAtTime(0.28, now + 0.012);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      boomOsc.connect(boomGain);
      boomGain.connect(ctx.destination);
      boomOsc.start(now + 0.012);
      boomOsc.stop(now + 0.4);

      // 3. Ráfaga de humo, polvo y escombros leves (ruido filtrado descendente)
      const blastDur = 0.42;
      const blastLen = Math.floor(ctx.sampleRate * blastDur);
      const blastBuf = ctx.createBuffer(1, blastLen, ctx.sampleRate);
      const blastData = blastBuf.getChannelData(0);
      for (let i = 0; i < blastLen; i++) {
        const t = i / blastLen;
        blastData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.8);
      }

      const blastNoise = ctx.createBufferSource();
      blastNoise.buffer = blastBuf;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1450, now + 0.01);
      lp.frequency.exponentialRampToValueAtTime(190, now + blastDur);
      lp.Q.setValueAtTime(1.2, now + 0.01);

      const blastGain = ctx.createGain();
      blastGain.gain.setValueAtTime(0.22, now + 0.01);
      blastGain.gain.exponentialRampToValueAtTime(0.001, now + blastDur);

      blastNoise.connect(lp);
      lp.connect(blastGain);
      blastGain.connect(ctx.destination);
      blastNoise.start(now + 0.01);
    } catch {}
  }

  // Sonido agudo de clavar/quitar alfiler de bandera en el Buscaminas
  public playFlagPin() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2650, now);
      osc.frequency.exponentialRampToValueAtTime(1580, now + 0.032);
      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.038);
    } catch {}
  }

  // Golpe seco y profundo de estampación de sello de cera roja
  public playWaxSeal() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);

      // Leve crujido de cera
      setTimeout(() => this.playPencil(), 60);
    } catch {}
  }

  // Campanada lejana o misterio resuelto
  public playMysteryBell() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Acorde misterioso mayor con eco)
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.06);

        const startTime = this.ctx!.currentTime + idx * 0.06;
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.25);
      });
    } catch {}
  }

  // Clic agudo, nítido y cristalino para los botones e interacciones de los juegos
  public playClick(pitchMultiplier: number = 1) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;
      const mult = Math.max(0.75, Math.min(1.6, pitchMultiplier));

      // 1. Pulso tonal agudo y limpio (tipo pieza de marfil / mecanismo de relojería fina)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1950 * mult, now);
      osc.frequency.exponentialRampToValueAtTime(980 * mult, now + 0.024);

      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.026);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.028);

      // 2. Transitorio cristalino ultra-breve (3800 Hz) que aporta definición aguda
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'sine';
      snapOsc.frequency.setValueAtTime(3850 * mult, now);
      snapOsc.frequency.exponentialRampToValueAtTime(2200 * mult, now + 0.011);

      snapGain.gain.setValueAtTime(0.04, now);
      snapGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.012);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);

      snapOsc.start(now);
      snapOsc.stop(now + 0.014);
    } catch {}
  }

  // Clic de tecla de máquina de escribir años 20 (Criptograma y Crucigrama)
  public playTypewriterKey() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Golpe metálico agudo del tipo contra el rodillo
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2750, now);
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.022);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.026);

      // Chasquido agudo del resorte de retorno
      const springOsc = ctx.createOscillator();
      const springGain = ctx.createGain();
      springOsc.type = 'sine';
      springOsc.frequency.setValueAtTime(4300, now + 0.006);
      springOsc.frequency.exponentialRampToValueAtTime(2900, now + 0.018);
      springGain.gain.setValueAtTime(0.038, now + 0.006);
      springGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.02);
      springOsc.connect(springGain);
      springGain.connect(ctx.destination);
      springOsc.start(now + 0.006);
      springOsc.stop(now + 0.022);
    } catch {}
  }

  // Toque agudo de plumilla estilográfica sobre pergamino (Sudoku y Futoshiki)
  public playNibClick() {
    this.playClick(1.22);
  }

  // Chasquido agudo de ficha de marfil o tarjeta colocada (Sílabas y Connections)
  public playTileSnap() {
    this.playClick(1.14);
  }

  // Suceso paranormal: jarra o vaso de cristal cayendo al suelo y rompiéndose
  // Si existe /audio/glass-shatter.mp3 lo reproduce; de lo contrario usa síntesis física realista
  public playGlassShatter() {
    if (this.isMuted) return;
    try {
      const customAudio = new Audio('./audio/glass-shatter.mp3');
      customAudio.volume = 0.42;
      customAudio.play().catch(() => {
        this.synthesizeRealisticGlassShatter();
      });
    } catch {
      this.synthesizeRealisticGlassShatter();
    }
  }

  private synthesizeRealisticGlassShatter() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 0. Pequeño tintineo previo al vuelco de la jarra sobre la mesa (65 ms antes del impacto)
      const preTip = ctx.createOscillator();
      const preGain = ctx.createGain();
      preTip.type = 'sine';
      preTip.frequency.setValueAtTime(2280, now);
      preGain.gain.setValueAtTime(0.015, now);
      preGain.gain.exponentialRampToValueAtTime(0.0003, now + 0.045);
      preTip.connect(preGain);
      preGain.connect(ctx.destination);
      preTip.start(now);
      preTip.stop(now + 0.05);

      const impact = now + 0.07;

      // 1. Golpe seco pesado de la base contra el suelo de madera/mármol
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(145, impact);
      thudOsc.frequency.exponentialRampToValueAtTime(34, impact + 0.075);
      thudGain.gain.setValueAtTime(0.22, impact);
      thudGain.gain.exponentialRampToValueAtTime(0.0004, impact + 0.085);
      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(impact);
      thudOsc.stop(impact + 0.095);

      // 2. Breve resonancia del cuerpo de cristal justo al fracturarse (0-28 ms)
      [840, 1320, 1980, 2670].forEach((freq, idx) => {
        const ring = ctx.createOscillator();
        const ringGain = ctx.createGain();
        ring.type = 'triangle';
        ring.frequency.setValueAtTime(freq, impact);
        ringGain.gain.setValueAtTime(0.032 / (idx + 1), impact);
        ringGain.gain.exponentialRampToValueAtTime(0.0002, impact + 0.032);
        ring.connect(ringGain);
        ringGain.connect(ctx.destination);
        ring.start(impact);
        ring.stop(impact + 0.038);
      });

      // 3. Crujido granular denso (fractura principal + oleadas de rebote)
      const bursts = [
        { offset: 0.002, dur: 0.16, gain: 0.2, bp: 2600, q: 1.1 },
        { offset: 0.005, dur: 0.22, gain: 0.18, bp: 5600, q: 1.5 },
        { offset: 0.035, dur: 0.19, gain: 0.11, bp: 7400, q: 1.9 },
        { offset: 0.11, dur: 0.14, gain: 0.075, bp: 5900, q: 2.2 },
        { offset: 0.23, dur: 0.12, gain: 0.045, bp: 6900, q: 2.5 },
        { offset: 0.38, dur: 0.11, gain: 0.025, bp: 6400, q: 2.8 },
      ];

      bursts.forEach(b => {
        const bufferSize = Math.floor(ctx.sampleRate * b.dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const r = Math.random();
          const spike =
            r > 0.78 ? Math.random() * 2 - 1 : r > 0.45 ? Math.random() * 0.5 - 0.25 : 0;
          data[i] = spike * Math.exp(-i / (bufferSize * 0.22));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(b.bp, impact + b.offset);
        filter.Q.setValueAtTime(b.q, impact + b.offset);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(b.gain, impact + b.offset);
        gain.gain.exponentialRampToValueAtTime(0.0003, impact + b.offset + b.dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(impact + b.offset);
      });

      // 4. 22 esquirlas cristalinas dispersándose y asentándose hasta 1.15 s
      const shards = [
        { freq: 2890, t: 0.006, d: 0.11, g: 0.034 },
        { freq: 4120, t: 0.012, d: 0.13, g: 0.036 },
        { freq: 5490, t: 0.019, d: 0.12, g: 0.03 },
        { freq: 6840, t: 0.028, d: 0.1, g: 0.026 },
        { freq: 3480, t: 0.044, d: 0.13, g: 0.028 },
        { freq: 6120, t: 0.065, d: 0.11, g: 0.024 },
        { freq: 4720, t: 0.092, d: 0.12, g: 0.021 },
        { freq: 7820, t: 0.118, d: 0.09, g: 0.017 },
        { freq: 3180, t: 0.155, d: 0.13, g: 0.018 },
        { freq: 5280, t: 0.195, d: 0.11, g: 0.015 },
        { freq: 6580, t: 0.245, d: 0.1, g: 0.013 },
        { freq: 3980, t: 0.295, d: 0.12, g: 0.012 },
        { freq: 5740, t: 0.355, d: 0.09, g: 0.009 },
        { freq: 7210, t: 0.42, d: 0.08, g: 0.007 },
        { freq: 4560, t: 0.495, d: 0.08, g: 0.006 },
        { freq: 6020, t: 0.575, d: 0.07, g: 0.005 },
        { freq: 5120, t: 0.665, d: 0.07, g: 0.004 },
        { freq: 6790, t: 0.76, d: 0.06, g: 0.0035 },
        { freq: 4380, t: 0.85, d: 0.06, g: 0.003 },
        { freq: 5890, t: 0.945, d: 0.05, g: 0.0025 },
        { freq: 7110, t: 1.03, d: 0.05, g: 0.002 },
        { freq: 4920, t: 1.12, d: 0.04, g: 0.0015 },
      ];

      shards.forEach(s => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = impact + s.t;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(s.freq, start);
        osc.frequency.exponentialRampToValueAtTime(s.freq * 0.955, start + s.d);

        gain.gain.setValueAtTime(s.g, start);
        gain.gain.exponentialRampToValueAtTime(0.0002, start + s.d);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + s.d + 0.015);
      });
    } catch {}
  }

  // Respiración pesada y tensa de la Detective Azlynn (usa /audio/breathing.mp3 si existe)
  public playHeavyBreathing() {
    if (this.isMuted) return;
    try {
      const customAudio = new Audio('./audio/breathing.mp3');
      customAudio.volume = 0.25;
      customAudio.play().catch(() => {
        this.synthesizeHeavyBreathing();
      });
    } catch {
      this.synthesizeHeavyBreathing();
    }
  }

  private synthesizeHeavyBreathing() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;

      const cycles = [
        { start: 0, inhaleDur: 0.75, exhaleDur: 1.05, vol: 0.045 },
        { start: 2.05, inhaleDur: 0.7, exhaleDur: 1.15, vol: 0.038 },
      ];

      cycles.forEach(c => {
        const totalDur = c.inhaleDur + c.exhaleDur + 0.15;
        const bufferSize = Math.floor(ctx.sampleRate * totalDur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(780, now + c.start);
        filter.frequency.linearRampToValueAtTime(520, now + c.start + c.inhaleDur);
        filter.frequency.linearRampToValueAtTime(640, now + c.start + c.inhaleDur + c.exhaleDur);
        filter.Q.setValueAtTime(2.6, now + c.start);

        const gain = ctx.createGain();
        const t0 = now + c.start;
        gain.gain.setValueAtTime(0.0005, t0);
        gain.gain.linearRampToValueAtTime(c.vol * 0.75, t0 + c.inhaleDur * 0.65);
        gain.gain.linearRampToValueAtTime(0.002, t0 + c.inhaleDur);
        const tEx = t0 + c.inhaleDur + 0.08;
        gain.gain.linearRampToValueAtTime(c.vol, tEx + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.0005, tEx + c.exhaleDur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t0);
        noise.stop(t0 + totalDur);
      });
    } catch {}
  }

  // Suceso paranormal: reproduce grabaciones reales en /audio/whisper-1..3.mp3
  public playConspiracyWhisper(_phrase?: string) {
    if (this.isMuted) return;
    try {
      const idx = 1 + Math.floor(Math.random() * 3);
      const whisperAudio = new Audio(`./audio/whisper-${idx}.mp3`);
      whisperAudio.volume = 0.22;
      whisperAudio.play().catch(() => {
        this.playColdWhisper();
      });
    } catch {
      this.playColdWhisper();
    }
  }

  // Suceso paranormal: crujido grave de madera vieja o pisada lejana
  public playWoodCreak() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.linearRampToValueAtTime(62, now + 0.38);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.42);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  // Suceso paranormal: ráfaga fugaz de aire frío detrás del pasillo
  public playColdWhisper() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.65);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(1100, now + 0.3);
      filter.frequency.exponentialRampToValueAtTime(380, now + 0.65);
      filter.Q.setValueAtTime(4.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.65);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
    } catch {}
  }

  // Tensión máxima: Latido cardíaco visceral sintetizado para la Audiencia Formal de Acusación
  private heartbeatInterval: number | null = null;

  public playHeartbeat() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Primer latido (lub) - pulso bajo y seco
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(36, now + 0.12);
      gain1.gain.setValueAtTime(0.24, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.14);

      // Segundo latido (dub) - pulso más grave y sordo
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(52, now + 0.16);
      osc2.frequency.exponentialRampToValueAtTime(28, now + 0.32);
      gain2.gain.setValueAtTime(0.28, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.35);
    } catch {}
  }

  public startHeartbeatLoop() {
    this.stopHeartbeatLoop();
    this.playHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      this.playHeartbeat();
    }, 1120);
  }

  public stopHeartbeatLoop() {
    if (this.heartbeatInterval !== null) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public playError() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(165, now);
      osc.frequency.exponentialRampToValueAtTime(88, now + 0.18);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    } catch {}
  }
}

export const sound = new SoundEngine();
