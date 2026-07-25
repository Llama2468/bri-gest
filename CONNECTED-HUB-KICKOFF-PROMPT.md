# Connected Hub — kickoff prompts

Two prompts for opening the next session, depending on how much you want to do in one sitting.
Both assume `CONNECTED-HUB-DESIGN.md` and `BACKLOG.md`'s "The connected hub" section exist —
read this file's own instructions and paste the prompt text into a fresh session.

---

## Option A — architecture review only (smaller first touchpoint)

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

## Option B — full Phase 1 kickoff (branch + scaffold)

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

Either way, when the session ends, ask it to leave `CONNECTED-HUB-DESIGN.md` and
`BACKLOG.md` accurate to whatever state was actually reached — same discipline this project
already applies to `VERSION` constants and the syntax gate: a document that doesn't match
the code is worse than no document, because it gets trusted.
