import { ParticlePool } from '../particles/particle';
import { FireworkEffect, SoundTriggerCallback } from './fireworkTypes';
import { COLORS } from './fireworkColors';

export class Anar implements FireworkEffect {
  public active: boolean = true;
  private x: number;
  private y: number;
  private onSound?: SoundTriggerCallback;
  private emitCooldown: number = 0;

  constructor(x: number, y: number, onSound?: SoundTriggerCallback) {
    this.x = x;
    this.y = y;
    this.onSound = onSound;
  }

  public updatePosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public update(dt: number, pool: ParticlePool): void {
    if (!this.active) return;

    this.onSound?.('ANAR_LOOP');

    this.emitCooldown += dt;
    // Emit ~35-40 particles per frame for rich fountain density
    const spawnCount = 28;

    for (let i = 0; i < spawnCount; i++) {
      // Cone angle: ~35 degrees spread upward
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.65;
      const speed = 12 + Math.random() * 11;
      const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 2;
      const vy = Math.sin(angle) * speed;

      // Color variation: 80% golden sodium, 20% white-hot magnesium core
      const isWhite = Math.random() < 0.22;
      const color = isWhite ? COLORS.WHITE_HOT : COLORS.GOLD;
      const fadeColor = isWhite ? COLORS.GOLD : COLORS.DEEP_ORANGE;

      pool.spawn({
        x: this.x + (Math.random() - 0.5) * 12,
        y: this.y + (Math.random() - 0.5) * 6,
        vx,
        vy,
        color,
        fadeColor,
        size: 2.2 + Math.random() * 1.4,
        life: 0.65 + Math.random() * 0.45,
        drag: 0.965,
        gravity: 0.38, // Heavy fountain gravity curves sparks back down
        flicker: true,
        crackle: Math.random() < 0.2
      });
    }

    // Core base flame
    for (let j = 0; j < 4; j++) {
      pool.spawn({
        x: this.x + (Math.random() - 0.5) * 10,
        y: this.y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 4,
        color: COLORS.WHITE_HOT,
        fadeColor: COLORS.GOLD,
        size: 4.0,
        life: 0.25,
        drag: 0.9,
        gravity: 0.1
      });
    }
  }

  public stop(): void {
    this.active = false;
  }
}
