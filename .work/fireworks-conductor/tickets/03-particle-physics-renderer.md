# Ticket 03: Particle Physics Engine & Glow Renderer

## Intent
Build a high-performance Canvas 2D particle simulation engine using additive blending (`lighter`), pre-rendered radial glow sprites, velocity-integrated sub-frame motion blur trails, drag, and gravity.

## Acceptance Criteria
- [ ] Particle pool supporting 2000+ active particles at 60fps.
- [ ] Additive blending (`globalCompositeOperation = 'lighter'`) for white-hot glowing cores.
- [ ] Offscreen pre-rendered radial glow textures for multi-colored sparks.
- [ ] Motion trail rendering from $(x_{t-1}, y_{t-1}) \to (x_t, y_t)$ with tapered width.
- [ ] Physics simulation: velocity, acceleration, gravity, air resistance drag, life decay.
- [ ] Color temperature ramps: white-hot -> chemical color -> ember orange/smoke.
