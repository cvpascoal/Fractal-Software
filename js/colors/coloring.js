/**
 * Smooth coloring algorithms for fractals
 * Converts iteration count + escape data to RGB
 */

import { PALETTES } from './palettes.js';

/**
 * Parse hex to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Interpolate between two colors
 */
function lerpColor(c1, c2, t) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t)
  };
}

/**
 * Get color from palette given normalized position (0–1)
 * offset: shifts the palette for cycling effect
 */
export function getColorFromPalette(paletteName, t, offset = 0) {
  const palette = PALETTES[paletteName] || PALETTES.ocean;
  let pos = ((t + offset) % 1 + 1) % 1;

  for (let i = 0; i < palette.length - 1; i++) {
    const p1 = palette[i];
    const p2 = palette[i + 1];
    if (pos >= p1.pos && pos <= p2.pos) {
      const localT = (pos - p1.pos) / (p2.pos - p1.pos);
      const c1 = hexToRgb(p1.hex);
      const c2 = hexToRgb(p2.hex);
      const rgb = lerpColor(c1, c2, localT);
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }
  }
  const last = hexToRgb(palette[palette.length - 1].hex);
  return `rgb(${last.r}, ${last.g}, ${last.b})`;
}

/**
 * Smooth iteration count (continuous coloring)
 * iterations: raw count
 * maxIter: max iterations
 * zx, zy: final z value (for smooth escape time)
 */
export function smoothIteration(iterations, maxIter, zx, zy) {
  if (iterations >= maxIter) return 0;
  const log_zn = Math.log(zx * zx + zy * zy) / 2;
  const nu = Math.log(log_zn / Math.LN2) / Math.LN2;
  return iterations + 1 - nu;
}

/**
 * Parse color string to [r, g, b]
 */
function parseColorToRgb(color) {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16)
    ];
  }
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
}

/**
 * Create a color function for the renderer (returns CSS color string)
 */
export function createColorFn(paletteName, backgroundColor, offset = 0) {
  return (iterations, maxIter, zx, zy) => {
    if (iterations >= maxIter) return backgroundColor;
    const smooth = smoothIteration(iterations, maxIter, zx, zy);
    const t = smooth / maxIter;
    return getColorFromPalette(paletteName, t, offset);
  };
}

/**
 * Create a color function that returns [r, g, b] for ImageData
 */
export function createColorFnRgb(paletteName, backgroundColor, offset = 0) {
  const bgRgb = parseColorToRgb(backgroundColor);
  return (iterations, maxIter, zx, zy) => {
    if (iterations >= maxIter) return bgRgb;
    const smooth = smoothIteration(iterations, maxIter, zx, zy);
    const t = smooth / maxIter;
    const colorStr = getColorFromPalette(paletteName, t, offset);
    return parseColorToRgb(colorStr);
  };
}
