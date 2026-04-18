# Stage A — Chunked Delivery Plan

**Date**: 2026-04-18
**Status**: Approved, implementation pending
**Relationship**: Extends [Client_Server_Architecture_Plan.md](./Client_Server_Architecture_Plan.md). Records the decision to execute Stage A now and defer Stages B/C.

## Why now

The monolithic `public/data/graph.seed.json` is 12.3 MB (5,239 nodes / 16,381 edges) and every visitor downloads, parses, and holds the full blob in memory. Parse alone is ~60–100 MB of JS objects once React state and derived lookup maps are allocated. Every filter toggle and search keystroke walks the full node array.

Today this is fine on broadband/desktop and painful on mobile. Tomorrow it breaks: the next podcast source (beyond Jesse Michels) will push the corpus from ~5k to ~10–15k nodes, and subsequent channels will keep compounding. We fix the delivery shape before we add more data to it.

Per user direction, the archive is **knowledge-first**: transcript-derived entities (people, claims, programs, incidents) merge into the main Graph / Map / Timeline views as first-class nodes. The channel / interviewer is a provenance filter dimension, not a primary browsing axis. Stage A reflects this — no separate route or data silo per channel; `source_channel` is just another filter facet.

## What gets built

Single new build script `scripts/pipeline/build-client-artifacts.mjs` reads `graph.seed.json` and emits four files into `public/data/`:

| File | Purpose | Approx size |
|---|---|---|
| `graph.meta.json` | Counts, filter dimensions (node types, pipeline sources, channels), tag vocabulary | ~100 KB |
| `graph.nodes.ndjson` | One node per line, streamable | ~8 MB |
| `graph.edges.ndjson` | One edge per line, streamable | ~4 MB |
| `graph.search.json` | Precomputed MiniSearch inverted index (label + tags + summary) | ~1–2 MB |

Wired into the existing `npm run build` chain so deploys stay single-command. GitHub Pages remains the hosting target.

### Frontend changes

- `src/App.tsx` streams NDJSON via the existing `response.body.getReader()` pattern, populates React state incrementally.
- Map and Timeline views render with whatever has arrived so far; Graph view waits for a typed first slice (top-degree nodes first).
- Filter panel reads pre-computed dimensions from `graph.meta.json`.
- Search hits the precomputed MiniSearch index, not a linear scan over in-memory state.
- `src/data/fallbackGraph.ts` stays untouched — last-resort offline seed, not on the hot path.

## Library choice: MiniSearch

