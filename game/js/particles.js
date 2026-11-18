// Particles — explosion bursts, engine trails, floating score text and screen shake.
// Purely visual: no gameplay state lives here.

export class Particles {
  constructor() {
    this.parts = [];
    this.texts = [];
    this.shakeTime = 0;
    this.shakeMag = 0;
  }

  burst(x, y, color, count = 18, speed = 260, life = 0.6, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.85);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: life * (0.6 + Math.random() * 0.7),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.9),
        color,
        drag: 0.92,
      });
    }
  }

  // A short ring that expands and fades — used for bombs and big kills.
  ring(x, y, color, maxRadius = 160) {
    this.parts.push({
      x, y, vx: 0, vy: 0,
      life: 0.5, maxLife: 0.5,
      size: 4, color, drag: 1,
      ring: true, maxRadius,
    });
  }

  trail(x, y, color) {
    this.parts.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      life: 0.35, maxLife: 0.35,
      size: 2.2, color, drag: 0.95,
    });
  }

  spark(x, y, color) {
    this.burst(x, y, color, 6, 140, 0.3, 2);
  }

  scoreText(x, y, text, color = '#ffffff') {
    this.texts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  shake(magnitude, duration = 0.35) {
    this.shakeMag = Math.max(this.shakeMag, magnitude);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.parts.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeMag = 0;
    }
  }

  // Current screen-shake offset in pixels (0 when no shake).
  shakeOffset() {
    if (this.shakeTime <= 0 || this.shakeMag <= 0) return { x: 0, y: 0 };
    const m = this.shakeMag * (this.shakeTime / 0.35);
    return {
      x: (Math.random() - 0.5) * 2 * m,
      y: (Math.random() - 0.5) * 2 * m,
    };
  }

  draw(ctx) {
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      if (p.ring) {
        const prog = 1 - a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * a + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.maxRadius * prog, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = t.color;
      ctx.font = 'bold 18px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.parts.length = 0;
    this.texts.length = 0;
    this.shakeTime = 0;
    this.shakeMag = 0;
  }
}
