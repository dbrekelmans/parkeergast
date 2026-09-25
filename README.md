# parkeergast

A friendlier front end for the Parkeren Delft visitor permit
(`vergunningen.parkerendelft.com/DVSPortal`). Built with TanStack Start.

```bash
pnpm install
pnpm dev
```

## How it works

The browser never talks to Parkeren Delft directly. Server functions in
`src/lib/api.ts` call the DVS API (`src/server/dvs.ts`) and keep the DVS
session cookies in our own session cookie, sealed with `SESSION_SECRET`.

When the user ticks "Ingelogd blijven", their DVS credentials are sealed into
that cookie too, so the server can log in again when DVS expires the session.

API notes: `docs/reverse-engineering/parkeren-delft/README.md`.

## Configuration

| Variable | |
|---|---|
| `SESSION_SECRET` | At least 32 characters. Required in production; development falls back to a fixed secret. |

## Build

```bash
pnpm build
```
