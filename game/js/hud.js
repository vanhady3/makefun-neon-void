// HUD — the DOM overlay: score, wave, lives, combo meter, active power-up,
// center banner messages and the menu / pause / game-over screens.

export class HUD {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      score: document.getElementById('hud-score'),
      best: document.getElementById('hud-best'),
      wave: document.getElementById('hud-wave'),
      waveFill: document.getElementById('hud-wave-fill'),
      lives: document.getElementById('hud-lives'),
      combo: document.getElementById('hud-combo'),
      comboMult: document.getElementById('hud-combo-mult'),
      comboFill: document.getElementById('hud-combo-fill'),
      powerup: document.getElementById('hud-powerup'),
      powerupIcon: document.getElementById('hud-powerup-icon'),
      powerupName: document.getElementById('hud-powerup-name'),
      powerupFill: document.getElementById('hud-powerup-fill'),
      banner: document.getElementById('banner'),
      menu: document.getElementById('menu-screen'),
      menuBest: document.getElementById('menu-best'),
      pause: document.getElementById('pause-screen'),
      gameover: document.getElementById('gameover-screen'),
      finalScore: document.getElementById('final-score'),
      finalWave: document.getElementById('final-wave'),
      finalBest: document.getElementById('final-best'),
      finalNewBest: document.getElementById('final-newbest'),
      muteBtn: document.getElementById('mute-btn'),
    };
    this._bannerTimer = null;
  }

  setScore(n) { this.el.score.textContent = n.toLocaleString('en-US'); }
  setBest(n) { this.el.best.textContent = n.toLocaleString('en-US'); }
  setWave(n) { this.el.wave.textContent = n; }

  // Fraction of the current wave cleared (0..1).
  setWaveProgress(frac) {
    this.el.waveFill.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
  }

  setLives(n) {
    // Ship icons: filled for lives left, dim for lost.
    let s = '';
    for (let i = 0; i < 3; i++) s += i < n ? '▲' : '<span style="opacity:0.25">▲</span>';
    this.el.lives.innerHTML = s;
  }

  setCombo(mult, frac) {
    if (mult <= 1) {
      this.el.combo.classList.add('hidden');
      return;
    }
    this.el.combo.classList.remove('hidden');
    this.el.comboMult.textContent = `COMBO x${mult}`;
    this.el.comboFill.style.width = `${Math.round(frac * 100)}%`;
  }

  // powerup: { icon, name, frac } or null.
  setPowerUp(powerup) {
    if (!powerup) {
      this.el.powerup.classList.add('hidden');
      return;
    }
    this.el.powerup.classList.remove('hidden');
    this.el.powerupIcon.textContent = powerup.icon;
    this.el.powerupName.textContent = powerup.name;
    this.el.powerupFill.style.width = `${Math.round(Math.max(0, Math.min(1, powerup.frac)) * 100)}%`;
  }

  showBanner(text, ms = 1600) {
    this.el.banner.textContent = text;
    this.el.banner.classList.remove('hidden');
    if (this._bannerTimer) clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      this.el.banner.classList.add('hidden');
    }, ms);
  }

  setMute(muted) {
    this.el.muteBtn.textContent = muted ? 'MUTED' : 'SOUND ON';
  }

  showMenu(best) {
    this.el.menu.classList.remove('hidden');
    this.el.pause.classList.add('hidden');
    this.el.gameover.classList.add('hidden');
    this.el.hud.classList.add('hidden');
    this.el.menuBest.textContent = best.toLocaleString('en-US');
  }

  showPlaying() {
    this.el.menu.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.gameover.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
  }

  showPause() {
    this.el.pause.classList.remove('hidden');
  }

  hidePause() {
    this.el.pause.classList.add('hidden');
  }

  showGameOver(score, wave, best, isNewBest) {
    this.el.gameover.classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.el.finalScore.textContent = score.toLocaleString('en-US');
    this.el.finalWave.textContent = wave;
    this.el.finalBest.textContent = best.toLocaleString('en-US');
    this.el.finalNewBest.textContent = isNewBest ? 'YES!' : '-';
    this.el.finalNewBest.style.color = isNewBest ? '#ffe600' : '';
  }
}
