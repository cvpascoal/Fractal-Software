/**
 * Fractal Explorer — Main entry point
 * Wires renderers, zoom/pan, controls, and render loop
 */

import { MandelbrotRenderer } from './fractal/mandelbrot.js';
import { JuliaRenderer } from './fractal/julia.js';
import { BurningShipRenderer } from './fractal/burning-ship.js';
import { TricornRenderer } from './fractal/tricorn.js';
import { NewtonRenderer } from './fractal/newton.js';
import { createColorFnRgb } from './colors/coloring.js';
import { renderWithWorkers, cancelCurrentJob } from './workers/render-pool.js';
import { setupZoomPan } from './ui/zoom-pan.js';
import { createControls } from './ui/controls.js';
import { setupShortcuts } from './ui/shortcuts.js';
import { exportPng, copyToClipboard, getShareUrl, encodeState, decodeState } from './ui/export-share.js';
import { INTERESTING_SPOTS, loadBookmarks, saveBookmark, deleteBookmark } from './data/presets.js';
import { startPaletteAnimation, startMotionAnimation, stopAnimation } from './ui/animation.js';

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
  tricorn: new TricornRenderer(canvas),
  newton: new NewtonRenderer(canvas)
};

let state = {
  fractal: 'mandelbrot',
  maxIterations: 150,
  backgroundColor: '#000000',
  palette: 'ocean',
  paletteOffset: 0,
  juliaC: { real: -0.7, imag: 0.27 },
  useWorkers: true,
  qualityPreset: 'balanced',
  animateQuality: 'balanced',
  animateMotion: false,
  motionPhase: 0,
  motionWarpAmount: 0
};

let renderScheduled = false;
let isInteracting = false;
let interactionTimer = null;
let currentRenderScale = 1;
let firstRenderDone = false;
const INTERACTION_DEBOUNCE_MS = 220;
const INTERACTIVE_MAX_DIM = 520;
const INTERACTIVE_ITER_SCALE = 0.55;
const MIN_BASE_ITERATIONS = 35;
const ITERATIONS_PER_ZOOM_DECADE = 70;
const FRACTAL_ITER_FACTORS = {
  mandelbrot: { baseMul: 1.0, zoomMul: 1.0 },
  julia: { baseMul: 0.95, zoomMul: 0.9 },
  'burning-ship': { baseMul: 1.15, zoomMul: 1.2 },
  tricorn: { baseMul: 1.0, zoomMul: 1.05 },
  newton: { baseMul: 0.85, zoomMul: 0.75 }
};

const QUALITY_PRESETS = {
  speed: { maxIterations: 80, iterPerDecade: 45 },
  balanced: { maxIterations: 150, iterPerDecade: 70 },
  quality: { maxIterations: 300, iterPerDecade: 95 }
};

const ANIMATION_QUALITY_PRESETS = {
  speed: { iterScale: 0.45, renderScale: 0.6, fps: 20, speed: 0.02, motionSpeed: 1.9, motionWarpAmount: 0.7 },
  balanced: { iterScale: 0.6, renderScale: 0.75, fps: 24, speed: 0.014, motionSpeed: 1.35, motionWarpAmount: 1.0 },
  quality: { iterScale: 0.8, renderScale: 1, fps: 30, speed: 0.01, motionSpeed: 1.0, motionWarpAmount: 1.25 }
};
let lastMotionUiUpdateMs = 0;
let animationPerfScale = 1;
const ANIM_PERF_MIN_SCALE = 0.4;
const ANIM_PERF_MAX_SCALE = 1;
const ANIM_REFINE_EVERY_FRAMES = 8;
const ANIM_REFINE_COOLDOWN_MS = 420;
let animationFrameCounter = 0;
let animationRefineInFlight = false;
let lastAnimationRefineMs = 0;
let canvasInView = true;

const FRACTAL_MOTION_PROFILES = {
  mandelbrot: { amp: 1.0, speed: 1.0, zoomAmpFalloff: 0.24, zoomSpeedRise: 0.1 },
  julia: { amp: 0.9, speed: 1.2, zoomAmpFalloff: 0.18, zoomSpeedRise: 0.08 },
  'burning-ship': { amp: 1.25, speed: 0.9, zoomAmpFalloff: 0.28, zoomSpeedRise: 0.12 },
  tricorn: { amp: 1.05, speed: 1.05, zoomAmpFalloff: 0.22, zoomSpeedRise: 0.1 },
  newton: { amp: 0.75, speed: 1.15, zoomAmpFalloff: 0.14, zoomSpeedRise: 0.06 }
};

