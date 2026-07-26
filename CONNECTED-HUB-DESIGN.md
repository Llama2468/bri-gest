# Connected Hub — design document

Status: **not started.** This consolidates and extends what was previously scattered across
`BACKLOG.md`'s "The hub — a different project" section and one-line mentions in `CLAUDE.md`.
Written 2026-07-26, before any code exists, so the next session opens against a clear plan
instead of re-deriving one. `BACKLOG.md` still owns the day-to-day task list; this file owns
the architecture and the decisions that shouldn't be re-litigated per session.

---

## 1. What this is, in one paragraph

A shared identity and curation layer sitting alongside the two standalone tools (`endo/`,
`gm/`), letting registered users (via ORCID) flag PMIDs as interesting to others, building a
**curation graph** — provenanced, typed judgment-events attached to PMID pointers — that the
standalone tools can later read from and write to, without either tool depending on it to
function.

## 2. Non-goals — read this before writing any code

- **Not a feature of the endocrine or GM tools.** Bolting per-user save lists, sharing, or
  commenting onto a single-file `localStorage` app produces something that works for exactly
  one person and then has to be thrown away. This is a separate system the tools optionally
  talk to.
- **Not a paper library.** The hub never stores abstracts, titles, or any PubMed content
  itself — only PMID pointers and judgment-events about them. Fetching the actual article
  data stays the standalone tools' job, straight from NCBI, same as today.
- **Not built ahead of content.** The output-templating layer (curriculum reading lists, gap
  analysis, atlas nodes) is explicitly phase-gated behind having real judgment-events to
  template against. Do not build it early because it's the "interesting" part.
- **Not a replacement for the standalone tools.** They stay useful with zero network calls to
  this system, exactly as they are today. The hub augments; it never becomes a dependency.

## 3. Architecture

### 3.1 Identity — ORCID OAuth

Non-negotiable, and not just a login mechanism — it **is** the trust model. A judgment-event
is only worth anything if it's attached to a real, verifiable professional identity; anonymous
or self-asserted identity defeats the entire point of a curation graph over a bookmark list.

Registration on orcid.org was in progress as of the last time this was touched (per
`BACKLOG.md` §4) — confirm current status before assuming it's ready. The OAuth token
exchange (client secret) must happen server-side in the Worker, never in the static frontend;
the client secret must never enter this repo or any client-side bundle.

### 3.2 Backend — Cloudflare Workers + D1

Chosen for its simplicity and cost (Workers + D1 is CPU-metered rather than always-on, and D1
free-tier is generous for the actual data volume this project will produce for a long time).
This is genuinely separate infrastructure from GitHub Pages — a Cloudflare account, `wrangler`
deploys, a D1 SQLite database — and touches the static hosting side of this repo not at all,
except for whatever fetch calls the frontend eventually makes to it.

### 3.3 Data model — a curation graph, not a paper library

The hub stores PMID pointers plus typed, provenanced expert-judgment overlays:

- **Node:** a PMID (no article content, just the identifier and maybe a denormalised
  title/journal cache for display — TBD, see D2).
- **Edge / event:** a judgment-event — *this ORCID-identified person asserted this typed
  judgment about this PMID at this time.* Append-only. Typed, not free-text, so the schema
  can be queried and aggregated (this is what makes it a graph and not a comment section).
- **The standalone tools are sensors.** They emit judgment-events into the graph via the
  Worker API. This is why the tools stay useful on their own (see non-goals) and why the hub
  never becomes a single point of failure for them.

### 3.4 The three originally-requested features, mapped onto the architecture

| Feature asked for | Maps to |
|---|---|
| Persistent per-user save lists | ORCID identity + D1 replaces `localStorage`; the pool becomes portable across devices — the actual user-facing win, not the graph itself |
| Forwarding a saved article into a shared pool | The graph's most primitive judgment-event type: *this identified expert flagged this PMID as of interest to others.* Build this first |
| Ranking, reviewing, commenting | Richer typed judgment-events on the same substrate. These make the graph worth more than a bookmark list — but are meaningless without content in the graph already |

## 4. Repo, infrastructure & branching strategy

This section didn't exist before 2026-07-26 — added because the standalone tools are now a
polished, live, daily-use product, and this work must not put that at risk.

