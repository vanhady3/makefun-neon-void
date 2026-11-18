// Input — keyboard + mouse state for the game.
// Tracks held keys (lowercase) and the mouse position in canvas pixels,
// converting from CSS pixels so the game works at any display scale.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = canvas.width / 2;
    this.mouseY = canvas.height / 2 - 120;
    this.mouseDown = false;
    this._pressed = new Set();
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
      if (!this.keys.has(k)) this._pressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });

    const updateMouse = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    };
    this.canvas.addEventListener('mousemove', updateMouse);
    this.canvas.addEventListener('mousedown', (e) => {
      updateMouse(e);
      this.mouseDown = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    // Keep the context menu from popping up over the game.
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isDown(...keys) {
    return keys.some((k) => this.keys.has(k));
  }

  // True only on the frame the key went down (edge trigger).
  wasPressed(key) {
    return this._pressed.has(key.toLowerCase());
  }

  // Call once per frame after the game has read the input.
  endFrame() {
    this._pressed.clear();
  }
}