function getAnimationPerfPreset() {
  return ANIMATION_QUALITY_PRESETS[state.animateQuality] || ANIMATION_QUALITY_PRESETS.balanced;
}

function isCanvasLikelyVisible() {
  const rect = container?.getBoundingClientRect?.();
  if (!rect) return true;
  const vw = window.innerWidth || document.documentElement.clientWidth || 1;
  const vh = window.innerHeight || document.documentElement.clientHeight || 1;
  return rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
}

function canAnimateNow() {
  // Do not rely on document.hidden here: some embedded previews can
  // report hidden=true and block animation entirely.
  return canvasInView || isCanvasLikelyVisible();
}

function getZoomAdaptiveMotionParams() {
  const preset = getAnimationPerfPreset();
  const profile = FRACTAL_MOTION_PROFILES[state.fractal] || FRACTAL_MOTION_PROFILES.mandelbrot;
  const zoomDecades = Math.max(0, Math.log10(Math.max(1, state.zoom || 1)));
  const ampFalloff = 1 / (1 + zoomDecades * profile.zoomAmpFalloff);
  const speedRise = 1 + Math.min(1, zoomDecades * profile.zoomSpeedRise);
  return {
    speed: preset.motionSpeed * profile.speed * speedRise,
    amount: preset.motionWarpAmount * profile.amp * ampFalloff
  };
}

function tuneAnimationPerf(renderMs) {
  if (!isAnimationActive()) return;
  const preset = getAnimationPerfPreset();
  const fps = Math.max(1, preset.fps || 24);
  const budgetMs = 1000 / fps;
  if (renderMs > budgetMs * 1.2) {
    animationPerfScale = Math.max(ANIM_PERF_MIN_SCALE, animationPerfScale - 0.08);
  } else if (renderMs < budgetMs * 0.7) {
    animationPerfScale = Math.min(ANIM_PERF_MAX_SCALE, animationPerfScale + 0.04);
  }
}

function isAnimationActive() {
  const paletteOn = !!document.getElementById('animate-palette')?.checked;
  return paletteOn || !!state.animateMotion;
}