- **Branch:** `brigest-connected`, cut from `main` at the point this design doc lands. Confirmed
  via `git branch -a` (2026-07-26) that this branch does **not** exist yet despite being named
  in `BACKLOG.md` — create it fresh, don't assume prior work is sitting on it.
- **GitHub Pages already only deploys from `main`** (standard default for this kind of repo) —
  confirm this in the repo's Pages settings before relying on it, but if so, work on
  `brigest-connected` is automatically invisible to the live site for free, with no extra
  infrastructure needed. This is the cheapest possible isolation mechanism; use it rather than
  inventing a parallel deploy target.
- **Directory isolation, not file mutation.** Build the Worker source and any new frontend
  code in new top-level directories (suggest `/hub-api/` for the Worker, `/connected/` for any
  new frontend surface) rather than editing `index.html`, `endo/index.html`, or `gm/index.html`
  in place. This keeps the diff against `main` almost entirely additive, so merging back is a
  low-risk review rather than a rewrite of files that are currently working, tested, and live.
  The one deliberate exception: a single new link/section added to the hub once there's
  something real to link to (see below) — everything else about the existing three tools
  should be untouched by this branch until that point.
- **Cloudflare deploy is a separate pipeline.** A `wrangler deploy` (manual or its own GitHub
  Actions workflow, gated to the `brigest-connected` branch or manual dispatch) handles the
  Worker/D1 side. It must never share a workflow file with `.github/workflows/syntax-check.yml`
  — keep the blast radius of a broken Workers deploy completely separate from the static-site
  syntax gate that protects the three live tools.
- **Merge criteria back to `main`:** only merge once (a) identity + first emission event work
  end-to-end against a real (even if empty) D1 database, and (b) the one integration touchpoint
  in the hub is reviewed and deliberate, not incidental. Do not merge partial/broken Workers
  code just because a session ran out of time — `brigest-connected` can sit unmerged indefinitely;
  `main` staying polished is the higher-priority invariant.
- **Secrets never enter this repo.** ORCID client secret and any Cloudflare API tokens live in
  Cloudflare's own secrets store / GitHub Actions secrets, never in `wrangler.toml` committed
  to the repo, never in frontend code.

### 4.1 Development/production environment hygiene — added 2026-07-26

**Explicit requirement, stated ahead of any code existing:** this project now has a live,
polished, daily-use product behind it, and that raises the bar for how casually a "dev"
version of the connected-hub backend is allowed to touch anything real. Branch isolation
(above) protects the *static frontend*. It does **not** by itself protect the *backend* —
Cloudflare Workers and D1 are a different failure surface, and "it's on a branch" doesn't
mean anything once a Worker is actually deployed and reachable. Environment separation there
has to be deliberate, not assumed.

Non-negotiable, regardless of how D8 (below) resolves the specifics:

- **Separate Cloudflare environments from the first deploy, not retrofitted later.**
  `wrangler.toml` `[env.staging]` / `[env.production]` (or a three-tier dev/staging/prod split
  if that turns out to be warranted) — decided under D8, but *some* separation exists before
  the Worker is ever deployed, not added after something goes wrong.
- **Separate D1 databases per environment.** Development and staging code must never bind to
  the production database. This is the same principle as never testing a migration against a
  production table directly — just enforced at the infrastructure level instead of by
  discipline alone.
- **Separate ORCID registrations per environment.** The sandbox registry for development and
  staging, the production registry only for what's actually live. Never share a client
  id/secret pair across environments — if the sandbox credential leaks, nothing real is
  exposed; that's the point of the separation.
- **A visible environment indicator in any non-production frontend surface** (e.g. a small
  "STAGING" badge), so testing against staging is never mistaken for testing against
  production, or vice versa, by whoever's looking at the screen in the moment.
- **A named promotion step, not an implicit one.** Something must observably happen — a
  deploy command, a tag, a checklist — when a change moves from staging to production. It
  should never be possible to say "I think that's live" without being able to point at the
  step that made it so.
- **The connected-hub component gets its own version identifier**, tracked the same
  transparent way `endo-v5.9`/`gm-v1.1` are — e.g. `hub-connected-v0.1` once something is
  actually deployed — so its rollout history is as visible as the two existing tools', not a
  separate, less-tracked class of change.

