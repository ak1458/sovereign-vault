import { useState } from 'react'

interface AuthScreenProps {
  title: string
  description: string
  actionLabel?: string
  error?: string | null
  isBusy?: boolean
  onAction?: () => void
  showKeypad?: boolean
}

export function AuthScreen({
  title,
  description,
  actionLabel,
  error,
  isBusy = false,
  onAction,
  showKeypad = true,
}: AuthScreenProps) {
  const [pinDepth, setPinDepth] = useState(0)

  const handlePinPress = () => {
    setPinDepth((value) => Math.min(4, value + 1))
  }

  const handlePinBackspace = () => {
    setPinDepth((value) => Math.max(0, value - 1))
  }

  return (
    <section className="flex h-full flex-col items-center justify-between px-6 pb-12 pt-14">
      <div className="w-full text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--vault-accent)] text-white shadow-lg">
          <span className="material-symbols-outlined text-4xl">shield_lock</span>
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--vault-subtext)]">{description}</p>
        {error && <p className="sv-status sv-status-error mx-auto mt-3 max-w-xs">{error}</p>}
      </div>

      {showKeypad ? (
        <div className="w-full">
          <div className="mb-6 flex justify-center gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                className={`h-3 w-3 rounded-full border border-[var(--vault-border)] ${
                  index < pinDepth ? 'bg-[var(--vault-accent)] shadow-[0_0_12px_var(--vault-accent)]' : ''
                }`}
                key={index}
              />
            ))}
          </div>

          <div className="sv-pin-grid">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((label) => (
              <button className="sv-pin-key" key={label} onClick={handlePinPress} type="button">
                {label}
              </button>
            ))}
            <button
              className="sv-pin-key border-none text-[var(--vault-accent)]"
              onClick={onAction}
              type="button"
            >
              <span className="material-symbols-outlined text-3xl">fingerprint</span>
            </button>
            <button className="sv-pin-key" onClick={handlePinPress} type="button">
              0
            </button>
            <button
              className="sv-pin-key border-none text-[var(--vault-subtext)]"
              onClick={handlePinBackspace}
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">backspace</span>
            </button>
          </div>

          {actionLabel && onAction && (
            <button
              className="sv-btn-primary mt-7 w-full py-3 text-sm"
              disabled={isBusy}
              onClick={onAction}
              type="button"
            >
              {isBusy ? `${actionLabel}...` : actionLabel}
            </button>
          )}
        </div>
      ) : (
        <div className="sv-card mt-6 w-full max-w-sm px-4 py-6 text-center">
          {actionLabel && onAction && (
            <button
              className="sv-btn-primary w-full py-3 text-sm"
              disabled={isBusy}
              onClick={onAction}
              type="button"
            >
              {isBusy ? `${actionLabel}...` : actionLabel}
            </button>
          )}
        </div>
      )}

      <button 
        className="sv-btn-ghost text-sm text-[var(--vault-subtext)] transition-colors hover:text-[var(--vault-text)]" 
        type="button"
        onClick={() => alert('To recover access, restore from a backup file in Settings > Restore Vault.')}
      >
        Forgot PIN?
      </button>
    </section>
  )
}
