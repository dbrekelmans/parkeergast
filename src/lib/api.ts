import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { Account, HistoryPage } from './account'
import { isPlausiblePlate, normalizePlate } from './plate'
import { toDvsIso } from './time'
import {
  DvsAuthError,
  DvsError,
  dvsLogin,
  dvsRequest,
  type DvsBaseModel,
  type DvsHistoryPage,
  type DvsLoginConfig,
  type DvsPermit,
  type Jar,
  type LoginMethod,
} from '#/server/dvs'
import { toAccount, toHistoryItem } from '#/server/map'
import { appSession, withDvs, type Dvs } from '#/server/session'

const mediaBody = ({ media }: Dvs) => ({ permitMediaTypeID: media.typeId, permitMediaCode: media.code })

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export const getSignedIn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await appSession()
  return Boolean(session.data.jar && session.data.media)
})

export const logIn = createServerFn({ method: 'POST' })
  .validator((d: { method: LoginMethod; identifier: string; password: string; remember: boolean }) => {
    assert(d.method === 'Gebruiker' || d.method === 'Pas', 'Onbekende inlogmethode')
    assert(typeof d.identifier === 'string' && d.identifier.trim(), 'Vul je gebruikersnaam of meldnummer in.')
    assert(typeof d.password === 'string' && d.password, 'Vul je wachtwoord of pincode in.')
    return { ...d, identifier: d.identifier.trim(), remember: Boolean(d.remember) }
  })
  .handler(async ({ data }) => {
    const jar: Jar = {}
    try {
      const config = await dvsRequest<DvsLoginConfig>(jar, 'GET', 'login')
      const permitMediaTypeID = config.PermitMediaTypes[0]?.ID ?? 4
      const creds = { method: data.method, identifier: data.identifier, password: data.password, permitMediaTypeID }
      const base = await dvsLogin(jar, creds)
      const media = base.Permits[0].PermitMedias[0]
      const session = await appSession()
      await session.clear()
      await session.update({
        jar,
        media: { code: media.Code, typeId: media.TypeID },
        creds: data.remember ? creds : undefined,
      })
      return { ok: true as const }
    } catch (error) {
      if (error instanceof DvsError || error instanceof DvsAuthError) {
        const message = /username or password is incorrect/i.test(error.message)
          ? 'Deze combinatie van gegevens klopt niet. Controleer ze en probeer het opnieuw.'
          : error.message
        return { ok: false as const, message }
      }
      throw error
    }
  })

export const logOut = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await appSession()
  const { jar } = session.data
  if (jar) await dvsRequest(jar, 'POST', 'login/logout', null).catch(() => {})
  await session.clear()
  throw redirect({ to: '/login' })
})

export const getAccount = createServerFn({ method: 'GET' }).handler(
  (): Promise<Account> =>
    withDvs(async (dvs) => {
      try {
        const base = await dvsRequest<DvsBaseModel>(dvs.jar, 'POST', 'login/getbase', null)
        return toAccount(base.Permits[0])
      } catch (error) {
        // getbase reports an expired session as an ErrorMessage, not a 401.
        if (error instanceof DvsError) throw new DvsAuthError()
        throw error
      }
    }),
)

export const createReservation = createServerFn({ method: 'POST' })
  .validator((d: { plate: string; from: string; until: string; saveAs?: string | null }) => {
    assert(isPlausiblePlate(d.plate), 'Dit kenteken klopt niet.')
    assert(Date.parse(d.until) > Date.parse(d.from), 'De eindtijd moet na de begintijd liggen.')
    return { ...d, plate: normalizePlate(d.plate) }
  })
  .handler(({ data }) =>
    withDvs(async (dvs) => {
      await dvsRequest<{ Permit: DvsPermit }>(dvs.jar, 'POST', 'reservation/create', {
        LicensePlate: { Value: data.plate },
        ...mediaBody(dvs),
        DateFrom: toDvsIso(new Date(data.from)),
        DateUntil: toDvsIso(new Date(data.until)),
      })
      if (data.saveAs != null) {
        const name = data.saveAs.trim() || null
        // The reservation stands even if saving the plate fails.
        await dvsRequest(dvs.jar, 'POST', 'permitmedialicenseplate/upsert', {
          ...mediaBody(dvs),
          licensePlate: { Value: data.plate, Name: name },
          updateLicensePlate: null,
          name,
        }).catch((error) => console.warn('[dvs] saving plate failed', error))
      }
    }),
  )

export const changeReservation = createServerFn({ method: 'POST' })
  .validator((d: { id: number; minutes: number }) => {
    assert(Number.isInteger(d.id) && Number.isInteger(d.minutes) && d.minutes !== 0, 'Ongeldige wijziging')
    return d
  })
  .handler(({ data }) =>
    withDvs(async (dvs) => {
      await dvsRequest(dvs.jar, 'POST', 'reservation/update', {
        Minutes: data.minutes,
        ReservationID: data.id,
        ...mediaBody(dvs),
      })
    }),
  )

export const endReservation = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => {
    assert(Number.isInteger(d.id), 'Ongeldige reservering')
    return d
  })
  .handler(({ data }) =>
    withDvs(async (dvs) => {
      await dvsRequest(dvs.jar, 'POST', 'reservation/end', { ReservationID: data.id, ...mediaBody(dvs) })
    }),
  )

export const removePlate = createServerFn({ method: 'POST' })
  .validator((d: { plate: string; name: string | null }) => d)
  .handler(({ data }) =>
    withDvs(async (dvs) => {
      await dvsRequest(dvs.jar, 'POST', 'permitmedialicenseplate/remove', {
        ...mediaBody(dvs),
        licensePlate: { Value: data.plate, Name: data.name },
        name: data.name,
      })
    }),
  )

export const getHistory = createServerFn({ method: 'GET' })
  .validator((d: { page: number }) => ({ page: Math.max(1, Math.floor(Number(d.page) || 1)) }))
  .handler(
    ({ data }): Promise<HistoryPage> =>
      withDvs(async (dvs) => {
        const res = await dvsRequest<DvsHistoryPage>(dvs.jar, 'POST', 'history/reservations', {
          ...mediaBody(dvs),
          page: data.page,
        })
        return {
          items: (res?.Items ?? []).flatMap((item, i) => toHistoryItem(item, i) ?? []),
          page: res?.Page ?? data.page,
          totalPages: res?.TotalPages ?? 1,
        }
      }),
  )

export const startTopUp = createServerFn({ method: 'POST' })
  .validator((d: { units: number }) => {
    assert(Number.isInteger(d.units) && d.units > 0, 'Ongeldig pakket')
    return d
  })
  .handler(({ data }) =>
    withDvs(async (dvs) => {
      const res = await dvsRequest<{ RedirectUrl?: string }>(dvs.jar, 'POST', 'upgrade', {
        ...mediaBody(dvs),
        unitsToAdd: data.units,
        customerInvoiceReference: '',
      })
      if (!res?.RedirectUrl) throw new DvsError('Parkeren Delft gaf geen betaallink terug. Probeer het later opnieuw.')
      return { redirectUrl: res.RedirectUrl }
    }),
  )
