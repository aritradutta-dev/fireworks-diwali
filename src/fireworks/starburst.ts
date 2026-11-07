import { ParticlePool } from '../particles/particle';
import { FireworkEffect, SoundTriggerCallback } from './fireworkTypes';
import { COLORS, PALETTES } from './fireworkColors';

export class Starburst implements FireworkEffect {
  public active: boolean = false; // Detonates once immediately upon instantiation

  constructor(
    x: number,
    y: number,
    pool: ParticlePool,
    onSound?: SoundTriggerCallback
  ) {
    onSound?.('EXPLOSION', 1.2);

    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const primaryColor = palette[0];
    const secondaryColor = palette[1];

    const particleCount = 280;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 14 + 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const isSecondary = Math.random() < 0.35;
      const isCore = Math.random() < 0.15;

      pool.spawn({
        x,
        y,
        vx,
        vy,
        color: isCore ? COLORS.WHITE_HOT : isSecondary ? secondaryColor : primaryColor,
        fadeColor: isSecondary ? COLORS.GOLD : COLORS.DEEP_ORANGE,
        size: 3.2,
        life: 1.1 + Math.random() * 0.5,
        drag: 0.965,
        gravity: 0.08,
        flicker: true,
        crackle: Math.random() < 0.4
      });
    }

    // High-speed outer ring sparks
    for (let j = 0; j < 60; j++) {
      const angle = (j / 60) * Math.PI * 2;
      const speed = 15 + Math.random() * 2;
      pool.spawn({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: primaryColor,
        fadeColor: COLORS.WHITE_HOT,
        size: 2.8,
        life: 0.9,
        drag: 0.96,
        gravity: 0.06,
        flicker: false,
        crackle: true
      });
    }
  }

  public update(): void {
    // Immediate one-shot effect
  }
}
