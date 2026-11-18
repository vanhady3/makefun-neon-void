// PowerUps — drops from killed enemies, drift, magnetise to the player and grant effects.
// Types: shield (blocks one hit), rapid (2x fire rate), spread (3-way shots), bomb
// (clears the screen). The bomb's screen-clear is applied by main.js from the
// collected list this file returns, so this file never touches the enemy list.

export const POWERUP_TYPES = {
  shield: { color: '#00f0ff', icon: '◉', name: 'SHIELD', duration: 8 },
  rapid:  { color: '#ffe600', icon: '⚡', name: 'RAPID FIRE', duration: 10 },
  spread: { color: '#ff2d95', icon: '✦', name: 'SPREAD SHOT', duration: 10 },
  bomb:   { color: '#ffffff', icon: '✹', name: 'BOMB', duration: 0 },
};

const DROP_CHANCE = 0.15;
const LIFETIME = 12;
const MAGNET_RADIUS = 130;
const COLLECT_RADIUS = 34;

export class PowerUps {
  constructor() {
    this.items = [];
  }

  maybeDrop(x, y) {
    if (Math.random() < DROP_CHANCE) {
      const keys = Object.keys(POWERUP_TYPES);
      const key = keys[Math.floor(Math.random() * keys.length)];
      this.spawn(x, y, key);
    }
  }

  spawn(x, y, key) {
    this.items.push({
      x, y, key,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40,
      life: LIFETIME,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  // Returns the keys collected this frame (main.js applies them).
  update(dt, player, particles) {
    const collected = [];
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      it.pulse += dt * 4;
      if (it.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      const dx = player.x - it.x;
      const dy = player.y - it.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < MAGNET_RADIUS) {
        // Magnetise toward the player when close.
        const pull = 420 * (1 - dist / MAGNET_RADIUS) + 120;
        it.vx += (dx / dist) * pull * dt;
        it.vy += (dy / dist) * pull * dt;
      } else {
        it.vx *= 0.98;
        it.vy *= 0.98;
      }
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      if (dist < COLLECT_RADIUS) {
        collected.push(it.key);
        particles.burst(it.x, it.y, POWERUP_TYPES[it.key].color, 14, 200, 0.5, 3);
        this.items.splice(i, 1);
      }
    }
    return collected;
  }

  draw(ctx) {
    for (const it of this.items) {
      const def = POWERUP_TYPES[it.key];
      const blink = it.life < 3 && Math.floor(it.life * 6) % 2 === 0;
      if (blink) continue;
      const bob = Math.sin(it.pulse) * 3;
      ctx.save();
      ctx.translate(it.x, it.y + bob);
      ctx.shadowBlur = 16;
      ctx.shadowColor = def.color;
      // Outer ring.
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();
      // Inner disc.
      ctx.fillStyle = 'rgba(5,5,16,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      // Icon glyph.
      ctx.fillStyle = def.color;
      ctx.font = 'bold 16px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, 0, 1);
      ctx.restore();
    }
  }

  clear() {
    this.items.length = 0;
  }
}
