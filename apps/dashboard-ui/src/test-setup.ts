import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock global fetch
global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ setupNeeded: false }),
    })
);

// Mock ResizeObserver (often needed for UI tests)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
