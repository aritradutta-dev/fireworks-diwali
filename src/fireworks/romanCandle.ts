import { ParticlePool, ParticleColor } from '../particles/particle';
import { FireworkEffect, SoundTriggerCallback } from './fireworkTypes';
import { COLORS } from './fireworkColors';

interface CandleBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: ParticleColor;
  life: number;
}

export class RomanCandle implements FireworkEffect {
  public active: boolean = true;
  private x: number;
  private y: number;
  private onSound?: SoundTriggerCallback;

  private balls: CandleBall[] = [];
  private shotsRemaining: number = 5;
  private shotTimer: number = 0;
  private readonly SHOT_INTERVAL: number = 0.22; // 220ms between shots

  private colorSequence = [
    COLORS.CRIMSON,
    COLORS.EMERALD,
    COLORS.GOLD,
    COLORS.ELECTRIC_BLUE,
    COLORS.MAGENTA
  ];

  constructor(x: number, y: number, onSound?: SoundTriggerCallback) {
    this.x = x;
    this.y = y;
    this.onSound = onSound;
    this.fireSingleShot();
  }

  public updatePosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  private fireSingleShot(): void {
    if (this.shotsRemaining <= 0) return;

    this.onSound?.('ROMAN_POP');
    const color = this.colorSequence[5 - this.shotsRemaining] || COLORS.GOLD;
    this.shotsRemaining--;

    this.balls.push({
      x: this.x,
      y: this.y,
      vx: (Math.random() - 0.5) * 3,
      vy: -(14 + Math.random() * 4),
      color,
      life: 0.65 + Math.random() * 0.25
    });
  }

  public update(dt: number, pool: ParticlePool): void {
    // Check if ready for next shot in burst
    if (this.shotsRemaining > 0) {
      this.shotTimer += dt;
      if (this.shotTimer >= this.SHOT_INTERVAL) {
        this.shotTimer = 0;
        this.fireSingleShot();
      }
    }

    // Update active flying fireballs
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.life -= dt;
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.2; // Gravity

      // Emit trailing comet sparks
      for (let j = 0; j < 3; j++) {
        pool.spawn({
          x: b.x + (Math.random() - 0.5) * 4,
          y: b.y + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 2 + 1,
          color: b.color,
          fadeColor: COLORS.GOLD,
          size: 2.5,
          life: 0.28,
          drag: 0.94,
          gravity: 0.05
        });
      }

      // Detonate into mini-peony burst
      if (b.life <= 0 || b.vy >= 0) {
        this.detonateBall(b, pool);
        this.balls.splice(i, 1);
      }
    }

    if (this.shotsRemaining <= 0 && this.balls.length === 0) {
      this.active = false;
    }
  }

  private detonateBall(b: CandleBall, pool: ParticlePool): void {
    this.onSound?.('EXPLOSION', 0.45);

    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      pool.spawn({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() < 0.25 ? COLORS.WHITE_HOT : b.color,
        fadeColor: COLORS.GOLD,
        size: 2.8,
        life: 0.75 + Math.random() * 0.3,
        drag: 0.95,
        gravity: 0.08,
        flicker: true,
        crackle: true
      });
    }
  }
}
