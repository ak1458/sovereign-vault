import { useEffect, useRef, useState } from 'react'
import { triggerHapticFeedback } from '../../core/utils/haptics'

interface AuthScreenProps {
  title: string
  description: string
  actionLabel?: string
  error?: string | null
  isBusy?: boolean
  onAction?: () => void
  onPinSubmit?: (pin: string) => void
  onPasskeyClick?: () => void
  showKeypad?: boolean
  mode?: 'setup' | 'unlock'
}

const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5

export function AuthScreen({
  title,
  description,
  actionLabel,
  error,
  isBusy = false,
  onAction,
  onPinSubmit,
  onPasskeyClick,
  showKeypad = true,
}: AuthScreenProps) {
  const [pin, setPin] = useState('')
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState(0)
  const attemptsRef = useRef(0)
  const prevErrorRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      attemptsRef.current += 1
      void triggerHapticFeedback('error')
      setPin('')
      if (attemptsRef.current >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
        const backoffSec = Math.min(
          Math.pow(2, attemptsRef.current - MAX_ATTEMPTS_BEFORE_LOCKOUT + 1) * 5,
          60,
        )
        setLockoutRemainingSec(backoffSec)
      }
    }
    prevErrorRef.current = error
  }, [error])

  useEffect(() => {
    if (lockoutRemainingSec <= 0) {
      return
    }

    const timer = setInterval(() => {
      setLockoutRemainingSec((sec) => Math.max(0, sec - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [lockoutRemainingSec])

  const isLockedOut = lockoutRemainingSec > 0

  const handleDigitPress = (digit: string) => {
    if (isLockedOut || isBusy) {
      return
    }
    void triggerHapticFeedback('light')
    
    setPin((prev) => {
      if (prev.length >= 6) return prev
      const nextPin = prev + digit
      if (nextPin.length === 4 && onPinSubmit) {
        setTimeout(() => onPinSubmit(nextPin), 50)
      }
      return nextPin
    })
  }

  const handleBackspace = () => {
    if (isLockedOut || isBusy) {
      return
    }
    void triggerHapticFeedback('light')
    setPin((prev) => prev.slice(0, -1))
  }

  const handleActionClick = () => {
    if (isLockedOut || isBusy) {
      return
    }
    void triggerHapticFeedback('medium')
    if (pin.length >= 4 && onPinSubmit) {
      onPinSubmit(pin)
    } else if (onPasskeyClick) {
      onPasskeyClick()
    } else {
      onAction?.()
    }
  }

  return (
    <section className="flex h-full flex-col items-center justify-between px-6 pb-8 pt-10">
      <div className="w-full text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--vault-accent)] text-white shadow-lg">
          <span className="material-symbols-outlined text-4xl">shield_lock</span>
        </div>
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-1 max-w-xs text-xs text-[var(--vault-subtext)]">{description}</p>

        {isLockedOut ? (
          <p className="sv-status sv-status-error mx-auto mt-3 max-w-xs">
            Too many failed attempts. Locked for {lockoutRemainingSec}s.
          </p>
        ) : (
          error && <p className="sv-status sv-status-error mx-auto mt-3 max-w-xs">{error}</p>
        )}
      </div>

      {showKeypad ? (
        <div className="w-full max-w-xs mx-auto">
          <div className="mb-6 flex justify-center gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                className={`h-3.5 w-3.5 rounded-full border border-[var(--vault-border)] transition-all duration-200 ${
                  index < pin.length ? 'bg-[var(--vault-accent)] scale-110 shadow-[0_0_12px_var(--vault-accent)]' : 'bg-transparent'
                }`}
                key={index}
              />
            ))}
          </div>

          <div className="sv-pin-grid">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                className="sv-pin-key hover:bg-white/20 active:scale-95 transition-all"
                disabled={isLockedOut || isBusy}
                key={digit}
                onClick={() => handleDigitPress(digit)}
                type="button"
              >
                {digit}
              </button>
            ))}
            <button
              className="sv-pin-key border-none text-[var(--vault-accent)] disabled:opacity-50 hover:bg-white/10 active:scale-95 transition-all"
              disabled={isLockedOut || isBusy}
              onClick={() => onPasskeyClick ? onPasskeyClick() : handleActionClick()}
              title="Use Passkey / Biometrics"
              type="button"
            >
              <span className="material-symbols-outlined text-3xl">fingerprint</span>
            </button>
            <button
              className="sv-pin-key hover:bg-white/20 active:scale-95 transition-all"
              disabled={isLockedOut || isBusy}
              onClick={() => handleDigitPress('0')}
              type="button"
            >
              0
            </button>
            <button
              className="sv-pin-key border-none text-[var(--vault-subtext)] disabled:opacity-50 hover:bg-white/10 active:scale-95 transition-all"
              disabled={isLockedOut || isBusy || pin.length === 0}
              onClick={handleBackspace}
              title="Backspace"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">backspace</span>
            </button>
          </div>

          {actionLabel && (
            <button
              className="sv-btn-primary mt-6 w-full py-3 text-sm disabled:opacity-50"
              disabled={isBusy || isLockedOut}
              onClick={handleActionClick}
              type="button"
            >
              {isBusy ? `${actionLabel}...` : actionLabel}
            </button>
          )}
        </div>
      ) : (
        <div className="sv-card mt-6 w-full max-w-sm px-4 py-6 text-center">
          {actionLabel && (
            <button
              className="sv-btn-primary w-full py-3 text-sm disabled:opacity-50"
              disabled={isBusy || isLockedOut}
              onClick={handleActionClick}
              type="button"
            >
              {isBusy ? `${actionLabel}...` : actionLabel}
            </button>
          )}
        </div>
      )}

      <button
        className="sv-btn-ghost text-xs text-[var(--vault-subtext)] transition-colors hover:text-[var(--vault-text)] mt-4"
        type="button"
        onClick={() => alert('To recover access to your local encrypted vault, restore from a verified JSON/Encrypted backup file in Settings.')}
      >
        Forgot PIN / Passkey?
      </button>
    </section>
  )
}
