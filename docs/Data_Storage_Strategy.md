# NHI Archive Data Storage Strategy

## Current Decision (GitHub Pages Compatible)

For the public GitHub Pages deployment, the archive remains **static-file based**:

- Primary graph file: `public/data/graph.seed.json`
- Pipeline report: `pipeline/out/ingestion-report.json`
- Review queue: `pipeline/out/review-queue.json`

Why this is the chosen default:

- Works on GitHub Pages (no server runtime required)
- Zero backend ops and low hosting cost
- Fast global delivery through static CDN
- Reproducible builds from pipeline scripts

## Data Model

The graph is modeled as:

- `nodes[]` with typed entities (`incident`, `person`, `organization`, `location`, `statement`, `event`, `media`, etc.)
- `edges[]` with semantic relationships (`WITNESSED`, `INVESTIGATED`, `REFERENCES`, `PART_OF`, `LOCATED_IN_COUNTRY`, etc.)

This keeps the model graph-native while still portable as JSON.

## Scale Path (If Needed Later)

When static JSON becomes limiting, the migration path is:

1. Keep pipeline output as canonical JSON artifacts.
2. Add an optional ingestion sink into a graph-capable backend.
   - Option A: PostgreSQL + graph-style edge table + indexes
   - Option B: Managed graph database (Neo4j/Neptune) behind an API
3. Keep GitHub Pages as a read-only public mirror for lightweight browsing.

This allows gradual migration without breaking the existing site.
