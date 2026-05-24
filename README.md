# wispr-web

Next.js 15 + TypeScript + Tailwind frontend for [Wispr](https://wispr.rushyendra.dev) — a web-only zero-knowledge clipboard.

**Backend counterpart:** [`dog-broad/wispr-api`](https://github.com/dog-broad/wispr-api) (FastAPI + Postgres + Redis).

This repo is structured for eventual open-sourcing — the client crypto is meant to be readable and auditable.

## Quickstart

Requires Node 20+ and pnpm 11+.

```bash
pnpm install
cp .env.example .env.local      # optional in dev; defaults work locally
pnpm dev                        # http://localhost:3000
```

By default the app calls the api at `http://localhost:8000`. Override via `NEXT_PUBLIC_API_BASE_URL` in `.env.local` to point at a deployed environment.

### Run the whole stack locally

Two terminals — one per repo. The api side handles CORS for `http://localhost:3000` out of the box:

```bash
# terminal 1 — sibling wispr-api repo
cd ../wispr-api && docker compose up -d --build

# terminal 2 — this repo
pnpm dev
```

Then open <http://localhost:3000>. The `/styleguide` page has a "live env" badge at the top that pings the api `/health` endpoint and turns moss-green when the wire is up.

Build / verify:

```bash
pnpm build        # production build, prerenders all routes
pnpm typecheck    # tsc --noEmit, strict
pnpm lint         # next lint
pnpm format       # prettier --write
```

## Routes

| Path           | Purpose                                                                       | Indexable |
|----------------|-------------------------------------------------------------------------------|-----------|
| `/`            | Home — composer shell with the four-mode strip                                | yes       |
| `/about`       | Plain-English explanation of how Wispr works + the security model             | yes       |
| `/styleguide`  | Internal visual language reference. Decommissions before `link-foundation` merges to `main`. | no        |
| `/robots.txt`  | Allow `/` and `/about`; disallow receive routes + `/styleguide`               | —         |
| `/sitemap.xml` | Marketing pages only                                                          | —         |

## Stack

- **Next.js 15** App Router with typed routes
- **React 19**
- **TypeScript** strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Tailwind 4** (CSS-first via `@theme`)
- **next/font** for Silkscreen, Pixelify Sans, VT323

## Environment

`.env.example` is the contract. Copy to `.env.local` to override:

| Var                          | Default (dev)          | Purpose                                          |
|------------------------------|------------------------|--------------------------------------------------|
| `NEXT_PUBLIC_API_BASE_URL`   | `http://localhost:8000`| Base URL of the wispr-api service. No trailing slash. |

`lib/env.ts` falls back to the dev defaults if a var is missing, in any environment. Deployed environments override via Vercel's platform env config. A stale-default deploy is caught visibly by the live-env badge on `/styleguide`, so we don't need a build-time guard.

## Aesthetic

Full retro pixel art. Three fonts (Silkscreen display, Pixelify Sans body, VT323 for digits and mono), six colors (cream `#f4ecd8`, navy `#1f1a2e`, pink `#ff6188`, purple `#8b5fbf`, moss `#7a9e7e`, marigold `#f9b572`), chunky pixel borders, offset solid shadows, `steps()`-only motion, the Wisp mascot.

The full rule set is encoded directly in the design tokens (`app/globals.css` under `@theme`) and the primitive components in `components/pixel/`. The `/styleguide` route is the living reference while the first ship cycle is in flight; the real production pages adopt the same primitives so the demo can be removed without visual regression.

## Layout

```
app/
├── layout.tsx        Root layout — fonts, theme bootstrap, atmosphere layers
├── page.tsx          /
├── about/page.tsx    /about
├── styleguide/       /styleguide (noindex; pre-merge decommission)
├── globals.css       Design tokens (@theme) + atmosphere + motion
├── robots.ts         Allow / and /about
└── sitemap.ts        Marketing-only

components/pixel/     Pixel design primitives — buttons, cards, inputs,
                      badges, pills, logo, mascot, theme toggle, atmosphere,
                      LiveApiBadge (smoke-pings /health on /styleguide)

lib/
├── cn.ts             Tiny className joiner
└── env.ts            Typed env loader — single read site for process.env;
                      falls back to dev defaults in any environment
```
