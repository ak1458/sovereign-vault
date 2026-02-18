import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
  message: string
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  }

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unexpected application error.',
    }
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App crashed:', error, info)
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="native-shell">
          <section className="native-phone items-center justify-center p-6">
            <div className="glass-card max-w-sm p-5 text-center">
              <h1 className="text-lg font-semibold text-sv-text">
                App Failed To Render
              </h1>
              <p className="mt-2 text-sm text-sv-subtext">{this.state.message}</p>
              <button
                className="primary-button mt-4"
                onClick={() => window.location.reload()}
                type="button"
              >
                Reload
              </button>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
