import type { ReactNode } from 'react'

export function SectionHeading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="mt-1.5 flex items-baseline justify-between px-1">
      <h2 className="text-[15px] font-bold">{title}</h2>
      {aside && <span className="text-[13px] text-muted-foreground tabular-nums">{aside}</span>}
    </div>
  )
}
