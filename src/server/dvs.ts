// Client for the Parkeren Delft DVSPortal API. See
// docs/reverse-engineering/parkeren-delft/README.md for the endpoints.

const ORIGIN = 'https://vergunningen.parkerendelft.com'
const API = `${ORIGIN}/DVSPortal/api/`
const XSRF_COOKIE = '__Host-Xsrf-DVSPortal'

/** The DVS cookies for one user. Mutated in place as responses set cookies. */
export type Jar = Record<string, string>

export type LoginMethod = 'Gebruiker' | 'Pas'
export type Credentials = { method: LoginMethod; identifier: string; password: string; permitMediaTypeID: number }

const LOGIN_METHOD_IDS: Record<LoginMethod, number> = { Gebruiker: 1, Pas: 2 }

/** The DVS session is gone; log in again. */
export class DvsAuthError extends Error {
  constructor() {
    super('Je sessie bij Parkeren Delft is verlopen. Log opnieuw in.')
  }
}

/** DVS refused the request. The message is Dutch and meant for the user. */
export class DvsError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message)
  }
}

function storeCookies(jar: Jar, setCookies: string[]) {
  for (const header of setCookies) {
    const [pair, ...attrs] = header.split(';')
    const eq = pair.indexOf('=')
    if (eq < 1) continue
    const name = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    const expired = attrs.some((a) => {
      const [k, v] = a.trim().split('=')
      return (k.toLowerCase() === 'expires' && Date.parse(v) < Date.now()) || (k.toLowerCase() === 'max-age' && Number(v) <= 0)
    })
    if (!value || expired) delete jar[name]
    else jar[name] = value
  }
}

export async function dvsRequest<T>(jar: Jar, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Origin: ORIGIN,
    Referer: `${ORIGIN}/DVSPortal/`,
  }
  const cookie = Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  if (cookie) headers.Cookie = cookie
  if (jar[XSRF_COOKIE]) headers['X-XSRF-TOKEN'] = jar[XSRF_COOKIE]
  if (method === 'POST') headers['Content-Type'] = 'application/json'

  const res = await fetch(API + path, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body ?? null) : undefined,
    redirect: 'manual',
  })
  storeCookies(jar, res.headers.getSetCookie())

  if (res.status === 401 || res.status === 403) throw new DvsAuthError()
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new DvsError(data?.detail ?? data?.title ?? `Parkeren Delft gaf een fout (${res.status}). Probeer het later opnieuw.`)
  }
  if (data && typeof data === 'object' && data.ErrorMessage) throw new DvsError(data.ErrorMessage, data.Result)
  return data as T
}

export async function dvsLogin(jar: Jar, creds: Credentials): Promise<DvsBaseModel> {
  const res = await dvsRequest<DvsBaseModel>(jar, 'POST', 'login', {
    identifier: creds.identifier,
    loginMethod: LOGIN_METHOD_IDS[creds.method],
    password: creds.password,
    otp: null,
    resetCode: null,
    asIdentifier: null,
    zipCode: null,
    permitMediaTypeID: creds.permitMediaTypeID,
  })
  if (!res?.Permits?.length) throw new DvsError('Dit account heeft geen bezoekersvergunning.')
  return res
}

// ---- Response shapes (only the fields we use) ----

export type DvsLoginConfig = {
  PermitMediaTypes: { ID: number; Name: string }[]
  LoginMethods: string[]
  DefaultLoginMethod: number
}

export type DvsReservation = {
  ReservationID: number
  ValidFrom: string
  ValidUntil: string
  LicensePlate: { Value: string; DisplayValue?: string; Name: string | null }
  Units: number
}

export type DvsPermitMedia = {
  TypeID: number
  Code: string
  Balance: number
  RemainingUpgrades: number | null
  RestrictedProlongReservationIDs: number[] | null
  LicensePlates: { Value: string; Name: string | null }[] | null
  ActiveReservations: DvsReservation[] | null
}

export type DvsPermit = {
  ZoneCode: string
  ProlongMinutes: number
  BalanceLimit: number
  UnitPrice: number
  UpgradeUnits: number[] | null
  BlockTimes: { ValidFrom: string; ValidUntil: string; IsFree: boolean; IsAllowed: boolean }[] | null
  PermitMedias: DvsPermitMedia[]
}

export type DvsBaseModel = { Permits: DvsPermit[] }

export type DvsHistoryPage = { Items: Record<string, unknown>[] | null; Page: number; TotalPages: number }
