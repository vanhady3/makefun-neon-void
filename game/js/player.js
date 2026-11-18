// Player — the defender ship: movement, aiming, shooting, lives and power-up timers.
// Power-up effects are applied here; powerups.js only decides what drops.

export const PLAYER_RADIUS = 16;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.speed = 330;
    this.radius = PLAYER_RADIUS;
    this.lives = 3;
    this.invulnerableUntil = 0;
    this.fireCooldown = 0;
    this.thrust = 0; // 0..1, for the engine trail
    // Power-up expiry timestamps (game time, seconds).
    this.shieldUntil = 0;
    this.rapidUntil = 0;
    this.spreadUntil = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.lives = 3;
    this.invulnerableUntil = 0;
    this.fireCooldown = 0;
    this.shieldUntil = 0;
    this.rapidUntil = 0;
    this.spreadUntil = 0;
  }

  get hasShield() { return this._now < this.shieldUntil; }
  get hasRapid() { return this._now < this.rapidUntil; }
  get hasSpread() { return this._now < this.spreadUntil; }

  // The active timed power-up for the HUD (spread wins over rapid when both run).
  activePowerUp() {
    if (this.hasSpread) return { key: 'spread', name: 'SPREAD SHOT', frac: (this.spreadUntil - this._now) / 10 };
    if (this.hasRapid) return { key: 'rapid', name: 'RAPID FIRE', frac: (this.rapidUntil - this._now) / 10 };
    if (this.hasShield) return { key: 'shield', name: 'SHIELD', frac: (this.shieldUntil - this._now) / 8 };
    return null;
  }

  applyPowerUp(key, now) {
    if (key === 'shield') this.shieldUntil = now + 8;
    if (key === 'rapid') this.rapidUntil = now + 10;
    if (key === 'spread') this.spreadUntil = now + 10;
  }

  get invulnerable() { return this._now < this.invulnerableUntil; }

  update(dt, now, input, bounds, bullets, audio, particles) {
    this._now = now;
    // --- Movement (WASD / arrows), clamped to the arena with a margin. ---
    let mx = 0, my = 0;
    if (input.isDown('a', 'arrowleft')) mx -= 1;
    if (input.isDown('d', 'arrowright')) mx += 1;
    if (input.isDown('w', 'arrowup')) my -= 1;
    if (input.isDown('s', 'arrowdown')) my += 1;
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      this.x += (mx / len) * this.speed * dt;
      this.y += (my / len) * this.speed * dt;
      this.thrust = Math.min(1, this.thrust + dt * 6);
    } else {
      this.thrust = Math.max(0, this.thrust - dt * 4);
    }
    const m = this.radius + 6;
    this.x = Math.max(m, Math.min(bounds.width - m, this.x));
    this.y = Math.max(m, Math.min(bounds.height - m, this.y));

    // --- Aim at the mouse. ---
    this.angle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

    // --- Engine trail while thrusting. ---
    if (this.thrust > 0.15) {
      const bx = this.x - Math.cos(this.angle) * (this.radius + 4);
      const by = this.y - Math.sin(this.angle) * (this.radius + 4);
      particles.trail(bx, by, '#00f0ff');
    }

    // --- Shooting (hold mouse or Space). ---
    this.fireCooldown -= dt;
    const firing = input.mouseDown || input.isDown(' ');
    if (firing && this.fireCooldown <= 0) {
      const rate = this.hasRapid ? 0.06 : 0.12;
      this.fireCooldown = rate;
      const noseX = this.x + Math.cos(this.angle) * (this.radius + 6);
      const noseY = this.y + Math.sin(this.angle) * (this.radius + 6);
      if (this.hasSpread) {
        bullets.spawnPlayer(noseX, noseY, this.angle - 0.22);
        bullets.spawnPlayer(noseX, noseY, this.angle);
        bullets.spawnPlayer(noseX, noseY, this.angle + 0.22);
      } else {
        bullets.spawnPlayer(noseX, noseY, this.angle);
      }
      particles.spark(noseX, noseY, '#ffe600');
      audio.shoot();
    }
  }

  // Returns 'shield' (blocked), 'hit' (life lost) or 'immune' (invulnerable).
  takeHit(now) {
    if (this.invulnerable) return 'immune';
    if (this.hasShield) {
      this.shieldUntil = 0;
      this.invulnerableUntil = now + 1;
      return 'shield';
    }
    this.lives -= 1;
    this.invulnerableUntil = now + 2;
    return 'hit';
  }

  draw(ctx, now) {
    this._now = now;
    const blink = this.invulnerable && Math.floor(now * 14) % 2 === 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (blink) ctx.globalAlpha = 0.35;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00f0ff';
    // Hull: a sharp dart.
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    // Cockpit.
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8feff';
    ctx.beginPath();
    ctx.arc(5, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // Wing accents.
    ctx.fillStyle = '#ff2d95';
    ctx.beginPath();
    ctx.moveTo(-12, -11);
    ctx.lineTo(-18, -14);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-12, 11);
    ctx.lineTo(-18, 14);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Shield ring.
    if (this.hasShield) {
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(now * 6);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
