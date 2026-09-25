import { useEffect, type ReactNode } from 'react'

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div className={open ? 'scrim open' : 'scrim'} onClick={onClose} />
      <div className={open ? 'sheet open' : 'sheet'} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <div className="sheet-body">
          <div className="sheet-h">
            <h2>{title}</h2>
            <button className="x" onClick={onClose} aria-label="Sluiten">
              ×
            </button>
          </div>
          {open && children}
        </div>
      </div>
    </>
  )
}
