/**
 * High-Performance Particle Engine with Additive Blending & Motion Trails
 */

export interface ParticleColor {
  r: number;
  g: number;
  b: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  color: ParticleColor;
  fadeColor: ParticleColor;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
  drag: number;
  gravity: number;
  flicker: boolean;
  crackle: boolean;
  trail: boolean;
}

export class ParticlePool {
  private pool: Particle[] = [];
  public activeCount: number = 0;
  private readonly MAX_PARTICLES: number = 3500;

  constructor() {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        vx: 0,
        vy: 0,
        color: { r: 255, g: 255, b: 255 },
        fadeColor: { r: 255, g: 180, b: 0 },
        alpha: 1,
        size: 2,
        life: 1,
        maxLife: 1,
        drag: 0.98,
        gravity: 0.05,
        flicker: false,
        crackle: false,
        trail: true
      });
    }
  }

  public spawn(config: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: ParticleColor;
    fadeColor?: ParticleColor;
    size?: number;
    life: number;
    drag?: number;
    gravity?: number;
    flicker?: boolean;
    crackle?: boolean;
    trail?: boolean;
  }): Particle | null {
    // Find next inactive particle
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.x = config.x;
        p.y = config.y;
        p.prevX = config.x;
        p.prevY = config.y;
        p.vx = config.vx;
        p.vy = config.vy;
        p.color = config.color;
        p.fadeColor = config.fadeColor || { r: 255, g: 160, b: 40 };
        p.size = config.size ?? 2.5;
        p.life = config.life;
        p.maxLife = config.life;
        p.alpha = 1;
        p.drag = config.drag ?? 0.98;
        p.gravity = config.gravity ?? 0.06;
        p.flicker = config.flicker ?? false;
        p.crackle = config.crackle ?? false;
        p.trail = config.trail ?? true;
        this.activeCount++;
        return p;
      }
    }
    return null;
  }

  public update(dt: number, onCrackle?: (x: number, y: number, color: ParticleColor) => void): void {
    let count = 0;
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        if (p.crackle && onCrackle && Math.random() < 0.6) {
          onCrackle(p.x, p.y, p.color);
        }
        continue;
      }

      count++;
      p.prevX = p.x;
      p.prevY = p.y;

      // Physics integration
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;

      // Quadratic decay for natural spark extinction
      const lifeRatio = p.life / p.maxLife;
      p.alpha = lifeRatio * lifeRatio;

      if (p.flicker && Math.random() < 0.25) {
        p.alpha *= 0.35 + Math.random() * 0.65;
      }
    }
    this.activeCount = count;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.activeCount === 0) return;

    ctx.save();
    // Emissive additive blending: overlapping sparks bloom white-hot naturally
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active || p.alpha <= 0.01) continue;

      const progress = 1 - p.life / p.maxLife;
      // Interpolate color from birth color to fade color
      const r = Math.round(p.color.r + (p.fadeColor.r - p.color.r) * progress);
      const g = Math.round(p.color.g + (p.fadeColor.g - p.color.g) * progress);
      const b = Math.round(p.color.b + (p.fadeColor.b - p.color.b) * progress);

      const colorStr = `rgba(${r},${g},${b},${p.alpha.toFixed(2)})`;
      const coreColorStr = `rgba(255,255,255,${(p.alpha * 0.85).toFixed(2)})`;

      // 1. Draw Sub-Frame Motion Blur Trail (Line from prevX,prevY to current x,y)
      if (p.trail) {
        ctx.strokeStyle = colorStr;
        ctx.lineWidth = Math.max(1, p.size * p.alpha);
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // 2. Draw White-Hot Core Spark Head
      ctx.fillStyle = coreColorStr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.8, p.size * 0.45 * p.alpha), 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Outer Chromatic Halo
      ctx.fillStyle = colorStr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public clear(): void {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.pool[i].active = false;
    }
    this.activeCount = 0;
  }
}