This section exists because the user asked for it explicitly, as a standing priority for all
infrastructure work going forward, not just this project — treat it as durable guidance, not
a one-off checklist item to satisfy once and move past.

## 5. Build order — not negotiable

**Identity → emission → accumulate real content → *then* the output-templating layer.**

1. ORCID OAuth working end-to-end (login, token exchange in the Worker, session handling).
2. The single primitive emission event (forward a saved article into the shared pool) writing
   to D1 and reading back correctly.
3. Let real content accumulate — this phase has no code deliverable, just usage.
4. Only then: richer judgment-event types (rank/review/comment), and only after that,
   the templating layer (curriculum reading lists, gap analysis, atlas nodes) — which is
   architecturally specified in principle but deliberately not designed in detail yet, because
   designing it against an empty graph would just be guessing.

## 6. Architectural decisions (D1–D8) — confirmed 2026-07-26

`BACKLOG.md` names seven ("D1–D7") as unresolved but never enumerated them — confirmed by
searching the full working tree, every branch, and git history: no prior enumeration existed
anywhere before this doc. D1–D7 were drafted as a first-pass reconstruction, then reviewed and
decided one at a time with the user in the session that also wrote this update. D8 was added
alongside §4.1, also on 2026-07-26, and decided in the same pass. These are now settled
decisions, not proposals — re-open only with a deliberate reason, not by default at the start
of the next session.

- **D1 — OAuth flow shape. Decided: confidential client only, no PKCE.** Token exchange
  happens server-side in the Worker (already non-negotiable per §3.1), secret never in the
  frontend. PKCE exists to protect clients that *can't* hold a secret; with a confidential
  Worker-held secret it's not solving a live problem yet. Revisit if ORCID's registration flow
  pushes toward it or once there's real traffic worth hardening further. Sandbox-vs-production
  ORCID registry per environment is not part of this decision — it's D8 applied to ORCID,
  already settled in principle by §4.1.
- **D2 — Judgment-event schema. Decided: core fields + `schema_version`; title/journal cached
  at write time, display-only.** Fields: ORCID iD, PMID, event_type, timestamp, source_tool,
  payload (JSON, shape depends on event_type), schema_version (so old rows stay interpretable
  as new judgment types are added). A best-effort title+journal cache is written alongside the
  PMID at emission time so the hub can render a list without an NCBI round-trip — explicitly
  documented as a stale-tolerant display cache, never a source of truth. Anything beyond a list
  view (abstract, full metadata) still re-fetches from PubMed, keeping §2's "not a paper
  library" intact.
- **D3 — Where tools emit from. Decided: deep-link to the hub only, no direct emission.**
  `endo/` and `gm/` never call the Worker API directly — that would require bridging ORCID auth
  state across three separately-deployed static origins, real complexity landing inside the two
  files this whole project must not put at risk (§2, §4). All auth/emission logic lives in the
  hub; the standalone tools' only touchpoint is the single link/button already carved out as
  the "one deliberate exception" in §4. Revisit only if usage data shows the extra click is an
  actual adoption blocker.
- **D4 — RACP curriculum node IDs (sleeper dependency). Decided: stays out of scope, but
  events carry a lightweight topic anchor now.** Formal curriculum-node mapping is correctly
  gated behind the build order (§5) — designing it against an empty graph would just be
  guessing, per §5.4. What's decided now: the payload (per D2) carries the emitting tool's
  existing topic/lane id (`endo`'s TOPICS id or `gm`'s lane id) at emission time, so future
  curriculum-mapping work has a real starting point instead of an empty column to backfill.
- **D5 — Data ownership, retention, and export. Decided: append-only with author-initiated
  retraction events; no retention policy.** History is never mutated. Contributors can
  self-service retract/withdraw their own past events via a retraction event type (tombstone,
  not erasure) — keeps the graph's integrity property while giving ORCID-identified
  contributors a real way to walk back something they no longer stand behind. True hard-delete
  (physically removing rows) stays a manual, rare, ops-level action for cases like a legal
  request — not a self-service feature. No time-based retention policy; low volume makes one
  pure overhead for now.
