import { ParticlePool } from '../particles/particle';
import { FireworkEffect, SoundTriggerCallback } from './fireworkTypes';
import { Rocket } from './rocket';

export class GrandFinale implements FireworkEffect {
  public active: boolean = true;
  private duration: number = 2.8;
  private timer: number = 0;
  private rocketInterval: number = 0.22;
  private nextRocketTime: number = 0;
  private screenW: number;
  private screenH: number;
  private onSound?: SoundTriggerCallback;
  private rockets: Rocket[] = [];

  constructor(
    screenW: number,
    screenH: number,
    onSound?: SoundTriggerCallback
  ) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.onSound = onSound;
    this.spawnSalvo();
  }

  private spawnSalvo(): void {
    // Launch 2 staggered rockets across screen
    for (let i = 0; i < 2; i++) {
      const launchX = this.screenW * (0.15 + Math.random() * 0.7);
      const launchY = this.screenH;
      const targetY = this.screenH * (0.15 + Math.random() * 0.35);

      this.rockets.push(new Rocket(launchX, launchY, targetY, this.onSound));
    }
  }

  public update(dt: number, pool: ParticlePool): void {
    this.timer += dt;

    if (this.timer < this.duration) {
      if (this.timer >= this.nextRocketTime) {
        this.nextRocketTime = this.timer + this.rocketInterval + Math.random() * 0.1;
        this.spawnSalvo();
      }
    }

    // Update active rockets in finale
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.update(dt, pool);
      if (!r.active) {
        this.rockets.splice(i, 1);
      }
    }

    if (this.timer >= this.duration && this.rockets.length === 0) {
      this.active = false;
    }
  }
}
