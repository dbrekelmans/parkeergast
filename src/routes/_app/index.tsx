import { createFileRoute } from '@tanstack/react-router'
import { ReservationCard } from '#/components/ReservationCard'
import { TariffStrip } from '#/components/TariffStrip'
import { useNow } from '#/components/useNow'
import { euro } from '#/lib/time'
import { useApp } from '#/components/AppContext'

export const Route = createFileRoute('/_app/')({ component: Overview })

function Overview() {
  const { account, blocks, openTopUp } = useApp()
  const now = useNow()
  const hours = Math.floor(account.balance / 60)
  const minutes = account.balance % 60

  return (
    <main className="screen">
      <section className="panel" aria-label="Saldo">
        <div className="balance-top">
          <div>
            <div className="label">Saldo</div>
            <div className="big num">
              {hours}
              <small>u</small>
              {minutes}
              <small>m</small>
            </div>
            <div className="label num">≈ {euro(account.balance * account.unitPrice)} aan parkeertijd</div>
          </div>
          <button className="ghost-btn" onClick={openTopUp}>
            Opwaarderen
          </button>
        </div>
        <TariffStrip blocks={blocks} now={now} />
      </section>

      <div className="section-h">
        <h2>Nu geparkeerd</h2>
        {account.active.length > 0 && <span>{account.active.length} actief</span>}
      </div>
      <div className="stack">
        {account.active.length === 0 ? (
          <div className="empty">Er staat nu niemand geparkeerd.</div>
        ) : (
          account.active.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              plates={account.plates}
              blocks={blocks}
              step={account.stepMinutes}
              now={now}
            />
          ))
        )}
      </div>
    </main>
  )
}
