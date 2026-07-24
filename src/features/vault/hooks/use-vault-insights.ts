import { useEffect, useState } from 'react'
import { buildVaultInsights, type VaultInsights } from '../../insights/insights.service'
import { listVaultItems, listVaultItemsCount } from '../vault.service'

interface UseVaultInsightsOptions {
  isUnlocked: boolean
  sessionKey: CryptoKey | null
  activeTab: string
  latestItemToken: string
}

export function useVaultInsights({
  isUnlocked,
  sessionKey,
  activeTab,
  latestItemToken,
}: UseVaultInsightsOptions) {
  const [insights, setInsights] = useState<VaultInsights | null>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [insightsRefreshToken, setInsightsRefreshToken] = useState(0)

  useEffect(() => {
    if (!isUnlocked || !sessionKey) {
      setInsights(null)
      setIsLoadingInsights(false)
      setInsightsError(null)
      return
    }

    if (activeTab !== 'insights') {
      return
    }

    let isCancelled = false

    const loadInsights = async () => {
      setIsLoadingInsights(true)
      setInsightsError(null)

      try {
        const totalCount = await listVaultItemsCount()
        const notes =
          totalCount > 0
            ? await listVaultItems(sessionKey, { limit: totalCount, offset: 0 })
            : []
        const nextInsights = buildVaultInsights(notes)

        if (!isCancelled) {
          setInsights(nextInsights)
        }
      } catch (error) {
        if (!isCancelled) {
          setInsights(null)
          setInsightsError(
            error instanceof Error ? error.message : 'Failed to generate local insights.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingInsights(false)
        }
      }
    }

    void loadInsights()

    return () => {
      isCancelled = true
    }
  }, [activeTab, insightsRefreshToken, isUnlocked, latestItemToken, sessionKey])

  const refreshInsights = () => {
    setInsightsRefreshToken((prev) => prev + 1)
  }

  return {
    insights,
    isLoadingInsights,
    insightsError,
    refreshInsights,
  }
}
