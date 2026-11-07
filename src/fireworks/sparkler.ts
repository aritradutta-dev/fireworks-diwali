import { ParticlePool } from '../particles/particle';
import { FireworkEffect, SoundTriggerCallback } from './fireworkTypes';
import { COLORS } from './fireworkColors';

export class Sparkler implements FireworkEffect {
  public active: boolean = true;
  private x: number;
  private y: number;
  private onSound?: SoundTriggerCallback;

  constructor(x: number, y: number, onSound?: SoundTriggerCallback) {
    this.x = x;
    this.y = y;
    this.onSound = onSound;
  }

  public updatePosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public update(_dt: number, pool: ParticlePool): void {
    if (!this.active) return;

    this.onSound?.('SPARKLER_LOOP');

    // Localized golden glow around the pinch point
    pool.addFlash(this.x, this.y, 160, COLORS.GOLD, 0.28);

    // Emit 28 high-velocity, high-jitter branching sparks
    const sparkCount = 26;

    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 11 + 3.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const isWhite = Math.random() < 0.4;

      pool.spawn({
        x: this.x + (Math.random() - 0.5) * 8,
        y: this.y + (Math.random() - 0.5) * 8,
        vx,
        vy,
        color: isWhite ? COLORS.WHITE_HOT : COLORS.GOLD,
        fadeColor: COLORS.AMBER,
        size: 2.6 + Math.random() * 1.6,
        life: 0.55 + Math.random() * 0.45,
        drag: 0.94,
        gravity: 0.12,
        flicker: true,
        crackle: true
      });
    }

    // White-hot magnesium core flame
    for (let j = 0; j < 3; j++) {
      pool.spawn({
        x: this.x + (Math.random() - 0.5) * 6,
        y: this.y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: COLORS.WHITE_HOT,
        fadeColor: COLORS.GOLD,
        size: 7.5,
        life: 0.15,
        drag: 0.88,
        gravity: 0
      });
    }
  }

  public stop(): void {
    this.active = false;
  }
}
