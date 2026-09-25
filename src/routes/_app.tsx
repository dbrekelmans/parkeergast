import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'
import { AppContext, type AppContextValue } from '#/components/AppContext'
import { Brand } from '#/components/Brand'
import { NewReservationForm, type Prefill } from '#/components/NewReservationForm'
import { TopUpForm } from '#/components/TopUpForm'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import { Toaster } from '#/components/ui/sonner'
import { getAccount, logOut } from '#/lib/api'
import { toBlocks } from '#/lib/tariff'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app')({
  loader: () => getAccount(),
  staleTime: 10_000,
  component: AppLayout,
})

type SheetKind = { kind: 'new'; prefill: Prefill; key: number } | { kind: 'topup' }

const tabClass = cn(buttonVariants({ variant: 'ghost' }), 'h-9 rounded-[10px] text-[13px] font-semibold text-muted-foreground')

function AppLayout() {
  const account = Route.useLoaderData()
  const blocks = useMemo(() => toBlocks(account.blocks), [account.blocks])
  // Kept after closing so the content stays rendered during the exit animation.
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  const [open, setOpen] = useState(false)
  const logOutFn = useServerFn(logOut)

  const ctx = useMemo<AppContextValue>(() => {
    const show = (next: SheetKind) => {
      setSheet(next)
      setOpen(true)
    }
    return {
      account,
      blocks,
      openNew: (prefill = {}) => show({ kind: 'new', prefill, key: Date.now() }),
      openTopUp: () => show({ kind: 'topup' }),
    }
  }, [account, blocks])

  return (
    <AppContext.Provider value={ctx}>
      <div className="mx-auto flex min-h-dvh max-w-app flex-col">
        <header className="flex items-center justify-between gap-3 px-5 pt-[calc(env(safe-area-inset-top,0px)+18px)] pb-2">
          <Brand />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-card font-normal text-muted-foreground">
              Delft · {account.zone}
            </Badge>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => logOutFn()}>
              Uitloggen
            </Button>
          </div>
        </header>
        <Outlet />
      </div>

      <nav className="fixed bottom-0 left-1/2 z-10 flex w-full max-w-app -translate-x-1/2 flex-col gap-2.5 bg-linear-to-t from-background from-70% to-transparent px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+14px)]">
        <Button size="xl" onClick={() => ctx.openNew()}>
          Gast aanmelden
        </Button>
        <div className="grid grid-cols-2 rounded-[14px] border bg-card p-1">
          <Link to="/" className={tabClass} activeProps={{ className: 'bg-muted text-foreground' }} activeOptions={{ exact: true }}>
            Overzicht
          </Link>
          <Link to="/geschiedenis" className={tabClass} activeProps={{ className: 'bg-muted text-foreground' }}>
            Geschiedenis
          </Link>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-app gap-0 rounded-t-3xl border-0">
          <div className="mx-auto mt-2.5 mb-1 h-1 w-10 shrink-0 rounded-full bg-border" />
          <SheetHeader className="px-4.5 pt-2 pb-2">
            <SheetTitle className="text-xl font-bold">{sheet?.kind === 'topup' ? 'Saldo opwaarderen' : 'Gast aanmelden'}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4.5 overflow-y-auto px-4.5 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+18px)]">
            {sheet?.kind === 'new' && (
              <NewReservationForm
                key={sheet.key}
                account={account}
                blocks={blocks}
                prefill={sheet.prefill}
                onDone={() => setOpen(false)}
              />
            )}
            {sheet?.kind === 'topup' && <TopUpForm account={account} />}
          </div>
        </SheetContent>
      </Sheet>

      <Toaster position="bottom-center" offset={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 136px)' }} mobileOffset={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 136px)' }} />
    </AppContext.Provider>
  )
}
