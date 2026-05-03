import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Minimal SW-ish globals
function makeCache() {
  return {
    add: vi.fn(async () => {}),
    put: vi.fn(async () => {}),
  }
}

describe('public/sw.js', () => {
  let listeners

  beforeEach(() => {
    listeners = {}

    // Capture event listeners registered by the SW module
    vi.stubGlobal('self', {
      registration: { scope: 'https://example.com/hockey-app/' },
      addEventListener: (type, cb) => { listeners[type] = cb },
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn(async () => {}) },
    })

    const cache = makeCache()

    vi.stubGlobal('caches', {
      open: vi.fn(async () => cache),
      match: vi.fn(async () => null),
      keys: vi.fn(async () => []),
      delete: vi.fn(async () => true),
    })

    // needed for fetch handler URL parsing
    vi.stubGlobal('location', { origin: 'https://example.com' })

    // Import SW after globals are ready
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('handles SKIP_WAITING message by calling self.skipWaiting()', async () => {
    const client = { url: 'https://example.com/hockey-app/' }

    // Make clients.get resolve a valid same-origin client
    self.clients.get = vi.fn(async () => client)

    await import('./sw.js')

    expect(typeof listeners.message).toBe('function')

    const waitUntil = vi.fn((p) => p)
    listeners.message({ data: { type: 'SKIP_WAITING' }, source: { id: 'c1' }, waitUntil })

    // let the async waitUntil chain resolve
    await new Promise((r) => setTimeout(r, 0))

    expect(waitUntil).toHaveBeenCalledTimes(1)
    expect(self.skipWaiting).toHaveBeenCalledTimes(1)
  })

  it('registers install handler', async () => {
    await import('./sw.js')
    expect(typeof listeners.install).toBe('function')
  })
})
