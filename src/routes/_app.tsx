import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useCallback, useMemo, useState } from 'react'
import { AppContext, type AppContextValue } from '#/components/AppContext'
import { NewReservationForm, type Prefill } from '#/components/NewReservationForm'
import { Sheet } from '#/components/Sheet'
import { ToastProvider } from '#/components/Toast'
import { TopUpForm } from '#/components/TopUpForm'
import { getAccount, logOut } from '#/lib/api'
import { toBlocks } from '#/lib/tariff'

export const Route = createFileRoute('/_app')({
  loader: () => getAccount(),
  staleTime: 10_000,
  component: AppLayout,
})

type OpenSheet = { kind: 'new'; prefill: Prefill; key: number } | { kind: 'topup' } | null

function AppLayout() {
  const account = Route.useLoaderData()
  const blocks = useMemo(() => toBlocks(account.blocks), [account.blocks])
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const close = useCallback(() => setSheet(null), [])
  const logOutFn = useServerFn(logOut)

  const ctx = useMemo<AppContextValue>(
    () => ({
      account,
      blocks,
      openNew: (prefill = {}) => setSheet({ kind: 'new', prefill, key: Date.now() }),
      openTopUp: () => setSheet({ kind: 'topup' }),
    }),
    [account, blocks],
  )

  return (
    <AppContext.Provider value={ctx}>
      <ToastProvider>
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              parkeer<em>gast</em>
            </div>
            <div className="topbar-right">
              <span className="zone">Delft · {account.zone}</span>
              <button className="link-btn" onClick={() => logOutFn()}>
                Uitloggen
              </button>
            </div>
          </header>
          <Outlet />
        </div>

        <nav className="dock">
          <button className="cta" onClick={() => ctx.openNew()}>
            Gast aanmelden
          </button>
          <div className="tabs">
            <Link to="/" activeProps={{ className: 'active' }} activeOptions={{ exact: true }}>
              Overzicht
            </Link>
            <Link to="/geschiedenis" activeProps={{ className: 'active' }}>
              Geschiedenis
            </Link>
          </div>
        </nav>

        <Sheet open={sheet?.kind === 'new'} onClose={close} title="Gast aanmelden">
          {sheet?.kind === 'new' && (
            <NewReservationForm key={sheet.key} account={account} blocks={blocks} prefill={sheet.prefill} onDone={close} />
          )}
        </Sheet>
        <Sheet open={sheet?.kind === 'topup'} onClose={close} title="Saldo opwaarderen">
          <TopUpForm account={account} />
        </Sheet>
      </ToastProvider>
    </AppContext.Provider>
  )
}
