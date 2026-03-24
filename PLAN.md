# Fractal Visualization Software — Project Plan

## 🎯 Vision
A beautiful, interactive fractal explorer where users can zoom infinitely, tweak parameters in real-time, and customize colors to create stunning visualizations.

---

## ✨ Core Features

### 1. **Zoom & Pan**
- **Zoom in/out** — Mouse wheel or pinch gesture
- **Pan** — Click and drag to move around
- **Smooth animations** — Optional easing when zooming
- **Deep zoom support** — Handle arbitrary precision for extreme zooms (Mandelbrot at 10^100+)

### 2. **Fractal Types**
| Fractal | Parameters | Notes |
|---------|------------|-------|
| **Mandelbrot Set** | Max iterations, Escape radius | Classic, most popular |
| **Julia Set** | c (real, imaginary), Max iterations | Infinite variations |
| **Burning Ship** | Same as Mandelbrot | Cool twisted variant |
| **Tricorn** | Same as Mandelbrot | Mirror Mandelbrot |

### 3. **Color & Styling**
- **Background color** — Full RGB picker + presets
- **Fractal coloring** — Multiple algorithms:
  - Smooth iteration count (continuous coloring)
  - Exponential smoothing
  - Distance estimation coloring
- **Color palettes** (cool themes):
  - 🌊 **Ocean** — Deep blues, teals, cyan
  - 🔥 **Fire** — Reds, oranges, yellows
  - 🌌 **Cosmic** — Purples, magentas, deep space
  - 🌈 **Rainbow** — Full spectrum
  - 🌙 **Aurora** — Greens, teals, northern lights
  - 💎 **Crystal** — Icy blues, whites
  - ⚡ **Plasma** — Electric blues, violets
- **Palette cycling** — Animate through colors
- **Custom gradient** — User-defined color stops

### 4. **Parameter Controls**
- Max iterations (slider)
- Escape radius
- Julia c (real + imaginary) — for Julia set
- Color speed / palette offset
- Smoothness factor

---

## 🛠️ Tech Stack Recommendation

### Option A: Web (Recommended) — *Best for rapid development & sharing*
```
HTML5 + Vanilla JS + Canvas 2D (or WebGL)
```
- **Pros**: Cross-platform, no install, easy to share, Web Workers for parallel rendering
- **Cons**: Very deep zoom needs BigInt/big number lib (e.g., decimal.js)

### Option B: Electron + Web
```
Same as A, wrapped in Electron
```
- **Pros**: Desktop app, file save/load, system integration
- **Cons**: Heavier, more setup

### Option C: Python + PyGame / SDL
```
Python, NumPy for math, PyGame for display
```
- **Pros**: Quick prototyping, familiar if you know Python
- **Cons**: Slower than native, zoom limited by float precision

**Recommendation**: Start with **Option A (Web)** — it's the fastest path to something beautiful and works everywhere. Upgrade to Electron later if you want a desktop app.

---

## 📁 Project Structure

```
Fractal-Software/
├── index.html              # Main app entry
├── css/
│   └── styles.css          # UI styling
├── js/
│   ├── main.js             # App init, event binding
│   ├── fractal/
│   │   ├── mandelbrot.js   # Mandelbrot rendering
│   │   ├── julia.js        # Julia set rendering
│   │   ├── burning-ship.js # Burning Ship
│   │   └── renderer.js     # Shared canvas logic
│   ├── colors/
│   │   ├── palettes.js     # Color palette definitions
│   │   └── coloring.js     # Smooth coloring algorithms
│   ├── ui/
│   │   ├── controls.js     # Sliders, color pickers
│   │   └── zoom-pan.js     # Mouse/touch handling
│   └── utils/
│       ├── complex.js      # Complex number helpers
│       └── workers.js      # Web Worker pool (optional)
├── assets/                 # Icons, presets (optional)
├── PLAN.md                 # This file
└── README.md               # Usage & setup
```

---

## 🗓️ Development Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up HTML/CSS/JS structure
- [ ] Implement basic Mandelbrot on Canvas
- [ ] Add zoom (mouse wheel) and pan (drag)
- [ ] Simple iteration-count coloring

### Phase 2: Colors & Styling (Week 2)
- [ ] Background color picker
- [ ] 3–5 cool color palettes (Ocean, Cosmic, Fire, etc.)
- [ ] Smooth coloring algorithm
- [ ] Palette offset/cycling control

### Phase 3: More Fractals & Parameters (Week 3)
- [ ] Julia set with c parameter
- [ ] Burning Ship, Tricorn
- [ ] Max iterations slider
- [ ] Escape radius control

### Phase 4: Performance (see [PERFORMANCE_PLAN.md](PERFORMANCE_PLAN.md))
- [ ] Phase 1: Low-res during interaction + debounced full-quality
- [ ] Phase 2: Web Workers for parallel CPU rendering
- [ ] Phase 3: WebGL/GPU (optional, maximum speed)

### Phase 5: Polish
- [ ] Big number support for deep zoom (optional)
- [ ] Save/load presets (localStorage or JSON export)
- [ ] Responsive UI, keyboard shortcuts
- [ ] Cancel in-flight renders when new interaction starts

---

## 🎨 Cool Color Palette Ideas

| Name   | Colors (hex) |
|--------|--------------|
| Ocean  | `#0a1628 → #1e3a5f → #4a90a4 → #87ceeb` |
| Cosmic | `#0d0221 → #2d1b69 → #7b2cbf → #e0aaff` |
| Fire   | `#1a0000 → #660000 → #ff6600 → #ffcc00` |
| Aurora | `#002211 → #006644 → #00cc88 → #88ffcc` |
| Crystal| `#e0f7fa → #80deea → #26c6da → #0097a7` |
| Plasma | `#1a0033 → #4a0080 → #00d4ff → #ff00ff` |

---

## 🚀 Next Steps

1. **Confirm tech stack** — Web (recommended) or Python?
2. **Create the folder structure** above
3. **Start Phase 1** — Basic Mandelbrot + zoom/pan
4. **Iterate** — Add colors and fractals as you go

Want to proceed with the Web stack and create the initial project files?
