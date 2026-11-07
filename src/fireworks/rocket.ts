import { ParticlePool, ParticleColor } from '../particles/particle';
import { FireworkEffect, SoundTriggerCallback } from './fireworkTypes';
import { COLORS, getRandomColor } from './fireworkColors';

export class Rocket implements FireworkEffect {
  public active: boolean = true;
  private x: number;
  private y: number;
  private vx: number;
  private vy: number;
  private targetY: number;
  private color: ParticleColor;
  private trailTimer: number = 0;
  private onSound?: SoundTriggerCallback;

  constructor(
    startX: number,
    startY: number,
    targetY: number,
    onSound?: SoundTriggerCallback
  ) {
    this.x = startX;
    this.y = startY;
    this.vx = (Math.random() - 0.5) * 2.5;
    this.vy = -(16 + Math.random() * 4); // Fast upward velocity
    this.targetY = targetY;
    this.color = getRandomColor();
    this.onSound = onSound;

    this.onSound?.('ROCKET_LAUNCH');
  }

  public update(dt: number, pool: ParticlePool): void {
    if (!this.active) return;

    // Advance missile head
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.25; // Gentle gravity on ascent

    // Emit trailing smoke & golden spark tail
    this.trailTimer += dt;
    if (this.trailTimer > 0.015) {
      this.trailTimer = 0;
      // Tail sparks
      for (let i = 0; i < 3; i++) {
        pool.spawn({
          x: this.x + (Math.random() - 0.5) * 4,
          y: this.y + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 2.2,
          vy: Math.random() * 3 + 1,
          color: COLORS.GOLD,
          fadeColor: COLORS.DEEP_ORANGE,
          size: 2.2,
          life: 0.35 + Math.random() * 0.2,
          drag: 0.95,
          gravity: 0.08
        });
      }
    }

    // Detonate when reaching target height or velocity reverses
    if (this.y <= this.targetY || this.vy >= -1) {
      this.detonate(pool);
      this.active = false;
    }
  }

  private detonate(pool: ParticlePool): void {
    this.onSound?.('EXPLOSION', 1.0);

    const particleCount = 220 + Math.floor(Math.random() * 60);
    const isWillow = Math.random() < 0.45; // Golden willow droop vs Peony burst
    const burstColor = isWillow ? COLORS.GOLD : this.color;
    const secondaryColor = isWillow ? COLORS.AMBER : COLORS.WHITE_HOT;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = isWillow ? Math.random() * 9 + 2 : Math.random() * 12 + 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      pool.spawn({
        x: this.x,
        y: this.y,
        vx,
        vy,
        color: Math.random() < 0.2 ? COLORS.WHITE_HOT : burstColor,
        fadeColor: secondaryColor,
        size: isWillow ? 2.6 : 3.0,
        life: isWillow ? 1.6 + Math.random() * 0.6 : 1.2 + Math.random() * 0.4,
        drag: isWillow ? 0.97 : 0.96,
        gravity: isWillow ? 0.12 : 0.07, // Willows droop heavily
        flicker: true,
        crackle: Math.random() < 0.35
      });
    }

    // Central flash
    for (let j = 0; j < 25; j++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5;
      pool.spawn({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: COLORS.WHITE_HOT,
        fadeColor: burstColor,
        size: 4.5,
        life: 0.3,
        drag: 0.88,
        gravity: 0
      });
    }
  }
}
