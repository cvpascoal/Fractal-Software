/**
 * Interesting spots and bookmarks
 *
 * targetIterations helps ensure each preset lands with good quality.
 */

export const INTERESTING_SPOTS = {
  mandelbrot: [
    { name: 'Full view', cx: 0, cy: 0, zoom: 1, targetIterations: 120, qualityPreset: 'balanced' },
    { name: 'Seahorse valley', cx: -0.743643887037151, cy: 0.13182590420533, zoom: 4e4, targetIterations: 320, qualityPreset: 'quality' },
    { name: 'Elephant valley', cx: 0.286931868895365, cy: 0.00828742746122, zoom: 1e4, targetIterations: 260, qualityPreset: 'quality' },
    { name: 'Antenna', cx: -0.16, cy: 1.0405, zoom: 2e3, targetIterations: 220, qualityPreset: 'balanced' },
    { name: 'Spiral', cx: -0.761574, cy: -0.0847596, zoom: 1e5, targetIterations: 360, qualityPreset: 'quality' },
    { name: 'Deep zoom', cx: -0.7435669, cy: 0.1314023, zoom: 1e8, targetIterations: 500, qualityPreset: 'quality' }
  ],
  julia: [
    { name: 'Classic swirl', cx: 0, cy: 0, zoom: 1, juliaC: { real: -0.7, imag: 0.27015 }, targetIterations: 180, qualityPreset: 'balanced' },
    { name: 'Dendrite', cx: 0, cy: 0, zoom: 1.4, juliaC: { real: -0.835, imag: -0.2321 }, targetIterations: 220, qualityPreset: 'quality' },
    { name: 'Feather', cx: 0, cy: 0, zoom: 2.5, juliaC: { real: -0.4, imag: 0.6 }, targetIterations: 240, qualityPreset: 'quality' }
  ],
  'burning-ship': [
    { name: 'Full view', cx: -0.45, cy: -0.5, zoom: 0.9, targetIterations: 170, qualityPreset: 'balanced' },
    { name: 'Ship harbor', cx: -1.7443359375, cy: -0.017451171875, zoom: 2e4, targetIterations: 420, qualityPreset: 'quality' },
    { name: 'Flame ridge', cx: -1.768, cy: -0.035, zoom: 8e3, targetIterations: 320, qualityPreset: 'quality' }
  ],
  tricorn: [
    { name: 'Full view', cx: 0, cy: 0, zoom: 1, targetIterations: 150, qualityPreset: 'balanced' },
    { name: 'Needle arc', cx: -0.105, cy: 0.825, zoom: 2.5e3, targetIterations: 280, qualityPreset: 'quality' },
    { name: 'Mirror bloom', cx: 0.36, cy: -0.18, zoom: 1.2e3, targetIterations: 240, qualityPreset: 'balanced' }
  ],
  newton: [
    { name: 'Root basin full', cx: 0, cy: 0, zoom: 1.5, targetIterations: 110, qualityPreset: 'balanced' },
    { name: 'Boundary filaments', cx: 0.08, cy: 0.03, zoom: 40, targetIterations: 260, qualityPreset: 'quality' },
    { name: 'Micro boundary', cx: -0.014, cy: 0.019, zoom: 220, targetIterations: 340, qualityPreset: 'quality' }
  ]
};

const BOOKMARKS_KEY = 'fractal-explorer-bookmarks';

export function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookmark(bookmark) {
  const list = loadBookmarks();
  list.unshift({ ...bookmark, id: Date.now() });
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list.slice(0, 20)));
}

export function deleteBookmark(id) {
  const list = loadBookmarks().filter(b => b.id !== id);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
}
