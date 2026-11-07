import './style.css';
import { VideoCompositor } from './video/videoCompositor';
import { VisionEngine } from './vision/visionEngine';
import { FireworkDirector } from './fireworks/fireworkDirector';
import { PyroAudioEngine } from './audio/pyroAudioEngine';
import { CaptureEngine } from './capture/captureEngine';
import { DetectedGesture, GestureType } from './vision/gestureTypes';

class FireworksApp {
  private compositor: VideoCompositor;
  private vision: VisionEngine;
  private director: FireworkDirector;
  private audio: PyroAudioEngine;
  private capture: CaptureEngine;

  // DOM Elements
  private hudElement: HTMLElement;
  private restoreHudBtn: HTMLElement;
  private statusPill: HTMLElement;
  private statusText: HTMLElement;
  private creatorModeBtn: HTMLElement;
  private debugBtn: HTMLElement;
  private audioBtn: HTMLElement;
  private screenshotBtn: HTMLElement;
  private recordBtn: HTMLElement;
  private recordLabel: HTMLElement;
  private recordTimer: HTMLElement;
  private announcementToast: HTMLElement;
  private announcementName: HTMLElement;
  private announcementIcon: HTMLElement;
  private gestureCards: Map<string, HTMLElement> = new Map();

  private isCreatorMode: boolean = false;
  private lastAnnouncedGesture: GestureType = 'NONE';
  private announcementTimeout: number = 0;
  private lastFrameTime: number = performance.now();

  constructor() {
    const canvas = document.getElementById('stage') as HTMLCanvasElement;
    const video = document.getElementById('webcam') as HTMLVideoElement;
    this.hudElement = document.getElementById('hud') as HTMLElement;
    this.restoreHudBtn = document.getElementById('btn-restore-hud') as HTMLElement;
    this.statusPill = document.getElementById('status-pill') as HTMLElement;
    this.statusText = document.getElementById('status-text') as HTMLElement;
    this.creatorModeBtn = document.getElementById('btn-creator-mode') as HTMLElement;
    this.debugBtn = document.getElementById('btn-debug') as HTMLElement;
    this.audioBtn = document.getElementById('btn-audio') as HTMLElement;
    this.screenshotBtn = document.getElementById('btn-screenshot') as HTMLElement;
    this.recordBtn = document.getElementById('btn-record') as HTMLElement;
    this.recordLabel = document.getElementById('record-label') as HTMLElement;
    this.recordTimer = document.getElementById('record-timer') as HTMLElement;
    this.announcementToast = document.getElementById('gesture-announcement') as HTMLElement;
    this.announcementName = document.getElementById('announcement-name') as HTMLElement;
    this.announcementIcon = document.getElementById('announcement-icon') as HTMLElement;

    // Cache gesture cards
    document.querySelectorAll<HTMLElement>('.gesture-card').forEach((card) => {
      const g = card.getAttribute('data-gesture');
      if (g) this.gestureCards.set(g, card);
    });

    // Initialize core subsystems
    this.compositor = new VideoCompositor({ canvas, video });
    this.vision = new VisionEngine();
    this.audio = new PyroAudioEngine();
    this.director = new FireworkDirector();
    this.capture = new CaptureEngine(canvas);

    // Wire procedural audio triggers to firework director
    this.director.setSoundCallback((soundType, intensity) => {
      switch (soundType) {
        case 'ROCKET_LAUNCH':
          this.audio.playRocketLaunch();
          break;
        case 'EXPLOSION':
          this.audio.playExplosion(intensity);
          break;
        case 'ANAR_LOOP':
          this.audio.pulseAnarLoop();
          break;
        case 'SPARKLER_LOOP':
          this.audio.pulseSparklerLoop();
          break;
        case 'CHAKRI_LOOP':
          this.audio.pulseChakriLoop();
          break;
        case 'ROMAN_POP':
          this.audio.playRomanPop();
          break;
        case 'FINALE':
          this.audio.playFinaleBarrage();
          break;
      }
    });

    this.setupListeners();
    this.init();
  }

