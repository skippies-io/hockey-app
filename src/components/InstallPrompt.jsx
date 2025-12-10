import React, { useEffect, useState, useCallback } from 'react'

/**
 * InstallPrompt
 * - Android/desktop Chrome/Edge: shows a button when `beforeinstallprompt` fires.
 * - iOS Safari: shows a hint (Share → Add to Home Screen).
 * - Remembers "Not now" per browser via localStorage.
 * - Added: 1s delay + fade/slide-in animation.
 */
export default function InstallPrompt() {
  const [supportsPrompt, setSupportsPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInStandalone, setIsInStandalone] = useState(false)
  const [ready, setReady] = useState(false) // delay before showing
  const [visible, setVisible] = useState(false) // controls fade/slide

  useEffect(() => {
    // 1s delay before showing (for fade-in)
    const timer = setTimeout(() => {
      setReady(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Detect iOS and standalone mode
    const ua = navigator.userAgent || ''
    const iOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(iOS)

    const standalone =
      matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true
    setIsInStandalone(standalone)

    setDismissed(localStorage.getItem('hj_install_dismissed') === '1')

    // beforeinstallprompt (Android/desktop)
    const onBIP = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setSupportsPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', onBIP)

    // Installed event
    const onInstalled = () => {
      setInstalled(true)
      setSupportsPrompt(false)
      setDeferredPrompt(null)
      localStorage.removeItem('hj_install_dismissed')
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome !== 'accepted') {
      localStorage.setItem('hj_install_dismissed', '1')
      setDismissed(true)
    }
    setDeferredPrompt(null)
    setSupportsPrompt(false)
  }, [deferredPrompt])

  const handleNotNow = useCallback(() => {
    localStorage.setItem('hj_install_dismissed', '1')
    setDismissed(true)
  }, [])

  useEffect(() => {
    if (!ready) {
      setVisible(false)
      return
    }

    const canShow =
      !installed &&
      !isInStandalone &&
      !dismissed &&
      ((isIOS && !supportsPrompt) || supportsPrompt)

    setVisible(canShow)
  }, [ready, installed, isInStandalone, dismissed, isIOS, supportsPrompt])

  // If already installed (standalone) or dismissed, render nothing
  if (installed || isInStandalone || dismissed) return null

  const animatedBarStyle = {
    ...barStyle,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, 12px)',
    transition: 'opacity 220ms ease-out, transform 220ms ease-out',
    pointerEvents: visible ? 'auto' : 'none',
  }

  // Nothing to show
  if (!supportsPrompt && !isIOS) return null

  // iOS hint
  if (isIOS && !supportsPrompt) {
    return (
      <div style={animatedBarStyle}>
        <span style={{ lineHeight: 1.4 }}>
          Add this app to your Home Screen:{' '}
          <strong>Share</strong> → <strong>Add to Home Screen</strong>
        </span>
        <button onClick={handleNotNow} style={ghostBtnStyle}>
          Got it
        </button>
      </div>
    )
  }

  // Android/desktop button
  if (supportsPrompt) {
    return (
      <div style={animatedBarStyle}>
        <span>Install the HJ app</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleNotNow} style={ghostBtnStyle}>
            Not now
          </button>
          <button onClick={handleInstallClick} style={primaryBtnStyle}>
            Install
          </button>
        </div>
      </div>
    )
  }

  return null
}

const barStyle = {
  position: 'fixed',
  bottom: 12,
  left: '50%',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'rgba(17,17,17,0.9)',
  color: 'white',
  padding: '10px 14px',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  maxWidth: '94%',
  // transform added dynamically for animation
}

const primaryBtnStyle = {
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
}

const ghostBtnStyle = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.35)',
  background: 'transparent',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 500,
}
