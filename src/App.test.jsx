import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { TournamentProvider } from './context/TournamentContext';

// Mock fetch
globalThis.fetch = vi.fn((url) => {
  if (url && url.includes('sheet=Announcements')) {
      return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
              ok: true, 
              rows: [{ Title: "Test News", Message: "Hello World" }] // No ID = Global
          }),
      });
  }
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

  it('renders announcements on overview', async () => {
    // Reset path
    window.history.pushState({}, 'Home', '/');
    
    // We need to ensure we have a tournament context that matches the announcement
     render(
      <BrowserRouter>
        <TournamentProvider>
           <App />
        </TournamentProvider>
      </BrowserRouter>
    );

    // Should find "Latest & Breaking" or "Test News"
    // Note: Tournament ID matching might fail if activeTournamentId is null/default. 
    // But our logic says if no ID in row, show global. Let's make the mock row have no ID for safety in this test.
    const news = await screen.findByText(/Test News/i);
    expect(news).toBeTruthy();
  });
});

