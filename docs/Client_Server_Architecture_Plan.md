# Client / Server Architecture Plan

## Scope

This is **not** a redesign. It's a recommendation document written after the transcript-extraction pipeline completed and the graph grew to 5,239 nodes / 16,381 edges. The frontend was designed for the pre-transcripts 3,713-node static graph; at current scale it has real problems that a future session should address. This document captures the analysis and proposes a migration path when that work begins.

## Current architecture (observations)

The app is static-first:

- `src/App.tsx` fetches `./data/graph.seed.json` once on mount, streams it via `response.body.getReader()`, progress-indicates the download, `JSON.parse`s the entire file, stores it in React state.
- `graph.seed.json` is now **12.3 MB** of JSON (was ~8 MB pre-transcripts).
- `normalizeGraphData` walks all 5,239 nodes and 16,381 edges in one pass; `buildDefaultFilters` walks them again; `buildRelationIndex` walks edges again.
- Every filter change (`FilterPanel` toggles) calls `filterGraph` which scans the full node array (`useMemo` caches until filters change). Search does another full scan.
- `GraphView` hands the filtered node/edge arrays to `react-force-graph-2d`, which runs force simulation on whatever it receives. The existing `graphNodeCap` filter caps visible nodes for performance.
- Fallback: `src/data/fallbackGraph.ts` contains 716 lines of hardcoded graph data for the case where the fetch fails.
- Deployment: GitHub Pages via `.github/workflows/deploy-pages.yml`. Every commit to `main` publishes the ~12 MB `graph.seed.json` as a static asset.

## What breaks at 5k+ nodes

**Download cost.** 12 MB per visitor per cold load. Fine on broadband, painful on mobile, bad for SEO/user-perceived latency. With growth from `wikipedia-uap` + `global-ufo-scrubbed` continuing to accumulate, this trend is only going one direction.

**Parse + memory cost.** 12 MB of JSON parses into roughly 60–100 MB of in-memory JS objects once React state, lookup Maps (`nodeLookup`), and derived arrays (`availableTags`, `filteredGraph.nodes`, `degreeOrderedNodeIds`, `baseGraphSkeletonIds`, `graphSkeletonIds`) are held simultaneously. On a mid-range phone this will swap or crash the tab.

**Filter and search all client-side.** Every keystroke in search walks 5,239 nodes building a haystack string. With no text index, the cost grows linearly with corpus size. Once the archive has 50k nodes (plausible with more ingestion), this stops being interactive.

**Force-graph rendering.** `react-force-graph-2d` runs the simulation on whatever you hand it. The existing `graphNodeCap` is the mitigation, but it's a visibility band-aid — the underlying graph is still all in memory. And full-graph features (shortest-path, neighborhood expansion, degree ranking) touch the whole array.

**No query pushdown.** There's no way to ask "show me everyone who appears in videos Grusch is in" without materializing both sides of that join on the client. The data model is rich enough to support such queries; the delivery shape isn't.

**No auth/admin surface.** Current constraint list in `Architecture_Design.md` already flags this ("no authenticated write/admin surface"). With extraction pipelines producing 1,500+ nodes in a single session and a review queue at `pipeline/out/review-queue.json`, a human-in-the-loop approval UI is overdue.

## Recommended migration path

Do this **in stages**, not as a big-bang rewrite. Preserve the GitHub Pages deployment option as a lightweight public mirror of the published graph.

### Stage A — still static, but chunked (low-risk first move)

1. Split `graph.seed.json` into:
   - `graph.meta.json` (node count, edge count, filter indexes, Wikidata-id list) — fetched first, ~100 KB
   - `graph.nodes.ndjson` (one node per line) — streamed and parsed incrementally, ~8 MB
   - `graph.edges.ndjson` (one edge per line) — streamed incrementally, ~4 MB
   - `graph.search-index.json` — precomputed inverted index keyed on normalized label/tags/summary, ~1–2 MB

2. Frontend: stream NDJSON using existing `response.body.getReader()` pattern, build state incrementally. Render the map and timeline views with whatever has arrived so far; graph-view waits for a `pipeline_source` / node-type-caps first slice.

3. Search hits the precomputed inverted index, not a linear scan. Filtering the inverted index is O(log n) per term.

