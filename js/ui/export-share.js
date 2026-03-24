/**
 * Export PNG, copy to clipboard, share URL
 */

export function exportPng(canvas, filename = 'fractal.png') {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

export async function copyToClipboard(canvas) {
  try {
    await canvas.toBlob(async (blob) => {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
    }, 'image/png');
    return true;
  } catch {
    return false;
  }
}

export function encodeState(state) {
  const params = new URLSearchParams();
  params.set('f', state.fractal || 'mandelbrot');
  params.set('cx', String(state.centerX ?? 0));
  params.set('cy', String(state.centerY ?? 0));
  params.set('z', String(state.zoom ?? 1));
  params.set('i', String(state.maxIterations ?? 150));
  params.set('p', state.palette || 'ocean');
  params.set('po', String((state.paletteOffset ?? 0) * 100));
  params.set('bg', (state.backgroundColor || '#000000').replace('#', ''));
  if (state.fractal === 'julia' && state.juliaC) {
    params.set('jr', String(state.juliaC.real));
    params.set('ji', String(state.juliaC.imag));
  }
  return params.toString();
}

export function decodeState(search) {
  const params = new URLSearchParams(search || location.search);
  const state = {};
  const f = params.get('f');
  if (f) state.fractal = f;
  const cx = params.get('cx');
  if (cx != null) state.centerX = parseFloat(cx);
  const cy = params.get('cy');
  if (cy != null) state.centerY = parseFloat(cy);
  const z = params.get('z');
  if (z != null) state.zoom = parseFloat(z);
  const i = params.get('i');
  if (i != null) state.maxIterations = parseInt(i, 10);
  const p = params.get('p');
  if (p) state.palette = p;
  const po = params.get('po');
  if (po != null) state.paletteOffset = parseFloat(po) / 100;
  const bg = params.get('bg');
  if (bg) state.backgroundColor = '#' + bg;
  const jr = params.get('jr');
  const ji = params.get('ji');
  if (jr != null && ji != null) {
    state.juliaC = { real: parseFloat(jr), imag: parseFloat(ji) };
  }
  return state;
}

export function getShareUrl(state) {
  return location.origin + location.pathname + '?' + encodeState(state);
}
