import '@testing-library/jest-dom/vitest';

// jsdom lacks these; Recharts needs ResizeObserver
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.scrollTo = () => {};