function startMotionIfEnabled() {
  if (!state.animateMotion) return;
  const basePreset = getAnimationPerfPreset();
  startMotionAnimation((t) => {
    if (!canAnimateNow()) return;
    const adaptive = getZoomAdaptiveMotionParams();
    state.motionPhase = t * adaptive.speed;
    state.motionWarpAmount = adaptive.amount * Math.max(0.75, animationPerfScale);
    const now = performance.now();
    if (now - lastMotionUiUpdateMs > 120) {
      updateFooter(state.centerX, state.centerY, state.zoom);
      lastMotionUiUpdateMs = now;
    }
    scheduleRender();
  }, { fps: basePreset.fps });
}

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
  const fractalTuning = FRACTAL_ITER_FACTORS[state.fractal] || FRACTAL_ITER_FACTORS.mandelbrot;
  const qualityCap = Math.max(MIN_BASE_ITERATIONS, state.maxIterations);
  const zoom = Math.max(0.1, state.zoom || 1);
  const zoomDecades = Math.max(0, Math.log10(zoom));
  const zoomDriven = Math.floor(
    MIN_BASE_ITERATIONS * fractalTuning.baseMul +
    zoomDecades * preset.iterPerDecade * fractalTuning.zoomMul
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
  const renderStart = performance.now();
  const animationEnabled = isAnimationActive() && canAnimateNow();
  const animPreset = getAnimationPerfPreset();
  const animationScale = animationEnabled ? animPreset.renderScale * animationPerfScale : 1;

  const targetScale = isInteracting ? computeInteractiveScale() : animationScale;
  const willUseWorkersOffscreen = !isInteracting && state.useWorkers && !animationEnabled && currentRenderScale < 1;
  if (targetScale !== currentRenderScale && !willUseWorkersOffscreen) {
    applyRenderScale(targetScale);
  }

  let iterations = computeAdaptiveIterations();
  if (animationEnabled) {
    animationFrameCounter++;
    iterations = Math.max(MIN_BASE_ITERATIONS, Math.floor(iterations * animPreset.iterScale * animationPerfScale));
  }
  const warpAmount = state.animateMotion ? state.motionWarpAmount : 0;
  renderer.warpPhase = state.motionPhase;
  renderer.warpAmount = warpAmount;

  if (isInteracting) {
    if (!firstRenderDone) { firstRenderDone = true; document.getElementById('loading-skeleton')?.classList.remove('visible'); }
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
    tuneAnimationPerf(performance.now() - renderStart);
    return;
  }

  const { width: displayW, height: displayH } = getDisplaySize();

  // Two-phase animation render:
  // 1) fast continuous sync frame (already rendered below),
  // 2) occasional worker refine frame with higher iterations.
  const canDoAnimationRefine =
    animationEnabled &&
    state.useWorkers &&
    !animationRefineInFlight &&
    animationFrameCounter % ANIM_REFINE_EVERY_FRAMES === 0 &&
    performance.now() - lastAnimationRefineMs > ANIM_REFINE_COOLDOWN_MS;

  if (canDoAnimationRefine) {
    const refineIterations = Math.max(
      MIN_BASE_ITERATIONS,
      Math.min(
        state.maxIterations,
        Math.floor(iterations * 1.55)
      )
    );
    animationRefineInFlight = true;
    lastAnimationRefineMs = performance.now();
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
        maxIterations: refineIterations,
        palette: state.palette,
        backgroundColor: state.backgroundColor,
        paletteOffset: state.paletteOffset,
        warpPhase: state.motionPhase,
        warpAmount,
        cReal: state.juliaC?.real ?? -0.7,
        cImag: state.juliaC?.imag ?? 0.27
      },
      (offscreenCanvas) => {
        animationRefineInFlight = false;
        if (!offscreenCanvas || isInteracting || !isAnimationActive()) return;
        canvas.getContext('2d').drawImage(offscreenCanvas, 0, 0, canvas.width, canvas.height);
      }
    );
  }

  if (state.useWorkers && !animationEnabled) {
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
        warpPhase: state.motionPhase,
        warpAmount,
        cReal: state.juliaC?.real ?? -0.7,
        cImag: state.juliaC?.imag ?? 0.27
      },
      (offscreenCanvas) => {
        if (refiningEl) refiningEl.classList.remove('visible');
        if (!offscreenCanvas || isInteracting) return;
        if (needsResize) applyRenderScale(1);
        canvas.getContext('2d').drawImage(offscreenCanvas, 0, 0);
        tuneAnimationPerf(performance.now() - renderStart);
        if (!firstRenderDone) { firstRenderDone = true; document.getElementById('loading-skeleton')?.classList.remove('visible'); }
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
  tuneAnimationPerf(performance.now() - renderStart);
  if (!firstRenderDone) { firstRenderDone = true; document.getElementById('loading-skeleton')?.classList.remove('visible'); }
}

function applyView(cx, cy, zoom) {
  state.centerX = cx;
  state.centerY = cy;
  state.zoom = zoom;
  updateFooter(cx, cy, zoom);
  scheduleRender();
}

