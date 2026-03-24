/**
 * Mandelbrot Set renderer
 * z_{n+1} = z_n² + c, where z_0 = 0, c = pixel coordinates
 */

import { FractalRenderer } from './renderer.js';

export class MandelbrotRenderer extends FractalRenderer {
  render(getColorFn) {
    const { width, height, ctx, maxIterations, escapeRadius } = this;
    const escapeRadiusSq = escapeRadius * escapeRadius;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const { x: cx, y: cy } = this.pixelToComplex(px, py);
        let zx = 0, zy = 0;
        let iterations = 0;

        while (iterations < maxIterations) {
          const zx2 = zx * zx, zy2 = zy * zy;
          if (zx2 + zy2 > escapeRadiusSq) break;
          const newZx = zx2 - zy2 + cx;
          const newZy = 2 * zx * zy + cy;
          zx = newZx;
          zy = newZy;
          iterations++;
        }

        const rgb = getColorFn(iterations, maxIterations, zx, zy);
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
