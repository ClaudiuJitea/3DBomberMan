export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    // Initialized on first user gesture
  }

  private initContext(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.35;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.35;
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playMove(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playPlaceBomb(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playFuseTick(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(440, now + 0.02);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playExplosion(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Sub rumble oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.6);

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.5);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.5);
  }

  public playPowerUp(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.12);
    });
  }

  public playShieldUp(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Crystalline resonant chord (C5, E5, G5, C6)
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.22, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.35);
    });
  }

  public playShieldBreak(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // 1. Force field shatter zap
    const zapOsc = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zapOsc.type = 'sawtooth';
    zapOsc.frequency.setValueAtTime(850, now);
    zapOsc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    zapGain.gain.setValueAtTime(0.35, now);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    zapOsc.connect(zapGain);
    zapGain.connect(this.masterGain);
    zapOsc.start(now);
    zapOsc.stop(now + 0.25);

    // 2. Crystalline crackle / bandpass noise pop
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(3.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.25);
  }

  public playEnemyDeath(): void {
    this.playEnemyRobotDeath(0);
  }

  public playEnemyRobotDeath(stage: number): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    if (stage === 0) {
      // Stage 0: Cartoon spring lid POP (booo-ing!)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(820, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (stage === 1) {
      // Stage 1: Mechanical gear ratchet clicking / chug
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240 + (i % 2) * 60, now + i * 0.14);
        gain.gain.setValueAtTime(0.18, now + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.14);
        osc.stop(now + i * 0.14 + 0.05);
      }
    } else if (stage === 2) {
      // Stage 2: Spring sign unfurl (sproing-snap!)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.22);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (stage === 3) {
      // Stage 3: Comically sad metal bird cuckoo squeak
      const audioCtx = this.ctx;
      const targetGain = this.masterGain;
      [440, 370].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + idx * 0.18 + 0.22);

        gain.gain.setValueAtTime(0.22, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.22);

        osc.connect(gain);
        gain.connect(targetGain);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.22);
      });
    }
  }

  public playEnemyRocketDeath(stage: number): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    if (stage === 0) {
      // Stage 0: Hatch pop & sizzling fuse
      const oscPop = this.ctx.createOscillator();
      const gainPop = this.ctx.createGain();
      oscPop.type = 'sine';
      oscPop.frequency.setValueAtTime(220, now);
      oscPop.frequency.exponentialRampToValueAtTime(740, now + 0.08);
      oscPop.frequency.exponentialRampToValueAtTime(280, now + 0.25);
      gainPop.gain.setValueAtTime(0.35, now);
      gainPop.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      oscPop.connect(gainPop);
      gainPop.connect(this.masterGain);
      oscPop.start(now);
      oscPop.stop(now + 0.25);

      // Sizzling spark noise
      for (let i = 0; i < 6; i++) {
        const oscSpark = this.ctx.createOscillator();
        const gainSpark = this.ctx.createGain();
        oscSpark.type = 'triangle';
        oscSpark.frequency.setValueAtTime(1400 + Math.random() * 800, now + i * 0.05);
        gainSpark.gain.setValueAtTime(0.12, now + i * 0.05);
        gainSpark.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.04);
        oscSpark.connect(gainSpark);
        gainSpark.connect(this.masterGain);
        oscSpark.start(now + i * 0.05);
        oscSpark.stop(now + i * 0.05 + 0.04);
      }
    } else if (stage === 1) {
      // Stage 1: Whistling screaming bottle rocket & pinwheel spin (wheeeee-whirl!)
      const oscWhistle = this.ctx.createOscillator();
      const gainWhistle = this.ctx.createGain();
      oscWhistle.type = 'sawtooth';
      oscWhistle.frequency.setValueAtTime(360, now);
      oscWhistle.frequency.exponentialRampToValueAtTime(1420, now + 0.45);
      oscWhistle.frequency.exponentialRampToValueAtTime(980, now + 0.85);

      // Low pass filter for warm arcade jet buzz
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      gainWhistle.gain.setValueAtTime(0.28, now);
      gainWhistle.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      oscWhistle.connect(filter);
      filter.connect(gainWhistle);
      gainWhistle.connect(this.masterGain);
      oscWhistle.start(now);
      oscWhistle.stop(now + 0.85);
    } else if (stage === 2) {
      // Stage 2: Sputtering engine cough (putt-putt-cough!)
      for (let i = 0; i < 3; i++) {
        const oscCough = this.ctx.createOscillator();
        const gainCough = this.ctx.createGain();
        oscCough.type = 'square';
        oscCough.frequency.setValueAtTime(180 - i * 35, now + i * 0.12);
        gainCough.gain.setValueAtTime(0.22, now + i * 0.12);
        gainCough.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.07);
        oscCough.connect(gainCough);
        gainCough.connect(this.masterGain);
        oscCough.start(now + i * 0.12);
        oscCough.stop(now + i * 0.12 + 0.07);
      }
    } else if (stage === 3) {
      // Stage 3: Slide whistle plunge followed by comic metal crash / anvil thud
      const oscSlide = this.ctx.createOscillator();
      const gainSlide = this.ctx.createGain();
      oscSlide.type = 'sine';
      oscSlide.frequency.setValueAtTime(860, now);
      oscSlide.frequency.exponentialRampToValueAtTime(110, now + 0.22);
      gainSlide.gain.setValueAtTime(0.30, now);
      gainSlide.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      oscSlide.connect(gainSlide);
      gainSlide.connect(this.masterGain);
      oscSlide.start(now);
      oscSlide.stop(now + 0.22);

      // Metal thud impact
      const impactTime = now + 0.20;
      const oscThud = this.ctx.createOscillator();
      const gainThud = this.ctx.createGain();
      oscThud.type = 'triangle';
      oscThud.frequency.setValueAtTime(95, impactTime);
      oscThud.frequency.exponentialRampToValueAtTime(32, impactTime + 0.35);
      gainThud.gain.setValueAtTime(0.45, impactTime);
      gainThud.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.35);
      oscThud.connect(gainThud);
      gainThud.connect(this.masterGain);
      oscThud.start(impactTime);
      oscThud.stop(impactTime + 0.35);
    }
  }

  public playPlayerDeath(): void {
    this.playFireDeath(0);
  }

  public playFireDeath(stage: number): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    if (stage === 0) {
      // Stage 0: Sizzle zap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.22);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (stage === 1) {
      // Stage 1: High cartoon panic chirp (hot pants!)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (stage === 2) {
      // Stage 2: Ash crumble & poof drop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (stage === 3) {
      // Stage 3: Cute cartoon eyelid double-blink pop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1150, now);
      osc.frequency.exponentialRampToValueAtTime(1650, now + 0.04);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.045);
    } else if (stage === 4) {
      // Stage 4: Eyeball marble floor bounce & roll
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.06);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.065);
    }
  }

  public playEnemyDeathBoing(stage: number): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    if (stage === 0) {
      // Stage 0: Balloon Swelling Tension (Rubber stretch rising pitch)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 1.0);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.95);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.05);
    } else if (stage === 1) {
      // Stage 1: Explosive Blood POP & Splat
      // 1. Noise burst
      const bufferSize = this.ctx.sampleRate * 0.18;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.40, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      noise.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);

      // 2. Wet squelch pop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.16);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (stage === 2) {
      // Stage 2: Celestial Angelic Harp Arpeggio (Soul ascending to heaven)
      const harpNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      harpNotes.forEach((f, i) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + i * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, noteTime);

        gain.gain.setValueAtTime(0.18, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(noteTime);
        osc.stop(noteTime + 0.45);
      });
    }
  }

  public playBombOverheat(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1050, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.035);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playVictory(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const melody = [
      { freq: 523.25, dur: 0.12 }, // C5
      { freq: 659.25, dur: 0.12 }, // E5
      { freq: 783.99, dur: 0.12 }, // G5
      { freq: 1046.50, dur: 0.35 } // C6
    ];

    let t = now;
    melody.forEach(m => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(m.freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + m.dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + m.dur);
      t += m.dur + 0.02;
    });
  }
}