  private setupListeners(): void {
    const unlockAudio = () => this.audio.unlock();
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    // 1. Creator Mode Toggle (H key)
    const toggleCreatorMode = () => {
      this.isCreatorMode = !this.isCreatorMode;
      if (this.isCreatorMode) {
        this.hudElement.classList.add('hud-hidden');
        this.restoreHudBtn.classList.remove('hidden');
      } else {
        this.hudElement.classList.remove('hud-hidden');
        this.restoreHudBtn.classList.add('hidden');
      }
    };
    this.creatorModeBtn.addEventListener('click', toggleCreatorMode);
    this.restoreHudBtn.addEventListener('click', toggleCreatorMode);

    // 2. Debug Tracker Skeleton (D key)
    const toggleDebug = () => {
      this.vision.showDebug = !this.vision.showDebug;
      if (this.vision.showDebug) {
        this.debugBtn.classList.add('btn-active');
      } else {
        this.debugBtn.classList.remove('btn-active');
      }
    };
    this.debugBtn.addEventListener('click', toggleDebug);

    // 3. Audio Toggle (M key)
    const toggleAudio = () => {
      this.audio.unlock();
      const muted = this.audio.toggleMute();
      const label = this.audioBtn.querySelector('.btn-label');
      const icon = this.audioBtn.querySelector('.btn-icon');
      if (label && icon) {
        label.textContent = muted ? 'Muted' : 'Sound';
        icon.textContent = muted ? '🔇' : '🔊';
      }
      if (muted) {
        this.audioBtn.classList.add('btn-active');
      } else {
        this.audioBtn.classList.remove('btn-active');
      }
    };
    this.audioBtn.addEventListener('click', toggleAudio);

    // 4. Postcard Screenshot (S key)
    const takeSnap = () => {
      this.capture.takeScreenshot();
      this.announceToast('📸 Postcard Captured & Downloaded!', '✨');
    };
    this.screenshotBtn.addEventListener('click', takeSnap);

    // 5. Video Reel Recording (R key)
    const toggleRecording = () => {
      this.audio.unlock();
      if (this.capture.isRecording) {
        this.capture.stopRecording();
      } else {
        const audioTrack = this.audio.getAudioStream();
        this.capture.startRecording(audioTrack);
      }
    };
    this.recordBtn.addEventListener('click', toggleRecording);

    // Configure capture callbacks for UI updates
    this.capture.setCallbacks({
      onRecordingStart: () => {
        this.recordBtn.classList.add('recording');
        this.recordLabel.textContent = 'Stop';
        this.announceToast('🔴 Recording Started (Max 30s)', '🎥');
      },
      onRecordingStop: () => {
        this.recordBtn.classList.remove('recording');
        this.recordLabel.textContent = 'Record';
        this.recordTimer.textContent = '00:00';
        this.announceToast('💾 Reel Saved & Downloading...', '🎉');
      },
      onTimeUpdate: (elapsed, max) => {
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = Math.floor(elapsed % 60).toString().padStart(2, '0');
        const maxS = Math.floor(max % 60).toString().padStart(2, '0');
        this.recordTimer.textContent = `${m}:${s} / 00:${maxS}`;
      }
    });

    // 6. Global Keybindings
    window.addEventListener('keydown', (e) => {
      if (e.key === 'h' || e.key === 'H') toggleCreatorMode();
      if (e.key === 'd' || e.key === 'D') toggleDebug();
      if (e.key === 'm' || e.key === 'M') toggleAudio();
      if (e.key === 's' || e.key === 'S') takeSnap();
      if (e.key === 'r' || e.key === 'R') toggleRecording();

      // Manual Testing Keys (1 to 7)
      const w = this.compositor.width;
      const h = this.compositor.height;
      const center = { x: w / 2, y: h / 2 };

      if (e.key === '1') {
        this.director.handleGestures([{ type: 'ROCKET', confidence: 1, triggerPoint: { x: w * 0.5, y: h * 0.8 }, handIndex: 0, isContinuous: false }], w, h);
      } else if (e.key === '2') {
        this.director.handleGestures([{ type: 'ANAR', confidence: 1, triggerPoint: { x: w * 0.5, y: h * 0.75 }, handIndex: 0, isContinuous: true }], w, h);
      } else if (e.key === '3') {
        this.director.handleGestures([{ type: 'STARBURST', confidence: 1, triggerPoint: center, handIndex: 0, isContinuous: false }], w, h);
      } else if (e.key === '4') {
        this.director.handleGestures([{ type: 'ROMAN_CANDLE', confidence: 1, triggerPoint: { x: w * 0.5, y: h * 0.7 }, handIndex: 0, isContinuous: false }], w, h);
      } else if (e.key === '5') {
        this.director.handleGestures([{ type: 'PHOOLJHADI', confidence: 1, triggerPoint: center, handIndex: 0, isContinuous: true }], w, h);
      } else if (e.key === '6') {
        this.director.handleGestures([{ type: 'CHAKRI', confidence: 1, triggerPoint: center, handIndex: 0, isContinuous: false }], w, h);
      } else if (e.key === '7') {
        this.director.handleGestures([{ type: 'GRAND_FINALE', confidence: 1, triggerPoint: center, handIndex: -1, isContinuous: false }], w, h);
      }
    });

    // Mouse click launches a rocket at click coordinate!
    window.addEventListener('pointerdown', (e) => {
      // Don't fire if clicking HUD buttons
      if ((e.target as HTMLElement).closest('.hud-header, .hud-footer, .restore-hud-btn')) return;
      this.audio.unlock();
      this.director.handleGestures(
        [{ type: 'ROCKET', confidence: 1, triggerPoint: { x: e.clientX, y: e.clientY }, handIndex: 0, isContinuous: false }],
        this.compositor.width,
        this.compositor.height
      );
    });
  }

