import '@testing-library/jest-dom/vitest';

process.env.VITEST = '1';
process.env.NODE_ENV = 'test';

if (typeof globalThis.localStorage?.getItem !== 'function') {
  class StorageMock {
    constructor() {
      this._store = new Map();
    }

    get length() {
      return this._store.size;
    }

    key(index) {
      return Array.from(this._store.keys())[index] ?? null;
    }

    getItem(key) {
      return this._store.has(key) ? this._store.get(key) : null;
    }

    setItem(key, value) {
      this._store.set(key, String(value));
    }

    removeItem(key) {
      this._store.delete(key);
    }

    clear() {
      this._store.clear();
    }
  }

  if (!globalThis.Storage) {
    globalThis.Storage = StorageMock;
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: new StorageMock(),
    configurable: true,
    writable: true,
  });

  Object.defineProperty(globalThis, 'sessionStorage', {
    value: new StorageMock(),
    configurable: true,
    writable: true,
  });
}
