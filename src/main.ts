import './style.css';
import { VideoCompositor } from './video/videoCompositor';
import { VisionEngine } from './vision/visionEngine';
import { FireworkDirector } from './fireworks/fireworkDirector';
import { PyroAudioEngine } from './audio/pyroAudioEngine';
import { CaptureEngine } from './capture/captureEngine';
import { DetectedGesture } from './vision/gestureTypes';

class FireworksApp {
  private compositor: VideoCompositor;
  private vision: VisionEngine;
  private director: FireworkDirector;
  private audio: PyroAudioEngine;
  private capture: CaptureEngine;

  // DOM Elements
  private hudElement: HTMLElement;
  private restoreHudBtn: HTMLElement;
  private creatorModeBtn: HTMLElement;
  private debugBtn: HTMLElement;
  private audioBtn: HTMLElement;
  private screenshotBtn: HTMLElement;
  private recordBtn: HTMLElement;
  private recordLabel: HTMLElement;
  private recordTimer: HTMLElement;
  private finaleCenter: HTMLElement;
  private finaleTimeout: number = 0;

  // Recording Modal Elements
  private recordingModal: HTMLElement;
  private previewVideo: HTMLVideoElement;
  private modalDownloadBtn: HTMLElement;
  private modalRetakeBtn: HTMLElement;
  private modalCloseBtn: HTMLElement;

  private gestureCards: Map<string, HTMLElement> = new Map();
  private isCreatorMode: boolean = false;
  private lastFrameTime: number = performance.now();

