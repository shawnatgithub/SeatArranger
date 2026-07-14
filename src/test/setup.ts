import '@testing-library/jest-dom/vitest';

// antd 依赖 matchMedia 判定响应式断点，jsdom 不实现，需 polyfill
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}

// ResizeObserver polyfill（antd Steps / rc-motion 使用）
if (typeof window !== 'undefined' && !(window as unknown as { ResizeObserver?: unknown }).ResizeObserver) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
import '@testing-library/jest-dom/vitest';
