/**
 * Julia Set renderer
 * z_{n+1} = z_n² + c, where z_0 = pixel coords, c = constant parameter
 */

import { FractalRenderer } from './renderer.js';

export class JuliaRenderer extends FractalRenderer {
  constructor(canvas) {
    super(canvas);
    this.cReal = -0.7;
    this.cImag = 0.27015;
  }

  setC(real, imag) {
    this.cReal = real;
    this.cImag = imag;
  }

  render(getColorFn) {
    const { width, height, ctx, maxIterations, escapeRadius, cReal, cImag } = this;
    const escapeRadiusSq = escapeRadius * escapeRadius;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        let { x: zx, y: zy } = this.pixelToComplex(px, py);
        let iterations = 0;

        while (iterations < maxIterations) {
          const zx2 = zx * zx, zy2 = zy * zy;
          if (zx2 + zy2 > escapeRadiusSq) break;
          const newZx = zx2 - zy2 + cReal;
          const newZy = 2 * zx * zy + cImag;
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