function initZoomPan() {
  state.centerX = 0;
  state.centerY = 0;
  state.zoom = 1;

  const { setView, zoomIn, zoomOut, pan, wasDrag } = setupZoomPan(canvas, (view) => {
    markInteraction();
    applyView(view.centerX, view.centerY, view.zoom);
  });

  const resetView = () => {
    cancelCurrentJob();
    if (refiningEl) refiningEl.classList.remove('visible');
    setView(0, 0, 1);
    applyView(0, 0, 1);
  };

  document.getElementById('reset-view')?.addEventListener('click', resetView);

  canvas.addEventListener('click', (e) => {
    if (state.fractal !== 'mandelbrot' || wasDrag()) return;
    if (e.target !== canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const { x, y } = RENDERERS.mandelbrot.pixelToComplex(px, py);
    state.juliaC = { real: x, imag: y };
    syncJuliaInputs();
    setFractalUI('julia');
    renderInterestingSpots(setView, applyView);
    scheduleRender();
  });

  setupShortcuts({
    reset: resetView,
    setFractal: (f) => { setFractalUI(f); renderInterestingSpots(setView, applyView); scheduleRender(); },
    zoomIn: () => { markInteraction(); zoomIn(); },
    zoomOut: () => { markInteraction(); zoomOut(); },
    pan: (dx, dy) => { markInteraction(); pan(dx, dy); },
    toggleFullscreen: toggleFullscreen,
    exportPng: () => exportPng(canvas)
  });

  document.getElementById('btn-export')?.addEventListener('click', () => exportPng(canvas));
  document.getElementById('btn-copy')?.addEventListener('click', async () => {
    const ok = await copyToClipboard(canvas);
    showToast(ok ? 'Copied to clipboard' : 'Copy failed');
  });
  document.getElementById('btn-share')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl(state));
      showToast('Share URL copied');
    } catch { showToast('Copy failed'); }
  });
  document.getElementById('btn-fullscreen')?.addEventListener('click', toggleFullscreen);

  let doRenderBookmarks = () => {};
  document.getElementById('save-bookmark')?.addEventListener('click', () => {
    saveBookmark({
      name: `View ${new Date().toLocaleTimeString()}`,
      centerX: state.centerX, centerY: state.centerY, zoom: state.zoom,
      fractal: state.fractal, juliaC: state.juliaC, palette: state.palette
    });
    doRenderBookmarks();
  });

  document.getElementById('animate-palette')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      cancelCurrentJob();
      animationPerfScale = 0.85;
      animationFrameCounter = 0;
      animationRefineInFlight = false;
      const preset = getAnimationPerfPreset();
      startPaletteAnimation((t) => {
        if (!canAnimateNow()) return;
        state.paletteOffset = t;
        scheduleRender();
      }, { fps: preset.fps, speed: preset.speed });
      if (state.animateMotion) startMotionIfEnabled();
    } else {
      if (!state.animateMotion) animationPerfScale = 1;
      if (!state.animateMotion) stopAnimation();
      updateFooter(state.centerX, state.centerY, state.zoom);
      scheduleRender();
    }
  });

  document.getElementById('animate-quality')?.addEventListener('change', (e) => {
    state.animateQuality = e.target.value;
    animationPerfScale = 0.85;
    animationFrameCounter = 0;
    animationRefineInFlight = false;
    const preset = getAnimationPerfPreset();
    if (document.getElementById('animate-palette')?.checked) {
      startPaletteAnimation((t) => {
        if (!canAnimateNow()) return;
        state.paletteOffset = t;
        scheduleRender();
      }, { fps: preset.fps, speed: preset.speed });
    }
    if (state.animateMotion) startMotionIfEnabled();
    updateFooter(state.centerX, state.centerY, state.zoom);
    scheduleRender();
  });

  document.getElementById('animate-motion')?.addEventListener('change', (e) => {
    state.animateMotion = e.target.checked;
    if (state.animateMotion) {
      cancelCurrentJob();
      animationPerfScale = 0.85;
      animationFrameCounter = 0;
      animationRefineInFlight = false;
      startMotionIfEnabled();
    } else {
      state.motionWarpAmount = 0;
      animationRefineInFlight = false;
      if (!document.getElementById('animate-palette')?.checked) {
        animationPerfScale = 1;
        stopAnimation();
      }
      updateFooter(state.centerX, state.centerY, state.zoom);
      scheduleRender();
    }
  });

  renderInterestingSpots(setView, applyView);
  doRenderBookmarks = () => renderBookmarks(setView, applyView, doRenderBookmarks);
  doRenderBookmarks();

  return { setView, zoomIn, zoomOut, pan };
}

function setFractalUI(fractal) {
  state.fractal = fractal;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.fractal === fractal);
  });
  document.getElementById('julia-c-group').style.display = fractal === 'julia' ? 'block' : 'none';
  const h = document.getElementById('click-hint');
  if (h) { h.textContent = fractal === 'mandelbrot' ? '• Click to set Julia c' : ''; h.classList.toggle('visible', fractal === 'mandelbrot'); }
}

function syncJuliaInputs() {
  const r = document.getElementById('julia-c-real');
  const i = document.getElementById('julia-c-imag');
  if (r) r.value = state.juliaC?.real ?? -0.7;
  if (i) i.value = state.juliaC?.imag ?? 0.27;
}

