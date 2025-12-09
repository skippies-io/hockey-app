import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { HashRouter } from 'react-router-dom'
import "./styles/hj-tokens.css";
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
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
