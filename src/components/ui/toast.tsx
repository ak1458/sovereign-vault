import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export interface ToastMessage {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

interface ToastContextType {
  showToast: (message: string, type?: ToastMessage['type']) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, type, message }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 pointer-events-none px-4 w-full max-w-sm">
        {toasts.map((toast) => {
          const bgMap = {
            info: 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border)]',
            success: 'bg-[#30D158]/20 text-[#30D158] border-[#30D158]/40',
            warning: 'bg-[#FF9F0A]/20 text-[#FF9F0A] border-[#FF9F0A]/40',
            error: 'bg-[#FF453A]/20 text-[#FF453A] border-[#FF453A]/40',
          }

          const iconMap = {
            info: 'info',
            success: 'check_circle',
            warning: 'warning',
            error: 'error',
          }

          return (
            <div
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${bgMap[toast.type]}`}
              key={toast.id}
            >
              <span className="material-symbols-outlined text-lg">{iconMap[toast.type]}</span>
              <span className="flex-1">{toast.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      showToast: (message: string) => {
        // Fallback console print if provider missing
        console.log('[Toast]', message)
      },
    }
  }
  return context
}
