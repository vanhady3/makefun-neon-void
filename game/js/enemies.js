// Enemies — four enemy types with distinct looks and behaviour, plus the wave director.
// Chaser hunts the player. Shooter keeps its distance and fires. Splitter breaks into
// two fast minis when killed. Tank is slow, tough and worth the most.

export const ENEMY_TYPES = {
  chaser:   { hp: 1, radius: 15, speed: 100, score: 100, color: '#ff2d95' },
  shooter:  { hp: 2, radius: 16, speed: 85,  score: 150, color: '#ffe600' },
  splitter: { hp: 2, radius: 20, speed: 58,  score: 150, color: '#39ff6a' },
  tank:     { hp: 6, radius: 34, speed: 36,  score: 300, color: '#b14bff' },
  mini:     { hp: 1, radius: 10, speed: 185, score: 50,  color: '#ff7ab8' },
};

let nextId = 1;

export class Enemy {
  constructor(type, x, y, wave) {
    const def = ENEMY_TYPES[type];
    this.id = nextId++;
    this.type = type;
    this.x = x;
    this.y = y;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.radius = def.radius;
    this.speed = def.speed + wave * 6;
    this.score = def.score;
    this.color = def.color;
    this.wave = wave;
    this.flash = 0; // hit-flash timer
    this.fireTimer = 1.5 + Math.random() * 1.2; // shooters only
    this.wobble = Math.random() * Math.PI * 2;
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
  }

  // Returns 'split' when a splitter dies (main.js spawns the minis).
  takeDamage(amount) {
    this.hp -= amount;
    this.flash = 0.12;
    if (this.hp <= 0) return this.type === 'splitter' ? 'split' : 'dead';
    return 'hit';
  }

  update(dt, playerX, playerY, bullets) {
    this.flash = Math.max(0, this.flash - dt);
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    if (this.type === 'chaser' || this.type === 'mini' || this.type === 'tank') {
      // Hunt the player, with a slight sinusoidal wobble so paths are not dead straight.
      this.wobble += dt * 2.2;
      const wob = Math.sin(this.wobble) * 0.35;
      const px = -ny * wob;
      const py = nx * wob;
      this.x += (nx + px) * this.speed * dt;
      this.y += (ny + py) * this.speed * dt;
    } else if (this.type === 'shooter') {
      // Keep a ~280px ring around the player and strafe sideways.
      const want = 280;
      const radial = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
      this.x += (nx * radial + -ny * this.strafeDir * 0.7) * this.speed * dt;
      this.y += (ny * radial + nx * this.strafeDir * 0.7) * this.speed * dt;
      if (Math.random() < dt * 0.15) this.strafeDir *= -1;
      // Fire a slow aimed bullet.
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && dist < 620) {
        this.fireTimer = 2.2 + Math.random() * 0.6;
        bullets.spawnEnemy(this.x, this.y, Math.atan2(dy, dx), 230);
      }
    } else if (this.type === 'splitter') {
      this.wobble += dt * 1.4;
      const wob = Math.sin(this.wobble) * 0.5;
      this.x += (nx - ny * wob) * this.speed * dt;
      this.y += (ny + nx * wob) * this.speed * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowBlur = 16;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;

    if (this.type === 'chaser') {
      // Diamond dart.
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(0, 11);
      ctx.lineTo(-16, 0);
      ctx.lineTo(0, -11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#050510';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'mini') {
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-11, 0);
      ctx.lineTo(0, -8);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'shooter') {
      // Hexagon with a gun barrel pointing at the player.
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * 16;
        const py = Math.sin(a) * 16;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#050510';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'splitter') {
      // Pulsing blob: two overlapping circles.
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.08;
      ctx.beginPath();
      ctx.arc(-6 * pulse, 0, 12, 0, Math.PI * 2);
      ctx.arc(6 * pulse, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#050510';
      ctx.beginPath();
      ctx.arc(-6, 0, 4, 0, Math.PI * 2);
      ctx.arc(6, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'tank') {
      // Heavy octagon with armour plates.
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const px = Math.cos(a) * 34;
        const py = Math.sin(a) * 34;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e9d5ff';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#050510';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // HP pips for tough enemies.
    if (this.maxHp > 2) {
      const w = this.radius * 1.6;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(this.x - w / 2, this.y - this.radius - 10, w, 4);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - w / 2, this.y - this.radius - 10, w * (this.hp / this.maxHp), 4);
    }
  }
}

// WaveDirector — builds each wave's spawn queue and trickles enemies in from the edges.
export class WaveDirector {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.wave = 0;
    this.queue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.9;
    this.betweenWaves = 0; // countdown to the next wave once the field is clear
  }

  startWave(n) {
    this.wave = n;
    const total = 4 + 2 * n;
    const shooters = Math.min(2 + Math.floor(n / 2), 5);
    const splitters = n >= 3 ? Math.min(1 + Math.floor(n / 3), 4) : 0;
    const tanks = n >= 4 ? Math.min(1 + Math.floor((n - 4) / 2), 4) : 0;
    const chasers = Math.max(2, total - shooters - splitters - tanks);
    const list = [];
    for (let i = 0; i < chasers; i++) list.push('chaser');
    for (let i = 0; i < shooters; i++) list.push('shooter');
    for (let i = 0; i < splitters; i++) list.push('splitter');
    for (let i = 0; i < tanks; i++) list.push('tank');
    // Shuffle so the mix is unpredictable.
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    this.queue = list;
    this.spawnInterval = Math.max(0.35, 0.9 - n * 0.05);
    this.spawnTimer = 0.5;
    this.betweenWaves = 0;
  }

  // Edge spawn point, just outside the arena on a random side.
  edgePoint() {
    const side = Math.floor(Math.random() * 4);
    const m = 30;
    if (side === 0) return { x: -m, y: Math.random() * this.height };
    if (side === 1) return { x: this.width + m, y: Math.random() * this.height };
    if (side === 2) return { x: Math.random() * this.width, y: -m };
    return { x: Math.random() * this.width, y: this.height + m };
  }

  update(dt, enemies) {
    if (this.queue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.spawnInterval;
        const type = this.queue.shift();
        const p = this.edgePoint();
        enemies.push(new Enemy(type, p.x, p.y, this.wave));
      }
    }
  }

  get pending() { return this.queue.length; }
}
