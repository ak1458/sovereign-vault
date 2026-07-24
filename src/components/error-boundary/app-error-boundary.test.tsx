import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './app-error-boundary'

function ProblemChild(): ReactNode {
  throw new Error('Component crashed during render!')
}

describe('AppErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(
      <AppErrorBoundary>
        <div>Safe Content</div>
      </AppErrorBoundary>,
    )

    expect(screen.getByText('Safe Content')).toBeDefined()
  })

  it('renders error fallback message when a child component throws', () => {
    // Suppress console.error during expected throw
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AppErrorBoundary>
        <ProblemChild />
      </AppErrorBoundary>,
    )

    expect(screen.getByText('App Failed To Render')).toBeDefined()
    expect(screen.getByText('Component crashed during render!')).toBeDefined()

    consoleSpy.mockRestore()
  })
})
