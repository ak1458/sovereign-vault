import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthScreen } from './auth-screen'

describe('AuthScreen component', () => {
  it('renders title, description and fingerprint action button', () => {
    const handleAction = vi.fn()
    render(
      <AuthScreen
        actionLabel="Unlock Vault"
        description="Authenticate with passkey"
        onAction={handleAction}
        title="Enter PIN"
      />,
    )

    expect(screen.getByText('Enter PIN')).toBeDefined()
    expect(screen.getByText('Authenticate with passkey')).toBeDefined()
    expect(screen.getByText('Unlock Vault')).toBeDefined()
  })

  it('displays error message when error prop is set', () => {
    render(
      <AuthScreen
        description="Authenticate with passkey"
        error="Invalid passkey credentials"
        title="Enter PIN"
      />,
    )

    expect(screen.getByText('Invalid passkey credentials')).toBeDefined()
  })

  it('renders keypad digits 0-9', () => {
    render(
      <AuthScreen
        description="Authenticate with passkey"
        showKeypad={true}
        title="Enter PIN"
      />,
    )

    for (let i = 0; i <= 9; i++) {
      expect(screen.getByText(String(i))).toBeDefined()
    }
  })
})
