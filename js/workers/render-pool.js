/**
 * Worker pool for parallel fractal rendering
 * Splits image into horizontal strips, assigns to workers, composites results
 */

const workerCount = Math.max(2, Math.min(8, navigator.hardwareConcurrency || 4));
let workers = [];
let nextJobId = 0;
let pendingStrips = new Map();
let currentJobId = 0;

function hexToRgb(hex) {
  const h = hex.replace(/^#/, '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

function createWorker() {
  return new Worker(new URL('./fractal-worker.js', import.meta.url), {
    type: 'module'
  });
}

function initWorkers() {
  if (workers.length > 0) return;
  for (let i = 0; i < workerCount; i++) {
    const w = createWorker();
    w.onmessage = (e) => {
      const { jobId, yStart, yEnd, data } = e.data;
      const pending = pendingStrips.get(jobId);
      if (!pending) return;
      if (jobId !== currentJobId) return;
      pending.strips.push({ yStart, yEnd, data });
      pending.received++;
      if (pending.received === pending.total) {
        pendingStrips.delete(jobId);
        if (jobId !== currentJobId) return;
        const { ctx, width, height, strips } = pending;
        const imageData = ctx.getImageData(0, 0, width, height);
        const out = imageData.data;
        for (const { yStart: ys, data: stripData } of strips) {
          out.set(stripData, ys * width * 4);
        }
        ctx.putImageData(imageData, 0, 0);
        pending.onComplete();
      }
    };
    workers.push(w);
  }
}

/**
 * Render fractal using worker pool
 * If params.renderToOffscreen, renders to offscreen canvas and passes it to onComplete.
 */
export function renderWithWorkers(canvas, params, onComplete) {
  initWorkers();

  const jobId = ++nextJobId;
  currentJobId = jobId;

  const width = params.width;
  const height = params.height;
  const useOffscreen = !!params.renderToOffscreen;

  let targetCanvas = canvas;
  if (useOffscreen) {
    targetCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : (() => {
            const c = document.createElement('canvas');
            c.width = width;
            c.height = height;
            return c;
          })();
  }
  const ctx = targetCanvas.getContext('2d');

  const [r, g, b] = hexToRgb(params.backgroundColor || '#000000');
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, width, height);

  const stripHeight = Math.ceil(height / workerCount);
  let assigned = 0;
  let stripCount = 0;

  for (let i = 0; i < workerCount && assigned < height; i++) {
    const yStart = assigned;
    const yEnd = Math.min(assigned + stripHeight, height);
    assigned = yEnd;
    if (yStart >= yEnd) continue;

    stripCount++;
    workers[i].postMessage({
      jobId,
      width,
      height,
      yStart,
      yEnd,
      fractal: params.fractal,
      centerX: params.centerX,
      centerY: params.centerY,
      zoom: params.zoom,
      maxIterations: params.maxIterations,
      escapeRadius: params.escapeRadius ?? 4,
      palette: params.palette,
      backgroundColor: params.backgroundColor,
      offset: params.paletteOffset ?? 0,
      cReal: params.cReal ?? -0.7,
      cImag: params.cImag ?? 0.27,
      warpPhase: params.warpPhase ?? 0,
      warpAmount: params.warpAmount ?? 0
    });
  }

  pendingStrips.set(jobId, {
    ctx,
    width,
    height,
    total: stripCount,
    received: 0,
    strips: [],
    targetCanvas,
    useOffscreen,
    onComplete: () => onComplete?.(useOffscreen ? targetCanvas : null)
  });
}

export function getWorkerCount() {
  return workerCount;
}

export function cancelCurrentJob() {
  currentJobId = -1;
}
