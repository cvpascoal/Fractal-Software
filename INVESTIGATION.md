# Deep Investigation: Black Screen / Slow Render After Zoom/Pan

## Root Cause

**When the user stops zooming/panning, `applyRenderScale(1)` is called BEFORE `renderWithWorkers`.**

### Flow when user stops:

1. `isInteracting` → false (debounce fires)
2. `scheduleRender()` → `render()` runs
3. `targetScale = 1` (idle = full res)
4. `currentRenderScale = 0.3` (still at interactive low-res)
5. **`targetScale !== currentRenderScale`** → **`applyRenderScale(1)` runs**
6. `applyRenderScale` calls `r.resize(fullW, fullH)` for each renderer
7. **`this.canvas.width = width` and `this.canvas.height = height`** — **assigning to canvas dimensions CLEARS the canvas** (per HTML5 spec)
8. User sees full-size **black/cleared canvas**
9. `renderWithWorkers` runs, renders to **offscreen** (display canvas is never touched)
10. Display stays black for 2–5+ seconds until workers complete
11. Callback: `drawImage(offscreenCanvas)` — only now does the image appear

### Why offscreen doesn’t help

The offscreen strategy was meant to keep the previous frame visible. But the display canvas is cleared in step 7 **before** workers even start. The previous low-res frame is lost when we resize.

---

## Fix

**Do not resize the canvas when transitioning from interactive to worker render.**

- Skip `applyRenderScale(targetScale)` when we're about to do a worker render and `needsResize` is true.
- Keep the canvas at low-res so the last interactive frame stays visible.
- Resize only in the worker completion callback, right before `drawImage`, so the clear and draw happen in the same frame.

---

## Additional Findings

| Location | Behavior |
|----------|----------|
| `renderer.resize()` | Sets `canvas.width`/`height` → **clears canvas** |
| `applyRenderScale(1)` on stop | Resizes to full → **clears display** before workers run |
| Worker pool | Renders to offscreen correctly; display canvas is never updated until callback |
| `scheduleRender` | Uses `requestAnimationFrame`; only one render per frame (no batching of rapid events) |

---

## Implementation

In `main.js` `render()`:
- When `!isInteracting` and `state.useWorkers` and `currentRenderScale < 1`: skip the `applyRenderScale(targetScale)` block.
- Resize only in the worker `onComplete` callback when `needsResize` is true.
