/**
 * Zoom and pan interaction handler
 * Mouse wheel zoom, click-drag pan
 */

export function setupZoomPan(canvas, onViewChange) {
  let isDragging = false;
  let lastX = 0, lastY = 0;
  let centerX = 0, centerY = 0;
  let zoom = 1;

  const getCenter = () => ({ centerX, centerY });
  const getZoom = () => zoom;
  const setView = (cx, cy, z) => {
    centerX = cx;
    centerY = cy;
    zoom = z;
  };

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(1e10, zoom * factor));

    // Zoom toward mouse position
    const scale = 4 / (zoom * Math.min(canvas.width, canvas.height));
    const aspect = canvas.width / canvas.height;
    const fracX = centerX + (mouseX - canvas.width / 2) * scale * aspect;
    const fracY = centerY - (mouseY - canvas.height / 2) * scale;

    const newScale = 4 / (newZoom * Math.min(canvas.width, canvas.height));
    centerX = fracX - (mouseX - canvas.width / 2) * newScale * aspect;
    centerY = fracY + (mouseY - canvas.height / 2) * newScale;
    zoom = newZoom;

    onViewChange({ centerX, centerY, zoom });
  }, { passive: false });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      const scale = 4 / (zoom * Math.min(canvas.width, canvas.height));
      const aspect = canvas.width / canvas.height;
      centerX -= dx * scale * aspect;
      centerY += dy * scale;
      onViewChange({ centerX, centerY, zoom });
    }
  });

  canvas.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mouseleave', () => { isDragging = false; });

  return { getCenter, getZoom, setView };
}
