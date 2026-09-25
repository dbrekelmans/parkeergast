import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useApp } from '#/components/AppContext'
import { Plate } from '#/components/Plate'
import { SectionHeading } from '#/components/SectionHeading'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Empty, EmptyDescription } from '#/components/ui/empty'
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '#/components/ui/item'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { getHistory } from '#/lib/api'
import { formatPlate } from '#/lib/plate'
import { MINUTE, clock, dayLabel, hm } from '#/lib/time'

export const Route = createFileRoute('/_app/geschiedenis')({
  validateSearch: (search: Record<string, unknown>): { page?: number } =>
    Number(search.page) > 1 ? { page: Math.floor(Number(search.page)) } : {},
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ deps }) => getHistory({ data: { page: deps.page } }),
  head: () => ({ meta: [{ title: 'Geschiedenis · Parkeergast' }] }),
  component: History,
})

const EVERYONE = '*'
const chipClass = 'h-8 rounded-full bg-card px-3 text-[13px] aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background'

function History() {
  const history = Route.useLoaderData()
  const { account, openNew } = useApp()
  const navigate = useNavigate({ from: Route.fullPath })
  const [filter, setFilter] = useState(EVERYONE)
  const now = new Date()

  const nameFor = (plate: string) => account.plates.find((p) => p.value === plate)?.name
  const plates = [...new Set(history.items.map((h) => h.plate))]
  const rows = history.items.filter((h) => filter === EVERYONE || h.plate === filter)

  return (
    <main className="flex flex-col gap-3.5 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+140px)]">
      <SectionHeading
        title="Geschiedenis"
        aside={history.totalPages > 1 && `pagina ${history.page} van ${history.totalPages}`}
      />

      {plates.length > 1 && (
        <ToggleGroup
          variant="outline"
          spacing={1.5}
          aria-label="Filter op kenteken"
          className="w-full overflow-x-auto pb-0.5"
          value={[filter]}
          onValueChange={([next]) => setFilter(next ?? EVERYONE)}
        >
          <ToggleGroupItem value={EVERYONE} className={chipClass}>
            Iedereen
          </ToggleGroupItem>
          {plates.map((p) => (
            <ToggleGroupItem key={p} value={p} className={chipClass}>
              {nameFor(p) ?? formatPlate(p)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {rows.length === 0 ? (
        <Empty className="rounded-2xl border-[1.5px] bg-card">
          <EmptyDescription>Nog geen reserveringen.</EmptyDescription>
        </Empty>
      ) : (
        <Card className="gap-0 py-0" role="list">
          {rows.map((h) => {
            const from = new Date(h.from)
            const until = new Date(h.until)
            const minutes = Math.round((until.getTime() - from.getTime()) / MINUTE)
            return (
              <Item key={h.key} role="listitem" className="flex-nowrap gap-3 rounded-none border-b-border px-3.5 py-3 not-last:border-b">
                <ItemMedia>
                  <Plate value={h.plate} small />
                </ItemMedia>
                <ItemContent className="min-w-0 gap-0">
                  <ItemTitle className="text-sm font-semibold">{nameFor(h.plate) ?? 'Gast'}</ItemTitle>
                  <ItemDescription className="text-[13px] leading-snug tabular-nums">
                    {dayLabel(from, now)} {clock(from)}–{clock(until)} · {h.units ? hm(h.units) : 'gratis'}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full px-3 font-semibold"
                    onClick={() => openNew({ plate: h.plate, minutes: Math.max(30, Math.round(minutes / 30) * 30) })}
                  >
                    Opnieuw
                  </Button>
                </ItemActions>
              </Item>
            )
          })}
        </Card>
      )}

      {history.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={history.page <= 1}
            onClick={() => navigate({ search: history.page > 2 ? { page: history.page - 1 } : {} })}
          >
            Nieuwer
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            disabled={history.page >= history.totalPages}
            onClick={() => navigate({ search: { page: history.page + 1 } })}
          >
            Ouder
          </Button>
        </div>
      )}
    </main>
  )
}
