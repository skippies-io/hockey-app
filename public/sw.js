// public/sw.js
// HJ Indoor — service worker (drop-in)
// Update VERSION to force clients to take the new SW after deploys.
const VERSION   = 'v1.0.0';
const CACHE_NAME = `hj-cache-${VERSION}`;

// Derive the site base (works on GH Pages subpaths like /hockey-app/)
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/+$/, '') + '/';

// Core files to precache (add more if you want)
const PRECACHE = [
  BASE_PATH,                         // e.g. /hockey-app/
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.webmanifest',
  BASE_PATH + 'hj_logo.jpg',
  BASE_PATH + 'favicon.ico'
];

// ----- INSTALL: pre-cache core -----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ----- ACTIVATE: clean old caches -----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Helper: network-first with cache fallback + background fill
async function networkFirst(req) {
  try {
    const res = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    // Clone & store only successful GETs
    if (req.method === 'GET' && res && res.ok) {
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    // As a last resort, SPA fallback for navigations
    if (req.mode === 'navigate') {
      return caches.match(BASE_PATH + 'index.html');
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Helper: cache-first for immutable/versioned assets (e.g. /assets/*.js)
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  const cache = await caches.open(CACHE_NAME);
  if (req.method === 'GET' && res && res.ok) {
    cache.put(req, res.clone());
  }
  return res;
}

// ----- FETCH: smart routing -----
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Cache-first for hashed/static assets under /assets/
  if (url.pathname.startsWith(BASE_PATH + 'assets/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // For everything else (API calls, pages, images), use network-first
  event.respondWith(networkFirst(req));
});