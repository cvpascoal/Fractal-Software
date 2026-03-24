/**
 * Animation mode: animate palette offset or zoom
 */

let animId = null;
let motionId = null;

export function startPaletteAnimation(onTick, options = {}) {
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
  const fps = Math.max(1, options.fps || 24);
  const frameInterval = 1000 / fps;
  const speed = options.speed || 0.01;
  let t = 0;
  let last = 0;
  const tick = (now) => {
    if (last === 0 || now - last >= frameInterval) {
      t += speed;
      last = now;
    }
    onTick((t % 1));
    animId = requestAnimationFrame(tick);
  };
  animId = requestAnimationFrame(tick);
}

export function stopAnimation() {
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
  if (motionId) {
    cancelAnimationFrame(motionId);
    motionId = null;
  }
}

export function isAnimating() {
  return animId != null || motionId != null;
}

export function startMotionAnimation(onTick, options = {}) {
  if (motionId) {
    cancelAnimationFrame(motionId);
    motionId = null;
  }
  const fps = Math.max(1, options.fps || 30);
  const frameInterval = 1000 / fps;
  let startTime = 0;
  let last = 0;

  const tick = (now) => {
    if (!startTime) startTime = now;
    if (last === 0 || now - last >= frameInterval) {
      const t = (now - startTime) / 1000;
      onTick(t);
      last = now;
    }
    motionId = requestAnimationFrame(tick);
  };

  motionId = requestAnimationFrame(tick);
}
