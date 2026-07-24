export interface PasswordGeneratorOptions {
  length?: number
  includeUppercase?: boolean
  includeLowercase?: boolean
  includeNumbers?: boolean
  includeSymbols?: boolean
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

export function generateSecurePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
  } = options

  let charSet = ''
  const guaranteedChars: string[] = []

  if (includeUppercase) {
    charSet += UPPERCASE
    guaranteedChars.push(UPPERCASE[crypto.getRandomValues(new Uint32Array(1))[0] % UPPERCASE.length])
  }
  if (includeLowercase) {
    charSet += LOWERCASE
    guaranteedChars.push(LOWERCASE[crypto.getRandomValues(new Uint32Array(1))[0] % LOWERCASE.length])
  }
  if (includeNumbers) {
    charSet += NUMBERS
    guaranteedChars.push(NUMBERS[crypto.getRandomValues(new Uint32Array(1))[0] % NUMBERS.length])
  }
  if (includeSymbols) {
    charSet += SYMBOLS
    guaranteedChars.push(SYMBOLS[crypto.getRandomValues(new Uint32Array(1))[0] % SYMBOLS.length])
  }

  if (charSet.length === 0) {
    charSet = LOWERCASE + NUMBERS
  }

  const remainingLength = Math.max(0, length - guaranteedChars.length)
  const randomIndices = new Uint32Array(remainingLength)
  crypto.getRandomValues(randomIndices)

  const randomChars: string[] = []
  for (let i = 0; i < remainingLength; i++) {
    randomChars.push(charSet[randomIndices[i] % charSet.length])
  }

  const allChars = [...guaranteedChars, ...randomChars]
  
  // Cryptographic shuffle (Fisher-Yates)
  for (let i = allChars.length - 1; i > 0; i--) {
    const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    const temp = allChars[i]
    allChars[i] = allChars[randomIndex]
    allChars[randomIndex] = temp
  }

  return allChars.join('')
}

export function evaluatePasswordStrength(password: string): {
  score: number // 0 to 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Military-Grade'
  color: string
} {
  if (!password) {
    return { score: 0, label: 'Weak', color: '#ef4444' }
  }

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 14) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' }
  if (score === 2) return { score: 2, label: 'Fair', color: '#f59e0b' }
  if (score === 3) return { score: 3, label: 'Good', color: '#3b82f6' }
  if (score === 4) return { score: 4, label: 'Strong', color: '#10b981' }
  return { score: 5, label: 'Military-Grade', color: '#6366f1' }
}