We use [MiniSearch](https://github.com/lucaong/minisearch) for the search index.

**Rationale** (validated via web research, see Sources):

- Supports `toJSON()` / `loadJSON()` — precompute the index at build time, ship as static file, load instantly in browser. Exactly matches our precompute-then-ship pattern.
- Sized for 5k–50k documents; current 5,239 and projected growth to 10–20k sits in its sweet spot.
- Tiny bundle, zero dependencies, in-memory, works offline.
- Simple API; low migration cost if we ever swap libraries.

**Alternatives considered:**

- **FlexSearch** — measurably faster at 100k+ docs but we're nowhere near that; adds API complexity for no gain at current scale.
- **Orama** — modern, typo-tolerant, supports vectors. Typo tolerance is genuinely relevant for auto-caption misspellings (`grush` → `Grusch`). The extraction pipeline already canonicalizes names, so search over canonical labels is exact — but if fuzzy matching against raw mentions becomes a UX need, Orama is the natural upgrade path.
- **Fuse.js** — fuzzy only, no real index, meant for <10k items. Wrong shape for precomputed delivery.

## What Stage A does NOT solve

Flagging explicitly so we don't over-promise:

- **Force-graph simulation cost at 5k nodes.** `react-force-graph-2d` performance degrades past ~7k elements (confirmed via the library's GitHub issues — see Sources). Stage A reduces load/parse/search cost but not per-frame simulation cost. The existing `graphNodeCap` filter is still load-bearing. Proper fix is a Tier 1 ego-network view (1–2 hop around a focused node) — Stage A's chunked shape *enables* this, but doesn't *implement* it.
- **Cross-channel multi-hop queries.** "Every program mentioned by guests who appeared on ≥2 podcasts" stays a client-side walk. This is the Stage B trigger.
- **Write path / admin review UI.** No auth surface; review queue stays a static artifact.

## Triggers to advance to Stage B (SQLite + Fastify API)

Revisit Stage B when **any two** of these hold:

1. A 2nd podcast channel lands and total nodes cross ~10k, AND NDJSON stream size or parse time degrades mobile UX observably.
2. Server-side FTS or multi-hop graph queries become load-bearing beyond what MiniSearch precomputes.
3. The review queue becomes actionable — someone is going to approve/reject/merge records, not just read them.
4. Traffic exceeds GitHub Pages' comfortable ceiling (sustained ≥10 MB/s unlikely pre-launch).

Neo4j stays off the table. SQLite + FTS5 handles this scale indefinitely.

## Risks

| Risk | Mitigation |
|---|---|
| NDJSON parse error mid-stream corrupts state | Line-by-line parse; skip malformed lines with a warning; continue from next newline |
| Search index drift when graph updates | Index regenerated by the same build script; never edited by hand; part of `npm run build` |
| MiniSearch hits a future limit | Shipped index is a static file — swap library without touching build pipeline or data shape |
| Force-graph perf tanks at 5k nodes in practice | Separate concern; visual-verify step (next action #2) surfaces this before Stage A work starts |
| Mobile still slow after chunking | Add viewport-based rendering or ego-network view; doesn't invalidate Stage A, just adds a follow-up |

## Next actions

1. Re-run `scripts/pipeline/wikidata-anchor.mjs` — catch ~250 unanchored entities from transcript batches 23–98 (idempotent, cached).
2. Visual-verify the 5,239-node graph: `npm run dev`, confirm render + Data Source filter chip + mobile viewport behavior.
3. **If #2 surfaces force-graph perf problems**, address those before Stage A — Stage A assumes the app currently survives the 5k load.
4. Implement `scripts/pipeline/build-client-artifacts.mjs` (pure function over `graph.seed.json`).
5. Update `src/App.tsx` — NDJSON streaming + MiniSearch query path. Keep `fallbackGraph.ts` fallback intact.
6. Verify on a real mobile device (not just DevTools throttling) — cold load time, memory, search responsiveness.
7. Deploy to GitHub Pages; compare before/after metrics (initial TTI, peak memory, search latency).

## Sources (web research, 2026-04-18)

NDJSON streaming in browsers:
- [Fetching JSON over streaming HTTP — Pamela Fox](http://blog.pamelafox.org/2023/08/fetching-json-over-streaming-http.html)
- [Streaming Data with Fetch() and NDJSON — David Walsh](https://davidwalsh.name/streaming-data-fetch-ndjson)
- [NDJSON File Streaming using browser Stream API — GitHub Gist](https://gist.github.com/nestarz/1fa7ae93fb83f1eafb1b88c3a84f2e02)

Search libraries:
- [MiniSearch — GitHub](https://github.com/lucaong/minisearch)
- [Fuse.js vs FlexSearch vs Orama: Search 2026 — PkgPulse](https://www.pkgpulse.com/blog/fusejs-vs-flexsearch-vs-orama-client-side-search-2026)
- [FlexSearch — GitHub](https://github.com/nextapps-de/flexsearch)

Force-graph performance at scale:
- [Improving performance for extremely large datasets — react-force-graph #202](https://github.com/vasturiano/react-force-graph/issues/202)
- [Performance Optimization when rendering more than 12k elements — react-force-graph #223](https://github.com/vasturiano/react-force-graph/issues/223)

GitHub Pages limits:
- [GitHub Pages limits — GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
