// ----- bump to force update -----
const VERSION = 'v1.0.6'
const CACHE_NAME = `hj-cache-${VERSION}`

// Derive base path from the SW scope so it works on GitHub Pages subpath
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/+$/, '') + '/'

// Precache ONLY files that truly exist in /public on prod
const PRECACHE = [
  BASE_PATH,                          // e.g. /hockey-app/
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.webmanifest',
  BASE_PATH + 'HJ_icon_192.png',      // ← adjust if your actual file differs
  BASE_PATH + 'HJ_icon_512.png'       // ← adjust if your actual file differs
  // If (and only if) you have these files in public, you may add them:
  // BASE_PATH + 'hj_ico.png',
  // BASE_PATH + 'hj_logo.png'
]

// ----- INSTALL -----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(PRECACHE.map((url) => cache.add(url)))
      const failed = results
        .map((r, i) => ({ r, url: PRECACHE[i] }))
        .filter((x) => x.r.status === 'rejected')
      if (failed.length) {
        console.warn('[SW] Some precache requests failed:', failed.map((f) => f.url))
      }
    })
  )
})

// Allow the page to tell the waiting SW to activate immediately.
// Security hardening (Sonar): verify the origin of the received message.
self.addEventListener('message', (event) => {
  // Only accept messages coming from a controlled client of THIS service worker.
  // This prevents unrelated pages from calling skipWaiting via postMessage.
  try {
    if (!event || !event.source) return;
  } catch {
    return;
  }

  // event.source can be a Client or MessagePort. Ensure it's a Client we can resolve.
  if (!('id' in event.source)) return;

  event.waitUntil(
    self.clients.get(event.source.id).then((client) => {
      if (!client) return;
      const scopeOrigin = new URL(self.registration.scope).origin;
      const clientOrigin = new URL(client.url).origin;
      if (clientOrigin !== scopeOrigin) return;

      if (event?.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
      }
    })
  );
});

// ----- ACTIVATE -----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ----- FETCH (cache-first for same-origin GET) -----
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit
      return fetch(req).then((resp) => {
        const copy = resp.clone()
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {})
        return resp
      }).catch(() => hit)
    })
  )
})
