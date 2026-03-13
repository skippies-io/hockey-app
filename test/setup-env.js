process.env.VITEST = '1';
process.env.NODE_ENV = 'test';

// Node.js 25 provides a built-in `localStorage` stub that requires --localstorage-file
// to be set with a valid path. Without it, localStorage.clear (and other methods) are
// undefined. Polyfill with a working in-memory implementation when needed.
if (typeof localStorage !== 'undefined' && typeof localStorage.clear !== 'function') {
  const _store = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k) => _store.has(String(k)) ? _store.get(String(k)) : null,
      setItem: (k, v) => _store.set(String(k), String(v)),
      removeItem: (k) => _store.delete(String(k)),
      clear: () => _store.clear(),
      get length() { return _store.size; },
      key: (i) => [..._store.keys()][i] ?? null,
    },
    writable: true,
    configurable: true,
  });
}
