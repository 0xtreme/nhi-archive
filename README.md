# NHI Archive

A public UFO/UAP knowledge-graph explorer. Not a dashboard — a scene-based
intelligence browser inspired by Neo4j Bloom, Kumu, and Obsidian's local
graph. Users never see all 5k+ entities at once; every scene is seeded
from a curated perspective or a search hit, and grows outward as the user
expands neighbors.

Built from `docs/UFO_Archive_Platform_Spec.md`.

## Views

- **Graph / Scene Explorer** — landing hub with curated + auto-generated
  perspectives, then a scene mode with two layouts: **Radial Focus**
  (single focal node + 1-hop ring + 2-hop ring, click-to-refocus) as the
  default, and **Constellation** (force-directed canvas with semantic
  zoom) as an alternate. Community-halo overlay toggle uses offline
  Louvain output.
- **Map** — dark-navy Natural Earth basemap with incident markers
  clustered via [supercluster](https://github.com/mapbox/supercluster).
  Clusters expand on click to a scrollable incident list. Hynek-class
  colored markers + time cursor at the bottom. A "DETAIL" slider
  controls cluster-zoom.
- **Timeline** — chronological swimlanes per node type. Per-lane greedy
  collision packing distributes same-year events vertically so nothing
  stacks on a single pixel. Date precision is parsed from
  `date_start` (day / month / year) and used for fractional x
  positioning. Wide-zoom density badges flag dense year buckets.
- **Sources** — the 12 ingest feeds with per-source stats, featuring
  the American Alchemy / Jesse Michels transcript corpus as the primary
  extraction feed.

## Architecture

### Data

- **Canonical graph**: `public/data/graph.seed.json` (~14 MB, 5,179
  nodes / 16,271 edges after the canonicalization pass).
- **Chunked client artifacts** (`public/data/graph.meta.json`,
  `graph.nodes.ndjson`, `graph.edges.ndjson`, `graph.search.json`) — a
  streamable MiniSearch-indexed mirror of the seed graph, used as the
  offline fallback when the API isn't available.
- **SQLite DB** (`data/graph.db`, gitignored, ~26 MB) — the source of
  truth for the Scene Explorer. Schema covers node, edge, source_rich
  (quote provenance), alias, tag, community (Louvain output), and
  perspective tables plus an FTS5 virtual table for full-text search.

### Server (Fastify + better-sqlite3)

Reads `data/graph.db` and exposes:

| Endpoint | Purpose |
|---|---|
| `GET /api/meta` | counts + year range + community count |
| `GET /api/search?q=...&limit=20` | FTS5 search, AND-first OR-fallback |
| `GET /api/entity/:id` | full node + sources_rich + aliases + tags |
| `GET /api/ego/:id?depth=1&limit=60` | seed + N-hop neighborhood |
| `GET /api/expand/:id?rel=X&types=a,b` | one-step targeted expansion |
| `GET /api/path?from=X&to=Y&depth=4` | BFS shortest path |
| `GET /api/community/:id?limit=50` | community members + internal edges |
| `GET /api/communities/top?limit=20` | community headers |
| `GET /api/perspectives` | list all perspectives (curated + auto) |
| `GET /api/perspective/:slug` | scene payload (seeds + 1-hop) |
| `GET /api/healthz` | liveness |

Typical request latency on the current data is 1–2 ms (prepared
statements, mmapped DB).

### Frontend

- React 19 + TypeScript + Vite
- `src/lib/api.ts` — typed fetchers for every API endpoint
- `src/components-new/scene/` — Scene Explorer (LandingHub, SceneCanvas,
  SceneExplorer state machine)
- `src/components-new/graph/RadialFocus.tsx` — radial 1-hop / 2-hop layout
- `src/components-new/MapView.tsx` — d3-geo + supercluster
- `src/components-new/TimelineView.tsx` — packed swimlanes
- `src/lib/graphSim.ts` / `graphDrawing.ts` — custom force sim + canvas
  glyph renderer (operates only on ≤200-node scenes, never the full graph)
- `src/styles/system.css` — design tokens (Space Grotesk display + Inter
  body + JetBrains Mono data; dark ink surfaces; pastel accents)

## Running locally

```bash
npm install

# First time / after an ingest: build the SQLite DB from graph.seed.json
npm run build:sqlite

# Full stack (server on :8787 + Vite on :5173 with /api proxy)
npm run dev:full

# Or start them separately:
npm run server   # Fastify on :8787
npm run dev      # Vite on :5173
```

Open http://localhost:5173.

If the server is not running, the Scene Explorer shows an "API
UNREACHABLE" banner with instructions — the Map, Timeline, and Sources
views still work from the client-side chunked artifacts.

## Data pipeline

```bash
# Bulk-refresh everything (ingest + canonicalize + client artifacts + SQLite)
npm run refresh:data

# Or run individual stages:
npm run ingest:wikipedia   # fetch Wikipedia UFO articles
npm run ingest:global      # fetch scrubbed global sightings feed
npm run ingest             # merge, validate, materialize graph.seed.json
npm run canonicalize       # merge extraction-error duplicates
npm run build:client-artifacts  # rebuild chunked JSON + MiniSearch index
npm run build:sqlite       # rebuild data/graph.db + communities + perspectives
```

Individual scripts (under `scripts/pipeline/`):

- `canonicalize-dupes.mjs` — merges content-free or wrong-type duplicate
  nodes, rewrites edges, drops self-loops and duplicate edges.
- `build-sqlite.mjs` — builds `data/graph.db` schema + FTS5 + populates
  from `graph.seed.json`.
- `detect-communities.mjs` — runs Louvain modularity via
  `graphology-communities-louvain`; writes `community_id` onto every node.
- `register-perspectives.mjs` — registers 7 curated perspectives + a
  "hubs" perspective (top-20 most-connected) + 8 auto-derived
  community perspectives filtered to skip NUFORC-noise clusters.

## Transcript corpus

Separate from the ingest pipeline, `transcripts/` contains a cleaned
YouTube interview corpus from the Jesse Michels / American Alchemy
channel — 98 long-form episodes with ≥100k views. Entity extraction
ran inline-LLM per video, producing the `sources_rich` quote-level
provenance that anchors most of the claim / video / person nodes.

See `docs/Transcript_Archive_Pipeline.md` for the full extraction
pipeline, `docs/Transcript_Entity_Schema.md` for the schema, and
`docs/Transcript_Pipeline_Handoff.md` for the current state.

## Deployment

- **Frontend** — GitHub Pages via `.github/workflows/deploy-pages.yml`
  on push to `main`. Uses the chunked static artifacts; works without
  the API server.
- **API server** — intended to deploy to Fly.io / Render free tier as a
  single Node process. The DB file is shipped with the process (rebuilt
  from `graph.seed.json` at container build time).
