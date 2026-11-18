// Bullets — player and enemy projectiles.
// This file only moves, draws and culls bullets; collisions live in main.js.

export class Bullets {
  constructor() {
    this.playerBullets = [];
    this.enemyBullets = [];
  }

  spawnPlayer(x, y, angle, speed = 720, damage = 1) {
    this.playerBullets.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4,
      damage,
    });
  }

  spawnEnemy(x, y, angle, speed = 230) {
    this.enemyBullets.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 6,
    });
  }

  update(dt, width, height) {
    const margin = 40;
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -margin || b.x > width + margin || b.y < -margin || b.y > height + margin) {
        this.playerBullets.splice(i, 1);
      }
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -margin || b.x > width + margin || b.y < -margin || b.y > height + margin) {
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Player bullets: bright cyan bolts with a glow core.
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.fillStyle = '#aefcff';
    for (const b of this.playerBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // Enemy bullets: magenta orbs with a hot core.
    ctx.shadowColor = '#ff2d95';
    ctx.shadowBlur = 12;
    for (const b of this.enemyBullets) {
      ctx.fillStyle = '#ff2d95';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd7ec';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    this.playerBullets.length = 0;
    this.enemyBullets.length = 0;
  }
}
