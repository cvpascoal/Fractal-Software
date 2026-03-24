/**
 * Fractal Explorer — Main entry point
 * Wires renderers, zoom/pan, controls, and render loop
 */

import { MandelbrotRenderer } from './fractal/mandelbrot.js';
import { JuliaRenderer } from './fractal/julia.js';
import { BurningShipRenderer } from './fractal/burning-ship.js';
import { TricornRenderer } from './fractal/tricorn.js';
import { createColorFnRgb } from './colors/coloring.js';
import { renderWithWorkers, cancelCurrentJob } from './workers/render-pool.js';
import { setupZoomPan } from './ui/zoom-pan.js';
import { createControls } from './ui/controls.js';

const canvas = document.getElementById('fractal-canvas');
const container = document.getElementById('canvas-container');
const coordsEl = document.getElementById('coords');
const zoomEl = document.getElementById('zoom-level');
const iterEl = document.getElementById('iterations-display');
const refiningEl = document.getElementById('refining-indicator');

const RENDERERS = {
  mandelbrot: new MandelbrotRenderer(canvas),
  julia: new JuliaRenderer(canvas),
  'burning-ship': new BurningShipRenderer(canvas),
  tricorn: new TricornRenderer(canvas)
};

let state = {
  fractal: 'mandelbrot',
  maxIterations: 150,
  backgroundColor: '#000000',
  palette: 'ocean',
  paletteOffset: 0,
  juliaC: { real: -0.7, imag: 0.27 },
  useWorkers: true,
  qualityPreset: 'balanced'
};

let renderScheduled = false;
let isInteracting = false;
let interactionTimer = null;
let currentRenderScale = 1;
const INTERACTION_DEBOUNCE_MS = 220;
const INTERACTIVE_MAX_DIM = 520;
const INTERACTIVE_ITER_SCALE = 0.55;
const MIN_BASE_ITERATIONS = 35;
const ITERATIONS_PER_ZOOM_DECADE = 70;

const QUALITY_PRESETS = {
  speed: { maxIterations: 80, iterPerDecade: 45 },
  balanced: { maxIterations: 150, iterPerDecade: 70 },
  quality: { maxIterations: 300, iterPerDecade: 95 }
};

function getDisplaySize() {
  return {
    width: Math.max(1, container.clientWidth),
    height: Math.max(1, container.clientHeight)
  };
}

function computeInteractiveScale() {
  const { width, height } = getDisplaySize();
  const longest = Math.max(width, height);
  if (longest <= INTERACTIVE_MAX_DIM) return 1;
  return INTERACTIVE_MAX_DIM / longest;
}

function applyRenderScale(scale) {
  const { width, height } = getDisplaySize();
  const scaledW = Math.max(1, Math.floor(width * scale));
  const scaledH = Math.max(1, Math.floor(height * scale));
  Object.values(RENDERERS).forEach((r) => r.resize(scaledW, scaledH));
  currentRenderScale = scale;
}

function markInteraction() {
  isInteracting = true;
  if (refiningEl) refiningEl.classList.remove('visible');
  cancelCurrentJob();
  if (interactionTimer) clearTimeout(interactionTimer);
  interactionTimer = setTimeout(() => {
    isInteracting = false;
    scheduleRender();
  }, INTERACTION_DEBOUNCE_MS);
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    render();
    renderScheduled = false;
  });
}

function computeAdaptiveIterations() {
  const preset = QUALITY_PRESETS[state.qualityPreset] || QUALITY_PRESETS.balanced;
  const qualityCap = Math.max(MIN_BASE_ITERATIONS, state.maxIterations);
  const zoom = Math.max(0.1, state.zoom || 1);
  const zoomDecades = Math.max(0, Math.log10(zoom));
  const zoomDriven = Math.floor(
    MIN_BASE_ITERATIONS + zoomDecades * preset.iterPerDecade
  );
  const adaptive = Math.min(qualityCap, Math.max(MIN_BASE_ITERATIONS, zoomDriven));

  if (isInteracting) {
    return Math.max(MIN_BASE_ITERATIONS, Math.floor(adaptive * INTERACTIVE_ITER_SCALE));
  }
  return adaptive;
}

