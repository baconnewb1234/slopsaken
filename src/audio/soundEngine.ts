/**
 * Procedural Sketchbook Audio Engine for Inkbound
 * Generates creepy doodle-themed sounds using the Web Audio API
 */

class SketchAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Heartbeat tracking
  private heartbeatInterval: number | null = null;
  private currentHeartbeatRate: number = 0; // 0 = none, 1..4 = intensity

  // Dynamic Chase Music Loop - Bitcrushed Noli Terror Radius Concept Theme #3
  private isChasePlaying: boolean = false;
  private chaseTimer: number | null = null;
  private chaseStep: number = 0;

  // Bitcrusher Audio Effect Chain
  private bitcrushNode: WaveShaperNode | null = null;
  private bitcrushFilter: BiquadFilterNode | null = null;

  // Ambience loop
  private ambienceOsc: OscillatorNode | null = null;
  private ambienceGain: GainNode | null = null;

  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Create Authentic Bitcrusher WaveShaper (4-bit stepped quantization)
      const steps = 16;
      const n = 4096;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = Math.round(x * (steps / 2)) / (steps / 2);
      }
      this.bitcrushNode = this.ctx.createWaveShaper();
      this.bitcrushNode.curve = curve;
      this.bitcrushNode.oversample = 'none';

      // 8-bit downsampling lowpass filter
      this.bitcrushFilter = this.ctx.createBiquadFilter();
      this.bitcrushFilter.type = 'lowpass';
      this.bitcrushFilter.frequency.setValueAtTime(3400, this.ctx.currentTime);

      this.bitcrushNode.connect(this.bitcrushFilter);
      this.bitcrushFilter.connect(this.musicGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.startAmbience();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public ensureAudio() {
    this.initCtx();
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- Dynamic Terror Radius Heartbeat ---
  public updateTerrorRadius(distanceMeters: number) {
    if (!this.ctx || this.isMuted) return;

    // DBD style terror radius:
    // > 36m: Silent
    // 24m - 36m: Level 1 (Slow thumping heartbeat, 50 bpm)
    // 14m - 24m: Level 2 (Medium heartbeat, 90 bpm)
    // 6m - 14m: Level 3 (Fast intense heartbeat, 130 bpm)
    // < 6m: Level 4 (Frantic racing heartbeat, 165 bpm + dynamic chase)

    let rateLevel = 0;
    if (distanceMeters < 7) rateLevel = 4;
    else if (distanceMeters < 15) rateLevel = 3;
    else if (distanceMeters < 25) rateLevel = 2;
    else if (distanceMeters < 36) rateLevel = 1;

    if (rateLevel !== this.currentHeartbeatRate) {
      this.currentHeartbeatRate = rateLevel;
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (rateLevel > 0) {
        const intervalMs = rateLevel === 4 ? 380 : rateLevel === 3 ? 550 : rateLevel === 2 ? 800 : 1200;
        this.playHeartbeatThump(rateLevel);
        this.heartbeatInterval = window.setInterval(() => {
          this.playHeartbeatThump(rateLevel);
        }, intervalMs);
      }
    }

    // Toggle dynamic chase music based on terror
    if (distanceMeters < 16 && !this.isChasePlaying) {
      this.startChaseMusic();
    } else if (distanceMeters >= 20 && this.isChasePlaying) {
      this.stopChaseMusic();
    }
  }

  private playHeartbeatThump(intensity: number) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sub-bass 'Lub-Dub'
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110 + intensity * 25, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.14);

    const baseVol = 0.2 + intensity * 0.15;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(baseVol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);

    // Second faint 'dub'
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(65, t);
      osc2.frequency.exponentialRampToValueAtTime(30, t + 0.12);

      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(baseVol * 0.65, t + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t);
      osc2.stop(t + 0.16);
    }, 120);
  }

  // --- BITCRUSHED CHASE THEME: Noli's Terror Radius Concept Theme #3 [A Simple ASYM UST] ---
  public startChaseMusic() {
    if (this.isChasePlaying) return;
    this.initCtx();
    this.isChasePlaying = true;
    this.chaseStep = 0;
    if (this.chaseTimer) clearInterval(this.chaseTimer);

    // Fast syncopated terror rhythm (125ms per step)
    this.chaseTimer = window.setInterval(() => {
      this.playChaseBeat();
    }, 125);
  }

  private stopChaseMusic() {
    this.isChasePlaying = false;
    if (this.chaseTimer) {
      clearInterval(this.chaseTimer);
      this.chaseTimer = null;
    }
  }

  private playChaseBeat() {
    if (!this.ctx || !this.bitcrushNode || this.isMuted) return;
    const now = this.ctx.currentTime;
    this.chaseStep = (this.chaseStep + 1) % 16;

    // Bitcrushed Industrial Kick on downbeats (0, 4, 8, 12)
    if (this.chaseStep % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'square';
      kickOsc.frequency.setValueAtTime(150, now);
      kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.11);

      kickGain.gain.setValueAtTime(0.32, now);
      kickGain.gain.exponentialRampToValueAtTime(0.005, now + 0.13);

      kickOsc.connect(kickGain);
      kickGain.connect(this.bitcrushNode);
      kickOsc.start(now);
      kickOsc.stop(now + 0.14);
    }

    // Bitcrushed Glitch Snare on backbeats (steps 4, 12)
    if (this.chaseStep === 4 || this.chaseStep === 12) {
      const snareOsc = this.ctx.createOscillator();
      const snareGain = this.ctx.createGain();
      snareOsc.type = 'sawtooth';
      snareOsc.frequency.setValueAtTime(260, now);
      snareOsc.frequency.linearRampToValueAtTime(80, now + 0.08);

      snareGain.gain.setValueAtTime(0.24, now);
      snareGain.gain.exponentialRampToValueAtTime(0.005, now + 0.1);

      snareOsc.connect(snareGain);
      snareGain.connect(this.bitcrushNode);
      snareOsc.start(now);
      snareOsc.stop(now + 0.11);
    }

    // Noli's Menacing 8-Bit Chromatic Bass & Stabs
    // [C2: 65.4Hz, C#2: 69.3Hz, D2: 73.4Hz, Eb2: 77.8Hz, F2: 87.3Hz]
    const noliBassNotes = [65.4, 65.4, 69.3, 65.4, 77.8, 73.4, 65.4, 69.3, 65.4, 69.3, 87.3, 77.8, 73.4, 69.3, 65.4, 69.3];
    const bassFreq = noliBassNotes[this.chaseStep];

    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(bassFreq, now);

    bassGain.gain.setValueAtTime(0.22, now);
    bassGain.gain.exponentialRampToValueAtTime(0.008, now + 0.12);

    bassOsc.connect(bassGain);
    bassGain.connect(this.bitcrushNode);
    bassOsc.start(now);
    bassOsc.stop(now + 0.13);

    // Eerie high dissonant 8-bit stabs on odd steps
    if (this.chaseStep % 2 === 1) {
      const stabOsc = this.ctx.createOscillator();
      const stabGain = this.ctx.createGain();
      const stabFilter = this.ctx.createBiquadFilter();

      const noliStabFrequencies = [261.6, 277.2, 311.1, 293.7, 349.2, 329.6, 277.2, 261.6];
      const sFreq = noliStabFrequencies[(this.chaseStep >> 1) % noliStabFrequencies.length];

      stabOsc.type = 'square';
      stabOsc.frequency.setValueAtTime(sFreq, now);

      stabFilter.type = 'bandpass';
      stabFilter.frequency.setValueAtTime(900 + (this.chaseStep * 50), now);
      stabFilter.Q.setValueAtTime(5, now);

      stabGain.gain.setValueAtTime(0.12, now);
      stabGain.gain.exponentialRampToValueAtTime(0.005, now + 0.11);

      stabOsc.connect(stabFilter);
      stabFilter.connect(stabGain);
      stabGain.connect(this.bitcrushNode);

      stabOsc.start(now);
      stabOsc.stop(now + 0.12);
    }
  }

  // --- Background Ambience ---
  private startAmbience() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, now); // Low eerie drone

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);

    gain.gain.setValueAtTime(0.06, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    this.ambienceOsc = osc;
    this.ambienceGain = gain;
  }

  // --- Procedural Sound Effects ---

  // 1. Pencil Scribble (during repairs / interactions)
  public playPencilScratch() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800 + Math.random() * 800, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  // 2. Skill check warning chime ("Ping!")
  public playSkillCheckWarning() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(1150, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // 3. Skill check success bell
  public playSkillCheckSuccess(isGreat: boolean) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const freqs = isGreat ? [659.25, 830.61, 987.77] : [587.33, 739.99];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.2, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.38);
    });
  }

  // 4. Skill check fail / explosion spark
  public playSkillCheckFail() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Dissonant low buzz
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.4);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.42);

    // Spark snap noise
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  // 5. Pallet Drop / Heavy Wooden Slam
  public playPalletDrop() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  // 6. Hunter Stunned Sizzle
  public playHunterStunned() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.5);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  // 7. Vault whoosh
  public playVault() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(340, now + 0.12);
    osc.frequency.linearRampToValueAtTime(120, now + 0.22);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 8. Hunter Attack Swing & Hit
  public playAttackSwing() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playHitSplat() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Ink splash & bone crunch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // 9. Generator Finished Chime & Escape Gate Siren
  public playGeneratorDone() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.25, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.55);
    });
  }

  public playGateSiren() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const startTime = now + i * 0.6;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, startTime);
      osc.frequency.linearRampToValueAtTime(660, startTime + 0.28);
      osc.frequency.linearRampToValueAtTime(440, startTime + 0.55);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.linearRampToValueAtTime(0.01, startTime + 0.58);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.6);
    }
  }

  // 10. Ability Activate
  public playAbilityActivate() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.25);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  // 11. Teammate Rescued
  public playTeammateRescued() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.32);
    });
  }

  // 12. Forcefield Block / Clang (when stun is blocked by immunity shield)
  public playBlockClang() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // --- BITCRUSHED LMS THEME: BRICK ASYM UST | YOU CALL THIS AN LMS!? (LMS THEME V2) ---
  private isLastManPlaying: boolean = false;
  private lastManTimer: number | null = null;
  private lastManStep: number = 0;

  public playLastManStanding() {
    if (this.isLastManPlaying) return;
    this.initCtx();
    this.isLastManPlaying = true;
    this.lastManStep = 0;
    if (this.lastManTimer) clearInterval(this.lastManTimer);

    // Fast 165 BPM 16th-note ostinato (~91ms per step)
    this.lastManTimer = window.setInterval(() => {
      if (!this.ctx || !this.bitcrushNode || this.isMuted) return;
      const now = this.ctx.currentTime;
      this.lastManStep = (this.lastManStep + 1) % 32;

      // 1. Bitcrushed 8-Bit Kick on downbeats (0, 4, 8, 12, 16, 20, 24, 28)
      if (this.lastManStep % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'square';
        kickOsc.frequency.setValueAtTime(160, now);
        kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.08);

        kickGain.gain.setValueAtTime(0.35, now);
        kickGain.gain.exponentialRampToValueAtTime(0.005, now + 0.1);

        kickOsc.connect(kickGain);
        kickGain.connect(this.bitcrushNode);
        kickOsc.start(now);
        kickOsc.stop(now + 0.11);
      }

      // 2. Bitcrushed Noise Snare on backbeats (steps 4, 12, 20, 28)
      if (this.lastManStep % 8 === 4) {
        const snareOsc = this.ctx.createOscillator();
        const snareGain = this.ctx.createGain();
        snareOsc.type = 'sawtooth';
        snareOsc.frequency.setValueAtTime(380, now);
        snareOsc.frequency.linearRampToValueAtTime(90, now + 0.07);

        snareGain.gain.setValueAtTime(0.26, now);
        snareGain.gain.exponentialRampToValueAtTime(0.005, now + 0.09);

        snareOsc.connect(snareGain);
        snareGain.connect(this.bitcrushNode);
        snareOsc.start(now);
        snareOsc.stop(now + 0.1);
      }

      // 3. Bitcrushed Driving Bassline (D Minor Blues Scale)
      // D2: 73.4Hz, F2: 87.3Hz, G2: 98.0Hz, G#2: 103.8Hz, A2: 110.0Hz, C3: 130.8Hz, D3: 146.8Hz
      const lmsBassline = [
        73.4, 73.4, 87.3, 73.4, 98.0, 73.4, 103.8, 110.0,
        146.8, 130.8, 110.0, 98.0, 87.3, 73.4, 65.4, 69.3,
        73.4, 73.4, 87.3, 98.0, 110.0, 130.8, 146.8, 174.6,
        164.8, 146.8, 130.8, 110.0, 103.8, 98.0, 87.3, 73.4
      ];
      const bassFreq = lmsBassline[this.lastManStep];

      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassGain.gain.setValueAtTime(0.25, now);
      bassGain.gain.exponentialRampToValueAtTime(0.008, now + 0.09);

      bassOsc.connect(bassGain);
      bassGain.connect(this.bitcrushNode);
      bassOsc.start(now);
      bassOsc.stop(now + 0.1);

      // 4. Hyperactive Bitcrushed Chiptune Lead ("You Call This An LMS!?" Melody Motif)
      // D4: 293.7Hz, F4: 349.2Hz, G4: 392.0Hz, G#4: 415.3Hz, A4: 440.0Hz, C5: 523.3Hz, D5: 587.3Hz, F5: 698.5Hz, E5: 659.3Hz
      const lmsLeadMelody = [
        440.0, 587.3, 523.3, 440.0, 392.0, 349.2, 392.0, 440.0,
        587.3, 698.5, 659.3, 587.3, 523.3, 587.3, 440.0, 523.3,
        587.3, 587.3, 698.5, 784.0, 698.5, 587.3, 523.3, 440.0,
        392.0, 440.0, 523.3, 587.3, 698.5, 659.3, 587.3, 554.4
      ];
      const leadFreq = lmsLeadMelody[this.lastManStep];

      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = 'square';
      leadOsc.frequency.setValueAtTime(leadFreq, now);

      leadGain.gain.setValueAtTime(0.18, now);
      leadGain.gain.exponentialRampToValueAtTime(0.005, now + 0.085);

      leadOsc.connect(leadGain);
      leadGain.connect(this.bitcrushNode);
      leadOsc.start(now);
      leadOsc.stop(now + 0.09);
    }, 91);
  }

  public stopLastManStanding() {
    this.isLastManPlaying = false;
    if (this.lastManTimer) {
      clearInterval(this.lastManTimer);
      this.lastManTimer = null;
    }
  }

  public setVolume(percent: number) {
    if (this.masterGain && this.ctx) {
      const vol = Math.max(0, Math.min(1, percent / 100));
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : vol * 0.8, this.ctx.currentTime);
    }
  }

  // --- Survivor Custom Ability SFX ---
  public playCoinDing() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6 ding!

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  public playErrorBuzzer() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.28);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playFlintlockBang() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sub-bass thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);
    oscGain.gain.setValueAtTime(0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);

    // Gunpowder burst noise
    const bufferSize = this.ctx.sampleRate * 0.28;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.Q.setValueAtTime(1.2, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  public playFlintlockMisfire() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playHealSplash() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  public playSentryShoot() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.07);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playBonusPadBoost() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.32);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playBlockParry() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playPunchSwing() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public resetMatchAudio() {
    this.stopChaseMusic();
    this.stopLastManStanding();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.currentHeartbeatRate = 0;
  }
}

export const soundEngine = new SketchAudioEngine();
