import { useCallback, useEffect, useRef, useState } from 'react'
import { isPasskeySupported } from '../../../lib/passkey'
import {
  isPasskeyProtectionEnabled,
  setupPasskeyProtection,
  unlockVaultWithPasskey,
} from '../vault.service'

const AUTO_LOCK_TIMEOUT_MS = 3 * 60 * 1000
const DEV_MODE_KEY_STORAGE_KEY = 'sv_dev_mode'

type VaultSessionState =
  | 'checking'
  | 'locked'
  | 'unlocking'
  | 'setting-up'
  | 'unlocked'

interface UseVaultSessionResult {
  sessionKey: CryptoKey | null
  sessionState: VaultSessionState
  autoLockTimeoutMs: number
  passkeyConfigured: boolean
  passkeySupported: boolean
  lock: () => void
  setupPasskey: () => Promise<void>
  unlock: () => Promise<void>
  forceDevMode: () => Promise<CryptoKey>
}

async function generateDevModeKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export function useVaultSession(): UseVaultSessionResult {
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null)
  const [sessionState, setSessionState] = useState<VaultSessionState>('checking')
  const [passkeyConfigured, setPasskeyConfigured] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(true)
  const [isDevMode, setIsDevMode] = useState(false)
  const lockTimerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (lockTimerRef.current !== null) {
      window.clearTimeout(lockTimerRef.current)
      lockTimerRef.current = null
    }
  }, [])

  const lock = useCallback(() => {
    clearTimer()
    setSessionKey(null)
    setSessionState('locked')
  }, [clearTimer])

  const resetAutoLockTimer = useCallback(() => {
    if (!sessionKey) {
      return
    }

    clearTimer()
    lockTimerRef.current = window.setTimeout(() => {
      lock()
    }, AUTO_LOCK_TIMEOUT_MS)
  }, [clearTimer, lock, sessionKey])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      const supported = await isPasskeySupported()

      // Check for dev mode override
      const devModeEnabled = import.meta.env.DEV && localStorage.getItem(DEV_MODE_KEY_STORAGE_KEY) === 'enabled'

      if (devModeEnabled) {
        if (!isMounted) return
        setIsDevMode(true)
        setPasskeySupported(false)
        setPasskeyConfigured(true) // Pretend configured
        setSessionState('locked')
        return
      }

      const configured = supported ? await isPasskeyProtectionEnabled() : false

      if (!isMounted) {
        return
      }

      setPasskeySupported(supported)
      setPasskeyConfigured(configured)
      setSessionState('locked')
    }

    void initialize()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!sessionKey) {
      clearTimer()
      return
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'mousemove',
      'scroll',
      'touchstart',
    ]

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, resetAutoLockTimer, { passive: true })
    }

    resetAutoLockTimer()

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, resetAutoLockTimer)
      }
      clearTimer()
    }
  }, [clearTimer, resetAutoLockTimer, sessionKey])

  const setupPasskey = useCallback(async () => {
    if (sessionState === 'setting-up') {
      return
    }

    // Dev mode: create mock key
    if (import.meta.env.DEV && !passkeySupported) {
      setSessionState('setting-up')
      try {
        const key = await generateDevModeKey()
        localStorage.setItem(DEV_MODE_KEY_STORAGE_KEY, 'enabled')
        setIsDevMode(true)
        setPasskeyConfigured(true)
        setSessionKey(key)
        setSessionState('unlocked')
        return
      } catch (error) {
        setSessionKey(null)
        setSessionState('locked')
        throw error
      }
    }

    if (!passkeySupported) {
      return
    }

    setSessionState('setting-up')

    try {
      const key = await setupPasskeyProtection()
      setPasskeyConfigured(true)
      setSessionKey(key)
      setSessionState('unlocked')
    } catch (error) {
      setSessionKey(null)
      setSessionState('locked')
      throw error
    }
  }, [passkeySupported, sessionState])

  const unlock = useCallback(async () => {
    if (
      !passkeyConfigured ||
      sessionState === 'unlocking' ||
      sessionState === 'setting-up'
    ) {
      return
    }

    // Dev mode: create new mock key
    if (isDevMode) {
      setSessionState('unlocking')
      try {
        const key = await generateDevModeKey()
        setSessionKey(key)
        setSessionState('unlocked')
        return
      } catch (error) {
        setSessionKey(null)
        setSessionState('locked')
        throw error
      }
    }

    if (!passkeySupported) {
      return
    }

    setSessionState('unlocking')

    try {
      const key = await unlockVaultWithPasskey()
      setSessionKey(key)
      setSessionState('unlocked')
    } catch (error) {
      setSessionKey(null)
      setSessionState('locked')
      throw error
    }
  }, [isDevMode, passkeyConfigured, passkeySupported, sessionState])

  const forceDevMode = useCallback(async () => {
    if (sessionState === 'setting-up' || sessionState === 'unlocked') {
      throw new Error('Session is already active or setting up')
    }

    setSessionState('setting-up')
    try {
      const key = await generateDevModeKey()
      localStorage.setItem(DEV_MODE_KEY_STORAGE_KEY, 'enabled')
      setIsDevMode(true)
      setPasskeyConfigured(true)
      setPasskeySupported(false)
      setSessionKey(key)
      setSessionState('unlocked')
      return key
    } catch (error) {
      setSessionKey(null)
      setSessionState('locked')
      throw error
    }
  }, [sessionState])

  return {
    sessionKey,
    sessionState,
    autoLockTimeoutMs: AUTO_LOCK_TIMEOUT_MS,
    passkeyConfigured,
    passkeySupported,
    lock,
    setupPasskey,
    unlock,
    forceDevMode,
  }
}
