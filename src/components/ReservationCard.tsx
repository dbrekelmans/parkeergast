import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Reservation, SavedPlate } from '#/lib/account'
import { changeReservation, createReservation, endReservation } from '#/lib/api'
import { formatPlate } from '#/lib/plate'
import { paidMinutes, type Block } from '#/lib/tariff'
import { MINUTE, ceilMinute, clock, dayLabel, floorMinute, hm } from '#/lib/time'
import { errorMessage } from '#/lib/utils'
import { Plate } from './Plate'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Progress } from './ui/progress'

type Props = { reservation: Reservation; plates: SavedPlate[]; blocks: Block[]; step: number; now: Date }

export function ReservationCard({ reservation: r, plates, blocks, step, now }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const changeFn = useServerFn(changeReservation)
  const endFn = useServerFn(endReservation)
  const createFn = useServerFn(createReservation)

  const from = new Date(r.from)
  const until = new Date(r.until)
  const name = plates.find((p) => p.value === r.plate)?.name
  const left = Math.max(0, (until.getTime() - now.getTime()) / MINUTE)
  const done = Math.min(100, Math.max(0, ((now.getTime() - from.getTime()) / (until.getTime() - from.getTime())) * 100))
  const refund = paidMinutes(ceilMinute(now > from ? now : from), until, blocks)
  const canShorten = until.getTime() - step * MINUTE > now.getTime()

  async function run(action: () => Promise<unknown>, success?: () => void) {
    setBusy(true)
    try {
      await action()
      await router.invalidate()
      success?.()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const change = (minutes: number) =>
    run(
      () => changeFn({ data: { id: r.id, minutes } }),
      () => {
        const next = new Date(until.getTime() + minutes * MINUTE)
        toast(`${formatPlate(r.plate)} staat nu tot ${clock(next)}`)
      },
    )

  const stop = () =>
    run(
      () => endFn({ data: { id: r.id } }),
      () =>
        toast(`${formatPlate(r.plate)} afgemeld${refund ? ` · ${hm(refund)} terug` : ''}`, {
          duration: 5000,
          action: {
            label: 'Ongedaan maken',
            onClick: () =>
              createFn({
                data: { plate: r.plate, from: floorMinute(new Date()).toISOString(), until: r.until },
              })
                .then(() => router.invalidate())
                .then(() => toast(`${formatPlate(r.plate)} staat weer geparkeerd tot ${clock(until)}`))
                .catch((error) => toast.error(errorMessage(error))),
          },
        }),
    )

  return (
    <Card className="gap-3.5 p-4">
      <div className="flex items-center justify-between gap-2.5">
        <Plate value={r.plate} />
        <div className="text-right text-[13px] text-muted-foreground">
          {name && <b className="block text-[15px] font-semibold text-foreground">{name}</b>}
          sinds {clock(from)}
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Nog</div>
          <div className="text-[30px] leading-tight font-bold tracking-tight tabular-nums">{hm(left)}</div>
        </div>
        <div className="text-right text-[13px] text-muted-foreground tabular-nums">
          tot {clock(until)}
          <br />
          {dayLabel(until, now)}
        </div>
      </div>
      <Progress value={done} aria-hidden className="**:data-[slot=progress-track]:h-1.5" />
      <div className="grid grid-cols-[auto_auto_1fr] gap-2">
        <Button
          variant="outline"
          className="h-auto rounded-xl px-3.5 py-2.5 font-semibold"
          disabled={busy || !r.canProlong || !canShorten}
          onClick={() => change(-step)}
          aria-label={`${step} minuten korter`}
        >
          −{step} min
        </Button>
        <Button
          variant="outline"
          className="h-auto rounded-xl px-3.5 py-2.5 font-semibold"
          disabled={busy || !r.canProlong}
          onClick={() => change(step)}
          aria-label={`${step} minuten langer`}
        >
          +{step} min
        </Button>
        <Button variant="destructive" className="h-auto flex-col gap-0 rounded-xl py-2 font-semibold" disabled={busy} onClick={stop}>
          Stop nu
          <small className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {refund ? `${hm(refund)} terug` : 'geen kosten meer'}
          </small>
        </Button>
      </div>
    </Card>
  )
}
