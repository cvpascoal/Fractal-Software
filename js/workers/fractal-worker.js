/**
 * Web Worker: renders a horizontal strip of a fractal
 * Receives params, returns Uint8ClampedArray (transferable)
 */

import { PALETTES } from '../colors/palettes.js';

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [0, 0, 0];
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t)
  ];
}

function getColorRgb(paletteName, t, offset, bgRgb) {
  const palette = PALETTES[paletteName] || PALETTES.ocean;
  let pos = ((t + offset) % 1 + 1) % 1;
  for (let i = 0; i < palette.length - 1; i++) {
    const p1 = palette[i];
    const p2 = palette[i + 1];
    if (pos >= p1.pos && pos <= p2.pos) {
      const localT = (pos - p1.pos) / (p2.pos - p1.pos);
      const c1 = hexToRgb(p1.hex);
      const c2 = hexToRgb(p2.hex);
      return lerpColor(c1, c2, localT);
    }
  }
  return hexToRgb(palette[palette.length - 1].hex);
}

function parseBg(hex) {
  return hexToRgb(hex.startsWith('#') ? hex : '#' + hex);
}

function smoothIteration(iterations, maxIter, zx, zy) {
  if (iterations >= maxIter) return -1;
  const logZn = Math.log(zx * zx + zy * zy) / 2;
  const nu = Math.log(logZn / Math.LN2) / Math.LN2;
  return iterations + 1 - nu;
}

function pixelToComplex(px, py, width, height, centerX, centerY, zoom) {
  const aspect = width / height;
  const scale = 4 / (zoom * Math.min(width, height));
  const x = centerX + (px - width / 2) * scale * aspect;
  const y = centerY - (py - height / 2) * scale;
  return { x, y };
}

function colorAt(iterations, maxIter, zx, zy, palette, bgRgb, offset) {
  if (iterations >= maxIter) return bgRgb;
  const smooth = smoothIteration(iterations, maxIter, zx, zy);
  if (smooth < 0) return bgRgb;
  const t = smooth / maxIter;
  return getColorRgb(palette, t, offset, bgRgb);
}

function renderMandelbrot(params) {
  const {
    width,
    height,
    yStart,
    yEnd,
    centerX,
    centerY,
    zoom,
    maxIterations,
    escapeRadius,
    palette,
    bgRgb,
    offset
  } = params;
  const escSq = escapeRadius * escapeRadius;
  const stripHeight = yEnd - yStart;
  const data = new Uint8ClampedArray(width * stripHeight * 4);

  for (let py = yStart; py < yEnd; py++) {
    for (let px = 0; px < width; px++) {
      const { x: cx, y: cy } = pixelToComplex(
        px,
        py,
        width,
        height,
        centerX,
        centerY,
        zoom
      );
      let zx = 0,
        zy = 0;
      let iterations = 0;
      while (iterations < maxIterations) {
        const zx2 = zx * zx,
          zy2 = zy * zy;
        if (zx2 + zy2 > escSq) break;
        const newZx = zx2 - zy2 + cx;
        const newZy = 2 * zx * zy + cy;
        zx = newZx;
        zy = newZy;
        iterations++;
      }
      const rgb = colorAt(
        iterations,
        maxIterations,
        zx,
        zy,
        palette,
        bgRgb,
        offset
      );
      const i = ((py - yStart) * width + px) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  return data;
}

function renderJulia(params) {
  const {
    width,
    height,
    yStart,
    yEnd,
    centerX,
    centerY,
    zoom,
    maxIterations,
    escapeRadius,
    palette,
    bgRgb,
    offset,
    cReal,
    cImag
  } = params;
  const escSq = escapeRadius * escapeRadius;
  const stripHeight = yEnd - yStart;
  const data = new Uint8ClampedArray(width * stripHeight * 4);

  for (let py = yStart; py < yEnd; py++) {
    for (let px = 0; px < width; px++) {
      let { x: zx, y: zy } = pixelToComplex(
        px,
        py,
        width,
        height,
        centerX,
        centerY,
        zoom
      );
      let iterations = 0;
      while (iterations < maxIterations) {
        const zx2 = zx * zx,
          zy2 = zy * zy;
        if (zx2 + zy2 > escSq) break;
        const newZx = zx2 - zy2 + cReal;
        const newZy = 2 * zx * zy + cImag;
        zx = newZx;
        zy = newZy;
        iterations++;
      }
      const rgb = colorAt(
        iterations,
        maxIterations,
        zx,
        zy,
        palette,
        bgRgb,
        offset
      );
      const i = ((py - yStart) * width + px) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  return data;
}

function renderBurningShip(params) {
  const {
    width,
    height,
    yStart,
    yEnd,
    centerX,
    centerY,
    zoom,
    maxIterations,
    escapeRadius,
    palette,
    bgRgb,
    offset
  } = params;
  const escSq = escapeRadius * escapeRadius;
  const stripHeight = yEnd - yStart;
  const data = new Uint8ClampedArray(width * stripHeight * 4);

  for (let py = yStart; py < yEnd; py++) {
    for (let px = 0; px < width; px++) {
      const { x: cx, y: cy } = pixelToComplex(
        px,
        py,
        width,
        height,
        centerX,
        centerY,
        zoom
      );
      let zx = 0,
        zy = 0;
      let iterations = 0;
      while (iterations < maxIterations) {
        const zx2 = zx * zx,
          zy2 = zy * zy;
        if (zx2 + zy2 > escSq) break;
        const newZx = zx2 - zy2 + cx;
        const newZy = Math.abs(2 * zx * zy) + cy;
        zx = Math.abs(newZx);
        zy = newZy;
        iterations++;
      }
      const rgb = colorAt(
        iterations,
        maxIterations,
        zx,
        zy,
        palette,
        bgRgb,
        offset
      );
      const i = ((py - yStart) * width + px) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  return data;
}

function renderTricorn(params) {
  const {
    width,
    height,
    yStart,
    yEnd,
    centerX,
    centerY,
    zoom,
    maxIterations,
    escapeRadius,
    palette,
    bgRgb,
    offset
  } = params;
  const escSq = escapeRadius * escapeRadius;
  const stripHeight = yEnd - yStart;
  const data = new Uint8ClampedArray(width * stripHeight * 4);

  for (let py = yStart; py < yEnd; py++) {
    for (let px = 0; px < width; px++) {
      const { x: cx, y: cy } = pixelToComplex(
        px,
        py,
        width,
        height,
        centerX,
        centerY,
        zoom
      );
      let zx = 0,
        zy = 0;
      let iterations = 0;
      while (iterations < maxIterations) {
        const zx2 = zx * zx,
          zy2 = zy * zy;
        if (zx2 + zy2 > escSq) break;
        zx = zx2 - zy2 + cx;
        zy = -2 * zx * zy + cy;
        iterations++;
      }
      const rgb = colorAt(
        iterations,
        maxIterations,
        zx,
        zy,
        palette,
        bgRgb,
        offset
      );
      const i = ((py - yStart) * width + px) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  return data;
}

const RENDERERS = {
  mandelbrot: renderMandelbrot,
  julia: renderJulia,
  'burning-ship': renderBurningShip,
  tricorn: renderTricorn
};

self.onmessage = (e) => {
  const { jobId, yStart, yEnd, ...params } = e.data;
  const renderFn = RENDERERS[params.fractal] || renderMandelbrot;
  params.bgRgb = parseBg(params.backgroundColor);
  const data = renderFn({ ...params, yStart, yEnd });
  self.postMessage({ jobId, yStart, yEnd, data }, [data.buffer]);
};
