import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Helper: import main.jsx with fresh module state each time
async function importMain() {
  vi.resetModules()
  return import('./main.jsx')
}

describe('src/main.jsx', () => {
  let originalConfirm

  beforeEach(() => {
    // JSDOM root
    document.body.innerHTML = '<div id="root"></div>'

    // Silence console noise
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Avoid real router side effects
    vi.stubGlobal('confirm', vi.fn(() => false))
    originalConfirm = window.confirm

    // react-dom/client createRoot mock
    vi.mock('react-dom/client', () => {
      return {
        createRoot: () => ({ render: vi.fn() }),
      }
    })

    // Mock modules used for side effects
    vi.mock('./lib/vitals.js', () => ({ initVitals: vi.fn() }))
    vi.mock('./lib/githubPagesRoute.js', () => ({ decodeGithubPagesRedirect: vi.fn(() => null) }))
    vi.mock('./App.jsx', () => ({ default: () => null }))
    vi.mock('./context/TournamentContext', () => ({ TournamentProvider: ({ children }) => children }))

    // serviceWorker setup
    const addEventListener = vi.fn((evt, cb) => {
      if (evt === 'load') {
        // trigger immediately
        cb()
      }
    })
    vi.stubGlobal('addEventListener', addEventListener)

    const reg = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
    }

    const sw = {
      register: vi.fn(async () => reg),
      controller: null,
      addEventListener: vi.fn(),
    }

    Object.defineProperty(navigator, 'serviceWorker', {
      value: sw,
      configurable: true,
    })
  })

  afterEach(() => {
    window.confirm = originalConfirm
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('registers the service worker on load', async () => {
    await importMain()
    expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1)
    expect(String(navigator.serviceWorker.register.mock.calls[0][0])).toContain('sw.js')
  })
})