No server required. Shipping step is a new `scripts/pipeline/build-client-artifacts.mjs` that produces these files from `graph.seed.json`. GitHub Pages continues as hosting.

**Buys you**: ~2× perceived load time; sub-linear search; graph remains deliverable for the next 3–10× scale.

### Stage B — API for query pushdown (when Stage A hits its own ceiling)

1. Backing store: **SQLite** file checked into the repo, populated by `scripts/pipeline/build-sqlite.mjs` from `graph.seed.json`. Why SQLite: zero-infrastructure, file-based, fits in Git LFS if needed, trivial to copy into any env. FTS5 for full-text search. Real indexes on `node_type`, `pipeline_source`, `confidence`, `wikidata_id`, and edge `from_node_id` / `to_node_id`.

2. Server: **Node.js + Fastify** (or Hono), 200–300 LOC, single `server.mjs`. Endpoints:
   - `GET /api/search?q=...&limit=20` — FTS5 hit
   - `GET /api/node/:id` — single node + immediate neighbors
   - `GET /api/neighbors/:id?depth=1&types=person,claim` — breadth-first expansion
   - `GET /api/filter?node_type=claim&pipeline_source=transcripts&limit=500` — indexed filter
   - `GET /api/video/:id/claims` — specific to transcript domain: all claims asserted in a video
   - `GET /api/stats` — counts by type / source (replaces the client-side tallies)

3. Deployment: **Fly.io** or **Render** free tier is enough for the current read-only workload. The server starts, memory-maps the SQLite file, serves under load. No persistent writes, no scaling headaches.

4. Dev loop: `npm run server` runs `node server.mjs` locally on port 8787. Frontend reads a `VITE_API_URL` env var; when unset, falls back to the existing static-JSON path for offline/Pages mode.

**Buys you**: interactive search at 50k+ nodes. Arbitrary multi-hop queries. Review-queue admin endpoints. The same SQLite file can be re-generated nightly from the pipeline.

### Stage C — write path + review queue UI (when you want editorial workflow)

1. Add authenticated endpoints: `POST /api/review/:record_id/approve`, `POST /api/node/:id/merge`, `POST /api/edge/:id/correct`. Auth via magic-link email or GitHub OAuth — low bar.
2. Write-through model: mutations update a staging DB and emit a patch file; the pipeline re-materializes `graph.seed.json` nightly from the base pipeline + approved patches. The static Pages mirror stays in sync.
3. Frontend: a `/admin` route with a review-queue panel that pulls from `GET /api/review-queue` (currently only a static JSON artifact).

## What NOT to do

- **Don't introduce Neo4j or a dedicated graph DB yet.** The graph is 5k nodes. Adjacency-list queries in SQL handle this trivially. Operational cost of running Neo4j eats any query-latency gain at this scale. Revisit only if multi-hop path queries dominate traffic.
- **Don't break the static fallback.** The `fallbackGraph.ts` hardcoded seed is the reason the app loads at all when someone lands on a cached version. Keep that pathway even after Stage B.
- **Don't try to render the full graph.** Stage A's chunked loading plus the existing `graphNodeCap` is correct. The goal is an interactive ego-network view (1–2 hop around a focused node), not a god-view of all 5,239.

## Handshake with the transcript pipeline

The extraction pipeline outputs idempotent per-video JSON files (`transcripts/entities/<video_id>.json`). The integration script (`integrate-transcripts.mjs`) is the only place where node-envelope shape is transformed for `graph.seed.json` consumption. Whatever the next frontend architecture is, that seam stays the same:

- Extraction → `transcripts/entities/*.json` (raw extraction envelope)
- Merge → `pipeline/input/raw-source-records-transcripts.json`
- Integrate → `graph.seed.json` (or SQLite, or NDJSON, or whatever the frontend eats)

If the frontend moves to SQLite, add one more step that runs after integration: `build-sqlite.mjs` that reads `graph.seed.json` and writes `public/data/graph.db`. Nothing upstream in the transcript pipeline changes.

## Recommended first move

**Stage A** — split the JSON and add the inverted search index. It's ~1 day of focused work, requires no new infrastructure, and buys most of the perceived performance win. The visual-verification session that the existing handoff calls out can happen against the chunked version, which will make it obvious whether Stage B is even necessary yet.
