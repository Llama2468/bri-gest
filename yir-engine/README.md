# yir-engine — Endocrine Year in Review

Pipeline (to be built) that produces the static page at `../yir/`. It is published at https://llama2468.github.io/bri-gest/yir/.

- `YIR_SPEC.md`: the build specification (v0.6). Start here.
- `CLAUDE.md`: conventions for Claude Code in this folder. The repo-root `CLAUDE.md` still applies.
- `template/index.src.html`: the page template. The build replaces `/*DATA*/null` with the dataset JSON.
- `tests/fixtures/pilot_83.json`: the pilot dataset (83 included, 26 excluded, 109 screened; PubMed, 1 Jan – 26 Nov 2026).

## Current state

`../yir/index.html` is the **pilot (yir-v0.1-pilot)**. It was hand-assembled from the pilot dataset. It uses the pilot scoring, not the C/S/A framework in the spec.

Until the engine exists, rebuild the page with:

```bash
python3 -c "s=open('yir-engine/template/index.src.html',encoding='utf-8').read();d=open('yir-engine/tests/fixtures/pilot_83.json',encoding='utf-8').read().replace('</','<\\\\/');open('yir/index.html','w',encoding='utf-8').write(s.replace('/*DATA*/null',d))"
node .github/scripts/check-syntax.js
```

## How YIR differs from the Bri-gest digests

The Bri-gest digests render abstracts verbatim, with no AI content. YIR is different by design. It contains AI-assisted classification, take-homes and scoring, and the page discloses this prominently. YIR does not reproduce abstracts. In public mode, full abstracts are licence-gated (spec section 7a). The pilot shows none.
