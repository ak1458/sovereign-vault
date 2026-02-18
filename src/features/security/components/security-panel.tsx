import { useState } from 'react'
import { usePwaInstall } from '../../pwa/use-pwa-install'

interface SecurityPanelProps {
  passkeyConfigured: boolean
  autoLockMinutes: number
}

export function SecurityPanel({
  passkeyConfigured,
  autoLockMinutes,
}: SecurityPanelProps) {
  const { canInstall, install, isInstalled } = usePwaInstall()
  const [installResult, setInstallResult] = useState<string | null>(null)

  const handleInstall = async () => {
    setInstallResult(null)
    const outcome = await install()

    if (outcome === 'accepted') {
      setInstallResult('App installed successfully.')
      return
    }

    if (outcome === 'dismissed') {
      setInstallResult('Install prompt dismissed.')
      return
    }

    setInstallResult('Install prompt unavailable in this browser context.')
  }

  return (
    <section className="glass-card flex h-full flex-col p-4">
      <h2 className="text-lg font-semibold tracking-tight text-sv-text">
        Security & Device
      </h2>
      <p className="mt-2 text-sm text-sv-subtext">
        Review vault protection and install status for offline app behavior.
      </p>

      <div className="mt-4 rounded-xl border border-sv-border/70 bg-black/20 p-3 text-sm text-sv-text">
        <p>Passkey: {passkeyConfigured ? 'Configured' : 'Not configured'}</p>
        <p className="mt-1">Auto-lock: {autoLockMinutes} minute inactivity window</p>
        <p className="mt-1">Install mode: {isInstalled ? 'Standalone' : 'Browser tab'}</p>
      </div>

      <button
        className="primary-button mt-4"
        disabled={!canInstall}
        onClick={handleInstall}
        type="button"
      >
        Install App
      </button>

      {installResult && (
        <p className="mt-3 rounded-xl border border-sv-border/70 bg-black/20 px-3 py-2 text-sm text-sv-subtext">
          {installResult}
        </p>
      )}

      <div className="mt-4 rounded-xl border border-sv-danger/35 bg-sv-danger/12 p-3 text-xs text-sv-danger">
        If passkey, device, and backup are all lost, vault recovery is impossible.
      </div>
    </section>
  )
}