  constructor() {
    const canvas = document.getElementById('stage') as HTMLCanvasElement;
    const video = document.getElementById('webcam') as HTMLVideoElement;
    this.hudElement = document.getElementById('hud') as HTMLElement;
    this.restoreHudBtn = document.getElementById('btn-restore-hud') as HTMLElement;
    this.creatorModeBtn = document.getElementById('btn-creator-mode') as HTMLElement;
    this.debugBtn = document.getElementById('btn-debug') as HTMLElement;
    this.audioBtn = document.getElementById('btn-audio') as HTMLElement;
    this.screenshotBtn = document.getElementById('btn-screenshot') as HTMLElement;
    this.recordBtn = document.getElementById('btn-record') as HTMLElement;
    this.recordLabel = document.getElementById('record-label') as HTMLElement;
    this.recordTimer = document.getElementById('record-timer') as HTMLElement;
    this.finaleCenter = document.getElementById('grand-finale-center') as HTMLElement;

    // Recording Modal Elements
    this.recordingModal = document.getElementById('recording-modal') as HTMLElement;
    this.previewVideo = document.getElementById('preview-video') as HTMLVideoElement;
    this.modalDownloadBtn = document.getElementById('modal-download-btn') as HTMLElement;
    this.modalRetakeBtn = document.getElementById('modal-retake-btn') as HTMLElement;
    this.modalCloseBtn = document.getElementById('modal-close-btn') as HTMLElement;

    // Cache gesture cards
    document.querySelectorAll<HTMLElement>('.gesture-card').forEach((card) => {
      const g = card.getAttribute('data-gesture');
      if (g) this.gestureCards.set(g, card);
    });

    // Subsystems
    this.compositor = new VideoCompositor({ canvas, video });
    this.vision = new VisionEngine();
    this.audio = new PyroAudioEngine();
    this.director = new FireworkDirector();
    this.capture = new CaptureEngine(canvas);

    // Audio Trigger Callback
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

    // Configure capture callbacks
    this.capture.setCallbacks({
      onRecordingStart: () => {
        this.recordBtn.classList.add('recording');
        this.recordLabel.textContent = 'Stop';
      },
      onRecordingStop: (_blob, videoUrl) => {
        this.recordBtn.classList.remove('recording');
        this.recordLabel.textContent = 'Record';
        this.recordTimer.textContent = '00:00';

        // Open Video Preview Modal (Fog Mirror Style)
        this.showRecordingPreview(videoUrl);
      },
      onTimeUpdate: (elapsed, max) => {
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = Math.floor(elapsed % 60).toString().padStart(2, '0');
        const maxS = Math.floor(max % 60).toString().padStart(2, '0');
        this.recordTimer.textContent = `${m}:${s} / 00:${maxS}`;
      }
    });

    // Recording Preview Modal Handlers
    this.modalDownloadBtn.addEventListener('click', () => {
      this.capture.downloadCurrentReel();
    });

    const closeModal = () => {
      this.recordingModal.classList.add('hidden');
      this.previewVideo.pause();
      this.previewVideo.src = '';
    };

    this.modalCloseBtn.addEventListener('click', closeModal);
    this.modalRetakeBtn.addEventListener('click', closeModal);

    // Global Keybindings
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
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
        this.triggerGrandFinale(w, h);
      }
    });

    // Mouse click launches rocket at click coordinate
    window.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.hud-header, .hud-footer, .restore-hud-btn, .recording-modal')) return;
      this.audio.unlock();
      this.director.handleGestures(
        [{ type: 'ROCKET', confidence: 1, triggerPoint: { x: e.clientX, y: e.clientY }, handIndex: 0, isContinuous: false }],
        this.compositor.width,
        this.compositor.height
      );
    });
  }

  private showRecordingPreview(videoUrl: string): void {
    this.previewVideo.src = videoUrl;
    this.recordingModal.classList.remove('hidden');
    this.previewVideo.play().catch(() => {});
  }

  private triggerGrandFinale(w: number, h: number): void {
    this.director.handleGestures(
      [{ type: 'GRAND_FINALE', confidence: 1, triggerPoint: { x: w / 2, y: h / 2 }, handIndex: -1, isContinuous: false }],
      w,
      h
    );

    // After 1.4 seconds of rockets filling the sky, display the majestic "HAPPY DIWALI" centerpiece!
    window.clearTimeout(this.finaleTimeout);
    this.finaleTimeout = window.setTimeout(() => {
      this.finaleCenter.classList.remove('hidden');

      // Keep it up for 4.5 seconds of golden celebration, then fade out smoothly
      window.setTimeout(() => {
        this.finaleCenter.classList.add('hidden');
      }, 4800);
    }, 1400);
  }

  private async init(): Promise<void> {
    try {
      await this.compositor.startCamera();
      await this.vision.init();
    } catch (err) {
      console.error('Initialization failed:', err);
    }
    this.loop();
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    // 1. Draw atmospheric night camera background
    this.compositor.drawBackground();

    // 2. Process vision frame
    const activeGestures = this.vision.update(
      this.compositor.video,
      this.compositor.width,
      this.compositor.height
    );

    // Check if Grand Finale was recognized by gesture
    const isFinale = activeGestures.some((g) => g.type === 'GRAND_FINALE');
    if (isFinale) {
      this.triggerGrandFinale(this.compositor.width, this.compositor.height);
    } else {
      // 3. Dispatch other active gestures to Firework Director
      this.director.handleGestures(
        activeGestures,
        this.compositor.width,
        this.compositor.height
      );
    }

    // 4. Simulate & Render Particle Fireworks with Additive Blending & Lighting
    this.director.updateAndRender(dt, this.compositor.ctx);

    // 5. Draw Debug skeleton if active
    this.vision.drawDebugSkeleton(this.compositor.ctx);

    // 6. Update bottom gesture bar active highlight
    this.updateBottomBar(activeGestures);

    requestAnimationFrame(this.loop);
  };

  private updateBottomBar(gestures: DetectedGesture[]): void {
    this.gestureCards.forEach((card) => card.classList.remove('active'));
    if (gestures.length > 0) {
      const primary = gestures[0];
      const card = this.gestureCards.get(primary.type);
      if (card) card.classList.add('active');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FireworksApp();
});
