import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import "./styles/hj-tokens.css";
import './index.css'

import { TournamentProvider } from './context/TournamentContext'
import { initVitals } from './lib/vitals.js'
import { decodeGithubPagesRedirect } from './lib/githubPagesRoute.js'

// Handle client-side routing for GitHub Pages
const rewrittenPath = decodeGithubPagesRedirect(window.location.search, window.location.hash);
if (rewrittenPath !== null) {
  window.history.replaceState(null, '', rewrittenPath);
}

console.warn("HJ build", import.meta.env.VITE_BUILD_ID);
initVitals();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <TournamentProvider>
        <App />
      </TournamentProvider>
    </BrowserRouter>
  </React.StrictMode>
)
// Register service worker in production builds
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;

    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        // If there's already a waiting worker (e.g. user reopened the app), prompt immediately.
        if (reg.waiting) {
          const ok = window.confirm("Update available. Refresh now?");
          if (ok) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // When a new SW is installed and there's an existing controller,
            // it means an update is available for an already-open page.
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              const ok = window.confirm("Update available. Refresh now?");
              if (ok) newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        // When the new SW activates, reload exactly once so users get the fresh assets.
        let hasReloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (hasReloaded) return;
          hasReloaded = true;
          window.location.reload();
        });
      })
      .catch((err) => {
        console.warn("SW registration failed", err);
      });
  });
}
