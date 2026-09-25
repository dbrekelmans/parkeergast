import type { Account, HistoryItem } from '#/lib/account'
import type { DvsPermit } from './dvs'

// DVS returns UTC timestamps, sometimes without the trailing Z.
const utc = (s: string) => new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(s) ? s : `${s}Z`).toISOString()

export function toAccount(permit: DvsPermit): Account {
  const media = permit.PermitMedias[0]
  const restricted = new Set(media.RestrictedProlongReservationIDs ?? [])
  return {
    zone: permit.ZoneCode,
    balance: media.Balance,
    balanceLimit: permit.BalanceLimit,
    remainingUpgrades: media.RemainingUpgrades,
    unitPrice: permit.UnitPrice,
    upgradeUnits: permit.UpgradeUnits ?? [],
    stepMinutes: permit.ProlongMinutes || 10,
    plates: (media.LicensePlates ?? []).map((p) => ({ value: p.Value, name: p.Name || null })),
    active: (media.ActiveReservations ?? [])
      .map((r) => ({
        id: r.ReservationID,
        plate: r.LicensePlate.Value,
        from: utc(r.ValidFrom),
        until: utc(r.ValidUntil),
        units: r.Units,
        canProlong: !restricted.has(r.ReservationID),
      }))
      .sort((a, b) => a.until.localeCompare(b.until)),
    blocks: (permit.BlockTimes ?? [])
      .filter((b) => b.IsAllowed)
      .map((b) => ({ from: utc(b.ValidFrom), until: utc(b.ValidUntil), paid: !b.IsFree })),
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

// The history item shape wasn't captured during reverse engineering, so this
// accepts the field names the reservation objects use plus likely variants.
export function toHistoryItem(item: Record<string, unknown>, index: number): HistoryItem | null {
  const plateField = item.LicensePlate as { Value?: string } | string | undefined
  const plate = typeof plateField === 'string' ? plateField : (plateField?.Value ?? str(item.LicensePlateValue))
  const from = str(item.ValidFrom) ?? str(item.DateFrom)
  const until = str(item.ValidUntil) ?? str(item.DateUntil)
  if (!plate || !from || !until) {
    console.warn('[dvs] unrecognised history item, keys:', Object.keys(item).join(', '))
    return null
  }
  return {
    key: String(item.ReservationID ?? item.ID ?? index),
    plate,
    from: utc(from),
    until: utc(until),
    units: typeof item.Units === 'number' ? item.Units : 0,
  }
}
