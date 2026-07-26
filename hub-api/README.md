# hub-api

Cloudflare Worker + D1 backend for the bri-gest connected hub. Separate
infrastructure from GitHub Pages (which serves `index.html`, `endo/`,
`gm/` from `main` and is untouched by anything here). Architecture,
decisions, and rationale live in [`CONNECTED-HUB-DESIGN.md`](../CONNECTED-HUB-DESIGN.md)
at the repo root — this file is just the how-to-run-it notes.

## Environments (D8)

Three tiers, only two of which are actually deployed Cloudflare resources:

- **local dev** — `npm run dev` (`wrangler dev --env staging`), local D1 via
  miniflare, ORCID sandbox credentials from `.dev.vars`. Free, undeployed.
- **staging** — `npm run deploy:staging`. Real deployed Worker + its own D1
  database, ORCID sandbox credentials. Any frontend surface pointed at it
  must show a visible "STAGING" badge.
- **production** — `npm run deploy:production`. Own D1 database, ORCID
  *production* registry credentials. Not created/deployed yet as of this
  session — deliberately: no production database exists until it's stood
  up on purpose, per design doc section 7.

One Cloudflare account, two named environments in `wrangler.toml`
(`[env.staging]` / `[env.production]`) — not separate accounts.

**There is no default/top-level deploy target on purpose.** Always pass
`--env staging` or `--env production` explicitly (the npm scripts already
do this). A bare `wrangler deploy` would target an environment with no D1
binding at all — not "accidentally production," but still not a target
you want to land on by omission.

## Endpoints (staging, as of build-order items 1-2)

| Method + path | Auth | What it does |
|---|---|---|
| `GET /health` | none | `{status, stage, version}` — proves the Worker is deployed and reachable |
| `GET /auth/orcid/login` | none | Redirects to ORCID's authorize page (sets a short-lived CSRF state cookie) |
| `GET /auth/orcid/callback` | none | ORCID redirects here with `?code=&state=`; exchanges the code for a token server-side, confirms identity, issues the session cookie |
| `GET /me` | session cookie | `{signedIn, orcid, name}` or `401 {signedIn:false}` — check who (if anyone) is currently signed in |
| `GET /auth/logout` | none | Clears the session cookie |
| `POST /events` | session cookie | Body `{pmid, source_tool, topic_id?, cached_title?, cached_journal?}` — writes one `flag_interesting` judgment-event, returns the inserted row (`201`). `source_tool` must be one of `endo`/`gm`/`hub`. One hardcoded event type on purpose — see `src/index.js`'s header comment |
| `GET /events?pmid=` | session cookie | Reads back all judgment-events for that PMID, newest first |

There's no frontend calling any of this yet (that's the still-open "hub touchpoint" work in
`BACKLOG.md`) — everything above was verified by hand: OAuth via a real browser session, `/events`
via `fetch()` in DevTools Console on the Worker's own origin (so the `HttpOnly` session cookie
is sent automatically without ever being exposed to script or copied out).

## One-time setup (requires a human with Cloudflare + ORCID accounts)

1. `npm install`
2. `npx wrangler login` — interactive browser OAuth, must be run by a
   person, not automatable.
3. `npx wrangler d1 create bri-gest-hub-staging --env staging` — copy the
   returned `database_id` into `wrangler.toml`'s `[[env.staging.d1_databases]]`
   block (currently a `REPLACE_ME_...` placeholder).
4. `npm run d1:migrate:staging` — applies `migrations/0001_init.sql`.
5. Register (or confirm) an ORCID **sandbox** app at
   https://sandbox.orcid.org — copy `.dev.vars.example` to `.dev.vars` and
   fill in the client id/secret for local dev. (Sandbox registration only
   accepts `@mailinator.com` addresses for account verification, and the
   "register API credentials" step is gated on your account's *primary*
   email being verified, not just any verified email on the account — a
   real snag hit during setup, easy to mistake for a UI bug.)
6. For a deployed staging Worker (not just local `wrangler dev`), set
   secrets server-side:
   ```
   npx wrangler secret put ORCID_CLIENT_SECRET --env staging
   npx wrangler secret put SESSION_SECRET --env staging   # any random string, e.g. openssl rand -base64 32
   ```
7. `npm run deploy:staging`, then confirm `GET https://<staging-url>/health`
   responds.

Production (`bri-gest-hub-production` D1 database, production ORCID
registry, `--env production` secrets and deploy) is deliberately not stood
up yet — see design doc section 7, item 4's note that "no production
database exists yet at this stage, and that's fine."

## Promotion (D8)

No CI pipeline for this yet — a solo-maintained project doesn't need one.
Promoting staging to production is a deliberate manual act:

```
npm run deploy:production
git tag hub-connected-v0.1
git push origin hub-connected-v0.1   # only once you actually mean to record this
```

The tag is the observable record that promotion happened and when —
matching how `endo-v5.x`/`gm-v1.x` are tracked.

## Schema changes

Add a new numbered file under `migrations/`, then
`wrangler d1 migrations apply <db-name> --env <env>`. Never edit an
already-applied migration file — add a new one, same discipline as the
append-only judgment-event log itself.
