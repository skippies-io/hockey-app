import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

    vi.stubGlobal('location', { origin: 'https://example.com' })

    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('registers install and message handlers', async () => {
    await import('./sw.js')
    expect(typeof listeners.install).toBe('function')
    expect(typeof listeners.message).toBe('function')
  })

  it('calls skipWaiting for SKIP_WAITING from same-origin client', async () => {
    await import('./sw.js')
    listeners.message({ origin: 'https://example.com', data: { type: 'SKIP_WAITING' } })
    expect(self.skipWaiting).toHaveBeenCalledTimes(1)
  })

  it('ignores messages from a different origin', async () => {
    await import('./sw.js')
    listeners.message({ origin: 'https://evil.com', data: { type: 'SKIP_WAITING' } })
    expect(self.skipWaiting).not.toHaveBeenCalled()
  })

  it('ignores messages with no origin', async () => {
    await import('./sw.js')
    listeners.message({ origin: '', data: { type: 'SKIP_WAITING' } })
    expect(self.skipWaiting).not.toHaveBeenCalled()
  })

  it('ignores messages with unknown type from same origin', async () => {
    await import('./sw.js')
    listeners.message({ origin: 'https://example.com', data: { type: 'SOMETHING_ELSE' } })
    expect(self.skipWaiting).not.toHaveBeenCalled()
  })

  it('ignores messages with no data', async () => {
    await import('./sw.js')
    listeners.message({ origin: 'https://example.com', data: null })
    expect(self.skipWaiting).not.toHaveBeenCalled()
  })
})
