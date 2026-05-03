import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

async function importMain() {
  vi.resetModules()
  return import('./main.jsx')
}

describe('src/main.jsx', () => {
  let originalConfirm
  let reg
  let sw
  let loadHandlers

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('confirm', vi.fn(() => false))
    originalConfirm = window.confirm

    vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: vi.fn() }) }))
    vi.mock('./lib/vitals.js', () => ({ initVitals: vi.fn() }))
    vi.mock('./lib/githubPagesRoute.js', () => ({ decodeGithubPagesRedirect: vi.fn(() => null) }))
    vi.mock('./App.jsx', () => ({ default: () => null }))
    vi.mock('./context/TournamentContext', () => ({ TournamentProvider: ({ children }) => children }))

    loadHandlers = []
    vi.stubGlobal('addEventListener', vi.fn((evt, cb) => {
      if (evt === 'load') loadHandlers.push(cb)
    }))

    reg = { waiting: null, installing: null, addEventListener: vi.fn() }
    sw = { register: vi.fn(async () => reg), controller: null, addEventListener: vi.fn() }

    Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })
  })

  afterEach(() => {
    window.confirm = originalConfirm
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  async function boot() {
    await importMain()
    loadHandlers.forEach((cb) => cb())
    await Promise.resolve()
  }

  it('registers the service worker on load', async () => {
    await boot()
    expect(sw.register).toHaveBeenCalledTimes(1)
    expect(String(sw.register.mock.calls[0][0])).toContain('sw.js')
  })

  it('prompts and posts SKIP_WAITING when waiting worker exists and user confirms', async () => {
    const waiting = { postMessage: vi.fn() }
    reg.waiting = waiting
    vi.stubGlobal('confirm', vi.fn(() => true))
    await boot()
    expect(window.confirm).toHaveBeenCalledTimes(1)
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  it('does not post SKIP_WAITING when user dismisses the prompt', async () => {
    reg.waiting = { postMessage: vi.fn() }
    vi.stubGlobal('confirm', vi.fn(() => false))
    await boot()
    expect(reg.waiting.postMessage).not.toHaveBeenCalled()
  })

  it('posts SKIP_WAITING via updatefound → statechange when controller exists', async () => {
    const newWorker = { state: 'installing', addEventListener: vi.fn(), postMessage: vi.fn() }
    reg.installing = newWorker
    sw.controller = {}
    let updateFoundCb
    reg.addEventListener.mockImplementation((evt, cb) => {
      if (evt === 'updatefound') updateFoundCb = cb
    })
    vi.stubGlobal('confirm', vi.fn(() => true))

    await boot()
    updateFoundCb()

    const stateChangeCb = newWorker.addEventListener.mock.calls.find(([e]) => e === 'statechange')?.[1]
    newWorker.state = 'installed'
    stateChangeCb()

    expect(window.confirm).toHaveBeenCalledTimes(1)
    expect(newWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  it('skips prompt on statechange to installed when no controller', async () => {
    const newWorker = { state: 'installing', addEventListener: vi.fn(), postMessage: vi.fn() }
    reg.installing = newWorker
    sw.controller = null
    let updateFoundCb
    reg.addEventListener.mockImplementation((evt, cb) => {
      if (evt === 'updatefound') updateFoundCb = cb
    })

    await boot()
    updateFoundCb()

    const stateChangeCb = newWorker.addEventListener.mock.calls.find(([e]) => e === 'statechange')?.[1]
    newWorker.state = 'installed'
    stateChangeCb()

    expect(window.confirm).not.toHaveBeenCalled()
    expect(newWorker.postMessage).not.toHaveBeenCalled()
  })

  it('skips prompt on statechange to non-installed state', async () => {
    const newWorker = { state: 'installing', addEventListener: vi.fn(), postMessage: vi.fn() }
    reg.installing = newWorker
    sw.controller = {}
    let updateFoundCb
    reg.addEventListener.mockImplementation((evt, cb) => {
      if (evt === 'updatefound') updateFoundCb = cb
    })

    await boot()
    updateFoundCb()

    const stateChangeCb = newWorker.addEventListener.mock.calls.find(([e]) => e === 'statechange')?.[1]
    newWorker.state = 'activating'
    stateChangeCb()

    expect(window.confirm).not.toHaveBeenCalled()
  })

  it('reloads once on controllerchange (hasReloaded guard)', async () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', { value: { reload: reloadMock }, configurable: true })
    let controllerChangeCb
    sw.addEventListener.mockImplementation((evt, cb) => {
      if (evt === 'controllerchange') controllerChangeCb = cb
    })

    await boot()
    controllerChangeCb()
    controllerChangeCb()

    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('warns on SW registration failure', async () => {
    sw.register.mockRejectedValue(new Error('registration failed'))
    await boot()
    await Promise.resolve()
    expect(console.warn).toHaveBeenCalledWith('SW registration failed', expect.any(Error))
  })

  it('does nothing when updatefound fires but installing is null', async () => {
    reg.installing = null
    let updateFoundCb
    reg.addEventListener.mockImplementation((evt, cb) => {
      if (evt === 'updatefound') updateFoundCb = cb
    })

    await boot()
    updateFoundCb()

    expect(window.confirm).not.toHaveBeenCalled()
  })
})
