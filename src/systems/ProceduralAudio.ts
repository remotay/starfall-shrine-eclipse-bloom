/**
 * Fully procedural WebAudio: SFX from oscillators/noise envelopes, and a tiny
 * generative step sequencer for per-stage background music. No audio files.
 */

interface ToneOpts {
  f: number;
  f1?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  when?: number;
  filterF?: number;
  attack?: number;
  bus?: GainNode;
}

interface MusicTrack {
  bpm: number;
  root: number;
  /** semitone offsets of the scale */
  scale: number[];
  /** bass degrees per beat (16 = 4 bars), -100 = rest */
  bass: number[];
  /** arp degrees per 8th note (32 = 4 bars), -100 = rest */
  arp: number[];
  /** pad chord degrees per bar */
  pads: number[][];
  kick: boolean;
  arpVol: number;
}

const R = -100; // rest

const TRACKS: Record<string, MusicTrack> = {
  menu: {
    bpm: 66,
    root: 110,
    scale: [0, 3, 5, 7, 10, 12, 15],
    bass: [0, R, R, R, -2, R, R, R, 0, R, R, R, 3, R, -2, R],
    arp: [4, R, 2, R, 5, R, 4, R, 2, R, 0, R, 4, R, 6, R, 5, R, 4, R, 2, R, 4, R, 0, R, 2, R, 1, R, 0, R],
    pads: [[0, 2, 4], [0, 2, 4], [-2, 0, 3], [3, 5, 7]],
    kick: false,
    arpVol: 0.035,
  },
  stage0: {
    bpm: 100,
    root: 146.83, // D3
    scale: [0, 2, 3, 7, 10, 12, 14, 15],
    bass: [0, 0, R, 0, -4, R, -4, R, -2, R, -2, R, 3, R, 2, R],
    arp: [4, 6, 7, 6, 4, R, 2, R, 4, 6, 7, R, 6, 4, 2, R, 3, 5, 7, 5, 3, R, 1, R, 4, 2, 0, R, 2, 4, 6, R],
    pads: [[0, 2, 4], [-4, 0, 2], [-2, 1, 3], [2, 4, 6]],
    kick: false,
    arpVol: 0.042,
  },
  stage1: {
    bpm: 126,
    root: 130.81, // C3
    scale: [0, 2, 3, 5, 7, 8, 10, 12],
    bass: [0, R, 0, 0, R, 0, R, 0, -2, R, -2, -2, R, -2, R, 5],
    arp: [7, R, 4, 7, R, 4, 6, R, 7, R, 4, 7, R, 9, 7, 6, 5, R, 2, 5, R, 2, 4, R, 5, 7, 9, 7, R, 5, 4, 2],
    pads: [[0, 2, 4], [0, 2, 4], [-2, 0, 2], [3, 5, 7]],
    kick: true,
    arpVol: 0.045,
  },
  stage2: {
    bpm: 138,
    root: 123.47, // B2
    scale: [0, 1, 4, 5, 7, 8, 11, 12],
    bass: [0, 0, R, 0, 0, R, 1, R, -4, -4, R, -4, -4, R, 1, 0],
    arp: [7, R, 6, 7, 9, R, 7, 6, 4, R, 2, 4, 6, R, 4, 2, 7, 9, 11, R, 9, 7, 6, R, 7, 6, 4, 2, 1, R, 2, 4],
    pads: [[0, 2, 4], [-4, -2, 0], [1, 3, 5], [0, 2, 4]],
    kick: true,
    arpVol: 0.05,
  },
};

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private last: Record<string, number> = {};
  muted = false;

  // music sequencer state
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private step = 0;
  private track: MusicTrack | null = null;

  /** Create/resume the context. Must be called from a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 1;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.85;
      this.musicBus.connect(this.master);
      // 1 second of white noise, reused by all noise hits
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.value = this.muted ? 0 : 0.85;
    return this.muted;
  }

  private ok(key: string, minGap: number): boolean {
    const now = performance.now();
    if (now - (this.last[key] ?? -1e9) < minGap * 1000) return false;
    this.last[key] = now;
    return true;
  }

  private tone(o: ToneOpts): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = o.when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    const g = ctx.createGain();
    const vol = o.vol ?? 0.1;
    const atk = o.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let head: AudioNode = osc;
    if (o.filterF) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.filterF;
      head.connect(f);
      head = f;
    }
    head.connect(g);
    g.connect(o.bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  private noise(opts: { dur: number; vol: number; when?: number; filterF?: number; type?: BiquadFilterType }): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf) return;
    const t = opts.when ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'lowpass';
    f.frequency.value = opts.filterF ?? 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t);
    src.stop(t + opts.dur + 0.05);
  }

  /* ------------------------------- SFX ------------------------------- */

  shoot(): void {
    if (!this.ctx || !this.ok('shoot', 0.09)) return;
    this.tone({ f: 720, f1: 540, dur: 0.05, type: 'square', vol: 0.016, filterF: 1500 });
  }

  enemyDie(): void {
    if (!this.ctx || !this.ok('die', 0.04)) return;
    this.noise({ dur: 0.16, vol: 0.08, filterF: 2400 });
    this.tone({ f: 240, f1: 60, dur: 0.18, type: 'triangle', vol: 0.09 });
  }

  graze(): void {
    if (!this.ctx || !this.ok('graze', 0.05)) return;
    this.tone({ f: 2300, f1: 3100, dur: 0.035, type: 'sine', vol: 0.035 });
  }

  /** low hum tick while shots land on a boss — classic damage feedback */
  bossHit(): void {
    if (!this.ctx || !this.ok('bosshit', 0.09)) return;
    this.tone({ f: 150, f1: 110, dur: 0.05, type: 'square', vol: 0.022, filterF: 550 });
  }

  pickup(): void {
    if (!this.ctx || !this.ok('pickup', 0.04)) return;
    this.tone({ f: 1180, f1: 1500, dur: 0.05, type: 'sine', vol: 0.035 });
  }

  playerHit(): void {
    if (!this.ctx) return;
    this.noise({ dur: 0.35, vol: 0.22, filterF: 900 });
    this.tone({ f: 380, f1: 50, dur: 0.45, type: 'sawtooth', vol: 0.2, filterF: 1200 });
  }

  bomb(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise({ dur: 0.9, vol: 0.24, filterF: 700 });
    this.tone({ f: 58, f1: 36, dur: 1.0, type: 'sine', vol: 0.3, when: t });
    this.tone({ f: 880, f1: 110, dur: 0.7, type: 'sawtooth', vol: 0.07, filterF: 1600, when: t + 0.05 });
  }

  bossPhase(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise({ dur: 0.25, vol: 0.14, filterF: 3000 });
    for (const [i, f] of [392, 466, 587].entries()) {
      this.tone({ f, dur: 0.5, type: 'sawtooth', vol: 0.05, filterF: 2200, when: t + i * 0.03 });
    }
  }

  bossDie(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise({ dur: 1.4, vol: 0.26, filterF: 1100 });
    this.tone({ f: 90, f1: 28, dur: 1.6, type: 'sine', vol: 0.3 });
    for (let i = 0; i < 5; i++) {
      this.tone({ f: 1400 - i * 200, f1: 200, dur: 0.4, type: 'square', vol: 0.03, filterF: 2000, when: t + i * 0.12 });
    }
  }

  spellCapture(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [i, f] of [523, 659, 784, 1046, 1318].entries()) {
      this.tone({ f, dur: 0.28, type: 'triangle', vol: 0.07, when: t + i * 0.07 });
    }
  }

  extend(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [i, f] of [659, 880, 1108, 1318, 1760].entries()) {
      this.tone({ f, dur: 0.3, type: 'sine', vol: 0.08, when: t + i * 0.08 });
    }
  }

  confirm(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone({ f: 660, dur: 0.07, type: 'square', vol: 0.05, filterF: 2500, when: t });
    this.tone({ f: 990, dur: 0.12, type: 'square', vol: 0.05, filterF: 2500, when: t + 0.07 });
  }

  select(): void {
    if (!this.ctx || !this.ok('select', 0.05)) return;
    this.tone({ f: 440, dur: 0.05, type: 'square', vol: 0.04, filterF: 2200 });
  }

  /* ------------------------------ music ------------------------------ */

  startMusic(key: 'menu' | 'stage0' | 'stage1' | 'stage2'): void {
    if (!this.ctx) return;
    this.stopMusic();
    this.track = TRACKS[key];
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.pump(), 50);
  }

  stopMusic(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.track = null;
  }

  private freq(track: MusicTrack, degree: number, octave = 0): number {
    const n = track.scale.length;
    let d = degree;
    let oct = octave;
    while (d < 0) {
      d += n;
      oct -= 1;
    }
    oct += Math.floor(d / n);
    d %= n;
    return track.root * Math.pow(2, (track.scale[d] + oct * 12) / 12);
  }

  /** lookahead scheduler: schedules every 16th-note step slightly ahead */
  private pump(): void {
    const ctx = this.ctx;
    const tr = this.track;
    if (!ctx || !tr) return;
    const stepDur = 60 / tr.bpm / 4; // 16th note
    while (this.nextStepTime < ctx.currentTime + 0.18) {
      this.scheduleStep(tr, this.step, this.nextStepTime, stepDur);
      this.nextStepTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  private scheduleStep(tr: MusicTrack, step: number, t: number, stepDur: number): void {
    const beat = Math.floor(step / 4) % 16;
    const eighth = Math.floor(step / 2) % 32;
    const bar = Math.floor(step / 16) % 4;

    if (step % 4 === 0) {
      const bd = tr.bass[beat];
      if (bd !== R) {
        this.tone({ f: this.freq(tr, bd, -1), dur: stepDur * 3.4, type: 'triangle', vol: 0.07, when: t, bus: this.musicBus, attack: 0.01 });
      }
      if (tr.kick && step % 8 === 0) {
        this.tone({ f: 130, f1: 42, dur: 0.11, type: 'sine', vol: 0.09, when: t, bus: this.musicBus });
      }
    }
    if (step % 2 === 0) {
      const ad = tr.arp[eighth];
      if (ad !== R) {
        this.tone({ f: this.freq(tr, ad, 1), dur: stepDur * 1.8, type: 'square', vol: tr.arpVol, filterF: 1700, when: t, bus: this.musicBus, attack: 0.006 });
      }
      // hat on off-beats
      if (tr.kick && step % 8 === 4 && this.noiseBuf) {
        const src = this.ctx!.createBufferSource();
        src.buffer = this.noiseBuf;
        const f = this.ctx!.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 7000;
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.018, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        src.connect(f);
        f.connect(g);
        g.connect(this.musicBus);
        src.start(t);
        src.stop(t + 0.06);
      }
    }
    if (step % 16 === 0) {
      for (const d of tr.pads[bar]) {
        this.tone({ f: this.freq(tr, d, 0) * 1.002, dur: stepDur * 15, type: 'sawtooth', vol: 0.012, filterF: 750, when: t, bus: this.musicBus, attack: 0.25 });
        this.tone({ f: this.freq(tr, d, 0) * 0.998, dur: stepDur * 15, type: 'sawtooth', vol: 0.012, filterF: 750, when: t, bus: this.musicBus, attack: 0.25 });
      }
    }
  }
}

/** Module-level singleton: survives scene restarts. */
export const audio = new ProceduralAudio();
