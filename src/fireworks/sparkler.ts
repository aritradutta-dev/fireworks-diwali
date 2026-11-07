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

    // Emit 18-22 high-velocity branching crackle sparks per frame
    const sparkCount = 20;

    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const isWhite = Math.random() < 0.35;

      pool.spawn({
        x: this.x + (Math.random() - 0.5) * 6,
        y: this.y + (Math.random() - 0.5) * 6,
        vx,
        vy,
        color: isWhite ? COLORS.WHITE_HOT : COLORS.GOLD,
        fadeColor: COLORS.AMBER,
        size: 2.0 + Math.random() * 1.5,
        life: 0.45 + Math.random() * 0.35,
        drag: 0.94,
        gravity: 0.1,
        flicker: true,
        crackle: true
      });
    }

    // Hot central core spark
    pool.spawn({
      x: this.x,
      y: this.y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      color: COLORS.WHITE_HOT,
      fadeColor: COLORS.GOLD,
      size: 5.5,
      life: 0.15,
      drag: 0.9,
      gravity: 0
    });
  }

  public stop(): void {
    this.active = false;
  }
}
