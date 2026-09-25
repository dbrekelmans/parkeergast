import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import type { Account } from '#/lib/account'
import { createReservation } from '#/lib/api'
import { formatPlate, isPlausiblePlate, normalizePlate } from '#/lib/plate'
import { nextPaidStart, paidMinutes, paidPeriodEnd, type Block } from '#/lib/tariff'
import { MINUTE, clock, dayLabelSuffix, floorMinute, hm, wallTime } from '#/lib/time'
import { Plate } from './Plate'
import { TariffStrip } from './TariffStrip'
import { errorMessage, useToast } from './Toast'
import { useNow } from './useNow'

export type Prefill = { plate?: string; minutes?: number }

type Duration = number | 'end'
const PRESETS: { key: Duration; label: string }[] = [
  { key: 30, label: '30 min' },
  { key: 60, label: '1 uur' },
  { key: 120, label: '2 uur' },
  { key: 240, label: '4 uur' },
  { key: 480, label: '8 uur' },
  { key: 'end', label: 'Einde betaald' },
]

type Props = { account: Account; blocks: Block[]; prefill: Prefill; onDone: () => void }

export function NewReservationForm({ account, blocks, prefill, onDone }: Props) {
  const router = useRouter()
  const toast = useToast()
  const now = useNow(30_000)
  const createFn = useServerFn(createReservation)

  const [picked, setPicked] = useState<string | null>(prefill.plate ?? null)
  const [typed, setTyped] = useState('')
  const [duration, setDuration] = useState<Duration>(
    prefill.minutes && PRESETS.some((p) => p.key === prefill.minutes) ? prefill.minutes : 120,
  )
  const [customUntil, setCustomUntil] = useState('')
  const [save, setSave] = useState(true)
  const [saveName, setSaveName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = floorMinute(now)
  const periodEnd = paidPeriodEnd(from, blocks)
  const untilFor = (d: Duration) => (d === 'end' ? periodEnd : new Date(from.getTime() + d * MINUTE))
  let until: Date | null
  if (customUntil) {
    const [h, m] = customUntil.split(':').map(Number)
    until = wallTime(from, h, m)
    if (until <= from) until = wallTime(from, h, m, 1)
  } else {
    until = untilFor(duration)
  }

  const plate = picked ?? normalizePlate(typed)
  const isNewPlate = !picked && isPlausiblePlate(typed) && !account.plates.some((p) => p.value === plate)
  const cost = until ? paidMinutes(from, until, blocks) : 0
  const after = account.balance - cost
  const freeMinutes = until ? (until.getTime() - from.getTime()) / MINUTE - cost : 0
  const nextPaid = nextPaidStart(from, blocks)
  const ready = isPlausiblePlate(plate) && until !== null && after >= 0

  async function submit() {
    if (!ready || !until) return
    setBusy(true)
    setError(null)
    try {
      await createFn({
        data: {
          plate,
          from: from.toISOString(),
          until: until.toISOString(),
          saveAs: isNewPlate && save ? saveName : null,
        },
      })
      await router.invalidate()
      onDone()
      toast(`${formatPlate(plate)} staat geparkeerd tot ${clock(until)}`)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {account.plates.length > 0 && (
        <div>
          <span className="field-l">Wie komt er?</span>
          <div className="plates">
            {account.plates.map((p) => (
              <button
                key={p.value}
                className="pick"
                aria-pressed={picked === p.value}
                onClick={() => {
                  setPicked(picked === p.value ? null : p.value)
                  setTyped('')
                }}
              >
                <Plate value={p.value} small />
                {p.name ?? 'Gast'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="field-l" htmlFor="plate-in">
          {account.plates.length ? 'Of een ander kenteken' : 'Kenteken'}
        </label>
        <div className="plate-input">
          <span className="eu">NL</span>
          <input
            id="plate-in"
            placeholder="AB-123-C"
            maxLength={10}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={typed.length >= 4 ? formatPlate(typed) : typed}
            onChange={(e) => {
              setTyped(normalizePlate(e.target.value).slice(0, 8))
              setPicked(null)
            }}
          />
        </div>
      </div>

      <div>
        <span className="field-l">Hoe lang?</span>
        <div className="durs">
          {PRESETS.map((p) => {
            const u = untilFor(p.key)
            return (
              <button
                key={p.key}
                className="dur"
                aria-pressed={!customUntil && duration === p.key}
                disabled={!u}
                onClick={() => {
                  setDuration(p.key)
                  setCustomUntil('')
                }}
              >
                {p.label}
                <small className="num">{u ? `tot ${clock(u)}` : 'onbekend'}</small>
              </button>
            )
          })}
        </div>
        <div className="custom">
          <label htmlFor="until-in">of tot</label>
          <input type="time" id="until-in" step={600} value={customUntil} onChange={(e) => setCustomUntil(e.target.value)} />
        </div>
      </div>

      {until && <TariffStrip blocks={blocks} now={now} booking={[from, until]} />}

      {until && (
        <div className="summary">
          <div className="sum-row">
            <span>Periode</span>
            <b className="num">
              {clock(from)} – {clock(until)}
              {dayLabelSuffix(until, from)}
            </b>
          </div>
          <div className="sum-row">
            <span>Kost</span>
            <b className="num">{hm(cost)}</b>
          </div>
          <div className="sum-row">
            <span>Saldo daarna</span>
            <b className="num">{after < 0 ? `${hm(-after)} tekort` : hm(after)}</b>
          </div>
          {after < 0 ? (
            <div className="callout warn">Je saldo is {hm(-after)} te kort. Kies een kortere tijd of waardeer op.</div>
          ) : cost === 0 && nextPaid ? (
            <div className="callout">
              Deze hele periode is gratis. Aanmelden is pas nodig vanaf {clock(nextPaid)}
              {dayLabelSuffix(nextPaid, from)}.
            </div>
          ) : freeMinutes >= 1 ? (
            <div className="callout">{hm(freeMinutes)} hiervan valt in gratis tijd en kost niets.</div>
          ) : null}
          <div className="label">Te vroeg klaar? Stop op elk moment en krijg de rest terug.</div>
        </div>
      )}

      {isNewPlate && (
        <div>
          <label className="toggle">
            <span>Bewaar dit kenteken</span>
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
          </label>
          {save && (
            <input
              className="text-in"
              style={{ marginTop: 8 }}
              placeholder="Naam, bijv. Oma Ria"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              aria-label="Naam bij dit kenteken"
            />
          )}
        </div>
      )}

      {error && <div className="callout warn">{error}</div>}

      <button className="cta" disabled={!ready || busy} onClick={submit}>
        {busy
          ? 'Bezig…'
          : isPlausiblePlate(plate) && until
            ? `${formatPlate(plate)} aanmelden tot ${clock(until)}`
            : 'Kies of typ een kenteken'}
      </button>
    </>
  )
}
