import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom lacks browser APIs that Radix and other UI primitives call. Stubbing them here means feature
// tests never need local stubs (a missing one used to break other tasks' tests after merging).
class ResizeObserverStub {
  observe = (): void => undefined;
  unobserve = (): void => undefined;
  disconnect = (): void => undefined;
}

if (!('ResizeObserver' in globalThis)) {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
}

if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}

Element.prototype.scrollIntoView ??= (): void => undefined;
Element.prototype.hasPointerCapture ??= (): boolean => false;
Element.prototype.releasePointerCapture ??= (): void => undefined;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
