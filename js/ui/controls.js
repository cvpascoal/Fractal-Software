/**
 * UI controls: sliders, color pickers, palette selector
 * Wires all control elements and emits state updates on change
 */

import { PALETTES } from '../colors/palettes.js';

const QUALITY_PRESETS = {
  speed: { maxIterations: 80 },
  balanced: { maxIterations: 150 },
  quality: { maxIterations: 300 }
};

const PALETTE_NAMES = {
  ocean: 'Ocean',
  cosmic: 'Cosmic',
  fire: 'Fire',
  aurora: 'Aurora',
  crystal: 'Crystal',
  plasma: 'Plasma',
  rainbow: 'Rainbow'
};

export function createControls(state, onChange) {
  const maxIter = document.getElementById('max-iter');
  const maxIterVal = document.getElementById('max-iter-val');
  const juliaCGroup = document.getElementById('julia-c-group');
  const juliaCReal = document.getElementById('julia-c-real');
  const juliaCImag = document.getElementById('julia-c-imag');
  const bgColor = document.getElementById('bg-color');
  const paletteGrid = document.getElementById('palette-grid');
  const paletteOffset = document.getElementById('palette-offset');
  const fractalTabs = document.getElementById('fractal-tabs');
  const useWorkersCheck = document.getElementById('use-workers');
  const qualityTabs = document.querySelector('.quality-tabs');

  // Max iterations
  maxIter.value = state.maxIterations;
  maxIterVal.textContent = state.maxIterations;
  maxIter.addEventListener('input', () => {
    const val = parseInt(maxIter.value, 10);
    maxIterVal.textContent = val;
    onChange({ maxIterations: val });
  });

  // Julia c (only visible for Julia set)
  juliaCReal.value = state.juliaC?.real ?? -0.7;
  juliaCImag.value = state.juliaC?.imag ?? 0.27;
  juliaCGroup.style.display = state.fractal === 'julia' ? 'block' : 'none';

  juliaCReal.addEventListener('change', () => {
    const real = parseFloat(juliaCReal.value) || 0;
    onChange({ juliaC: { ...(state.juliaC || {}), real } });
  });
  juliaCImag.addEventListener('change', () => {
    const imag = parseFloat(juliaCImag.value) || 0;
    onChange({ juliaC: { ...(state.juliaC || {}), imag } });
  });

  // Background color
  bgColor.value = state.backgroundColor;
  bgColor.addEventListener('input', () => onChange({ backgroundColor: bgColor.value }));

  // Palette grid
  Object.entries(PALETTE_NAMES).forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'palette-btn';
    btn.title = label;
    btn.setAttribute('data-palette', key);
    // Mini color preview
    const palette = PALETTES[key];
    const firstColor = palette?.[0]?.hex || '#333';
    btn.style.background = `linear-gradient(90deg, ${palette?.map(p => p.hex).join(', ') || firstColor})`;
    if (state.palette === key) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange({ palette: key });
    });
    paletteGrid.appendChild(btn);
  });

  // Palette offset (state stores 0-1, slider is 0-100)
  const offsetVal = typeof state.paletteOffset === 'number' ? state.paletteOffset * 100 : 0;
  paletteOffset.value = Math.round(offsetVal);
  paletteOffset.addEventListener('input', () => {
    onChange({ paletteOffset: parseFloat(paletteOffset.value) / 100 });
  });

  // Web Workers toggle
  useWorkersCheck.checked = state.useWorkers !== false;
  useWorkersCheck.addEventListener('change', () => {
    onChange({ useWorkers: useWorkersCheck.checked });
  });

  // Quality preset
  if (qualityTabs) {
    qualityTabs.querySelectorAll('.quality-btn').forEach(btn => {
      if (state.qualityPreset === btn.dataset.quality) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      btn.addEventListener('click', () => {
        const preset = btn.dataset.quality;
        const { maxIterations } = QUALITY_PRESETS[preset] || QUALITY_PRESETS.balanced;
        qualityTabs.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        maxIter.value = maxIterations;
        maxIterVal.textContent = maxIterations;
        onChange({ qualityPreset: preset, maxIterations });
      });
    });
  }

  // Fractal tabs (onChange triggers setFractalUI in main)
  fractalTabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      onChange({ fractal: tab.dataset.fractal });
    });
  });
}
