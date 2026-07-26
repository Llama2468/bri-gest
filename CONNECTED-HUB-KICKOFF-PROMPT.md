# Connected Hub — kickoff prompts

Three prompts for opening a session, depending on how much you want to do in one sitting.
All assume `CONNECTED-HUB-DESIGN.md` and `BACKLOG.md`'s "The connected hub" section exist —
read this file's own instructions and paste the prompt text into a fresh session.

**Status as of 2026-07-27: Options A and B are both done** — D1–D8 confirmed, and build-order
items 1–2 (identity + the first emission event) built, verified end-to-end, and pushed to
`brigest-connected` with an open draft PR (#1). They're kept below for the historical record
and because their hard-constraint language is still worth re-reading. **Option C is the live
one** — the hub's one deliberate integration touchpoint, which is what's actually blocking
PR #1 from leaving draft.

---

## Option A — architecture review only (smaller first touchpoint) — DONE 2026-07-26

Use this if you want a session that's purely a decision-making conversation, no code, no
branch yet. Good if D1–D8 need real back-and-forth rather than a quick rubber-stamp.

```
Read CONNECTED-HUB-DESIGN.md in full. This is the connected-hub project -- ORCID identity,
Cloudflare Workers + D1, a curation-graph data model -- explicitly separate from the endo/gm/
hub tools in this repo, which are live, polished, and must not be touched or put at risk.

Section 6 of that doc proposes a first-draft enumeration of D1-D7, architectural decisions
that BACKLOG.md referenced but never actually listed anywhere -- confirmed by a full search of
this repo (working tree, every branch, git history) before that doc was written. They are a
reconstruction, not a recovered spec, and need your judgment. D8 (dev/staging/production
environment topology) was added later, at explicit request, as a standing priority for all
infrastructure work going forward -- give it the same real weight as D1-D7, not a rubber stamp
just because it was added second.

Walk me through D1 through D8 one at a time. For each: state the proposed default from the
doc, the real tradeoff, and your recommendation if you have one -- then ask me to decide before
moving to the next. Pay particular attention to D8: I want concrete answers (how many
environments, where the promotion step lives, how database/credential separation actually
works), not a restatement of the principle already in section 4.1. Don't write any code or
create the brigest-connected branch this session. End by updating CONNECTED-HUB-DESIGN.md
section 6 with whatever we actually decided, so the next session starts from confirmed
decisions instead of proposals.
```

## Option B — full Phase 1 kickoff (branch + scaffold) — DONE 2026-07-26/27

Use this once D1–D8 are confirmed (either from an Option A session, or because you're
comfortable deciding them inline). This is the "build order item 1" session from the design
doc's Definition of Done (section 7) — branch, Worker, D1 schema, ORCID OAuth. Explicitly
**not** the first emission event yet; that's the session after this one.

```
This is the connected-hub project. Read CONNECTED-HUB-DESIGN.md in full before doing anything
else -- it has the architecture, the repo/branching strategy, section 4.1's development/
production environment hygiene requirement, and the open D1-D8 decisions. Also read
BACKLOG.md's "The connected hub" section for the current pointer state.

The finish line for this session is the design doc's section 7, items 1-5 only -- stop there,
do not continue into build-order item 2 (the first emission event) even if there's time left:

1. Create the brigest-connected branch from the current main tip.
2. If D1-D8 aren't already confirmed/amended in CONNECTED-HUB-DESIGN.md section 6, walk me
   through them and get real decisions before writing any code -- don't assume the proposed
   defaults. D8 specifically (environment topology) must be settled before step 3 -- decide
   the shape of dev/staging/production separation before the first Worker deploy, not after.
3. Scaffold a Cloudflare Worker in /hub-api/, deployed to a non-production environment per the
   confirmed D8, reachable, doing nothing functional yet -- this is proving the deploy
   pipeline is real and isolated from both the GitHub Pages deploy that serves the live tools
   and from production, not building features.
4. Create the D1 database with a first-pass judgment-event schema per the confirmed D2 -- in
   the non-production environment. Do not create a production database this session.
5. Get ORCID OAuth working end-to-end against the sandbox registry per the confirmed D1 --
   login, token exchange happening in the Worker (never client-side), confirmed identity.

Hard constraints, not suggestions:
- Do not modify index.html, endo/index.html, or gm/index.html on this branch. They are live,
  polished, and in daily use -- this session's work must be fully additive and isolated in new
  directories, reviewable as a clean diff against main before anything merges.
- Do not deploy anything to a production Cloudflare environment or production D1 database this
  session. Everything built here targets dev/staging only -- production environment setup and
  the first real promotion are later, separate work, not something to reach for just because
  there's time left.
- Never point a dev/staging environment at a production database, or vice versa. If D8's
  decided topology doesn't cleanly prevent that by construction, treat that as a defect in the
  implementation, not an acceptable shortcut.
- Do not put any secret (ORCID client secret, Cloudflare API token) in a file that gets
  committed to this repo. This applies per-environment -- dev and production credentials are
  separate secrets, not the same value used in two places.
- If something in the design doc turns out to be wrong once you're actually building against
  real APIs, stop and tell me rather than quietly deciding around it -- update the design doc
  together, don't let it silently drift out of sync with what's actually built.
```

---

## Option C — the hub's integration touchpoint (live option, 2026-07-27)

Use this to pick up where Phase 1 and build-order items 1-2 left off. `hub-api/` already has a
working staging Worker: ORCID OAuth, a session cookie, and `POST/GET /events` (see
`hub-api/README.md`'s endpoint table) — all verified by hand via DevTools, with no frontend
calling any of it yet. This session's job is exactly design doc §4's "one deliberate
exception": a small frontend surface plus a single new link in the existing hub.

```
This is the connected-hub project, continuing from build-order items 1-2 (identity + the first
emission event), both done and verified on the brigest-connected branch -- see
CONNECTED-HUB-DESIGN.md, BACKLOG.md's "The connected hub" section, and hub-api/README.md's
endpoint table for exactly what already works (ORCID OAuth, a session cookie, POST/GET
/events against the staging Worker). Draft PR #1 is open but not mergeable yet -- design doc
section 4's merge criteria item (b), "the one integration touchpoint in the hub is reviewed
and deliberate, not incidental," isn't met yet. That's this session's job.

Build a small frontend surface (suggest /connected/ per the design doc's directory-isolation
rule) that a signed-in ORCID user can actually use to sign in and flag a PMID -- i.e. a real
UI in front of the /auth/orcid/login, /me, and POST /events endpoints that currently only get
exercised by hand. Then add the *one* deliberate edit to the existing hub (index.html) that
design doc section 4 explicitly carves out as an exception to "don't touch the live tools" --
a link/button pointing at /connected/, now that there's something real to link to.

Hard constraints, not suggestions:
- Everything still targets the staging environment. No production Cloudflare environment, D1
  database, or ORCID registration gets created or deployed to this session.
- The edit to index.html is the ONE exception to the "don't touch the live tools" rule, and
  should be reviewed as exactly that -- a single, deliberate, minimal change (a link/button),
  not an opportunity to touch anything else in that file. endo/index.html and gm/index.html
  stay untouched entirely.
- Per D8's staging environment requirement (section 4.1), the /connected/ frontend must show
  a visible "STAGING" indicator -- this is talking to a non-production backend and that must
  never be ambiguous to whoever's looking at the screen.
- Keep using the browser-verification pattern already established (real ORCID sandbox login,
  not a mocked identity) -- this project's non-goal list rules out anything that only works
  for the person building it.
- When the session ends, leave CONNECTED-HUB-DESIGN.md and BACKLOG.md accurate to whatever
  state was actually reached, same as the prior sessions on this project.
```

---

Whichever path you take, when the session ends, ask it to leave `CONNECTED-HUB-DESIGN.md` and
`BACKLOG.md` accurate to whatever state was actually reached — same discipline this project
already applies to `VERSION` constants and the syntax gate: a document that doesn't match
the code is worse than no document, because it gets trusted.
