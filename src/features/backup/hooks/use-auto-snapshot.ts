import { useEffect, useRef } from 'react'
import { createBackupSnapshot } from '../backup.service'

interface UseAutoSnapshotParams {
  sessionKey: CryptoKey | null
  enabled: boolean
  changeToken: string
}

const AUTO_SNAPSHOT_DEBOUNCE_MS = 6000

export function useAutoSnapshot({
  sessionKey,
  enabled,
  changeToken,
}: UseAutoSnapshotParams) {
  const hasMountedRef = useRef(false)

  useEffect(() => {
    if (!sessionKey || !enabled || !changeToken) {
      return
    }

    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    const timer = window.setTimeout(() => {
      void createBackupSnapshot(sessionKey, 'auto')
    }, AUTO_SNAPSHOT_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [changeToken, enabled, sessionKey])
}
