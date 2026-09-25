import { redirect } from '@tanstack/react-router'
import { useSession } from '@tanstack/react-start/server'
import { DvsAuthError, DvsError, dvsLogin, type Credentials, type Jar } from './dvs'

type SessionData = {
  jar?: Jar
  /** Only kept when the user ticks "Ingelogd blijven", to log in again once DVS expires the session. */
  creds?: Credentials
  media?: { code: string; typeId: number }
}

const DEV_SECRET = 'parkeergast-dev-only-secret-do-not-use-in-production'

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (s && s.length >= 32) return s
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set to at least 32 characters')
  return DEV_SECRET
}

// The session cookie is sealed (encrypted and signed) with SESSION_SECRET.
export const appSession = () =>
  useSession<SessionData>({
    name: 'parkeergast',
    password: secret(),
    maxAge: 60 * 60 * 24 * 90,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' },
  })

export type Dvs = { jar: Jar; media: { code: string; typeId: number } }

/**
 * Runs `fn` with the user's DVS cookies. When DVS says the session is gone,
 * logs in again with the remembered credentials and retries once; without
 * them, sends the user to the login page.
 */
export async function withDvs<T>(fn: (dvs: Dvs) => Promise<T>): Promise<T> {
  const session = await appSession()
  const { jar, creds, media } = session.data
  if (!jar || !media) throw redirect({ to: '/login' })

  const current = { jar: { ...jar }, media }
  try {
    const result = await fn(current)
    await session.update({ jar: current.jar })
    return result
  } catch (error) {
    if (!(error instanceof DvsAuthError)) {
      await session.update({ jar: current.jar })
      throw error
    }
  }

  if (!creds) {
    await session.clear()
    throw redirect({ to: '/login' })
  }
  const fresh = { jar: {} as Jar, media }
  try {
    await dvsLogin(fresh.jar, creds)
  } catch (error) {
    if (!(error instanceof DvsError || error instanceof DvsAuthError)) throw error
    await session.clear()
    throw redirect({ to: '/login' })
  }
  const result = await fn(fresh)
  await session.update({ jar: fresh.jar })
  return result
}
