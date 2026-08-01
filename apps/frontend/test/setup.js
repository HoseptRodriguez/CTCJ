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
