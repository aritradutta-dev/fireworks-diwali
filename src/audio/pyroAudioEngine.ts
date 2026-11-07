/**
 * Procedural Web Audio Pyrotechnics Synthesizer
 * Zero external audio files. 100% synthesized in real-time.
 * Supports output to screen audio as well as MediaStreamDestination for video recording.
 */

export class PyroAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;
  public isMuted: boolean = false;
  private isUnlocked: boolean = false;

  // Active continuous loop nodes
  private anarGain: GainNode | null = null;
  private anarLastSeen: number = 0;

  private sparklerGain: GainNode | null = null;
  private sparklerLastSeen: number = 0;

  private chakriGain: GainNode | null = null;
  private chakriLastSeen: number = 0;

  constructor() {
    // AudioContext will be unlocked on first user interaction
  }

  public unlock(): void {
    if (this.isUnlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.85;

      // Connect to normal speakers
      this.masterGain.connect(this.ctx.destination);

      // Create recording destination track for MediaRecorder
      this.recordingDestination = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.recordingDestination);

      this.isUnlocked = true;
      this.initContinuousLoops();
    } catch (e) {
      console.warn('Web Audio unlock failed:', e);
    }
  }

  public getAudioStream(): MediaStreamTrack | null {
    return this.recordingDestination?.stream.getAudioTracks()[0] || null;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  /**
   * 1. Ascending Rocket Launch Whistle
   */
  public playRocketLaunch(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Pitch swept oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = 320 + (Math.random() - 0.5) * 40;
    const endFreq = 1600 + (Math.random() - 0.5) * 150;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.65);

    // Envelope
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    // Modulated whoosh noise
    const noise = this.createNoiseNode(0.7);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFreq * 1.5, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq * 1.5, now + 0.65);
    filter.Q.value = 3.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(this.masterGain);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.75);
    noise.start(now);
    noise.stop(now + 0.75);
  }

  /**
   * 2. Deep Sub-Bass Explosion & Cracking Boom
   */
  public playExplosion(intensity: number = 1.0): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // A. Sub-Bass Thud (punch)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120 + Math.random() * 20, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.8);

    const oscVol = Math.min(1.0, 0.75 * intensity);
    oscGain.gain.setValueAtTime(oscVol, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.9);

    // B. Low-Pass Noise Boom & Air Blast
    const noise = this.createNoiseNode(1.4);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650 * intensity, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 1.2);

    const noiseGain = this.ctx.createGain();
    const noiseVol = Math.min(0.85, 0.65 * intensity);
    noiseGain.gain.setValueAtTime(noiseVol, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 1.4);
  }

  /**
   * 3. Roman Candle Pop
   */
  public playRomanPop(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.08);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Continuous Sound Generators (Anar, Sparkler, Chakri)
   */
  private initContinuousLoops(): void {
    if (!this.ctx || !this.masterGain) return;

    // Continuous Anar Fountain Noise Loop
    {
      const noise = this.createContinuousNoiseNode();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2800;
      filter.Q.value = 1.8;

      this.anarGain = this.ctx.createGain();
      this.anarGain.gain.value = 0;

      noise.connect(filter);
      filter.connect(this.anarGain);
      this.anarGain.connect(this.masterGain);
    }

    // Continuous Sparkler Crackle Loop
    {
      const noise = this.createContinuousNoiseNode();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 4500;

      this.sparklerGain = this.ctx.createGain();
      this.sparklerGain.gain.value = 0;

      noise.connect(filter);
      filter.connect(this.sparklerGain);
      this.sparklerGain.connect(this.masterGain);
    }

    // Continuous Chakri Whir Loop
    {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 160;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 4.0;

      this.chakriGain = this.ctx.createGain();
      this.chakriGain.gain.value = 0;

      osc.connect(filter);
      filter.connect(this.chakriGain);
      this.chakriGain.connect(this.masterGain);
      osc.start();
    }

    // Heartbeat monitor to fade out loops if not refreshed
    window.setInterval(() => {
      const now = performance.now();
      if (this.ctx && this.anarGain && now - this.anarLastSeen > 120) {
        this.anarGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      if (this.ctx && this.sparklerGain && now - this.sparklerLastSeen > 120) {
        this.sparklerGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      if (this.ctx && this.chakriGain && now - this.chakriLastSeen > 120) {
        this.chakriGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
    }, 80);
  }

  public pulseAnarLoop(): void {
    if (!this.ctx || !this.anarGain || this.isMuted) return;
    this.anarLastSeen = performance.now();
    this.anarGain.gain.setTargetAtTime(0.42, this.ctx.currentTime, 0.05);
  }

  public pulseSparklerLoop(): void {
    if (!this.ctx || !this.sparklerGain || this.isMuted) return;
    this.sparklerLastSeen = performance.now();
    this.sparklerGain.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.05);
  }

  public pulseChakriLoop(): void {
    if (!this.ctx || !this.chakriGain || this.isMuted) return;
    this.chakriLastSeen = performance.now();
    this.chakriGain.gain.setTargetAtTime(0.38, this.ctx.currentTime, 0.05);
  }

  private createNoiseNode(duration: number): AudioBufferSourceNode {
    if (!this.ctx) throw new Error('AudioContext missing');
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const node = this.ctx.createBufferSource();
    node.buffer = buffer;
    return node;
  }

  private createContinuousNoiseNode(): AudioBufferSourceNode {
    if (!this.ctx) throw new Error('AudioContext missing');
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const node = this.ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    node.start();
    return node;
  }
}
