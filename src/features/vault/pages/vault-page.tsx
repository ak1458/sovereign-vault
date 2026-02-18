import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactElement } from 'react'
import type { VaultCategory } from '../../../core/vault-category'
import { db } from '../../../lib/db'
import { useDebouncedValue } from '../../../lib/use-debounced-value'
import { aiService } from '../../ai/ai.service'
import { loadAiSettings, persistAiSettings, type AiSettings } from '../../ai/ai-settings'
import {
  createBackupSnapshot,
  exportEncryptedVaultBackup,
  importEncryptedVaultBackup,
  listBackupSnapshots,
  restoreBackupSnapshot,
  type BackupSnapshotSummary,
} from '../../backup/backup.service'
import { loadBackupSettings, persistBackupSettings } from '../../backup/backup-settings'
import { useAutoSnapshot } from '../../backup/hooks/use-auto-snapshot'
import { InsightsPanel } from '../../insights/components/insights-panel'
import { buildVaultInsights, type VaultInsights } from '../../insights/insights.service'
import { usePwaInstall } from '../../pwa/use-pwa-install'
import { AuthScreen } from '../components/auth-screen'
import { HomePanel } from '../components/home-panel'
import { NoteEditor } from '../components/note-editor'
import { NoteList } from '../components/note-list'
import { SettingsPanel } from '../components/settings-panel'
import { useVaultSession } from '../hooks/use-vault-session'
import type { VaultItem, VaultItemDraft } from '../types'
import {
  buildVaultEmbeddingText,
  createVaultItem,
  deleteVaultItem,
  listVaultItems,
  listVaultItemsCount,
  rebuildVaultEmbeddings,
  searchVaultItemIdsByEmbedding,
  updateVaultItem,
} from '../vault.service'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 220

type ThemeMode = 'light' | 'dark'
type AppTab = 'home' | 'search' | 'insights' | 'settings'

