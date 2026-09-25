import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Account } from '#/lib/account'
import { createReservation } from '#/lib/api'
import { formatPlate, isPlausiblePlate, normalizePlate } from '#/lib/plate'
import { nextPaidStart, paidMinutes, paidPeriodEnd, type Block } from '#/lib/tariff'
import { MINUTE, clock, dayLabelSuffix, floorMinute, hm, wallTime } from '#/lib/time'
import { errorMessage } from '#/lib/utils'
import { Plate } from './Plate'
import { SummaryRow } from './SummaryRow'
import { TariffStrip } from './TariffStrip'
import { Alert } from './ui/alert'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'
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
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Wie komt er?</span>
          <ToggleGroup
            aria-label="Opgeslagen kentekens"
            className="w-full flex-wrap"
            value={picked ? [picked] : []}
            onValueChange={([next]) => {
              setPicked(next ?? null)
              setTyped('')
            }}
          >
            {account.plates.map((p) => (
              <ToggleGroupItem
                key={p.value}
                value={p.value}
                className="h-auto gap-2 rounded-xl border-2 border-transparent bg-muted py-1.5 pr-2.5 pl-1.5 text-[13px] aria-pressed:border-primary aria-pressed:bg-secondary"
              >
                <Plate value={p.value} small />
                {p.name ?? 'Gast'}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="plate-in" className="text-[13px] font-semibold">
          {account.plates.length ? 'Of een ander kenteken' : 'Kenteken'}
        </Label>
        <div className="flex max-w-[260px] items-stretch overflow-hidden rounded-lg border-[1.5px] border-[#1a1a1a] bg-plate focus-within:ring-3 focus-within:ring-ring/50">
          <span className="flex items-end bg-eu px-1.5 py-1 text-[11px] font-bold text-white">NL</span>
          <input
            id="plate-in"
            className="w-full bg-transparent px-3 py-1.5 font-plate text-[28px] font-bold tracking-[0.06em] text-plate-foreground uppercase outline-none placeholder:text-black/35"
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

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">Hoe lang?</span>
        <ToggleGroup
          aria-label="Duur"
          variant="outline"
          className="grid w-full grid-cols-3"
          value={customUntil ? [] : [String(duration)]}
          onValueChange={([next]) => {
            if (!next) return
            setDuration(next === 'end' ? 'end' : Number(next))
            setCustomUntil('')
          }}
        >
          {PRESETS.map((p) => {
            const u = untilFor(p.key)
            return (
              <ToggleGroupItem
                key={p.key}
                value={String(p.key)}
                disabled={!u}
                className="h-auto flex-col gap-0 rounded-xl border-[1.5px] px-1.5 py-2.5 font-semibold leading-tight aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-primary"
              >
                {p.label}
                <small className="text-[11px] font-medium text-muted-foreground tabular-nums group-aria-pressed/toggle:text-primary">
                  {u ? `tot ${clock(u)}` : 'onbekend'}
                </small>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
        <div className="mt-1 flex items-center gap-2.5 text-sm text-muted-foreground">
          <Label htmlFor="until-in" className="font-normal">
            of tot
          </Label>
          <Input
            type="time"
            id="until-in"
            step={600}
            className="h-9 w-auto rounded-[10px] border-[1.5px] font-semibold text-foreground tabular-nums"
            value={customUntil}
            onChange={(e) => setCustomUntil(e.target.value)}
          />
        </div>
      </div>

      {until && <TariffStrip blocks={blocks} now={now} booking={[from, until]} />}

      {until && (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-muted p-3.5">
          <SummaryRow label="Periode">
            {clock(from)} – {clock(until)}
            {dayLabelSuffix(until, from)}
          </SummaryRow>
          <SummaryRow label="Kost">{hm(cost)}</SummaryRow>
          <SummaryRow label="Saldo daarna">{after < 0 ? `${hm(-after)} tekort` : hm(after)}</SummaryRow>
          {after < 0 ? (
            <Alert variant="warning">Je saldo is {hm(-after)} te kort. Kies een kortere tijd of waardeer op.</Alert>
          ) : cost === 0 && nextPaid ? (
            <Alert variant="info" role="note">
              Deze hele periode is gratis. Aanmelden is pas nodig vanaf {clock(nextPaid)}
              {dayLabelSuffix(nextPaid, from)}.
            </Alert>
          ) : freeMinutes >= 1 ? (
            <Alert variant="info" role="note">
              {hm(freeMinutes)} hiervan valt in gratis tijd en kost niets.
            </Alert>
          ) : null}
          <div className="text-xs font-medium text-muted-foreground">Te vroeg klaar? Stop op elk moment en krijg de rest terug.</div>
        </div>
      )}

      {isNewPlate && (
        <div className="flex flex-col gap-2">
          <Label className="justify-between text-sm font-normal">
            Bewaar dit kenteken
            <Switch checked={save} onCheckedChange={setSave} />
          </Label>
          {save && (
            <Input
              className="h-10 rounded-[10px] text-base"
              placeholder="Naam, bijv. Oma Ria"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              aria-label="Naam bij dit kenteken"
            />
          )}
        </div>
      )}

      {error && <Alert variant="warning">{error}</Alert>}

      <Button size="xl" disabled={!ready || busy} onClick={submit}>
        {busy
          ? 'Bezig…'
          : isPlausiblePlate(plate) && until
            ? `${formatPlate(plate)} aanmelden tot ${clock(until)}`
            : 'Kies of typ een kenteken'}
      </Button>
    </>
  )
}
