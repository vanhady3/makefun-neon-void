// Audio — all sound effects synthesized with WebAudio. No audio files.
// The context is created lazily on the first user gesture (browser policy).

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._noiseBuffer = null;
  }

  // Must be called from a user gesture at least once.
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      // Pre-build a 1s white-noise buffer for explosion sounds.
      const len = this.ctx.sampleRate;
      this._noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this._noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  _tone({ type = 'square', from = 440, to = null, dur = 0.1, vol = 0.5, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.3, vol = 0.5, cutoff = 1200, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, cutoff * 0.1), t0 + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shoot() {
    this._tone({ type: 'square', from: 920, to: 420, dur: 0.07, vol: 0.22 });
  }

  explosion(big = false) {
    this._noise({ dur: big ? 0.5 : 0.28, vol: big ? 0.6 : 0.4, cutoff: big ? 900 : 1600 });
    this._tone({ type: 'sine', from: 160, to: 40, dur: 0.3, vol: 0.35 });
  }

  powerup() {
    // Rising arpeggio: C5 E5 G5 C6
    [523, 659, 784, 1047].forEach((f, i) => {
      this._tone({ type: 'triangle', from: f, dur: 0.12, vol: 0.35, delay: i * 0.07 });
    });
  }

  playerHit() {
    this._tone({ type: 'sine', from: 140, to: 36, dur: 0.28, vol: 0.6 });
    this._noise({ dur: 0.2, vol: 0.3, cutoff: 700 });
  }

  waveClear() {
    // Bright chime: E5 then B5
    this._tone({ type: 'sine', from: 659, dur: 0.18, vol: 0.4 });
    this._tone({ type: 'sine', from: 988, dur: 0.3, vol: 0.4, delay: 0.12 });
  }

  gameOver() {
    // Descending tones: A4 F4 D4 A3
    [440, 349, 294, 220].forEach((f, i) => {
      this._tone({ type: 'triangle', from: f, dur: 0.28, vol: 0.4, delay: i * 0.18 });
    });
  }

  click() {
    this._tone({ type: 'square', from: 660, dur: 0.05, vol: 0.25 });
  }

  shieldBreak() {
    this._tone({ type: 'sawtooth', from: 300, to: 90, dur: 0.18, vol: 0.3 });
  }
}