  private async init(): Promise<void> {
    try {
      this.statusText.textContent = 'Requesting camera (640x480)...';
      await this.compositor.startCamera();

      this.statusText.textContent = 'Loading MediaPipe HandLandmarker (float16)...';
      await this.vision.init((progress) => {
        this.statusText.textContent = progress;
      });

      this.statusPill.className = 'status-pill status-ready';
      this.statusText.textContent = 'Ready • Show your hands';
    } catch (err) {
      console.error('Initialization failed:', err);
      this.statusPill.className = 'status-pill status-loading';
      this.statusText.textContent = err instanceof Error ? err.message : 'Startup error';
    }

    this.loop();
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    // 1. Draw atmospheric night sky camera feed
    this.compositor.drawBackground();

    // 2. Process vision frame
    const activeGestures = this.vision.update(
      this.compositor.video,
      this.compositor.width,
      this.compositor.height
    );

    // 3. Dispatch active gestures to Firework Director
    this.director.handleGestures(
      activeGestures,
      this.compositor.width,
      this.compositor.height
    );

    // 4. Simulate & Render Particle Fireworks with Additive Blending
    this.director.updateAndRender(dt, this.compositor.ctx);

    // 5. Draw Debug skeleton if active
    this.vision.drawDebugSkeleton(this.compositor.ctx);

    // 6. Update UI gesture state
    this.updateUI(activeGestures);

    requestAnimationFrame(this.loop);
  };

  private updateUI(gestures: DetectedGesture[]): void {
    // Clear active states on all cards
    this.gestureCards.forEach((card) => card.classList.remove('active'));

    if (gestures.length > 0) {
      const primary = gestures[0];
      const card = this.gestureCards.get(primary.type);
      if (card) card.classList.add('active');

      this.statusPill.className = 'status-pill status-active';
      this.statusText.textContent = `Igniting: ${this.formatGestureName(primary.type)}`;

      if (primary.type !== this.lastAnnouncedGesture) {
        this.announceGesture(primary.type);
        this.lastAnnouncedGesture = primary.type;
      }
    } else {
      if (this.vision.detectedHands.length > 0) {
        this.statusPill.className = 'status-pill status-ready';
        this.statusText.textContent = `${this.vision.detectedHands.length} hand(s) tracked • Form a gesture`;
      } else {
        this.statusPill.className = 'status-pill status-ready';
        this.statusText.textContent = 'Show your hands to conduct fireworks';
      }
      this.lastAnnouncedGesture = 'NONE';
    }
  }

  private announceToast(name: string, icon: string): void {
    this.announcementIcon.textContent = icon;
    this.announcementName.textContent = name;
    this.announcementToast.classList.remove('hidden');

    window.clearTimeout(this.announcementTimeout);
    this.announcementTimeout = window.setTimeout(() => {
      this.announcementToast.classList.add('hidden');
    }, 2000);
  }

  private announceGesture(type: GestureType): void {
    const config: Record<GestureType, { name: string; icon: string }> = {
      NONE: { name: '', icon: '' },
      ROCKET: { name: 'Rocket Launched!', icon: '🚀' },
      ANAR: { name: 'Anar Fountain Spouting!', icon: '✨' },
      STARBURST: { name: 'Starburst Shell Explosion!', icon: '💥' },
      ROMAN_CANDLE: { name: 'Roman Candle Firing!', icon: '🎆' },
      PHOOLJHADI: { name: 'Phooljhadi Sparkler Active!', icon: '👌' },
      CHAKRI: { name: 'Chakri Ground Spinner!', icon: '🔄' },
      GRAND_FINALE: { name: '🎆 GRAND FINALE BOMBARDMENT 🎆', icon: '🙌' }
    };

    const item = config[type];
    if (item.name) {
      this.announceToast(item.name, item.icon);
    }
  }

  private formatGestureName(type: GestureType): string {
    switch (type) {
      case 'ROCKET': return 'Rocket (☝️)';
      case 'ANAR': return 'Anar Fountain (✊)';
      case 'STARBURST': return 'Starburst (✋)';
      case 'ROMAN_CANDLE': return 'Roman Candle (✌️)';
      case 'PHOOLJHADI': return 'Phooljhadi Sparkler (👌)';
      case 'CHAKRI': return 'Chakri Spinner (👇 Point Down)';
      case 'GRAND_FINALE': return 'Grand Finale (🙌)';
      default: return 'None';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FireworksApp();
});
