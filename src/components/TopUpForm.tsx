import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import type { Account } from '#/lib/account'
import { startTopUp } from '#/lib/api'
import { euro, hm } from '#/lib/time'
import { errorMessage } from './Toast'

export function TopUpForm({ account }: { account: Account }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startTopUpFn = useServerFn(startTopUp)

  const units = account.upgradeUnits[0]
  if (!units) return <div className="callout">Opwaarderen is voor dit account niet mogelijk.</div>

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
      <div className="pkg">
        <div>
          <div className="label">Pakket</div>
          <div className="big num">{hm(units)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label">Prijs</div>
          <div className="big num">{euro(units * account.unitPrice)}</div>
        </div>
      </div>
      <div className="summary">
        <div className="sum-row">
          <span>Nu</span>
          <b className="num">{hm(account.balance)}</b>
        </div>
        <div className="sum-row">
          <span>Na opwaarderen</span>
          <b className="num">{hm(account.balance + units)}</b>
        </div>
        <div className="sum-row">
          <span>Maximum saldo</span>
          <b className="num">{hm(account.balanceLimit)}</b>
        </div>
        {account.remainingUpgrades !== null && (
          <div className="sum-row">
            <span>Nog te kopen deze periode</span>
            <b className="num">{hm(account.remainingUpgrades)}</b>
          </div>
        )}
      </div>
      {overLimit ? (
        <div className="callout warn">
          Dit pakket past nog niet: je saldo zou boven {hm(account.balanceLimit)} komen. Opwaarderen kan zodra je saldo{' '}
          {hm(account.balanceLimit - units)} of minder is, dus na nog {hm(account.balance - (account.balanceLimit - units))} parkeren.
        </div>
      ) : overPeriod ? (
        <div className="callout warn">Je kunt deze periode nog {hm(account.remainingUpgrades ?? 0)} kopen. Dat is minder dan dit pakket.</div>
      ) : (
        <div className="callout">Je betaalt via de betaalpagina van Parkeren Delft en komt daarna op hun site terug.</div>
      )}
      {error && <div className="callout warn">{error}</div>}
      <button className="cta" disabled={!fits || busy} onClick={pay}>
        {busy ? 'Bezig…' : `${euro(units * account.unitPrice)} betalen`}
      </button>
    </>
  )
}