function render() {
  const renderer = RENDERERS[state.fractal];
  if (!renderer) return;

  const targetScale = isInteracting ? computeInteractiveScale() : 1;
  const willUseWorkersOffscreen = !isInteracting && state.useWorkers && currentRenderScale < 1;
  if (targetScale !== currentRenderScale && !willUseWorkersOffscreen) {
    applyRenderScale(targetScale);
  }

  const iterations = computeAdaptiveIterations();

  if (isInteracting) {
    renderer.centerX = state.centerX;
    renderer.centerY = state.centerY;
    renderer.zoom = state.zoom;
    renderer.maxIterations = iterations;
    if (state.fractal === 'julia') {
      renderer.setC(state.juliaC.real, state.juliaC.imag);
    }
    const getColor = createColorFnRgb(
      state.palette,
      state.backgroundColor,
      state.paletteOffset
    );
    renderer.render(getColor);
    return;
  }

  const { width: displayW, height: displayH } = getDisplaySize();
  const w = canvas.width;
  const h = canvas.height;

  if (state.useWorkers) {
    const needsResize = currentRenderScale < 1;
    if (refiningEl) refiningEl.classList.add('visible');
    renderWithWorkers(
      canvas,
      {
        width: displayW,
        height: displayH,
        renderToOffscreen: true,
        fractal: state.fractal,
        centerX: state.centerX,
        centerY: state.centerY,
        zoom: state.zoom,
        maxIterations: iterations,
        palette: state.palette,
        backgroundColor: state.backgroundColor,
        paletteOffset: state.paletteOffset,
        cReal: state.juliaC?.real ?? -0.7,
        cImag: state.juliaC?.imag ?? 0.27
      },
      (offscreenCanvas) => {
        if (refiningEl) refiningEl.classList.remove('visible');
        if (!offscreenCanvas || isInteracting) return;
        if (needsResize) applyRenderScale(1);
        canvas.getContext('2d').drawImage(offscreenCanvas, 0, 0);
      }
    );
    return;
  }

  renderer.centerX = state.centerX;
  renderer.centerY = state.centerY;
  renderer.zoom = state.zoom;
  renderer.maxIterations = iterations;
  if (state.fractal === 'julia') {
    renderer.setC(state.juliaC.real, state.juliaC.imag);
  }
  const getColor = createColorFnRgb(
    state.palette,
    state.backgroundColor,
    state.paletteOffset
  );
  renderer.render(getColor);
}

function initZoomPan() {
  state.centerX = 0;
  state.centerY = 0;
  state.zoom = 1;

  const { setView } = setupZoomPan(canvas, (view) => {
    markInteraction();
    state.centerX = view.centerX;
    state.centerY = view.centerY;
    state.zoom = view.zoom;
    updateFooter(view.centerX, view.centerY, view.zoom);
    scheduleRender();
  });

  document.getElementById('reset-view')?.addEventListener('click', () => {
    cancelCurrentJob();
    if (refiningEl) refiningEl.classList.remove('visible');
    setView(0, 0, 1);
    state.centerX = 0;
    state.centerY = 0;
    state.zoom = 1;
    updateFooter(0, 0, 1);
    scheduleRender();
  });

  return setView;
}

function updateFooter(cx, cy, zoom) {
  const effectiveIterations = computeAdaptiveIterations();
  coordsEl.textContent = `x: ${cx.toExponential(4)}, y: ${cy.toExponential(4)}`;
  zoomEl.textContent = `Zoom: ${zoom.toFixed(1)}x`;
  iterEl.textContent = `Iterations: ${effectiveIterations}/${state.maxIterations}`;
}

function setupCanvasResize() {
  const resize = () => {
    const targetScale = isInteracting ? computeInteractiveScale() : 1;
    applyRenderScale(targetScale);
    scheduleRender();
  };

  new ResizeObserver(resize).observe(container);
  resize();
}

function setupMouseCoords() {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const { x, y } = RENDERERS[state.fractal].pixelToComplex(px, py);
    coordsEl.textContent = `x: ${x.toExponential(4)}, y: ${y.toExponential(4)}`;
  });
  canvas.addEventListener('mouseleave', () => {
    coordsEl.textContent = '—';
  });
}

function init() {
  setupCanvasResize();
  initZoomPan();
  createControls(state, (updates) => {
    markInteraction();
    Object.assign(state, updates);
    updateFooter(state.centerX, state.centerY, state.zoom);
    scheduleRender();
  });
  setupMouseCoords();

  // Initial render
  scheduleRender();
  updateFooter(0, 0, 1);
}

init();
