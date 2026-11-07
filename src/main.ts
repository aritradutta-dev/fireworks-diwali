import './style.css';
import { VideoCompositor } from './video/videoCompositor';

class FireworksApp {
  private compositor: VideoCompositor;
  private hudElement: HTMLElement;
  private restoreHudBtn: HTMLElement;
  private statusPill: HTMLElement;
  private statusText: HTMLElement;
  private creatorModeBtn: HTMLElement;
  private isCreatorMode: boolean = false;

  constructor() {
    const canvas = document.getElementById('stage') as HTMLCanvasElement;
    const video = document.getElementById('webcam') as HTMLVideoElement;
    this.hudElement = document.getElementById('hud') as HTMLElement;
    this.restoreHudBtn = document.getElementById('btn-restore-hud') as HTMLElement;
    this.statusPill = document.getElementById('status-pill') as HTMLElement;
    this.statusText = document.getElementById('status-text') as HTMLElement;
    this.creatorModeBtn = document.getElementById('btn-creator-mode') as HTMLElement;

    this.compositor = new VideoCompositor({ canvas, video });
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

    this.creatorModeBtn.addEventListener('click', toggleCreatorMode);
    this.restoreHudBtn.addEventListener('click', toggleCreatorMode);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'h' || e.key === 'H') {
        toggleCreatorMode();
      }
    });
  }

  private async init(): Promise<void> {
    try {
      this.statusText.textContent = 'Requesting camera...';
      await this.compositor.startCamera();
      this.statusPill.className = 'status-pill status-ready';
      this.statusText.textContent = 'Camera active • Initializing vision...';
    } catch (err) {
      console.error('Camera initialization failed:', err);
      this.statusPill.className = 'status-pill status-loading';
      this.statusText.textContent = 'Camera permission required';
    }

    this.loop();
  }

  private loop = (): void => {
    this.compositor.drawBackground();
    requestAnimationFrame(this.loop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new FireworksApp();
});
