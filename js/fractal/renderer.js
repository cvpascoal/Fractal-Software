/**
 * Shared fractal rendering logic
 * Canvas setup, coordinate mapping, common iteration helpers
 */

export class FractalRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    // View bounds in fractal space (complex plane)
    this.centerX = 0;
    this.centerY = 0;
    this.zoom = 1;
    this.maxIterations = 100;
    this.escapeRadius = 4;
    this.warpPhase = 0;
    this.warpAmount = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Map pixel (px, py) to complex plane coordinates
   */
  pixelToComplex(px, py) {
    const aspect = this.width / this.height;
    const scale = 4 / (this.zoom * Math.min(this.width, this.height));
    let x = this.centerX + (px - this.width / 2) * scale * aspect;
    let y = this.centerY - (py - this.height / 2) * scale;
    if (this.warpAmount > 0) {
      const nx = px / this.width - 0.5;
      const ny = py / this.height - 0.5;
      const waveX =
        Math.sin(ny * 8 + this.warpPhase * 1.7) +
        0.5 * Math.sin(ny * 14 - this.warpPhase * 0.9);
      const waveY =
        Math.cos(nx * 9 - this.warpPhase * 1.3) +
        0.5 * Math.cos(nx * 15 + this.warpPhase * 0.7);
      const dxPixels = waveX * this.warpAmount * 6;
      const dyPixels = waveY * this.warpAmount * 6;
      x += dxPixels * scale * aspect;
      y -= dyPixels * scale;
    }
    return { x, y };
  }

  /**
   * Get color for iteration count (smooth coloring)
   * Override in subclasses or pass palette
   */
  getColor(iterations, maxIter) {
    const t = iterations / maxIter;
    return `hsl(${t * 360}, 80%, 50%)`;
  }

  /**
   * Write pixel to ImageData. getColorFn must return [r, g, b]
   */
  setPixel(data, px, py, rgb) {
    const i = (py * this.width + px) * 4;
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
}
