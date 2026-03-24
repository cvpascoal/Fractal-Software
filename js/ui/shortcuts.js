/**
 * Keyboard shortcuts
 */

export function setupShortcuts(handlers) {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key.toLowerCase();
    if (key === 'r') {
      handlers.reset?.();
      e.preventDefault();
    } else if (key >= '1' && key <= '5') {
      handlers.setFractal?.(['mandelbrot', 'julia', 'burning-ship', 'tricorn', 'newton'][parseInt(key, 10) - 1]);
      e.preventDefault();
    } else if (key === '+' || key === '=') {
      handlers.zoomIn?.();
      e.preventDefault();
    } else if (key === '-') {
      handlers.zoomOut?.();
      e.preventDefault();
    } else if (key === 'arrowup') {
      handlers.pan?.(0, 1);
      e.preventDefault();
    } else if (key === 'arrowdown') {
      handlers.pan?.(0, -1);
      e.preventDefault();
    } else if (key === 'arrowleft') {
      handlers.pan?.(-1, 0);
      e.preventDefault();
    } else if (key === 'arrowright') {
      handlers.pan?.(1, 0);
      e.preventDefault();
    } else if (key === 'f' || key === 'f11') {
      handlers.toggleFullscreen?.();
      e.preventDefault();
    } else if (key === 'e' && (e.ctrlKey || e.metaKey)) {
      handlers.exportPng?.();
      e.preventDefault();
    }
  });
}
