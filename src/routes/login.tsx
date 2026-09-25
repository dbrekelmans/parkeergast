import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { Brand } from '#/components/Brand'
import { Alert } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { getSignedIn, logIn } from '#/lib/api'
import { errorMessage } from '#/lib/utils'

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
    <div className="mx-auto flex min-h-dvh max-w-app flex-col">
      <div className="px-5 pt-[calc(env(safe-area-inset-top,0px)+18px)] pb-2">
        <Brand />
      </div>
      <main className="flex flex-col gap-5 px-4 pt-6 pb-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-[30px] leading-tight font-extrabold tracking-tight text-balance">Log in met je bezoekersvergunning</h1>
          <p className="text-muted-foreground">Gebruik dezelfde gegevens als op parkerendelft.com.</p>
        </div>

        <ToggleGroup
          aria-label="Inlogmethode"
          spacing={0}
          className="grid w-full grid-cols-2 rounded-[14px] border bg-card p-1"
          value={[method]}
          onValueChange={([next]) => next && setMethod(next as Method)}
        >
          <ToggleGroupItem value="Gebruiker" className="h-9 rounded-[10px]! text-[13px] font-semibold text-muted-foreground aria-pressed:text-foreground">
            Gebruikersnaam
          </ToggleGroupItem>
          <ToggleGroupItem value="Pas" className="h-9 rounded-[10px]! text-[13px] font-semibold text-muted-foreground aria-pressed:text-foreground">
            Meldnummer en pincode
          </ToggleGroupItem>
        </ToggleGroup>

        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier" className="text-[13px] font-semibold">
              {method === 'Gebruiker' ? 'Gebruikersnaam' : 'Meldnummer'}
            </Label>
            <Input
              id="identifier"
              className="h-10 rounded-[10px] bg-card text-base"
              autoComplete="username"
              inputMode={method === 'Pas' ? 'numeric' : undefined}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-[13px] font-semibold">
              {method === 'Gebruiker' ? 'Wachtwoord' : 'Pincode'}
            </Label>
            <Input
              id="password"
              className="h-10 rounded-[10px] bg-card text-base"
              type="password"
              autoComplete="current-password"
              inputMode={method === 'Pas' ? 'numeric' : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Label className="justify-between text-sm font-normal">
            Ingelogd blijven
            <Switch checked={remember} onCheckedChange={setRemember} />
          </Label>
          {error && <Alert variant="warning">{error}</Alert>}
          <Button type="submit" size="xl" disabled={busy}>
            {busy ? 'Bezig met inloggen…' : 'Inloggen'}
          </Button>
          <p className="text-[13px] text-muted-foreground">
            Parkeergast stuurt je gegevens door naar Parkeren Delft. Met "Ingelogd blijven" bewaren we ze versleuteld in een cookie op
            dit apparaat, zodat je niet elke 15 minuten opnieuw hoeft in te loggen.
          </p>
        </form>
      </main>
    </div>
  )
}
