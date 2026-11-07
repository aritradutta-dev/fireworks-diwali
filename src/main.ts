import './style.css';
import { VideoCompositor } from './video/videoCompositor';
import { VisionEngine } from './vision/visionEngine';
import { DetectedGesture, GestureType } from './vision/gestureTypes';

class FireworksApp {
  private compositor: VideoCompositor;
  private vision: VisionEngine;

  // DOM Elements
  private hudElement: HTMLElement;
  private restoreHudBtn: HTMLElement;
  private statusPill: HTMLElement;
  private statusText: HTMLElement;
  private creatorModeBtn: HTMLElement;
  private debugBtn: HTMLElement;
  private announcementToast: HTMLElement;
  private announcementName: HTMLElement;
  private announcementIcon: HTMLElement;
  private gestureCards: Map<string, HTMLElement> = new Map();

  private isCreatorMode: boolean = false;
  private lastAnnouncedGesture: GestureType = 'NONE';
  private announcementTimeout: number = 0;

  constructor() {
    const canvas = document.getElementById('stage') as HTMLCanvasElement;
    const video = document.getElementById('webcam') as HTMLVideoElement;
    this.hudElement = document.getElementById('hud') as HTMLElement;
    this.restoreHudBtn = document.getElementById('btn-restore-hud') as HTMLElement;
    this.statusPill = document.getElementById('status-pill') as HTMLElement;
    this.statusText = document.getElementById('status-text') as HTMLElement;
    this.creatorModeBtn = document.getElementById('btn-creator-mode') as HTMLElement;
    this.debugBtn = document.getElementById('btn-debug') as HTMLElement;
    this.announcementToast = document.getElementById('gesture-announcement') as HTMLElement;
    this.announcementName = document.getElementById('announcement-name') as HTMLElement;
    this.announcementIcon = document.getElementById('announcement-icon') as HTMLElement;

    // Cache gesture cards
    document.querySelectorAll<HTMLElement>('.gesture-card').forEach((card) => {
      const g = card.getAttribute('data-gesture');
      if (g) this.gestureCards.set(g, card);
    });

    this.compositor = new VideoCompositor({ canvas, video });
    this.vision = new VisionEngine();

    this.setupListeners();
    this.init();
  }

  private setupListeners(): void {
    // Creator Mode (H key)
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

    // Debug Wireframe (D key)
    const toggleDebug = () => {
      this.vision.showDebug = !this.vision.showDebug;
      if (this.vision.showDebug) {
        this.debugBtn.classList.add('btn-active');
      } else {
        this.debugBtn.classList.remove('btn-active');
      }
    };

    this.creatorModeBtn.addEventListener('click', toggleCreatorMode);
    this.restoreHudBtn.addEventListener('click', toggleCreatorMode);
    this.debugBtn.addEventListener('click', toggleDebug);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'h' || e.key === 'H') toggleCreatorMode();
      if (e.key === 'd' || e.key === 'D') toggleDebug();
    });
  }

  private async init(): Promise<void> {
    try {
      this.statusText.textContent = 'Requesting camera...';
      await this.compositor.startCamera();

      this.statusText.textContent = 'Booting MediaPipe hand tracker...';
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
    // 1. Draw atmospheric night camera background
    this.compositor.drawBackground();

    // 2. Process vision frame
    const activeGestures = this.vision.update(
      this.compositor.video,
      this.compositor.width,
      this.compositor.height
    );

    // 3. Draw debug skeleton if active
    this.vision.drawDebugSkeleton(this.compositor.ctx);

    // 4. Update UI gesture state
    this.updateUI(activeGestures);

    requestAnimationFrame(this.loop);
  };

  private updateUI(gestures: DetectedGesture[]): void {
    // Clear active states on all gesture cards
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
    if (!item.name) return;

    this.announcementIcon.textContent = item.icon;
    this.announcementName.textContent = item.name;
    this.announcementToast.classList.remove('hidden');

    window.clearTimeout(this.announcementTimeout);
    this.announcementTimeout = window.setTimeout(() => {
      this.announcementToast.classList.add('hidden');
    }, 1800);
  }

  private formatGestureName(type: GestureType): string {
    switch (type) {
      case 'ROCKET': return 'Rocket (☝️)';
      case 'ANAR': return 'Anar Fountain (✊)';
      case 'STARBURST': return 'Starburst (✋)';
      case 'ROMAN_CANDLE': return 'Roman Candle (✌️)';
      case 'PHOOLJHADI': return 'Phooljhadi Sparkler (👌)';
      case 'CHAKRI': return 'Chakri Spinner (🔄)';
      case 'GRAND_FINALE': return 'Grand Finale (🙌)';
      default: return 'None';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FireworksApp();
});
