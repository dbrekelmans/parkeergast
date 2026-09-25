import type { ReactNode } from 'react'

export function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <b className="font-semibold tabular-nums">{children}</b>
    </div>
  )
}
