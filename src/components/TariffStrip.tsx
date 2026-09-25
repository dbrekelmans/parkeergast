import { nextPaidStart, type Block } from '#/lib/tariff'
import { MINUTE, clock, dayLabelSuffix } from '#/lib/time'

const HOUR = 60 * MINUTE

/** The next 24 hours, with paid time shaded and free time hatched. */
export function TariffStrip({ blocks, now, booking }: { blocks: Block[]; now: Date; booking?: [Date, Date] }) {
  const start = Math.floor(now.getTime() / HOUR) * HOUR - HOUR
  const end = start + 24 * HOUR
  const pct = (t: number) => ((Math.min(Math.max(t, start), end) - start) / (end - start)) * 100

  const paid = blocks.filter((b) => b.paid && b.until > start && b.from < end)
  const ticks = [3, 9, 15, 21].map((h) => ({ left: (h / 24) * 100, label: clock(new Date(start + h * HOUR)) }))

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="relative h-[22px] overflow-hidden rounded-md bg-[repeating-linear-gradient(135deg,var(--muted)_0_5px,var(--free)_5px_6px)]"
        aria-hidden
      >
        {paid.map((b) => (
          <div key={b.from} className="absolute inset-y-0 bg-primary/22" style={{ left: `${pct(b.from)}%`, width: `${pct(b.until) - pct(b.from)}%` }} />
        ))}
        {booking && (
          <div
            className="absolute inset-y-[5px] rounded bg-primary"
            style={{
              left: `${pct(booking[0].getTime())}%`,
              width: `${Math.max(0.8, pct(booking[1].getTime()) - pct(booking[0].getTime()))}%`,
            }}
          />
        )}
        <div className="absolute -inset-y-0.5 w-0.5 bg-destructive" style={{ left: `${pct(now.getTime())}%` }} />
      </div>
      <div className="relative h-3.5 text-[11px] text-muted-foreground tabular-nums" aria-hidden>
        {ticks.map((t) => (
          <span key={t.left} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${t.left}%` }}>
            {t.label}
          </span>
        ))}
      </div>
      {!booking && <StripNote blocks={blocks} now={now} />}
    </div>
  )
}

function StripNote({ blocks, now }: { blocks: Block[]; now: Date }) {
  const next = nextPaidStart(now, blocks)
  if (next) {
    return (
      <div className="text-[13px] text-muted-foreground">
        <b className="font-semibold text-foreground">Nu gratis</b> tot {clock(next)}
        {dayLabelSuffix(next, now)}. Aanmelden is pas daarna nodig.
      </div>
    )
  }
  const current = blocks.find((b) => b.paid && b.from <= now.getTime() && now.getTime() < b.until)
  if (!current) return <div className="text-[13px] text-muted-foreground">Geen tariefinformatie beschikbaar.</div>
  return (
    <div className="text-[13px] text-muted-foreground">
      <b className="font-semibold text-foreground">Nu betaald</b> tot {clock(new Date(current.until))}. Daarna gratis.
    </div>
  )
}
