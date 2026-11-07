import { ParticlePool } from '../particles/particle';
import { FireworkEffect, SoundTriggerCallback } from './fireworkTypes';
import { COLORS, PALETTES } from './fireworkColors';

export class Starburst implements FireworkEffect {
  public active: boolean = false;

  constructor(
    x: number,
    y: number,
    pool: ParticlePool,
    onSound?: SoundTriggerCallback
  ) {
    onSound?.('EXPLOSION', 1.3);

    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const primaryColor = palette[0];
    const secondaryColor = palette[1];

    // 1. Massive Initial Screen Flash (illuminates user and room)
    pool.addFlash(x, y, 650, primaryColor, 0.7);

    // 2. Volumetric Particle Distribution (360 particles filling the entire sphere)
    const particleCount = 340;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Non-uniform power distribution fills the interior volume of the sphere
      const speed = Math.pow(Math.random(), 0.65) * 16 + 2.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const isSecondary = Math.random() < 0.35;
      const isCore = Math.random() < 0.18;

      pool.spawn({
        x,
        y,
        vx,
        vy,
        color: isCore ? COLORS.WHITE_HOT : isSecondary ? secondaryColor : primaryColor,
        fadeColor: isSecondary ? COLORS.GOLD : COLORS.DEEP_ORANGE,
        size: 3.6,
        life: 1.2 + Math.random() * 0.6,
        drag: 0.965,
        gravity: 0.09,
        flicker: true,
        crackle: Math.random() < 0.55
      });
    }

    // 3. Central Blazing Fireball Flash
    for (let k = 0; k < 30; k++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6;
      pool.spawn({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: COLORS.WHITE_HOT,
        fadeColor: primaryColor,
        size: 7.0,
        life: 0.28,
        drag: 0.88,
        gravity: 0
      });
    }
  }

  public update(): void {
    // Immediate one-shot effect
  }
}
