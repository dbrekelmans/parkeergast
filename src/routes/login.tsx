import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { getSignedIn, logIn } from '#/lib/api'
import { errorMessage } from '#/components/Toast'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (await getSignedIn()) throw redirect({ to: '/' })
  },
  head: () => ({ meta: [{ title: 'Inloggen · Parkeergast' }] }),
  component: Login,
})

type Method = 'Gebruiker' | 'Pas'

function Login() {
  const router = useRouter()
  const [method, setMethod] = useState<Method>('Gebruiker')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await logIn({ data: { method, identifier, password, remember } })
      if (!res.ok) {
        setError(res.message)
        return
      }
      await router.navigate({ to: '/' })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          parkeer<em>gast</em>
        </div>
      </div>
      <main className="login">
        <div>
          <h1>Log in met je bezoekersvergunning</h1>
          <p style={{ marginTop: 8 }}>Gebruik dezelfde gegevens als op parkerendelft.com.</p>
        </div>

        <div className="segmented" role="group" aria-label="Inlogmethode">
          <button type="button" aria-pressed={method === 'Gebruiker'} onClick={() => setMethod('Gebruiker')}>
            Gebruikersnaam
          </button>
          <button type="button" aria-pressed={method === 'Pas'} onClick={() => setMethod('Pas')}>
            Meldnummer en pincode
          </button>
        </div>

        <form className="form" onSubmit={submit}>
          <div>
            <label className="field-l" htmlFor="identifier">
              {method === 'Gebruiker' ? 'Gebruikersnaam' : 'Meldnummer'}
            </label>
            <input
              id="identifier"
              className="text-in"
              autoComplete="username"
              inputMode={method === 'Pas' ? 'numeric' : undefined}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-l" htmlFor="password">
              {method === 'Gebruiker' ? 'Wachtwoord' : 'Pincode'}
            </label>
            <input
              id="password"
              className="text-in"
              type="password"
              autoComplete="current-password"
              inputMode={method === 'Pas' ? 'numeric' : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <label className="toggle">
            <span>Ingelogd blijven</span>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          </label>
          {error && <div className="callout warn">{error}</div>}
          <button className="cta" disabled={busy}>
            {busy ? 'Bezig met inloggen…' : 'Inloggen'}
          </button>
          <p className="fine">
            Parkeergast stuurt je gegevens door naar Parkeren Delft. Met "Ingelogd blijven" bewaren we ze versleuteld in een cookie op
            dit apparaat, zodat je niet elke 15 minuten opnieuw hoeft in te loggen.
          </p>
        </form>
      </main>
    </div>
  )
}
