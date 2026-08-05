import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// vitest.config.js uses `globals: false` (explicit imports everywhere,
// matching the backend's convention), so Testing Library's auto-cleanup
// -- which normally hooks the test framework's global afterEach -- doesn't
// register itself automatically. Do it explicitly here, once, for every
// component test in the app.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement IntersectionObserver, which framer-motion's
// `whileInView` (used by Section.jsx on every homepage section) needs at
// mount time. A no-op stub is enough -- tests don't scroll, they only need
// the component tree to mount without throwing.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = IntersectionObserverStub;

// jsdom also doesn't implement ResizeObserver, which Recharts' (Phase 11)
// ResponsiveContainer needs to measure its parent -- without a stub AND a
// non-zero getBoundingClientRect, ResponsiveContainer sees 0x0 and renders
// nothing at all, even in a real browser-backed component test.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;
Element.prototype.getBoundingClientRect = () => ({
  width: 600,
  height: 300,
  top: 0,
  left: 0,
  bottom: 300,
  right: 600,
  x: 0,
  y: 0,
  toJSON() {},
});
