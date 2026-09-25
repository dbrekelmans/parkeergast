import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import type { Account } from '#/lib/account'
import { startTopUp } from '#/lib/api'
import { euro, hm } from '#/lib/time'
import { errorMessage } from '#/lib/utils'
import { SummaryRow } from './SummaryRow'
import { Alert } from './ui/alert'
import { Button } from './ui/button'

export function TopUpForm({ account }: { account: Account }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startTopUpFn = useServerFn(startTopUp)

  const units = account.upgradeUnits[0]
  if (!units)
    return (
      <Alert variant="info" role="note">
        Opwaarderen is voor dit account niet mogelijk.
      </Alert>
    )

  const room = Math.min(account.balanceLimit - account.balance, account.remainingUpgrades ?? Infinity)
  const overLimit = account.balance + units > account.balanceLimit
  const overPeriod = account.remainingUpgrades !== null && units > account.remainingUpgrades
  const fits = units <= room

  async function pay() {
    setBusy(true)
    setError(null)
    try {
      const { redirectUrl } = await startTopUpFn({ data: { units } })
      window.location.href = redirectUrl
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-2xl border-2 border-primary p-3.5">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Pakket</div>
          <div className="text-[26px] leading-tight font-bold tracking-tight tabular-nums">{hm(units)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-muted-foreground">Prijs</div>
          <div className="text-[26px] leading-tight font-bold tracking-tight tabular-nums">{euro(units * account.unitPrice)}</div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 rounded-2xl bg-muted p-3.5">
        <SummaryRow label="Nu">{hm(account.balance)}</SummaryRow>
        <SummaryRow label="Na opwaarderen">{hm(account.balance + units)}</SummaryRow>
        <SummaryRow label="Maximum saldo">{hm(account.balanceLimit)}</SummaryRow>
        {account.remainingUpgrades !== null && <SummaryRow label="Nog te kopen deze periode">{hm(account.remainingUpgrades)}</SummaryRow>}
      </div>
      {overLimit ? (
        <Alert variant="warning">
          Dit pakket past nog niet: je saldo zou boven {hm(account.balanceLimit)} komen. Opwaarderen kan zodra je saldo{' '}
          {hm(account.balanceLimit - units)} of minder is, dus na nog {hm(account.balance - (account.balanceLimit - units))} parkeren.
        </Alert>
      ) : overPeriod ? (
        <Alert variant="warning">Je kunt deze periode nog {hm(account.remainingUpgrades ?? 0)} kopen. Dat is minder dan dit pakket.</Alert>
      ) : (
        <Alert variant="info" role="note">
          Je betaalt via de betaalpagina van Parkeren Delft en komt daarna op hun site terug.
        </Alert>
      )}
      {error && <Alert variant="warning">{error}</Alert>}
      <Button size="xl" disabled={!fits || busy} onClick={pay}>
        {busy ? 'Bezig…' : `${euro(units * account.unitPrice)} betalen`}
      </Button>
    </>
  )
}
