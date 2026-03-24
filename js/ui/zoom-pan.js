/**
 * Zoom and pan interaction handler
 * Mouse wheel zoom, click-drag pan
 */

export function setupZoomPan(canvas, onViewChange) {
  let isDragging = false;
  let dragOccurred = false;
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
      dragOccurred = false;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      dragOccurred = true;
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

  const zoomIn = () => {
    const factor = 1.2;
    zoom = Math.min(1e10, zoom * factor);
    onViewChange({ centerX, centerY, zoom });
  };
  const zoomOut = () => {
    const factor = 0.83;
    zoom = Math.max(0.1, zoom * factor);
    onViewChange({ centerX, centerY, zoom });
  };
  const pan = (dxFrac, dyFrac) => {
    const scale = 4 / (zoom * Math.min(canvas.width, canvas.height));
    const aspect = canvas.width / canvas.height;
    centerX -= dxFrac * 0.3 * scale * aspect;
    centerY += dyFrac * 0.3 * scale;
    onViewChange({ centerX, centerY, zoom });
  };

  let pinchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      pinchStart = null;
    } else if (e.touches.length === 2) {
      isDragging = false;
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      pinchStart = { dist: Math.hypot(dx, dy), centerX, centerY, zoom };
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      const scale = 4 / (zoom * Math.min(canvas.width, canvas.height));
      const aspect = canvas.width / canvas.height;
      centerX -= dx * scale * aspect;
      centerY += dy * scale;
      onViewChange({ centerX, centerY, zoom });
    } else if (e.touches.length === 2 && pinchStart) {
      e.preventDefault();
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / pinchStart.dist;
      zoom = Math.max(0.1, Math.min(1e10, pinchStart.zoom * factor));
      centerX = pinchStart.centerX;
      centerY = pinchStart.centerY;
      onViewChange({ centerX, centerY, zoom });
    }
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pinchStart = null;
    if (e.touches.length === 0) isDragging = false;
  }, { passive: true });

  return { getCenter, getZoom, setView, zoomIn, zoomOut, pan, wasDrag: () => dragOccurred };
}
