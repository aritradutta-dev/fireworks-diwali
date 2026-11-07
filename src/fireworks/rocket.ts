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
    this.vx = (Math.random() - 0.5) * 2.8;
    this.vy = -(18 + Math.random() * 5); // Fast upward velocity
    this.targetY = targetY;
    this.color = getRandomColor();
    this.onSound = onSound;

    this.onSound?.('ROCKET_LAUNCH');
  }

  public update(dt: number, pool: ParticlePool): void {
    if (!this.active) return;

    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.28; // Gravity on ascent

    // Emit trailing smoke & blazing spark plume
    this.trailTimer += dt;
    if (this.trailTimer > 0.012) {
      this.trailTimer = 0;
      for (let i = 0; i < 5; i++) {
        pool.spawn({
          x: this.x + (Math.random() - 0.5) * 5,
          y: this.y + (Math.random() - 0.5) * 5,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 4 + 2,
          color: COLORS.GOLD,
          fadeColor: COLORS.DEEP_ORANGE,
          size: 2.8,
          life: 0.45 + Math.random() * 0.25,
          drag: 0.94,
          gravity: 0.1
        });
      }
    }

    // Rocket head glow
    pool.spawn({
      x: this.x,
      y: this.y,
      vx: 0,
      vy: 0,
      color: COLORS.WHITE_HOT,
      fadeColor: COLORS.GOLD,
      size: 6.0,
      life: 0.08,
      drag: 0.9,
      gravity: 0
    });

    // Detonate when reaching apex
    if (this.y <= this.targetY || this.vy >= -1) {
      this.detonate(pool);
      this.active = false;
    }
  }

  private detonate(pool: ParticlePool): void {
    this.onSound?.('EXPLOSION', 1.2);

    // Concussive flash illuminating the sky
    pool.addFlash(this.x, this.y, 600, this.color, 0.65);

    const particleCount = 280 + Math.floor(Math.random() * 70);
    const isWillow = Math.random() < 0.5;
    const burstColor = isWillow ? COLORS.GOLD : this.color;
    const secondaryColor = isWillow ? COLORS.AMBER : COLORS.WHITE_HOT;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = isWillow
        ? Math.pow(Math.random(), 0.6) * 12 + 2.5
        : Math.pow(Math.random(), 0.6) * 15 + 3.5;

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      pool.spawn({
        x: this.x,
        y: this.y,
        vx,
        vy,
        color: Math.random() < 0.2 ? COLORS.WHITE_HOT : burstColor,
        fadeColor: secondaryColor,
        size: isWillow ? 3.0 : 3.5,
        life: isWillow ? 1.8 + Math.random() * 0.7 : 1.3 + Math.random() * 0.5,
        drag: isWillow ? 0.97 : 0.96,
        gravity: isWillow ? 0.14 : 0.08, // Willows droop heavily
        flicker: true,
        crackle: Math.random() < 0.45
      });
    }

    // Central explosion burst flash
    for (let j = 0; j < 35; j++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6.5;
      pool.spawn({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: COLORS.WHITE_HOT,
        fadeColor: burstColor,
        size: 7.0,
        life: 0.32,
        drag: 0.88,
        gravity: 0
      });
    }
  }
}
