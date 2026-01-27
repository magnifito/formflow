
import { render } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import App from './app';

vi.mock('./routes', () => ({
    router: {},
}));

vi.mock('react-router-dom', () => ({
    RouterProvider: () => <div>Router Content</div>,
}));

vi.mock('./hooks/useOrganizationContext', () => ({
    OrganizationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('App', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<App />);
        expect(baseElement).toBeTruthy();
    });

    it('should render router content', () => {
        const { getByText } = render(<App />);
        expect(getByText('Router Content')).toBeTruthy();
    });
});
