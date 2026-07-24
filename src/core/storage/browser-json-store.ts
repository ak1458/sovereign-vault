const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const loadJsonObject = (key: string): Record<string, unknown> | null => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    return isObject(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const persistJsonObject = (
  key: string,
  value: object,
): void => {
  window.localStorage.setItem(key, JSON.stringify(value))
}
