import { createFileRoute } from '@tanstack/react-router'
import { useApp } from '#/components/AppContext'
import { ReservationCard } from '#/components/ReservationCard'
import { SectionHeading } from '#/components/SectionHeading'
import { TariffStrip } from '#/components/TariffStrip'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Empty, EmptyDescription } from '#/components/ui/empty'
import { useNow } from '#/components/useNow'
import { euro } from '#/lib/time'

export const Route = createFileRoute('/_app/')({ component: Overview })

function Overview() {
  const { account, blocks, openTopUp } = useApp()
  const now = useNow()
  const hours = Math.floor(account.balance / 60)
  const minutes = account.balance % 60

  return (
    <main className="flex flex-col gap-3.5 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+140px)]">
      <Card aria-label="Saldo" className="gap-3.5 p-4.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Saldo</div>
            <div className="text-[34px] leading-tight font-bold tracking-tight tabular-nums">
              {hours}
              <small className="mr-1 ml-0.5 text-lg font-semibold text-muted-foreground">u</small>
              {minutes}
              <small className="ml-0.5 text-lg font-semibold text-muted-foreground">m</small>
            </div>
            <div className="text-xs font-medium text-muted-foreground tabular-nums">
              ≈ {euro(account.balance * account.unitPrice)} aan parkeertijd
            </div>
          </div>
          <Button variant="secondary" className="rounded-full px-3.5 font-semibold" onClick={openTopUp}>
            Opwaarderen
          </Button>
        </div>
        <TariffStrip blocks={blocks} now={now} />
      </Card>

      <SectionHeading title="Nu geparkeerd" aside={account.active.length > 0 && `${account.active.length} actief`} />
      <div className="flex flex-col gap-3">
        {account.active.length === 0 ? (
          <Empty className="rounded-2xl border-[1.5px] bg-card">
            <EmptyDescription>Er staat nu niemand geparkeerd.</EmptyDescription>
          </Empty>
        ) : (
          account.active.map((r) => (
            <ReservationCard key={r.id} reservation={r} plates={account.plates} blocks={blocks} step={account.stepMinutes} now={now} />
          ))
        )}
      </div>
    </main>
  )
}
