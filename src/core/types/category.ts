export const VAULT_CATEGORIES = [
  'note',
  'document',
  'password',
  'card',
] as const

export type VaultCategory = (typeof VAULT_CATEGORIES)[number]

export const DEFAULT_VAULT_CATEGORY: VaultCategory = 'note'

export const isVaultCategory = (value: unknown): value is VaultCategory => {
  return (
    typeof value === 'string' &&
    (VAULT_CATEGORIES as readonly string[]).includes(value)
  )
}

export const normalizeVaultCategory = (
  value: unknown,
): VaultCategory => {
  return isVaultCategory(value) ? value : DEFAULT_VAULT_CATEGORY
}

export const getVaultCategoryLabel = (category: VaultCategory): string => {
  switch (category) {
    case 'note':
      return 'Notes'
    case 'document':
      return 'Documents'
    case 'password':
      return 'Passwords'
    case 'card':
      return 'Cards'
    default:
      return 'Notes'
  }
}
