// Web Audio API Procedural Sound Synthesizer
// Genera efectos de sonido hiper-ligeros y cálidos sin archivos externos de audio

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy audio context init on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  // Sonido de pasar página de libro antiguo (White noise con filtro paso banda envolvente)
  public playPageTurn() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const bufferSize = this.ctx.sampleRate * 0.25; // 250ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.25);
      filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  // Rasgueo de lápiz al marcar una casilla / tachar una palabra
  public playPencil() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(i / 10);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
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

      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Acorde misterioso mayor con eco)
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

  // Clic suave de máquina de escribir o tecla
  public playClick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {}
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
          // Impulsos irregulares secos de vidrio quebrándose
          const r = Math.random();
          const spike = r > 0.78 ? (Math.random() * 2 - 1) : r > 0.45 ? (Math.random() * 0.5 - 0.25) : 0;
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
        { freq: 5490, t: 0.019, d: 0.12, g: 0.030 },
        { freq: 6840, t: 0.028, d: 0.10, g: 0.026 },
        { freq: 3480, t: 0.044, d: 0.13, g: 0.028 },
        { freq: 6120, t: 0.065, d: 0.11, g: 0.024 },
        { freq: 4720, t: 0.092, d: 0.12, g: 0.021 },
        { freq: 7820, t: 0.118, d: 0.09, g: 0.017 },
        { freq: 3180, t: 0.155, d: 0.13, g: 0.018 },
        { freq: 5280, t: 0.195, d: 0.11, g: 0.015 },
        { freq: 6580, t: 0.245, d: 0.10, g: 0.013 },
        { freq: 3980, t: 0.295, d: 0.12, g: 0.012 },
        { freq: 5740, t: 0.355, d: 0.09, g: 0.009 },
        { freq: 7210, t: 0.420, d: 0.08, g: 0.007 },
        { freq: 4560, t: 0.495, d: 0.08, g: 0.006 },
        { freq: 6020, t: 0.575, d: 0.07, g: 0.005 },
        { freq: 5120, t: 0.665, d: 0.07, g: 0.004 },
        { freq: 6790, t: 0.760, d: 0.06, g: 0.0035 },
        { freq: 4380, t: 0.850, d: 0.06, g: 0.003 },
        { freq: 5890, t: 0.945, d: 0.05, g: 0.0025 },
        { freq: 7110, t: 1.030, d: 0.05, g: 0.002 },
        { freq: 4920, t: 1.120, d: 0.04, g: 0.0015 },
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

      // 2 ciclos de inhalación + exhalación agitada y contenida
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

        // Filtro formante vocal suave (tracto respiratorio)
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(780, now + c.start);
        filter.frequency.linearRampToValueAtTime(520, now + c.start + c.inhaleDur);
        filter.frequency.linearRampToValueAtTime(640, now + c.start + c.inhaleDur + c.exhaleDur);
        filter.Q.setValueAtTime(2.6, now + c.start);

        const gain = ctx.createGain();
        const t0 = now + c.start;
        // Inhalación tensa
        gain.gain.setValueAtTime(0.0005, t0);
        gain.gain.linearRampToValueAtTime(c.vol * 0.75, t0 + c.inhaleDur * 0.65);
        gain.gain.linearRampToValueAtTime(0.002, t0 + c.inhaleDur);
        // Pausa breve y exhalación pesada
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
  // (y usa el susurro atmosférico si aún no se agregan los archivos)
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
