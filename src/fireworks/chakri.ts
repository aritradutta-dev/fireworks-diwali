import { ParticlePool } from '../particles/particle';
import { FireworkEffect, SoundTriggerCallback } from './fireworkTypes';
import { COLORS } from './fireworkColors';

export class Chakri implements FireworkEffect {
  public active: boolean = true;
  private x: number;
  private y: number;
  private angle: number = 0;
  private life: number = 2.4; // Spins furiously for 2.4s
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

    // High angular velocity rotation: accelerates then stabilizes
    const spinSpeed = 38 + Math.sin(this.life * 4) * 6;
    this.angle += spinSpeed * dt;

    // Dynamic ground illumination around the spinner
    pool.addFlash(this.x, this.y, 220, COLORS.GOLD, 0.28);

    // 4 major spiral nozzle arms
    const nozzles = 4;
    for (let n = 0; n < nozzles; n++) {
      const nozzleAngle = this.angle + (n * Math.PI * 2) / nozzles;

      // Spawn a ribbon of sparks along each spiral arm
      for (let s = 0; s < 5; s++) {
        const radius = 20 + s * 12 + Math.random() * 8;
        const nx = this.x + Math.cos(nozzleAngle) * radius;
        const ny = this.y + Math.sin(nozzleAngle) * radius;

        // Tangential velocity with centrifugal outward expansion
        const tangentAngle = nozzleAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.35;
        const speed = 12 + s * 3.5 + Math.random() * 8;
        const vx = Math.cos(tangentAngle) * speed;
        const vy = Math.sin(tangentAngle) * speed + 1.5; // Slight gravity pull

        const isMagenta = Math.random() < 0.3;
        const isWhite = Math.random() < 0.25;

        pool.spawn({
          x: nx,
          y: ny,
          vx,
          vy,
          color: isWhite ? COLORS.WHITE_HOT : isMagenta ? COLORS.MAGENTA : COLORS.GOLD,
          fadeColor: isMagenta ? COLORS.CRIMSON : COLORS.DEEP_ORANGE,
          size: 3.2,
          life: 0.55 + Math.random() * 0.3,
          drag: 0.955,
          gravity: 0.12,
          flicker: true,
          crackle: Math.random() < 0.3,
          bounceFloor: this.y + 120 // Ground bounce level
        });
      }
    }

    // Blazing white-hot center rotor disk
    for (let c = 0; c < 3; c++) {
      pool.spawn({
        x: this.x + (Math.random() - 0.5) * 12,
        y: this.y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: COLORS.WHITE_HOT,
        fadeColor: COLORS.GOLD,
        size: 9.0,
        life: 0.12,
        drag: 0.85,
        gravity: 0
      });
    }
  }
}
