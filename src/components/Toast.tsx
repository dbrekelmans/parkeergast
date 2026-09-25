import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type ToastState = { message: string; error?: boolean; undo?: () => void }
type ShowToast = (message: string, options?: { error?: boolean; undo?: () => void }) => void

const ToastContext = createContext<ShowToast>(() => {})

export const useToast = () => useContext(ToastContext)

export const errorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : 'Er ging iets mis. Probeer het opnieuw.'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback<ShowToast>((message, options) => {
    setToast({ message, ...options })
    setVisible(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), options?.undo ? 5000 : options?.error ? 5000 : 2800)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast${visible ? ' show' : ''}${toast?.error ? ' error' : ''}`} role="status" aria-live="polite">
        <span>{toast?.message}</span>
        {toast?.undo && (
          <button
            onClick={() => {
              setVisible(false)
              toast.undo?.()
            }}
          >
            Ongedaan maken
          </button>
        )}
      </div>
    </ToastContext.Provider>
  )
}
