// Global browser-API stubs the app's rendering code assumes exist.
// jsdom has no real <canvas> 2D context and no meaningful layout, so we
// fake just enough of the Canvas API for the chart-drawing code to run
// without throwing; pixel output itself is not something these tests assert.
import { afterEach, beforeEach } from 'vitest';

function makeFakeCtx() {
  const store = {};
  return new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop];
      // Any unknown method call (fill, stroke, arc, fillText, ...) becomes a no-op.
      return function () {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
}

beforeEach(() => {
  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = () => makeFakeCtx();
  }

  // Drives animateProgress() to completion in two synchronous steps instead
  // of hanging forever waiting for real animation frames.
  let clock = 0;
  window.requestAnimationFrame = (cb) => {
    clock += 500;
    cb(clock);
    return clock;
  };
  window.cancelAnimationFrame = () => {};

  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
  }
});

afterEach(() => {
  localStorage.clear();
});
