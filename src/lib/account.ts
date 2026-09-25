// The app's own view of a visitor account, mapped from the DVS BaseModel.
// Dates are ISO strings so they survive server-function serialisation.

export type SavedPlate = { value: string; name: string | null }

export type Reservation = {
  id: number
  plate: string
  from: string
  until: string
  /** Balance minutes charged for this reservation. */
  units: number
  canProlong: boolean
}

export type TariffBlock = { from: string; until: string; paid: boolean }

export type Account = {
  zone: string
  /** Minutes. */
  balance: number
  balanceLimit: number
  /** Minutes that can still be bought this period, or null when unlimited. */
  remainingUpgrades: number | null
  /** Euro per minute. */
  unitPrice: number
  upgradeUnits: number[]
  stepMinutes: number
  plates: SavedPlate[]
  active: Reservation[]
  blocks: TariffBlock[]
}

export type HistoryItem = {
  key: string
  plate: string
  from: string
  until: string
  units: number
}

export type HistoryPage = { items: HistoryItem[]; page: number; totalPages: number }
