import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { TournamentProvider } from './context/TournamentContext';

// Mock fetch
globalThis.fetch = vi.fn(() => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
  })
});

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});



describe('App Smoke Test', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <TournamentProvider>
          <App />
        </TournamentProvider>
      </BrowserRouter>
    );
    expect(document.body).toBeTruthy();
  });

  it('renders franchises route', async () => {
    // We need to render at /franchises
    window.history.pushState({}, 'Franchises', '/franchises');
    
    render(
      <BrowserRouter>
        <TournamentProvider>
          <App />
        </TournamentProvider>
      </BrowserRouter>
    );
     // Use screen.findByText because api fetch is async
    const heading = await screen.findByText(/Franchise Directory/i);
    expect(heading).toBeTruthy();
  });


});

