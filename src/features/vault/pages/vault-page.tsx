import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactElement } from 'react'
import { ToastProvider, useToast } from '../../../components/ui/toast'
import type { VaultCategory } from '../../../core/types/category'
import { db } from '../../../core/database/db'
import { aiService } from '../../ai/ai.service'
import { loadAiSettings, persistAiSettings, type AiSettings } from '../../ai/ai-settings'
import { loadBackupSettings, persistBackupSettings } from '../../backup/backup-settings'
import { useAutoSnapshot } from '../../backup/hooks/use-auto-snapshot'
import { InsightsPanel } from '../../insights/components/insights-panel'
import { usePwaInstall } from '../../pwa/use-pwa-install'
import { AuthScreen } from '../../auth/auth-screen'
import { HomePanel } from '../home-panel'
import { NoteEditor } from '../../editor/note-editor'
import { NoteList } from '../note-list'
import { SettingsPanel } from '../../settings/settings-panel'
import { useBackupActions } from '../hooks/use-backup-actions'
import { useVaultInsights } from '../hooks/use-vault-insights'
import { useVaultNotes } from '../hooks/use-vault-notes'
import { useVaultSession } from '../../auth/use-vault-session'
import type { VaultItem, VaultItemDraft } from '../../../core/types/vault'
import {
  buildVaultEmbeddingText,
  createVaultItem,
  deleteVaultItem,
  updateVaultItem,
} from '../vault.service'

type ThemeMode = 'light' | 'dark'
type AppTab = 'home' | 'search' | 'insights' | 'settings'

