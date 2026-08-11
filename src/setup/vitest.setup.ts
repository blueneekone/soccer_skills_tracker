import { vi } from 'vitest';

// Stub out canvas-confetti for JSDOM compliance
vi.mock('canvas-confetti', () => ({
  default: Object.assign(vi.fn(() => Promise.resolve()), {
    reset: vi.fn(),
    pause: vi.fn(),
  })
}));

// Mock requestAnimationFrame to avoid JSDOM errors with canvas animation loops
if (typeof globalThis !== 'undefined') {
  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0) as any;
  }
  if (!globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  }
}
