/**
 * Fractal Explorer — Main entry point
 * Wires renderers, zoom/pan, controls, and render loop
 */

import { MandelbrotRenderer } from './fractal/mandelbrot.js';
import { JuliaRenderer } from './fractal/julia.js';
import { BurningShipRenderer } from './fractal/burning-ship.js';
import { TricornRenderer } from './fractal/tricorn.js';
import { createColorFnRgb } from './colors/coloring.js';
import { PALETTES } from './colors/palettes.js';
import { setupZoomPan } from './ui/zoom-pan.js';
import { createControls } from './ui/controls.js';

const canvas = document.getElementById('fractal-canvas');
const container = document.getElementById('canvas-container');
const coordsEl = document.getElementById('coords');
const zoomEl = document.getElementById('zoom-level');
const iterEl = document.getElementById('iterations-display');

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
  juliaC: { real: -0.7, imag: 0.27 }
};

let renderScheduled = false;

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    render();
    renderScheduled = false;
  });
}

function render() {
  const renderer = RENDERERS[state.fractal];
  if (!renderer) return;

  renderer.centerX = state.centerX;
  renderer.centerY = state.centerY;
  renderer.zoom = state.zoom;
  renderer.maxIterations = state.maxIterations;

  if (state.fractal === 'julia') {
    renderer.setC(state.juliaC.real, state.juliaC.imag);
  }

  const getColor = createColorFnRgb(
    state.palette,
    state.backgroundColor,
    state.paletteOffset / 100
  );

  renderer.render(getColor);
}

function initZoomPan() {
  state.centerX = 0;
  state.centerY = 0;
  state.zoom = 1;

  const { setView } = setupZoomPan(canvas, (view) => {
    state.centerX = view.centerX;
    state.centerY = view.centerY;
    state.zoom = view.zoom;
    updateFooter(view.centerX, view.centerY, view.zoom);
    scheduleRender();
  });

  return setView;
}

function updateFooter(cx, cy, zoom) {
  coordsEl.textContent = `x: ${cx.toExponential(4)}, y: ${cy.toExponential(4)}`;
  zoomEl.textContent = `Zoom: ${zoom.toFixed(1)}x`;
  iterEl.textContent = `Iterations: ${state.maxIterations}`;
}

function setupCanvasResize() {
  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    Object.values(RENDERERS).forEach(r => r.resize(w, h));
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
