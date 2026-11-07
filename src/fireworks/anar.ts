import { ParticlePool } from '../particles/particle';
import { FireworkEffect, SoundTriggerCallback } from './fireworkTypes';
import { COLORS } from './fireworkColors';

export class Anar implements FireworkEffect {
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

    this.onSound?.('ANAR_LOOP');

    // Dynamic torch illumination on user's hand and room
    pool.addFlash(this.x, this.y - 40, 240, COLORS.GOLD, 0.35);

    // Roaring fountain spray: 45 high-energy sparks per frame
    const spawnCount = 42;

    for (let i = 0; i < spawnCount; i++) {
      // Natural conical spray: ~38 degrees wide
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.72;
      // High upward velocity
      const speed = 15 + Math.random() * 14;
      const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 2;
      const vy = Math.sin(angle) * speed;

      const isWhite = Math.random() < 0.28;
      const color = isWhite ? COLORS.WHITE_HOT : COLORS.GOLD;
      const fadeColor = isWhite ? COLORS.GOLD : COLORS.DEEP_ORANGE;

      pool.spawn({
        x: this.x + (Math.random() - 0.5) * 14,
        y: this.y + (Math.random() - 0.5) * 6,
        vx,
        vy,
        color,
        fadeColor,
        size: 3.2 + Math.random() * 1.6,
        life: 0.8 + Math.random() * 0.5,
        drag: 0.965,
        gravity: 0.42, // Heavy gravity curves fountain down
        flicker: true,
        crackle: Math.random() < 0.35,
        bounceFloor: this.y + 180
      });
    }

    // Blinding white-hot volcano jet at base of fist
    for (let j = 0; j < 6; j++) {
      pool.spawn({
        x: this.x + (Math.random() - 0.5) * 12,
        y: this.y - Math.random() * 20,
        vx: (Math.random() - 0.5) * 3,
        vy: -(6 + Math.random() * 8),
        color: COLORS.WHITE_HOT,
        fadeColor: COLORS.GOLD,
        size: 5.5,
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
