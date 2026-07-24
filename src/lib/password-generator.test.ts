import { describe, expect, it } from 'vitest'
import { evaluatePasswordStrength, generateSecurePassword } from './password-generator'

describe('Password Generator & Strength Evaluator', () => {
  it('generates secure passwords with requested length and character sets', () => {
    const pwd = generateSecurePassword({ length: 20 })
    expect(pwd.length).toBe(20)
    expect(/[A-Z]/.test(pwd)).toBe(true)
    expect(/[a-z]/.test(pwd)).toBe(true)
    expect(/[0-9]/.test(pwd)).toBe(true)
  })

  it('evaluates password strength correctly', () => {
    expect(evaluatePasswordStrength('12345').label).toBe('Weak')
    expect(evaluatePasswordStrength('SecretPass123!').score).toBeGreaterThanOrEqual(3)
    expect(evaluatePasswordStrength('K9#mX$8vL2!nQ7zP').label).toBe('Military-Grade')
  })
})
