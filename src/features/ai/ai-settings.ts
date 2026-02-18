import { loadJsonObject, persistJsonObject } from '../../storage/browser-json-store'

export interface AiSettings {
  semanticSearchEnabled: boolean
  summaryEnabled: boolean
}

const STORAGE_KEY = 'sv_ai_settings'

export const DEFAULT_AI_SETTINGS: AiSettings = {
  semanticSearchEnabled: true,
  summaryEnabled: false,
}

export const loadAiSettings = (): AiSettings => {
  const parsed = loadJsonObject(STORAGE_KEY)
  if (!parsed) {
    return DEFAULT_AI_SETTINGS
  }

  return {
    semanticSearchEnabled:
      typeof parsed.semanticSearchEnabled === 'boolean'
        ? parsed.semanticSearchEnabled
        : DEFAULT_AI_SETTINGS.semanticSearchEnabled,
    summaryEnabled:
      typeof parsed.summaryEnabled === 'boolean'
        ? parsed.summaryEnabled
        : DEFAULT_AI_SETTINGS.summaryEnabled,
  }
}

export const persistAiSettings = (settings: AiSettings): void => {
  persistJsonObject(STORAGE_KEY, settings)
}
