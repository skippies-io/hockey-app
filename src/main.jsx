import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import "./styles/hj-tokens.css";
import './index.css'

import { TournamentProvider } from './context/TournamentContext'

// Handle client-side routing for GitHub Pages
if (window.location.search.startsWith('?/')) {
  const path = window.location.search.slice(2);
  window.history.replaceState(null, '', path);
}

console.warn("HJ build", import.meta.env.VITE_BUILD_ID);

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
//if ("serviceWorker" in navigator) {
//  window.addEventListener("load", () => {
//    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
//    navigator.serviceWorker.register(swUrl).catch((err) => {
//      console.warn("SW registration failed", err);
//    });
//  });
//}
