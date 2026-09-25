import type { TariffBlock } from './account'
import { MINUTE } from './time'

export type Block = { from: number; until: number; paid: boolean }

export const toBlocks = (blocks: TariffBlock[]): Block[] =>
  blocks
    .map((b) => ({ from: Date.parse(b.from), until: Date.parse(b.until), paid: b.paid }))
    .sort((a, b) => a.from - b.from)

/** Balance minutes a window costs: only paid time counts, per started minute. */
export function paidMinutes(from: Date, until: Date, blocks: Block[]): number {
  const a = from.getTime()
  const b = until.getTime()
  let total = 0
  for (const block of blocks) {
    if (!block.paid) continue
    const s = Math.max(a, block.from)
    const e = Math.min(b, block.until)
    if (e > s) total += Math.ceil((e - s) / MINUTE)
  }
  return total
}

const paidAt = (t: number, blocks: Block[]) => blocks.find((b) => b.paid && b.from <= t && t < b.until)

/** When paid time next starts, or null if it's paid right now. */
export function nextPaidStart(t: Date, blocks: Block[]): Date | null {
  const ms = t.getTime()
  if (paidAt(ms, blocks)) return null
  const next = blocks.find((b) => b.paid && b.from > ms)
  return next ? new Date(next.from) : null
}

/** End of the paid period that's running now, or of the next one. */
export function paidPeriodEnd(t: Date, blocks: Block[]): Date | null {
  const ms = t.getTime()
  const block = paidAt(ms, blocks) ?? blocks.find((b) => b.paid && b.from > ms)
  return block ? new Date(block.until) : null
}
