import { createContext, useContext } from 'react'
import type { Account } from '#/lib/account'
import type { Block } from '#/lib/tariff'
import type { Prefill } from './NewReservationForm'

export type AppContextValue = {
  account: Account
  blocks: Block[]
  openNew: (prefill?: Prefill) => void
  openTopUp: () => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside the app layout')
  return ctx
}
