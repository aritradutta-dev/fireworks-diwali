/**
 * Reel Recording & Postcard Screenshot Engine
 * Uses MediaRecorder with visual canvas stream + procedural audio track.
 */

export interface CaptureCallbacks {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onTimeUpdate?: (elapsedSeconds: number, maxSeconds: number) => void;
}

export class CaptureEngine {
  private canvas: HTMLCanvasElement;
  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording: boolean = false;
  private startTime: number = 0;
  private timerInterval: number = 0;
  private readonly MAX_DURATION_SEC: number = 30;
  private callbacks: CaptureCallbacks = {};

  constructor(canvas: HTMLCanvasElement, callbacks?: CaptureCallbacks) {
    this.canvas = canvas;
    if (callbacks) this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: CaptureCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Starts video recording combining canvas visual stream + audio track
   */
  public startRecording(audioTrack: MediaStreamTrack | null): boolean {
    if (this.isRecording) return false;

    try {
      const canvasStream = this.canvas.captureStream(30);
      const combinedStream = new MediaStream();

      // Add visual track
      canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));

      // Add procedural audio track if available
      if (audioTrack) {
        combinedStream.addTrack(audioTrack);
      }

      // Detect best supported mime type
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      this.recorder = selectedMime
        ? new MediaRecorder(combinedStream, { mimeType: selectedMime })
        : new MediaRecorder(combinedStream);

      this.recordedChunks = [];

      this.recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.recorder.onstop = () => {
        this.finishRecording();
      };

      this.recorder.start(250); // Slice every 250ms
      this.isRecording = true;
      this.startTime = performance.now();

      this.callbacks.onRecordingStart?.();

      // Start elapsed timer loop
      this.timerInterval = window.setInterval(() => {
        if (!this.isRecording) return;
        const elapsed = (performance.now() - this.startTime) / 1000;
        this.callbacks.onTimeUpdate?.(elapsed, this.MAX_DURATION_SEC);

        if (elapsed >= this.MAX_DURATION_SEC) {
          this.stopRecording();
        }
      }, 200);

      return true;
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      return false;
    }
  }

  public stopRecording(): void {
    if (!this.isRecording || !this.recorder) return;
    this.isRecording = false;
    window.clearInterval(this.timerInterval);

    if (this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    this.callbacks.onRecordingStop?.();
  }

  private finishRecording(): void {
    if (this.recordedChunks.length === 0) return;

    const blob = new Blob(this.recordedChunks, {
      type: this.recorder?.mimeType || 'video/webm'
    });
    const url = URL.createObjectURL(blob);

    // Trigger instant download
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `Diwali-Fireworks-Reel-${timestamp}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /**
   * Captures current composited frame as a crisp festive PNG postcard
   */
  public takeScreenshot(): void {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    // Draw main stage canvas
    tCtx.drawImage(this.canvas, 0, 0);

    // Draw gold festive stamp on bottom right of the image
    const pad = tempCanvas.width * 0.035;
    tCtx.save();
    tCtx.textAlign = 'right';
    tCtx.fillStyle = '#FFD700';
    tCtx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    tCtx.shadowBlur = 15;
    tCtx.font = `bold ${Math.max(22, tempCanvas.width * 0.024)}px "Cinzel", serif`;
    tCtx.fillText('✨ Happy Diwali ✨', tempCanvas.width - pad, tempCanvas.height - pad - 18);

    tCtx.fillStyle = '#E2E8F0';
    tCtx.shadowBlur = 0;
    tCtx.font = `${Math.max(12, tempCanvas.width * 0.012)}px "Plus Jakarta Sans", sans-serif`;
    tCtx.fillText('Fireworks Conductor 2026', tempCanvas.width - pad, tempCanvas.height - pad);
    tCtx.restore();

    tempCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `Diwali-Postcard-${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/png');
  }
}