const APP_TABS: Array<{ id: AppTab; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'insights', label: 'Insights', icon: 'analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

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

function VaultContent() {
  const {
    authConfigured,
    autoLockTimeoutMs,
    lock,
    passkeySupported,
    sessionKey,
    sessionState,
    setupPasskey,
    setupPin,
    unlockPasskey,
    unlockPin,
  } = useVaultSession()

  const { showToast } = useToast()
  const { canInstall, install, isInstalled } = usePwaInstall()

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => resolveInitialTheme())
  const [authError, setAuthError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings())
  const [backupSettings, setBackupSettings] = useState(() => loadBackupSettings())
  const [noteSummary, setNoteSummary] = useState<string>('')
  const [isSummarizingNote, setIsSummarizingNote] = useState(false)
  const [installResult, setInstallResult] = useState<string | null>(null)

  const backupFileInputRef = useRef<HTMLInputElement | null>(null)

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

  const {
    activeCategory,
    filteredTotalCount,
    isDetailOpen,
    isLoadingNotes,
    recentNotes,
    searchInput,
    selectedId,
    vaultError,
    visibleNotes,
    setActiveCategory,
    setIsDetailOpen,
    setPage,
    setSearchInput,
    setSelectedId,
    setVaultError,
  } = useVaultNotes({
    aiSettings,
    isUnlocked,
    latestItemToken,
    sessionKey,
  })

  const { insights, insightsError, isLoadingInsights, refreshInsights } =
    useVaultInsights({
      activeTab,
      isUnlocked,
      latestItemToken,
      sessionKey,
    })

  const {
    backupError,
    backupSnapshots,
    backupStatus,
    handleCreateSnapshot,
    handleExportBackup,
    handleImportFileSelected,
    handleRestoreSnapshot,
    isExportingBackup,
    isImportingBackup,
    isSnapshotting,
  } = useBackupActions({
    backupFileInputRef,
    isUnlocked,
    latestItemToken,
    sessionKey,
  })

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
    changeToken: latestItemToken,
    enabled: isUnlocked && backupSettings.autoSnapshotEnabled,
    sessionKey: isUnlocked ? sessionKey : null,
  })

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
  }, [recentNotes, selectedId, selectedNote, setIsDetailOpen, setSelectedId, visibleNotes])

  const hasMore = useMemo(() => {
    return visibleNotes.length < filteredTotalCount
  }, [filteredTotalCount, visibleNotes.length])

  const handlePinSubmit = async (pin: string) => {
    setAuthError(null)
    try {
      if (!authConfigured) {
        await setupPin(pin)
        showToast('Vault created and secured with Master PIN!', 'success')
      } else {
        await unlockPin(pin)
        showToast('Vault unlocked successfully', 'success')
      }
    } catch {
      setAuthError(authConfigured ? 'Incorrect PIN entered.' : 'Failed to configure PIN.')
    }
  }

  const handlePasskeyClick = async () => {
    setAuthError(null)
    try {
      if (!authConfigured) {
        await setupPasskey()
        showToast('Vault secured with Passkey!', 'success')
      } else {
        await unlockPasskey()
        showToast('Vault unlocked with Passkey', 'success')
      }
    } catch {
      setAuthError('Passkey authentication failed.')
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
      showToast('New item created', 'success')
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : 'Failed to create item.')
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
      showToast('Saved changes', 'success')
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : 'Failed to save item.')
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
      showToast('Item deleted', 'info')
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : 'Failed to delete item.')
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
    showToast('Vault locked', 'info')
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
    showToast('Backup restored. Please unlock your vault.', 'success')
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
      showToast('AI summary generated', 'success')
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : 'Failed to summarize note.')
      setNoteSummary('')
    } finally {
      setIsSummarizingNote(false)
    }
  }

  const handleOpenImportPicker = () => {
    if (isExportingBackup || isImportingBackup || isSnapshotting) {
      return
    }

    backupFileInputRef.current?.click()
  }

  const handleImportFileWithConfirmation = async (event: ChangeEvent<HTMLInputElement>) => {
    const shouldProceed = window.confirm(
      'Import will overwrite the current local vault on this device. Continue?',
    )
    if (!shouldProceed) {
      if (event.target) {
        event.target.value = ''
      }
      return
    }

    await handleImportFileSelected(event)
    handleBackupImportCompleted()
  }

  const handleRestoreSnapshotWithConfirmation = async (snapshotId: string) => {
    const shouldProceed = window.confirm(
      'Restore snapshot will overwrite the current local vault. Continue?',
    )
    if (!shouldProceed) {
      return
    }

    await handleRestoreSnapshot(snapshotId)
    handleBackupImportCompleted()
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
        description="Initializing secure local cryptographic database..."
        showKeypad={false}
        title="Preparing Sovereign Vault"
      />
    )
  } else if (!authConfigured) {
    content = (
      <AuthScreen
        actionLabel="Create Vault Key"
        description="Set up your 4-digit Master PIN or use platform Passkey. Vault key is PBKDF2/AES-GCM encrypted."
        error={authError}
        isBusy={sessionState === 'setting-up'}
        onAction={() => handlePasskeyClick()}
        onPasskeyClick={passkeySupported ? handlePasskeyClick : undefined}
        onPinSubmit={handlePinSubmit}
        showKeypad={true}
        title="Create Master PIN"
      />
    )
  } else if (!isUnlocked) {
    content = (
      <AuthScreen
        actionLabel="Unlock"
        description={`Enter 4-digit PIN or click fingerprint for Passkey. Auto-lock after ${lockTimeoutMinutes}m.`}
        error={authError}
        isBusy={sessionState === 'unlocking'}
        onAction={() => handlePasskeyClick()}
        onPasskeyClick={passkeySupported ? handlePasskeyClick : undefined}
        onPinSubmit={handlePinSubmit}
        showKeypad={true}
        title="Unlock Vault"
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
        onRefresh={refreshInsights}
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
          void handleImportFileWithConfirmation(event)
        }}
        onInstall={() => {
          void handleInstall()
        }}
        onLock={handleLock}
        onOpenImportPicker={handleOpenImportPicker}
        onRestoreSnapshot={(snapshotId) => {
          void handleRestoreSnapshotWithConfirmation(snapshotId)
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

        <div className="relative flex-1 overflow-hidden">{content}</div>

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

export function VaultPage() {
  return (
    <ToastProvider>
      <VaultContent />
    </ToastProvider>
  )
}
