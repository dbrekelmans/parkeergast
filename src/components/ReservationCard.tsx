import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import type { Reservation, SavedPlate } from '#/lib/account'
import { changeReservation, createReservation, endReservation } from '#/lib/api'
import { formatPlate } from '#/lib/plate'
import { paidMinutes, type Block } from '#/lib/tariff'
import { MINUTE, ceilMinute, clock, dayLabel, floorMinute, hm } from '#/lib/time'
import { Plate } from './Plate'
import { errorMessage, useToast } from './Toast'

type Props = { reservation: Reservation; plates: SavedPlate[]; blocks: Block[]; step: number; now: Date }

export function ReservationCard({ reservation: r, plates, blocks, step, now }: Props) {
  const router = useRouter()
  const toast = useToast()
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
      toast(errorMessage(error), { error: true })
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
          undo: () =>
            createFn({
              data: { plate: r.plate, from: floorMinute(new Date()).toISOString(), until: r.until },
            })
              .then(() => router.invalidate())
              .then(() => toast(`${formatPlate(r.plate)} staat weer geparkeerd tot ${clock(until)}`))
              .catch((error) => toast(errorMessage(error), { error: true })),
        }),
    )

  return (
    <div className="card">
      <div className="card-head">
        <Plate value={r.plate} />
        <div className="who">
          {name && <b>{name}</b>}
          sinds {clock(from)}
        </div>
      </div>
      <div className="countdown">
        <div>
          <div className="label">Nog</div>
          <div className="big num">{hm(left)}</div>
        </div>
        <div className="until num">
          tot {clock(until)}
          <br />
          {dayLabel(until, now)}
        </div>
      </div>
      <div className="progress" aria-hidden>
        <i style={{ width: `${done}%` }} />
      </div>
      <div className="card-actions">
        <button className="step" disabled={busy || !r.canProlong || !canShorten} onClick={() => change(-step)} aria-label={`${step} minuten korter`}>
          −{step} min
        </button>
        <button className="step" disabled={busy || !r.canProlong} onClick={() => change(step)} aria-label={`${step} minuten langer`}>
          +{step} min
        </button>
        <button className="stop" disabled={busy} onClick={stop}>
          Stop nu
          <small className="num">{refund ? `${hm(refund)} terug` : 'geen kosten meer'}</small>
        </button>
      </div>
    </div>
  )
}
