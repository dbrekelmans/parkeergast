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
    <div className="strip">
      <div className="strip-bar" aria-hidden>
        {paid.map((b) => (
          <div key={b.from} className="paid" style={{ left: `${pct(b.from)}%`, width: `${pct(b.until) - pct(b.from)}%` }} />
        ))}
        {booking && (
          <div
            className="res"
            style={{
              left: `${pct(booking[0].getTime())}%`,
              width: `${Math.max(0.8, pct(booking[1].getTime()) - pct(booking[0].getTime()))}%`,
            }}
          />
        )}
        <div className="now" style={{ left: `${pct(now.getTime())}%` }} />
      </div>
      <div className="strip-ticks num" aria-hidden>
        {ticks.map((t) => (
          <span key={t.left} style={{ left: `${t.left}%` }}>
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
      <div className="strip-note">
        <b>Nu gratis</b> tot {clock(next)}
        {dayLabelSuffix(next, now)}. Aanmelden is pas daarna nodig.
      </div>
    )
  }
  const current = blocks.find((b) => b.paid && b.from <= now.getTime() && now.getTime() < b.until)
  if (!current) return <div className="strip-note">Geen tariefinformatie beschikbaar.</div>
  return (
    <div className="strip-note">
      <b>Nu betaald</b> tot {clock(new Date(current.until))}. Daarna gratis.
    </div>
  )
}
