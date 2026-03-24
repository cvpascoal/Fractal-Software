# Fractal Explorer — Performance & Smoothness Plan

## 🔍 Why It's Slow

| Bottleneck | Impact |
|------------|--------|
| **Single-threaded** | All 1–2M pixels computed on main thread, blocks UI |
| **Full resolution always** | 1920×1080 × 150 iter ≈ 300M ops per frame |
| **No prioritization** | Same quality during zoom (interactive) vs idle |
| **Blocking render** | User waits for full render before seeing anything |

---

## 🎯 Goal

- **Interactive mode**: Instant feedback while zooming/panning/dragging (60fps feel)
- **Idle mode**: Full-quality render in &lt; 1 second
- **Smooth transitions**: No stutter, no long freezes

---

## 📋 Phased Approach

### Phase 1: Low-Res During Interaction *(Quick win — 1–2 hours)*

**Idea**: While the user is actively interacting, render at reduced resolution. When they stop, do a full-quality render.

| What | How |
|------|-----|
| **Interaction detection** | Track: zoom (wheel), pan (drag), slider changes |
| **Low-res render** | Max 400–500px on longest side during interaction |
| **Debounced full-quality** | 200–300ms after last interaction → full resolution |
| **Visual cue** | Optional: subtle "Rendering..." or pulsing border when refining |

**Expected result**: Feels **10–20× faster** during zoom/pan. User sees something instantly.

**Implementation sketch**:
- `isInteracting` flag, set on wheel/mousedown/slider, cleared by debounce
- `render()` checks `isInteracting` → use `scale = 0.25` (or maxDim=400)
- Debounce timer: on interaction → reset timer; when fires → `isInteracting=false`, full render

---

### Phase 2: Web Workers *(Parallel CPU — 3–4 hours)*

**Idea**: Split the image into horizontal strips. Each strip is computed in a separate Web Worker. Main thread only composites.

| What | How |
|------|-----|
| **Worker pool** | 4–8 workers (e.g. `navigator.hardwareConcurrency`) |
| **Strip assignment** | Divide height by N, each worker gets `[yStart, yEnd]` |
| **Message protocol** | `{ type: 'render', params, stripId, yStart, yEnd }` → `{ stripId, imageData }` |
| **Palette in worker** | Pass palette as typed array or JSON; worker does coloring |

**Expected result**: **~4× speedup** on a 4-core CPU.

**Considerations**:
- Workers can't access DOM/canvas — pass raw params, get back `ImageData` or `Uint8ClampedArray`
- Need to handle worker creation, pooling, and cancellation (abort in-flight when new render requested)

---

### Phase 3: WebGL / GPU *(Biggest win — 1–2 days)*

**Idea**: Move the fractal math into a fragment shader. GPU computes millions of pixels in parallel.

| What | How |
|------|-----|
| **Fragment shader** | Each pixel = one shader invocation; Mandelbrot loop in GLSL |
| **Uniforms** | `centerX, centerY, zoom`, `maxIter`, `palette` (as texture or uniform array) |
| **Fractal type** | Switch via `#define` or uniform; different loop bodies |
| **Palette** | 1D texture (256×1) or uniform array for gradient lookup |

**Expected result**: **10–100× faster**. 4K at 60fps is realistic.

**Considerations**:
- GLSL has no `break` in some contexts; use loop with `maxIter` and condition
- Float precision limits deep zoom (~10^7); for deeper zoom need multi-pass or different approach
- Palette as texture: sample with `smoothIteration/maxIter` for smooth coloring

---

### Phase 4: Polish & Cancellation

| What | Why |
|------|-----|
| **Cancel in-flight renders** | If user zooms again mid-render, abort old render |
| **Progressive refinement** | Optional: first pass at 50 iter, second at full — show something in 50ms |
| **Render priority** | During interaction, prefer low-res; never block input |

---

## 📊 Rough Effort vs Impact

| Phase | Effort | Impact | When to do |
|-------|--------|--------|------------|
| **1. Low-res + debounce** | Low | High (UX) | First — immediate improvement |
| **2. Web Workers** | Medium | High (4×) | Second — big win, moderate complexity |
| **3. WebGL** | High | Very high (10–100×) | Third — transforms experience |
| **4. Polish** | Low | Medium | Ongoing |

---

## 🛠️ Recommended Order

1. **Implement Phase 1** — Gets you smooth, responsive interaction quickly.
2. **Implement Phase 2** — Makes full-quality renders much faster.
3. **Evaluate Phase 3** — If 2 isn’t enough, WebGL is the next step for maximum speed.

---

## 📁 Files to Create/Modify

| Phase | Files |
|-------|-------|
| 1 | `main.js` (interaction tracking, scaled render), `ui/zoom-pan.js` (interaction events) |
| 2 | `js/workers/fractal-worker.js` (worker script), `js/workers/pool.js` (orchestration), `main.js` (use pool) |
| 3 | `js/gl/fractal-shader.js`, `js/gl/renderer.js`, new WebGL-based fractal modules |

---

## ✅ Phase 1 Checklist (for implementation)

- [ ] Add `isInteracting` and `interactionDebounceMs` (e.g. 250ms)
- [ ] On wheel, mousedown (pan), slider input: set `isInteracting=true`, reset debounce timer
- [ ] When debounce fires: set `isInteracting=false`, trigger full render
- [ ] In `render()`: if `isInteracting`, use `renderWidth = min(width, 400)`, `renderHeight = proportionally`; else use full size
- [ ] Render to offscreen canvas or scaled, then draw scaled to display canvas (or resize renderer temporarily)
- [ ] Optional: show small "Refining..." when going from low-res to full

---

Ready to implement Phase 1 when you are.
