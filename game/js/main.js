// NEON VOID: Arena Defender — main loop, state machine and orchestration.
// States: menu (attract mode behind the title) -> playing -> paused -> gameover.
// Collisions, scoring, combo and wave flow live here; each subsystem owns its own job.

import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Particles } from './particles.js';
import { Bullets } from './bullets.js';
import { Player } from './player.js';
import { Enemy, WaveDirector } from './enemies.js';
import { PowerUps, POWERUP_TYPES } from './powerups.js';
import { HUD } from './hud.js';

const WIDTH = 1280;
const HEIGHT = 720;
const COMBO_WINDOW = 2.5;
const MAX_COMBO = 8;
const BEST_KEY = 'neon-void-best';

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.input = new Input(this.canvas);
    this.audio = new AudioEngine();
    this.particles = new Particles();
    this.bullets = new Bullets();
    this.player = new Player(WIDTH / 2, HEIGHT / 2);
    this.director = new WaveDirector(WIDTH, HEIGHT);
    this.powerups = new PowerUps();
    this.hud = new HUD();
    this.enemies = [];

    this.state = 'menu';
    this.time = 0;
    this.score = 0;
    this.wave = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.killsThisWave = 0;
    this.totalThisWave = 0;
    this.betweenWaves = 0;
    this.attractTimer = 0;
    this.best = this._loadBest();
    this._lastTs = 0;

    this._buildStars();
    this._wireButtons();
    this.hud.showMenu(this.best);
    this.hud.setMute(this.audio.muted);

    // Testing / screenshot interface (used by the maker's own Playwright scripts).
    window.__neonVoid = {
      game: this,
      start: () => this.startGame(),
      state: () => this.state,
      setScore: (n) => { this.score = n; this.hud.setScore(n); },
      setWave: (n) => { this.wave = n; this.hud.setWave(n); },
      setCombo: (n) => { this.combo = n; this.comboTimer = COMBO_WINDOW; },
      setLives: (n) => { this.player.lives = n; this.hud.setLives(n); },
      givePowerUp: (key) => { this.player.applyPowerUp(key, this.time); },
      spawnEnemy: (type, x, y) => {
        const e = new Enemy(type, x, y, Math.max(1, this.wave));
        this.enemies.push(e);
        return e;
      },
      spawnPowerUp: (key, x, y) => { this.powerups.spawn(x, y, key); },
      endGame: () => { if (this.state === 'playing') this.gameOver(); },
      getScore: () => this.score,
    };

    requestAnimationFrame((ts) => this.loop(ts));
  }

  _loadBest() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  _saveBest() {
    try {
      localStorage.setItem(BEST_KEY, String(this.best));
    } catch (e) { /* storage unavailable — best score just won't persist */ }
  }

  _buildStars() {
    this.stars = [];
    for (let i = 0; i < 110; i++) {
      this.stars.push({
        x: Math.random() * WIDTH, y: Math.random() * HEIGHT,
        size: 0.8 + Math.random() * 1.2, speed: 6 + Math.random() * 10,
        alpha: 0.35 + Math.random() * 0.4,
      });
    }
    for (let i = 0; i < 55; i++) {
      this.stars.push({
        x: Math.random() * WIDTH, y: Math.random() * HEIGHT,
        size: 1.4 + Math.random() * 1.8, speed: 16 + Math.random() * 20,
        alpha: 0.5 + Math.random() * 0.5,
      });
    }
  }

  _wireButtons() {
    document.getElementById('start-btn').addEventListener('click', () => {
      this.audio.ensure();
      this.audio.click();
      this.startGame();
    });
    document.getElementById('resume-btn').addEventListener('click', () => {
      this.audio.ensure();
      this.audio.click();
      this.togglePause();
    });
    document.getElementById('pause-restart-btn').addEventListener('click', () => {
      this.audio.ensure();
      this.audio.click();
      this.startGame();
    });
    document.getElementById('restart-btn').addEventListener('click', () => {
      this.audio.ensure();
      this.audio.click();
      this.startGame();
    });
    this.hud.el.muteBtn.addEventListener('click', () => {
      this.audio.ensure();
      this.hud.setMute(this.audio.toggleMute());
    });
    // Any first click resumes audio (browser autoplay policy).
    this.canvas.addEventListener('mousedown', () => this.audio.ensure(), { once: true });
  }

  startGame() {
    this.audio.ensure();
    this.score = 0;
    this.wave = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.enemies.length = 0;
    this.bullets.clear();
    this.powerups.clear();
    this.particles.clear();
    this.player.reset(WIDTH / 2, HEIGHT / 2);
    this.state = 'playing';
    this.hud.showPlaying();
    this.hud.setScore(0);
    this.hud.setBest(this.best);
    this.hud.setLives(this.player.lives);
    this.hud.setCombo(1, 0);
    this.hud.setPowerUp(null);
    this.nextWave();
  }

  nextWave() {
    this.wave += 1;
    this.killsThisWave = 0;
    this.totalThisWave = 4 + 2 * this.wave;
    this.director.startWave(this.wave);
    this.hud.setWave(this.wave);
    this.hud.setWaveProgress(0);
    this.hud.showBanner(`WAVE ${this.wave}`, 1400);
    this.audio.waveClear();
  }

  gameOver() {
    this.state = 'gameover';
    this.audio.gameOver();
    this.particles.burst(this.player.x, this.player.y, '#00f0ff', 40, 380, 0.9, 4);
    this.particles.burst(this.player.x, this.player.y, '#ff2d95', 30, 300, 0.8, 3);
    this.particles.shake(14, 0.5);
    const isNewBest = this.score > this.best;
    if (isNewBest) {
      this.best = this.score;
      this._saveBest();
    }
    this.hud.showGameOver(this.score, this.wave, this.best, isNewBest);
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.hud.showPause();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.hud.hidePause();
    }
  }

  // ---- Per-frame update ----

  loop(ts) {
    const dt = Math.min(0.05, (ts - this._lastTs) / 1000 || 0.016);
    this._lastTs = ts;
    this.time += dt;

    if (this.state === 'playing') this._updatePlaying(dt);
    else if (this.state === 'menu') this._updateMenu(dt);
    else if (this.state === 'gameover') this.particles.update(dt);
    // Paused: freeze everything (particles included) so resume is exact.

    this._draw();
    this._handleKeys();
    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  _updateMenu(dt) {
    this._updateStars(dt);
    this.particles.update(dt);
    // Attract mode: decorative enemies drift across the title screen.
    this.attractTimer -= dt;
    if (this.attractTimer <= 0) {
      this.attractTimer = 1.4;
      const types = ['chaser', 'shooter', 'splitter', 'tank'];
      const type = types[Math.floor(Math.random() * types.length)];
      const p = this.director.edgePoint();
      const e = new Enemy(type, p.x, p.y, 1);
      const tx = WIDTH - p.x + (Math.random() - 0.5) * 240;
      const ty = HEIGHT - p.y + (Math.random() - 0.5) * 240;
      const d = Math.hypot(tx - p.x, ty - p.y) || 1;
      e.driftX = ((tx - p.x) / d) * 60;
      e.driftY = ((ty - p.y) / d) * 60;
      this.enemies.push(e);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.driftX * dt;
      e.y += e.driftY * dt;
      if (e.x < -70 || e.x > WIDTH + 70 || e.y < -70 || e.y > HEIGHT + 70) {
        this.enemies.splice(i, 1);
      }
    }
  }

  _updatePlaying(dt) {
    this._updateStars(dt);
    this.player.update(dt, this.time, this.input, { width: WIDTH, height: HEIGHT },
      this.bullets, this.audio, this.particles);

    // Wave director trickles enemies in; between-wave pause after a clear.
    if (this.betweenWaves > 0) {
      this.betweenWaves -= dt;
      if (this.betweenWaves <= 0) this.nextWave();
    } else {
      this.director.update(dt, this.enemies);
    }

    for (const e of this.enemies) e.update(dt, this.player.x, this.player.y, this.bullets);
    this.bullets.update(dt, WIDTH, HEIGHT);
    this.particles.update(dt);

    // Power-up collection.
    const collected = this.powerups.update(dt, this.player, this.particles);
    for (const key of collected) {
      if (key === 'bomb') {
        this._detonateBomb();
      } else {
        this.player.applyPowerUp(key, this.time);
        this.audio.powerup();
        this.hud.showBanner(POWERUP_TYPES[key].name, 900);
      }
    }

    this._collideBulletsWithEnemies();
    this._collideEnemiesWithPlayer();
    this._collideEnemyBulletsWithPlayer();

    // Combo decay.
    if (this.combo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.comboTimer = 0;
      }
    }

    // Wave clear: queue empty and field empty.
    if (this.betweenWaves <= 0 && this.director.pending === 0 && this.enemies.length === 0) {
      const bonus = 100 * this.wave;
      this.score += bonus;
      this.hud.setScore(this.score);
      this.hud.showBanner(`WAVE ${this.wave} CLEAR  +${bonus}`, 1800);
      this.audio.waveClear();
      this.betweenWaves = 2.2;
    }

    // HUD refresh.
    this.hud.setScore(this.score);
    this.hud.setLives(this.player.lives);
    this.hud.setWaveProgress(this.killsThisWave / this.totalThisWave);
    this.hud.setCombo(this.combo, this.comboTimer / COMBO_WINDOW);
    const active = this.player.activePowerUp();
    if (active) {
      const def = POWERUP_TYPES[active.key];
      this.hud.setPowerUp({ icon: def.icon, name: def.name, frac: active.frac });
    } else {
      this.hud.setPowerUp(null);
    }
  }

  _detonateBomb() {
    this.audio.explosion(true);
    this.particles.ring(this.player.x, this.player.y, '#ffffff', 420);
    this.particles.shake(16, 0.5);
    // Every enemy on screen dies with full combo scoring.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      this._awardKill(e, true);
      this.enemies.splice(i, 1);
    }
    this.hud.showBanner('BOMB!', 900);
  }

  _awardKill(enemy, byBomb = false) {
    // Combo chains when kills land within the window.
    if (this.time - (this._lastKillTime || 0) <= COMBO_WINDOW) {
      this.combo = Math.min(MAX_COMBO, this.combo + 1);
    } else {
      this.combo = 1;
    }
    this.comboTimer = COMBO_WINDOW;
    this._lastKillTime = this.time;
    const points = enemy.score * this.combo;
    this.score += points;
    this.killsThisWave += 1;
    this.particles.burst(enemy.x, enemy.y, enemy.color, enemy.type === 'tank' ? 34 : 20,
      enemy.type === 'tank' ? 340 : 260, 0.7, 3);
    this.particles.scoreText(enemy.x, enemy.y - 10, `+${points}`, enemy.color);
    if (!byBomb) this.audio.explosion(enemy.type === 'tank');
    this.powerups.maybeDrop(enemy.x, enemy.y);
  }

  _collideBulletsWithEnemies() {
    const bullets = this.bullets.playerBullets;
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      let consumed = false;
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const rr = b.radius + e.radius;
        if (dx * dx + dy * dy < rr * rr) {
          const result = e.takeDamage(b.damage);
          this.particles.spark(b.x, b.y, e.color);
          bullets.splice(bi, 1);
          consumed = true;
          if (result === 'dead' || result === 'split') {
            this._awardKill(e);
            this.enemies.splice(ei, 1);
            if (result === 'split') {
              // Splitter bursts into two fast minis.
              for (let k = 0; k < 2; k++) {
                const mini = new Enemy('mini', e.x + (k === 0 ? -14 : 14), e.y, this.wave);
                this.enemies.push(mini);
              }
            }
          }
          break;
        }
      }
      if (consumed) continue;
    }
  }

  _collideEnemiesWithPlayer() {
    if (this.player.invulnerable) return;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const rr = e.radius + this.player.radius - 2;
      if (dx * dx + dy * dy < rr * rr) {
        this._playerHit(e);
        // The enemy that rammed the player also dies.
        this._awardKill(e);
        this.enemies.splice(i, 1);
        break;
      }
    }
  }

  _collideEnemyBulletsWithPlayer() {
    if (this.player.invulnerable) return;
    const bullets = this.bullets.enemyBullets;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const dx = b.x - this.player.x;
      const dy = b.y - this.player.y;
      const rr = b.radius + this.player.radius - 2;
      if (dx * dx + dy * dy < rr * rr) {
        bullets.splice(i, 1);
        this._playerHit(null);
        break;
      }
    }
  }

  _playerHit(source) {
    const result = this.player.takeHit(this.time);
    if (result === 'immune') return;
    if (result === 'shield') {
      this.audio.shieldBreak();
      this.particles.burst(this.player.x, this.player.y, '#00f0ff', 16, 220, 0.5, 3);
      this.particles.shake(6, 0.25);
      this.hud.showBanner('SHIELD DOWN', 900);
      return;
    }
    // A life was lost.
    this.audio.playerHit();
    this.particles.burst(this.player.x, this.player.y, '#00f0ff', 26, 320, 0.8, 3);
    this.particles.burst(this.player.x, this.player.y, '#ff2d95', 18, 260, 0.7, 3);
    this.particles.shake(12, 0.4);
    this.hud.setLives(this.player.lives);
    if (this.player.lives <= 0) {
      this.gameOver();
    }
  }

  _updateStars(dt) {
    for (const s of this.stars) {
      s.y += s.speed * dt;
      s.x -= s.speed * 0.25 * dt;
      if (s.y > HEIGHT + 4) { s.y = -4; s.x = Math.random() * WIDTH; }
      if (s.x < -4) { s.x = WIDTH + 4; }
    }
  }

  _handleKeys() {
    if (this.input.wasPressed('m')) {
      this.audio.ensure();
      this.hud.setMute(this.audio.toggleMute());
    }
    if (this.state === 'menu' && (this.input.wasPressed('enter') || this.input.wasPressed(' '))) {
      this.audio.ensure();
      this.audio.click();
      this.startGame();
    } else if (this.state === 'playing' && (this.input.wasPressed('p') || this.input.wasPressed('escape'))) {
      this.togglePause();
    } else if (this.state === 'paused' && (this.input.wasPressed('p') || this.input.wasPressed('escape'))) {
      this.togglePause();
    } else if (this.state === 'gameover' && (this.input.wasPressed('r') || this.input.wasPressed('enter'))) {
      this.audio.ensure();
      this.audio.click();
      this.startGame();
    }
  }

  // ---- Drawing ----

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const shake = this.particles.shakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // Starfield (two layers by size/alpha).
    for (const s of this.stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.size > 2 ? '#cfe9ff' : '#8fb8d8';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // Subtle grid.
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 80; x < WIDTH; x += 80) { ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); }
    for (let y = 80; y < HEIGHT; y += 80) { ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); }
    ctx.stroke();

    // Arena border.
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, WIDTH - 12, HEIGHT - 12);

    this.powerups.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    this.bullets.draw(ctx);
    if (this.state === 'playing' || this.state === 'paused') {
      this.player.draw(ctx, this.time);
    }
    this.particles.draw(ctx);

    ctx.restore();
  }
}

new Game();
