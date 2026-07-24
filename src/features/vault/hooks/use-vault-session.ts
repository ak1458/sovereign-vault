import { useCallback, useEffect, useRef, useState } from 'react'
import { isPasskeySupported } from '../../../lib/passkey'
import {
  getVaultAuthMode,
  isVaultProtectionEnabled,
  setupPasskeyProtection,
  setupPinProtection,
  unlockVaultWithPasskey,
  unlockVaultWithPin,
} from '../vault.service'

const AUTO_LOCK_TIMEOUT_MS = 3 * 60 * 1000

export type VaultSessionState =
  | 'checking'
  | 'locked'
  | 'unlocking'
  | 'setting-up'
  | 'unlocked'

export interface UseVaultSessionResult {
  sessionKey: CryptoKey | null
  sessionState: VaultSessionState
  autoLockTimeoutMs: number
  authConfigured: boolean
  authMode: 'passkey' | 'pin' | 'none'
  passkeySupported: boolean
  lock: () => void
  setupPasskey: () => Promise<void>
  setupPin: (pin: string) => Promise<void>
  unlockPasskey: () => Promise<void>
  unlockPin: (pin: string) => Promise<void>
  // Backward compatibility alias methods
  passkeyConfigured: boolean
  unlock: (pin?: string) => Promise<void>
  forceDevMode: () => Promise<CryptoKey>
}

export function useVaultSession(): UseVaultSessionResult {
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null)
  const [sessionState, setSessionState] = useState<VaultSessionState>('checking')
  const [authConfigured, setAuthConfigured] = useState(false)
  const [authMode, setAuthMode] = useState<'passkey' | 'pin' | 'none'>('none')
  const [passkeySupported, setPasskeySupported] = useState(true)
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

  const checkAuthStatus = useCallback(async () => {
    try {
      const supported = await isPasskeySupported()
      const configured = await isVaultProtectionEnabled()
      const mode = await getVaultAuthMode()

      setPasskeySupported(supported)
      setAuthConfigured(configured)
      setAuthMode(mode)
      setSessionState('locked')
    } catch {
      setSessionState('locked')
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      await checkAuthStatus()
      if (!isMounted) return
    }

    void initialize()

    return () => {
      isMounted = false
    }
  }, [checkAuthStatus])

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

    setSessionState('setting-up')

    try {
      const key = await setupPasskeyProtection()
      setAuthConfigured(true)
      setAuthMode('passkey')
      setSessionKey(key)
      setSessionState('unlocked')
    } catch (error) {
      setSessionKey(null)
      setSessionState('locked')
      throw error
    }
  }, [sessionState])

  const setupPin = useCallback(async (pin: string) => {
    if (sessionState === 'setting-up') {
      return
    }

    setSessionState('setting-up')

    try {
      const key = await setupPinProtection(pin)
      setAuthConfigured(true)
      setAuthMode('pin')
      setSessionKey(key)
      setSessionState('unlocked')
    } catch (error) {
      setSessionKey(null)
      setSessionState('locked')
      throw error
    }
  }, [sessionState])

  const unlockPasskey = useCallback(async () => {
    if (sessionState === 'unlocking' || sessionState === 'setting-up') {
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
  }, [sessionState])

  const unlockPin = useCallback(async (pin: string) => {
    if (sessionState === 'unlocking' || sessionState === 'setting-up') {
      return
    }

    setSessionState('unlocking')

    try {
      const key = await unlockVaultWithPin(pin)
      setSessionKey(key)
      setSessionState('unlocked')
    } catch (error) {
      setSessionKey(null)
      setSessionState('locked')
      throw error
    }
  }, [sessionState])

  const unlock = useCallback(async (pin?: string) => {
    if (pin) {
      await unlockPin(pin)
    } else {
      await unlockPasskey()
    }
  }, [unlockPasskey, unlockPin])

  const forceDevMode = useCallback(async () => {
    // Legacy fallback: sets up PIN "0000" cleanly with real encryption
    return setupPinProtection('0000').then((key) => {
      setAuthConfigured(true)
      setAuthMode('pin')
      setSessionKey(key)
      setSessionState('unlocked')
      return key
    })
  }, [])

  return {
    sessionKey,
    sessionState,
    autoLockTimeoutMs: AUTO_LOCK_TIMEOUT_MS,
    authConfigured,
    authMode,
    passkeySupported,
    lock,
    setupPasskey,
    setupPin,
    unlockPasskey,
    unlockPin,
    // Aliases
    passkeyConfigured: authConfigured,
    unlock,
    forceDevMode,
  }
}
