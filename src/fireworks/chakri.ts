import { ParticlePool } from '../particles/particle';
import { FireworkEffect, SoundTriggerCallback } from './fireworkTypes';
import { COLORS } from './fireworkColors';

export class Chakri implements FireworkEffect {
  public active: boolean = true;
  private x: number;
  private y: number;
  private angle: number = 0;
  private life: number = 1.85; // Spins for 1.85 seconds
  private onSound?: SoundTriggerCallback;

  constructor(x: number, y: number, onSound?: SoundTriggerCallback) {
    this.x = x;
    this.y = y;
    this.onSound = onSound;
  }

  public update(dt: number, pool: ParticlePool): void {
    if (!this.active) return;

    this.onSound?.('CHAKRI_LOOP');

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    // High angular velocity rotation: ~32 radians per second
    this.angle += 32 * dt;

    // 4 nozzles emitting sparks tangentially
    const nozzles = 4;
    for (let n = 0; n < nozzles; n++) {
      const nozzleAngle = this.angle + (n * Math.PI * 2) / nozzles;
      const nozzleRadius = 16;
      const nx = this.x + Math.cos(nozzleAngle) * nozzleRadius;
      const ny = this.y + Math.sin(nozzleAngle) * nozzleRadius;

      // Tangential velocity vector
      const tangentAngle = nozzleAngle + Math.PI / 2;
      const speed = 10 + Math.random() * 8;
      const vx = Math.cos(tangentAngle) * speed + (Math.random() - 0.5) * 2;
      const vy = Math.sin(tangentAngle) * speed + (Math.random() - 0.5) * 2;

      const isColor = Math.random() < 0.45;

      pool.spawn({
        x: nx,
        y: ny,
        vx,
        vy,
        color: isColor ? COLORS.MAGENTA : COLORS.GOLD,
        fadeColor: COLORS.DEEP_ORANGE,
        size: 2.4,
        life: 0.5 + Math.random() * 0.25,
        drag: 0.965,
        gravity: 0.05,
        flicker: true,
        crackle: Math.random() < 0.25
      });
    }

    // Glowing core disc
    pool.spawn({
      x: this.x,
      y: this.y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      color: COLORS.WHITE_HOT,
      fadeColor: COLORS.GOLD,
      size: 7.0,
      life: 0.08,
      drag: 0.8,
      gravity: 0
    });
  }
}
