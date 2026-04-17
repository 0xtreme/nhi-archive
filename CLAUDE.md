# NHI Archive — Orientation for Claude

This repo has two parallel workstreams. Before doing anything, know which one the user is asking about.

## 1. Core archive (graph/map/timeline app)

Static-first React + Vite app. Loads `public/data/graph.seed.json` (currently 12.3 MB, 5,239 nodes, 16,381 edges) and renders via `react-force-graph-2d`, Leaflet map, and custom timeline. Deploys to GitHub Pages from `main` via `.github/workflows/deploy-pages.yml`.

- Overview: `README.md`
- Full spec: `docs/UFO_Archive_Platform_Spec.md`
- Architecture: `docs/Architecture_Design.md`
- Ingestion: `docs/Data_Ingestion_Design.md`
- Storage: `docs/Data_Storage_Strategy.md`
- **Architecture at current scale (5k+ nodes)**: `docs/Client_Server_Architecture_Plan.md` ← **read this if the question is about performance, size, or moving off static-first**
- Code: `src/`, `scripts/pipeline/`, `pipeline/`, `public/data/`

## 2. Transcript corpus (Jesse Michels / American Alchemy)

98 long-form interview transcripts fully integrated into the graph as of 2026-04-18. Active workstream in recent sessions.

- **Pipeline doc (current state)**: `docs/Transcript_Archive_Pipeline.md` ← pipeline stages 0–3, 7, 8 all complete; stages 4/5/6/9 deferred
- **Entity schema**: `docs/Transcript_Entity_Schema.md`
- **Handoff**: `docs/Transcript_Pipeline_Handoff.md` ← start here if resuming transcript work
- Data: `transcripts/` (immutable `raw/`, `text/`; working `cleaned/`, `entities/`)
- Integration output: `pipeline/input/raw-source-records-transcripts.json`, `public/data/transcripts-graph-fragment.json`

## Key conventions

- `transcripts/raw/` and `transcripts/text/` are **immutable snapshots** — never modify. Derived work goes in new folders.
- Extraction scripts (`transcripts/_extract_*.py`) are idempotent — deterministic node IDs mean re-running overwrites cleanly.
- Core archive is TypeScript/React; transcripts tooling is Python stdlib only.
- `pipeline_source: "transcripts"` tags every transcript-origin node for UI filtering.
- `pipeline/out/wikidata-cache.json` caches Wikidata lookups — re-runs of the anchoring script are cheap.