function renderInterestingSpots(setView, applyView) {
  const el = document.getElementById('interesting-spots');
  if (!el) return;
  el.innerHTML = '';
  const spots = INTERESTING_SPOTS[state.fractal] || [];
  spots.forEach((s) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.textContent = s.name;
    btn.addEventListener('click', () => {
      cancelCurrentJob();
      if (s.qualityPreset) {
        state.qualityPreset = s.qualityPreset;
        document.querySelectorAll('.quality-btn').forEach((q) => {
          q.classList.toggle('active', q.dataset.quality === s.qualityPreset);
        });
      }
      if (typeof s.targetIterations === 'number') {
        state.maxIterations = s.targetIterations;
        const iterSlider = document.getElementById('max-iter');
        const iterLabel = document.getElementById('max-iter-val');
        if (iterSlider) iterSlider.value = String(s.targetIterations);
        if (iterLabel) iterLabel.textContent = String(s.targetIterations);
      }
      if (s.juliaC) {
        state.juliaC = { ...s.juliaC };
        syncJuliaInputs();
      }
      setView(s.cx, s.cy, s.zoom);
      applyView(s.cx, s.cy, s.zoom);
    });
    el.appendChild(btn);
  });
}

function renderBookmarks(setView, applyView, onRefresh) {
  const el = document.getElementById('bookmarks-list');
  if (!el) return;
  const list = loadBookmarks();
  el.innerHTML = '';
  const refresh = onRefresh || (() => {});
  list.forEach((b) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:0.2rem;align-items:center;';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.textContent = b.name || 'Bookmark';
    btn.addEventListener('click', () => {
      cancelCurrentJob();
      if (b.centerX != null) setView(b.centerX, b.centerY ?? 0, b.zoom ?? 1);
      if (b.centerX != null) applyView(b.centerX, b.centerY ?? 0, b.zoom ?? 1);
      if (b.fractal) {
        setFractalUI(b.fractal);
        renderInterestingSpots(setView, applyView);
      }
      if (b.juliaC) { state.juliaC = b.juliaC; syncJuliaInputs(); }
      if (b.palette) state.palette = b.palette;
      scheduleRender();
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'preset-btn';
    del.textContent = '×';
    del.style.cssText = 'padding:0 0.4rem;';
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteBookmark(b.id); refresh(); });
    wrap.appendChild(btn);
    wrap.appendChild(del);
    el.appendChild(wrap);
  });
}

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => { el.remove(); }, 1500);
}

function toggleFullscreen() {
  const container = document.getElementById('canvas-container');
  if (!document.fullscreenElement) {
    container?.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
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
  const urlState = decodeState(location.search);
  if (Object.keys(urlState).length) {
    Object.assign(state, urlState);
    if (state.fractal) setFractalUI(state.fractal);
    if (state.juliaC) syncJuliaInputs();
  }
  const animQuality = document.getElementById('animate-quality');
  if (animQuality) animQuality.value = state.animateQuality || 'balanced';
  const animMotion = document.getElementById('animate-motion');
  if (animMotion) animMotion.checked = !!state.animateMotion;

  setupCanvasResize();
  const obs = new IntersectionObserver(
    ([entry]) => {
      canvasInView = !!entry?.isIntersecting;
      if (!canvasInView) {
        cancelCurrentJob();
      } else if (isAnimationActive()) {
        scheduleRender();
      }
    },
    { threshold: 0.05 }
  );
  obs.observe(container);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelCurrentJob();
    } else if (isAnimationActive()) {
      scheduleRender();
    }
  });

  const { setView } = initZoomPan();
  if (urlState.centerX != null && urlState.centerY != null) {
    setView(urlState.centerX, urlState.centerY, urlState.zoom ?? 1);
    state.centerX = urlState.centerX;
    state.centerY = urlState.centerY;
    state.zoom = urlState.zoom ?? 1;
  }

  createControls(state, (updates) => {
    markInteraction();
    Object.assign(state, updates);
    if (updates.fractal) {
      setFractalUI(updates.fractal);
      renderInterestingSpots(setView, applyView);
    }
    updateFooter(state.centerX, state.centerY, state.zoom);
    scheduleRender();
  });
  setupMouseCoords();

  const skel = document.getElementById('loading-skeleton');
  if (skel) skel.classList.add('visible');
  scheduleRender();

  updateFooter(state.centerX ?? 0, state.centerY ?? 0, state.zoom ?? 1);
}

init();
