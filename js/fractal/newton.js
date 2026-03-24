/**
 * Newton fractal: z - (z³ - 1) / (3z²)
 * Roots of z³ - 1
 */

import { FractalRenderer } from './renderer.js';

const ROOTS = [
  { re: 1, im: 0 },
  { re: -0.5, im: Math.sqrt(3) / 2 },
  { re: -0.5, im: -Math.sqrt(3) / 2 }
];
const EPS = 1e-6;

function distToRoot(zx, zy, r) {
  const dx = zx - r.re, dy = zy - r.im;
  return dx * dx + dy * dy;
}

export class NewtonRenderer extends FractalRenderer {
  render(getColorFn) {
    const { width, height, ctx, maxIterations } = this;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        let { x: zx, y: zy } = this.pixelToComplex(px, py);
        let iterations = 0;
        let rootIdx = -1;

        while (iterations < maxIterations) {
          const z2 = zx * zx + zy * zy;
          if (z2 < 1e-20) break;
          const z3re = zx * (zx * zx - 3 * zy * zy) - 1;
          const z3im = zy * (3 * zx * zx - zy * zy);
          const denom = 3 * z2 * z2;
          const newZx = zx - (zx * z3re + zy * z3im) / denom;
          const newZy = zy - (zy * z3re - zx * z3im) / denom;
          zx = newZx;
          zy = newZy;
          iterations++;

          for (let i = 0; i < 3; i++) {
            if (distToRoot(zx, zy, ROOTS[i]) < EPS * EPS) {
              rootIdx = i;
              break;
            }
          }
          if (rootIdx >= 0) break;
        }

        const t = rootIdx >= 0 ? (rootIdx / 3 + iterations / (maxIterations * 3)) : 0;
        const rgb = getColorFn(rootIdx >= 0 ? iterations : maxIterations, maxIterations, zx, zy);
        const i = (py * width + px) * 4;
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
