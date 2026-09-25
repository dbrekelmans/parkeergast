import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plate } from '#/components/Plate'
import { formatPlate } from '#/lib/plate'
import { getHistory } from '#/lib/api'
import { MINUTE, clock, dayLabel, hm } from '#/lib/time'
import { useApp } from '#/components/AppContext'

export const Route = createFileRoute('/_app/geschiedenis')({
  validateSearch: (search: Record<string, unknown>): { page?: number } =>
    Number(search.page) > 1 ? { page: Math.floor(Number(search.page)) } : {},
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ deps }) => getHistory({ data: { page: deps.page } }),
  head: () => ({ meta: [{ title: 'Geschiedenis · Parkeergast' }] }),
  component: History,
})

function History() {
  const history = Route.useLoaderData()
  const { account, openNew } = useApp()
  const navigate = useNavigate({ from: Route.fullPath })
  const [filter, setFilter] = useState<string | null>(null)
  const now = new Date()

  const nameFor = (plate: string) => account.plates.find((p) => p.value === plate)?.name
  const plates = [...new Set(history.items.map((h) => h.plate))]
  const rows = history.items.filter((h) => !filter || h.plate === filter)

  return (
    <main className="screen">
      <div className="section-h">
        <h2>Geschiedenis</h2>
        {history.totalPages > 1 && (
          <span className="num">
            pagina {history.page} van {history.totalPages}
          </span>
        )}
      </div>

      {plates.length > 1 && (
        <div className="filter">
          <button className="chip" aria-pressed={!filter} onClick={() => setFilter(null)}>
            Iedereen
          </button>
          {plates.map((p) => (
            <button key={p} className="chip" aria-pressed={filter === p} onClick={() => setFilter(p)}>
              {nameFor(p) ?? formatPlate(p)}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty">Nog geen reserveringen.</div>
      ) : (
        <div className="hist">
          {rows.map((h) => {
            const from = new Date(h.from)
            const until = new Date(h.until)
            const minutes = Math.round((until.getTime() - from.getTime()) / MINUTE)
            return (
              <div className="hist-row" key={h.key}>
                <Plate value={h.plate} small />
                <div className="meta">
                  <b>{nameFor(h.plate) ?? 'Gast'}</b>
                  <span className="num">
                    {dayLabel(from, now)} {clock(from)}–{clock(until)} · {h.units ? hm(h.units) : 'gratis'}
                  </span>
                </div>
                <button className="again" onClick={() => openNew({ plate: h.plate, minutes: Math.max(30, Math.round(minutes / 30) * 30) })}>
                  Opnieuw
                </button>
              </div>
            )
          })}
        </div>
      )}

      {history.totalPages > 1 && (
        <div className="pager">
          <button
            className="chip"
            disabled={history.page <= 1}
            onClick={() => navigate({ search: history.page > 2 ? { page: history.page - 1 } : {} })}
          >
            Nieuwer
          </button>
          <button
            className="chip"
            disabled={history.page >= history.totalPages}
            onClick={() => navigate({ search: { page: history.page + 1 } })}
          >
            Ouder
          </button>
        </div>
      )}
    </main>
  )
}