const APP_TABS: Array<{ id: AppTab; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'insights', label: 'Insights', icon: 'analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

const filterByText = (notes: VaultItem[], query: string): VaultItem[] => {
  const normalized = query.trim().toLowerCase()

  if (normalized.length === 0) {
    return notes
  }

  return notes.filter((note) => {
    return (
      note.category.toLowerCase().includes(normalized) ||
      note.title.toLowerCase().includes(normalized) ||
      note.content.toLowerCase().includes(normalized) ||
      note.tags.some((tag) => tag.toLowerCase().includes(normalized))
    )
  })
}

const filterByCategory = (
  notes: VaultItem[],
  category: VaultCategory | 'all',
): VaultItem[] => {
  if (category === 'all') {
    return notes
  }

  return notes.filter((note) => note.category === category)
}

const resolveInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const stored = window.localStorage.getItem('sv-theme-mode')
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const snapshotDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function VaultPage() {
  const {
    autoLockTimeoutMs,
    lock,
    passkeyConfigured,
    passkeySupported,
    sessionKey,
    sessionState,
    setupPasskey,
    unlock,
    forceDevMode,
  } = useVaultSession()

  const { canInstall, install, isInstalled } = usePwaInstall()

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => resolveInitialTheme())
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [activeCategory, setActiveCategory] = useState<VaultCategory | 'all'>('all')
  const [page, setPage] = useState(1)
  const [filteredTotalCount, setFilteredTotalCount] = useState(0)
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [visibleNotes, setVisibleNotes] = useState<VaultItem[]>([])
  const [recentNotes, setRecentNotes] = useState<VaultItem[]>([])
  const [vaultError, setVaultError] = useState<string | null>(null)
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings())
  const [backupSettings, setBackupSettings] = useState(() => loadBackupSettings())
  const [noteSummary, setNoteSummary] = useState<string>('')
  const [isSummarizingNote, setIsSummarizingNote] = useState(false)
  const [insights, setInsights] = useState<VaultInsights | null>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [showDevModeOption, setShowDevModeOption] = useState(false)
  const [insightsRefreshToken, setInsightsRefreshToken] = useState(0)

  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshotSummary[]>([])
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [isExportingBackup, setIsExportingBackup] = useState(false)
  const [isImportingBackup, setIsImportingBackup] = useState(false)
  const [isSnapshotting, setIsSnapshotting] = useState(false)
  const [installResult, setInstallResult] = useState<string | null>(null)

  const backupFileInputRef = useRef<HTMLInputElement | null>(null)
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)

  const latestItemToken =
    useLiveQuery(
      async () => {
        const latest = await db.vaultItems.orderBy('updatedAt').last()
        return latest ? `${latest.id}:${latest.updatedAt}` : 'none'
      },
      [],
      'none',
    ) ?? 'none'

  const isUnlocked = sessionState === 'unlocked' && sessionKey !== null
  const lockTimeoutMinutes = Math.round(autoLockTimeoutMs / 60000)

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
    window.localStorage.setItem('sv-theme-mode', themeMode)
  }, [themeMode])

  useEffect(() => {
    persistAiSettings(aiSettings)
  }, [aiSettings])

  useEffect(() => {
    persistBackupSettings(backupSettings)
  }, [backupSettings])

  useAutoSnapshot({
    sessionKey: isUnlocked ? sessionKey : null,
    enabled: isUnlocked && backupSettings.autoSnapshotEnabled,
    changeToken: latestItemToken,
  })

  useEffect(() => {
    if (!isUnlocked || !sessionKey) {
      return
    }

    let isCancelled = false

    const runReindex = async () => {
      try {
        await rebuildVaultEmbeddings(sessionKey, (text) => aiService.embedText(text))
      } catch {
        if (!isCancelled) {
          setVaultError('Embedding reindex encountered an issue in this session.')
        }
      }
    }

    void runReindex()

    return () => {
      isCancelled = true
    }
  }, [isUnlocked, latestItemToken, sessionKey])

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

  useEffect(() => {
    if (!isUnlocked || !sessionKey) {
      setVisibleNotes([])
      setFilteredTotalCount(0)
      setIsLoadingNotes(false)
      return
    }

    let isCancelled = false

    const loadNotes = async () => {
      setIsLoadingNotes(true)
      setVaultError(null)

      try {
        const query = searchQuery.trim()
        let notes: VaultItem[] = []
        let totalMatches = 0

        if (query.length === 0) {
          if (activeCategory === 'all') {
            notes = await listVaultItems(sessionKey, {
              limit: PAGE_SIZE * page,
              offset: 0,
            })
            totalMatches = await listVaultItemsCount()
          } else {
            const totalCount = await listVaultItemsCount()
            const allNotes = await listVaultItems(sessionKey, {
              limit: totalCount,
              offset: 0,
            })
            const filtered = filterByCategory(allNotes, activeCategory)
            totalMatches = filtered.length
            notes = filtered.slice(0, PAGE_SIZE * page)
          }
        } else if (aiSettings.semanticSearchEnabled) {
          const queryEmbedding = await aiService.embedText(query)
          const resultIds = await searchVaultItemIdsByEmbedding(queryEmbedding.vector, 500)
          const rankedNotes = resultIds.length > 0 ? await listVaultItems(sessionKey, { ids: resultIds }) : []
          const filtered = filterByCategory(rankedNotes, activeCategory)
          totalMatches = filtered.length
          notes = filtered.slice(0, PAGE_SIZE * page)
        } else {
          const totalCount = await listVaultItemsCount()
          const allNotes = await listVaultItems(sessionKey, {
            limit: totalCount,
            offset: 0,
          })
          const filteredByText = filterByText(allNotes, query)
          const filtered = filterByCategory(filteredByText, activeCategory)
          totalMatches = filtered.length
          notes = filtered.slice(0, PAGE_SIZE * page)
        }

        if (!isCancelled) {
          setVisibleNotes(notes)
          setFilteredTotalCount(totalMatches)
        }
      } catch (error) {
        if (!isCancelled) {
          setVisibleNotes([])
          setFilteredTotalCount(0)
          setVaultError(error instanceof Error ? error.message : 'Failed to load vault notes.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingNotes(false)
        }
      }
    }

    void loadNotes()

    return () => {
      isCancelled = true
    }
  }, [
    aiSettings.semanticSearchEnabled,
    activeCategory,
    isUnlocked,
    latestItemToken,
    page,
    searchQuery,
    sessionKey,
  ])

  useEffect(() => {
    if (!isUnlocked || !sessionKey) {
      setRecentNotes([])
      return
    }

    let isCancelled = false

    const loadRecentNotes = async () => {
      try {
        const notes = await listVaultItems(sessionKey, { limit: 6, offset: 0 })
        if (!isCancelled) {
          setRecentNotes(notes)
        }
      } catch (error) {
        if (!isCancelled) {
          setRecentNotes([])
          setVaultError(error instanceof Error ? error.message : 'Failed to load recent notes.')
        }
      }
    }

    void loadRecentNotes()

    return () => {
      isCancelled = true
    }
  }, [isUnlocked, latestItemToken, sessionKey])

  useEffect(() => {
    if (!isUnlocked) {
      setBackupSnapshots([])
      return
    }

    let isCancelled = false

    const loadSnapshots = async () => {
      try {
        const snapshots = await listBackupSnapshots()
        if (!isCancelled) {
          setBackupSnapshots(snapshots)
        }
      } catch {
        if (!isCancelled) {
          setBackupSnapshots([])
        }
      }
    }

    void loadSnapshots()

    return () => {
      isCancelled = true
    }
  }, [isUnlocked, latestItemToken])

  const selectedNote = useMemo(() => {
    if (!selectedId) {
      return null
    }

    return (
      visibleNotes.find((note) => note.id === selectedId) ??
      recentNotes.find((note) => note.id === selectedId) ??
      null
    )
  }, [recentNotes, selectedId, visibleNotes])

  useEffect(() => {
    if (!selectedId || selectedNote) {
      return
    }

    const nextSelectedId = visibleNotes[0]?.id ?? recentNotes[0]?.id ?? null
    setSelectedId(nextSelectedId)
    if (!nextSelectedId) {
      setIsDetailOpen(false)
    }
  }, [recentNotes, selectedId, selectedNote, visibleNotes])

  const hasMore = useMemo(() => {
    return visibleNotes.length < filteredTotalCount
  }, [filteredTotalCount, visibleNotes.length])

  const clearBackupMessages = () => {
    setBackupError(null)
    setBackupStatus(null)
  }

  const handleSetupPasskey = async () => {
    setSetupError(null)
    setShowDevModeOption(false)
    try {
      await setupPasskey()
    } catch {
      setSetupError('Unable to set up passkey on this device/browser.')
      if (import.meta.env.DEV) {
        setShowDevModeOption(true)
      }
    }
  }

  const handleEnableDevMode = async () => {
    setSetupError(null)
    try {
      await forceDevMode()
    } catch {
      setSetupError('Dev mode setup failed.')
    }
  }

  const handleUnlock = async () => {
    setUnlockError(null)
    try {
      await unlock()
    } catch {
      setUnlockError('Unable to unlock this vault in the current browser session.')
    }
  }

  const handleCreate = async (category?: VaultCategory) => {
    if (!sessionKey) {
      return
    }

    setVaultError(null)

    try {
      const id = await createVaultItem(sessionKey, {
        category: category ?? (activeCategory === 'all' ? 'note' : activeCategory),
      })
      setSearchInput('')
      setActiveCategory('all')
      setPage(1)
      setSelectedId(id)
      setIsDetailOpen(true)
      setActiveTab('home')
      setNoteSummary('')
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : 'Failed to create note.')
    }
  }

  const handleSave = async (id: string, draft: VaultItemDraft) => {
    if (!sessionKey) {
      return
    }

    setVaultError(null)

    try {
      const embeddingInput = buildVaultEmbeddingText(draft)
      const embedding = await aiService.embedText(embeddingInput)
      await updateVaultItem(sessionKey, id, draft, embedding.vector, embedding.model)
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : 'Failed to save note.')
    }
  }

  const handleDelete = async (id: string) => {
    setVaultError(null)

    try {
      await deleteVaultItem(id)
      if (selectedId === id) {
        setIsDetailOpen(false)
        setSelectedId(null)
      }
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : 'Failed to delete note.')
    }
  }

  const handleSelectNote = (id: string) => {
    setSelectedId(id)
    setIsDetailOpen(true)
    setNoteSummary('')
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    setPage(1)
  }

  const handleCategoryChange = (category: VaultCategory | 'all') => {
    setActiveCategory(category)
    setPage(1)
  }

  const handleLoadMore = () => {
    setPage((value) => value + 1)
  }

  const handleChangeTab = (tab: AppTab) => {
    setActiveTab(tab)
    setIsDetailOpen(false)
    if (tab !== 'search') {
      setSearchInput('')
      setActiveCategory('all')
      setPage(1)
    }
  }

  const handleLock = () => {
    setIsDetailOpen(false)
    setNoteSummary('')
    lock()
  }

  const handleBackupImportCompleted = () => {
    setIsDetailOpen(false)
    setSelectedId(null)
    setSearchInput('')
    setActiveCategory('all')
    setPage(1)
    setNoteSummary('')
    setActiveTab('home')
    lock()
  }

  const handleSummarizeNote = async (note: VaultItem) => {
    if (isSummarizingNote || !aiSettings.summaryEnabled) {
      return
    }

    setIsSummarizingNote(true)
    setVaultError(null)

    try {
      const result = await aiService.summarizeText(note.content, 3)
      setNoteSummary(result.summary || 'No summary generated.')
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : 'Failed to summarize note.')
      setNoteSummary('')
    } finally {
      setIsSummarizingNote(false)
    }
  }

  const handleExportBackup = async () => {
    if (!sessionKey || isExportingBackup || isImportingBackup || isSnapshotting) {
      return
    }

    clearBackupMessages()
    setIsExportingBackup(true)

    try {
      const backup = await exportEncryptedVaultBackup(sessionKey)
      const downloadUrl = URL.createObjectURL(backup.blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = backup.filename
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)
      setBackupStatus(`Backup exported: ${backup.itemCount} encrypted notes.`)
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Backup export failed unexpectedly.')
    } finally {
      setIsExportingBackup(false)
    }
  }

  const handleCreateSnapshot = async () => {
    if (!sessionKey || isExportingBackup || isImportingBackup || isSnapshotting) {
      return
    }

    clearBackupMessages()
    setIsSnapshotting(true)

    try {
      const snapshot = await createBackupSnapshot(sessionKey, 'manual')
      setBackupSnapshots((current) => [snapshot, ...current].slice(0, 10))
      setBackupStatus(`Snapshot created at ${snapshotDateFormatter.format(snapshot.createdAt)}.`)
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Snapshot creation failed.')
    } finally {
      setIsSnapshotting(false)
    }
  }

  const handleOpenImportPicker = () => {
    if (isExportingBackup || isImportingBackup || isSnapshotting) {
      return
    }

    backupFileInputRef.current?.click()
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || isExportingBackup || isImportingBackup || isSnapshotting) {
      return
    }

    const shouldProceed = window.confirm(
      'Import will overwrite the current local vault on this device. Continue?',
    )
    if (!shouldProceed) {
      return
    }

    clearBackupMessages()
    setIsImportingBackup(true)

    try {
      const result = await importEncryptedVaultBackup(file)
      setBackupStatus(`Backup restored: ${result.itemCount} encrypted notes imported.`)
      handleBackupImportCompleted()
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Backup import failed unexpectedly.')
    } finally {
      setIsImportingBackup(false)
    }
  }

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (isExportingBackup || isImportingBackup || isSnapshotting) {
      return
    }

    const shouldProceed = window.confirm(
      'Restore snapshot will overwrite the current local vault. Continue?',
    )
    if (!shouldProceed) {
      return
    }

    clearBackupMessages()
    setIsImportingBackup(true)

    try {
      const result = await restoreBackupSnapshot(snapshotId)
      setBackupStatus(`Snapshot restored: ${result.itemCount} encrypted notes imported.`)
      handleBackupImportCompleted()
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Snapshot restore failed.')
    } finally {
      setIsImportingBackup(false)
    }
  }

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

  const handleToggleTheme = () => {
    setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  let content: ReactElement

  if (sessionState === 'checking') {
    content = (
      <AuthScreen
        description="Checking secure authenticator capability for this device."
        showKeypad={false}
        title="Preparing Vault"
      />
    )
  } else if (!passkeySupported && !import.meta.env.DEV) {
    content = (
      <AuthScreen
        description="Platform passkeys are required. Use a secure context and a passkey-capable browser."
        showKeypad={false}
        title="Passkeys Unavailable"
      />
    )
  } else if (!passkeySupported && import.meta.env.DEV && !passkeyConfigured) {
    content = (
      <AuthScreen
        actionLabel="Enter Dev Mode"
        description="Passkeys unavailable. Click to enable dev mode with a mock encryption key (NOT SECURE)."
        error={setupError}
        isBusy={sessionState === 'setting-up'}
        onAction={handleSetupPasskey}
        showKeypad={false}
        title="Development Mode"
      />
    )
  } else if (!passkeyConfigured) {
    content = (
      <>
        <AuthScreen
          actionLabel="Create Passkey"
          description="Set up your platform passkey. Your vault key is wrapped and never stored raw."
          error={setupError}
          isBusy={sessionState === 'setting-up'}
          onAction={handleSetupPasskey}
          showKeypad={false}
          title="Set Up Secure Access"
        />
        {showDevModeOption && import.meta.env.DEV && (
          <div className="absolute bottom-32 left-0 right-0 z-50 px-6">
            <div className="sv-card p-4 text-center">
              <p className="mb-3 text-xs text-[var(--vault-subtext)]">
                Having trouble? Use dev mode for local testing.
              </p>
              <button
                className="sv-btn-secondary w-full py-2 text-xs"
                onClick={handleEnableDevMode}
                type="button"
              >
                Use Dev Mode (Insecure)
              </button>
            </div>
          </div>
        )}
      </>
    )
  } else if (!isUnlocked) {
    content = (
      <AuthScreen
        actionLabel="Unlock Vault"
        description={`Authenticate with your passkey. Auto-lock triggers after ${lockTimeoutMinutes} minutes.`}
        error={unlockError}
        isBusy={sessionState === 'unlocking'}
        onAction={handleUnlock}
        title="Enter PIN"
      />
    )
  } else if (isDetailOpen && selectedNote) {
    content = (
      <NoteEditor
        isSummarizing={isSummarizingNote}
        note={selectedNote}
        onBack={() => setIsDetailOpen(false)}
        onDelete={handleDelete}
        onSave={handleSave}
        onSummarize={handleSummarizeNote}
        summaryEnabled={aiSettings.summaryEnabled}
        summaryText={noteSummary}
      />
    )
  } else if (activeTab === 'home') {
    content = (
      <HomePanel
        notes={recentNotes}
        onCreateCategory={(category) => {
          void handleCreate(category)
        }}
        onOpenInsights={() => setActiveTab('insights')}
        onOpenSearch={() => setActiveTab('search')}
        onSelectNote={handleSelectNote}
        onToggleTheme={handleToggleTheme}
        themeMode={themeMode}
      />
    )
  } else if (activeTab === 'search') {
    content = (
      <NoteList
        activeCategory={activeCategory}
        canCreate={isUnlocked}
        hasMore={hasMore}
        isLoading={isLoadingNotes}
        notes={visibleNotes}
        onCategoryChange={handleCategoryChange}
        onCreate={() => {
          void handleCreate('note')
        }}
        onCreateByCategory={(category) => {
          void handleCreate(category)
        }}
        onLoadMore={handleLoadMore}
        onSearchChange={handleSearchChange}
        onSelect={handleSelectNote}
        searchQuery={searchInput}
        selectedId={selectedId}
        semanticSearchEnabled={aiSettings.semanticSearchEnabled}
      />
    )
  } else if (activeTab === 'insights') {
    content = (
      <InsightsPanel
        error={insightsError}
        insights={insights}
        isLoading={isLoadingInsights}
        onRefresh={() => setInsightsRefreshToken((value) => value + 1)}
      />
    )
  } else {
    content = (
      <SettingsPanel
        autoSnapshotEnabled={backupSettings.autoSnapshotEnabled}
        backupError={backupError}
        backupSnapshots={backupSnapshots}
        backupStatus={backupStatus}
        busyBackup={isExportingBackup || isImportingBackup || isSnapshotting}
        canInstall={canInstall}
        fileInputRef={backupFileInputRef}
        installResult={installResult}
        isInstalled={isInstalled}
        isSnapshotting={isSnapshotting}
        lockTimeoutMinutes={lockTimeoutMinutes}
        onCreateSnapshot={() => {
          void handleCreateSnapshot()
        }}
        onExportBackup={() => {
          void handleExportBackup()
        }}
        onImportFile={(event) => {
          void handleImportFile(event)
        }}
        onInstall={() => {
          void handleInstall()
        }}
        onLock={handleLock}
        onOpenImportPicker={handleOpenImportPicker}
        onRestoreSnapshot={(snapshotId) => {
          void handleRestoreSnapshot(snapshotId)
        }}
        onSetTheme={setThemeMode}
        onToggleAutoSnapshot={() =>
          setBackupSettings((current) => ({
            ...current,
            autoSnapshotEnabled: !current.autoSnapshotEnabled,
          }))
        }
        onToggleSemanticSearch={() =>
          setAiSettings((current) => ({
            ...current,
            semanticSearchEnabled: !current.semanticSearchEnabled,
          }))
        }
        onToggleSummary={() =>
          setAiSettings((current) => ({
            ...current,
            summaryEnabled: !current.summaryEnabled,
          }))
        }
        onToggleTheme={handleToggleTheme}
        semanticSearchEnabled={aiSettings.semanticSearchEnabled}
        summaryEnabled={aiSettings.summaryEnabled}
        themeMode={themeMode}
      />
    )
  }

  const showNavigation = isUnlocked && !isDetailOpen
  const showFab = showNavigation && (activeTab === 'home' || activeTab === 'search')

  return (
    <main className="native-shell">
      <section className="native-phone">
        {vaultError && isUnlocked && (
          <div className="pointer-events-none absolute left-3 right-3 top-3 z-40">
            <p className="sv-status sv-status-error">{vaultError}</p>
          </div>
        )}

        <div className="h-full overflow-hidden">{content}</div>

        {showFab && (
          <button
            className="sv-fab"
            onClick={() => {
              void handleCreate('note')
            }}
            type="button"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        )}

        {showNavigation && (
          <nav className="sv-bottom-nav">
            {APP_TABS.map((tab) => {
              const isActive = tab.id === activeTab
              const iconStyle = isActive
                ? { fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }
                : undefined

              return (
                <button
                  className={`sv-nav-item ${isActive ? 'sv-nav-item-active' : ''}`}
                  key={tab.id}
                  onClick={() => handleChangeTab(tab.id)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[23px]" style={iconStyle}>
                    {tab.icon}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em]">
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </nav>
        )}
      </section>
    </main>
  )
}