- **D6 — Moderation / trust. Decided: open by default, admin escape hatch, no review queue.**
  Any ORCID-authenticated event is immediately visible to other registered users — no
  pre-publish gate. ORCID gating is already the primary trust mechanism and a strong bar
  relative to anonymous UGC; a personal review queue doesn't scale past one reviewer (you) and
  contradicts the graph-of-record framing in D5. Self-correction for honest mistakes runs
  through D5's retraction mechanism; a coarse, out-of-band admin capability (you, manually)
  covers genuine bad-faith cases without becoming part of the normal flow.
- **D7 — D1 schema evolution and backup. Decided: `wrangler d1 migrations` for schema changes;
  periodic export outside Cloudflare for backup.** Migrations use Cloudflare's own standard
  tooling — no real alternative worth considering at this scale. Backup is a full dump of the
  append-only event log to somewhere outside Cloudflare, run periodically; cheap given the
  append-only design (just "all rows since last export"), and directly addresses D1's
  single-Cloudflare-account point-of-failure risk for data meant to be durable (D5). Starts as
  a manually-triggered process for v0.1 — doesn't need automation before there's data anyone
  would miss — with scheduling as a natural later upgrade.
- **D8 — Dev/staging/production topology. Decided: three-tier, one Cloudflare account, manual
  promotion + git tag.**
  - **Tiers:** local dev (`wrangler dev`, local D1 via miniflare, ORCID sandbox credentials —
    free, undeployed, isolated by construction) → staging (deployed Worker, its own D1
    database, ORCID sandbox credentials, visible "STAGING" badge on any frontend surface
    pointed at it) → production (deployed Worker, its own D1 database, ORCID *production*
    registry credentials, no badge). Three tiers in concept; only staging and production are
    actually deployed Cloudflare resources.
  - **Account structure:** one shared Cloudflare account, two named environments
    (`[env.staging]` / `[env.production]` in `wrangler.toml`) rather than fully separate
    accounts. Named environments already deliver the isolation that matters — separate D1
    bindings, separate secrets — without the billing/login/DNS overhead of full account
    separation, which this project's risk profile doesn't warrant.
  - **Database separation:** two D1 databases, e.g. `bri-gest-hub-staging` and
    `bri-gest-hub-production`, distinct database IDs bound in their respective `wrangler.toml`
    env blocks. Staging data is disposable/synthetic; nothing ever flows staging → production
    except code.
  - **Credential separation:** two separate ORCID app registrations (sandbox, production), two
    separate secrets, set independently per environment — e.g.
    `wrangler secret put ORCID_CLIENT_SECRET --env staging` and `--env production`. Never
    shared across environments.
  - **Promotion step:** manual — running `wrangler deploy --env production` deliberately,
    paired with creating a git tag (`hub-connected-v0.1`, incrementing the same way
    `endo-v5.9`/`gm-v1.1` do) at that moment. The tag is the observable record that promotion
    happened and when. A GitHub Actions workflow gated on tag-push is a reasonable later
    upgrade if this grows past one maintainer, but isn't justified for v0.1.

## 7. Definition of done for the first session on this branch

Not "build the whole hub" — per the session rules in `BACKLOG.md`, name the finish line before
starting. Suggested Phase 1 scope for the first `brigest-connected` session:

1. `brigest-connected` branch created from current `main`.
2. D1–D8 above reviewed and confirmed/amended with the user *before* any code is written
   (matches the existing "review query and strategy changes before code is written" rule —
   this applies equally to architectural decisions). D8 specifically must be settled before
   step 3 — the environment topology has to exist before the first deploy, not be retrofitted
   onto a single Worker that was only ever pointed at one place.
3. Cloudflare Worker scaffolded in `/hub-api/`, deployed **to a non-production environment
   per D8's decision**, reachable, doing nothing yet but proving the pipeline works
   end-to-end and is isolated from both the Pages deploy and from production.
4. D1 database created with a first-pass schema for judgment-events (per D2, once decided) —
   in the non-production environment. No production database exists yet at this stage, and
   that's fine; it's created deliberately later, not implicitly by pointing the same config
   somewhere else.
5. ORCID OAuth working end-to-end against the **sandbox** registry (per D1, once decided):
   log in, get a token, confirm identity server-side.
6. Stop there. Emitting the first real judgment-event is deliberately Phase 2, not Phase 1 —
   don't let one session's scope creep into "build order" item 2 above before item 1 is solid.
   Standing up the production environment and doing the first real promotion is later still —
   do not deploy to production during a session whose actual scope is "prove the pipeline
   works."
