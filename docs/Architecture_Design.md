# NHI Archive Architecture Design

## 1. System Overview

NHI Archive is a static-first, graph-driven intelligence explorer deployed on GitHub Pages.

Current architecture layers:

1. Data ingestion pipeline (`scripts/pipeline/*`)
2. Versioned graph artifacts (`public/data/*.json`)
3. Client-side exploration app (`src/*`, React + Vite)
4. Static hosting and deployment (GitHub Actions + Pages)

The design objective is to support large public datasets with no server runtime while preserving traceability and extensibility.

## 2. Runtime Architecture (Frontend)

### 2.1 Framework and Rendering

- Framework: React 19 + TypeScript
- Build tool: Vite
- Graph rendering: `react-force-graph-2d` (canvas)
- Map rendering: `react-leaflet` + Carto basemap
- Timeline rendering: custom interactive histogram/list views

### 2.2 Top-Level Composition

`src/App.tsx` orchestrates:

- data loading and normalization
- global filter state
- view routing (`graph`, `map`, `timeline`)
- selected-node synchronization across views

Primary component structure:

- `TopBar`
- `FilterPanel`
- `GraphView` / `MapView` / `TimelineView`
- `DetailPanel`

### 2.3 View Modes

- Graph view: topology exploration + relationship context
- Map view: geospatial incident browsing
- Timeline view: chronological density and event navigation

All views consume the same filtered graph state to keep interactions consistent.

## 3. Data Architecture

### 3.1 Canonical Artifact

Primary data contract:

- `public/data/graph.seed.json`
  - `nodes[]`
  - `edges[]`
  - `metadata`

### 3.2 Entity Model

Node types:

- `incident`
- `person`
- `organization`
- `location`
- `statement`
- `artifact`
- `designation`
- `event`
- `media`

Edges encode semantic relationships (for example: `WITNESSED`, `INVESTIGATED`, `REFERENCES`, `PART_OF`, `LOCATED_AT`, `LOCATED_IN_COUNTRY`, `PRECEDED`).

### 3.3 Source Catalog

Generated source artifact:

- `public/data/source-list.json`

It includes source registry metadata and ingest statistics (`records_processed`, `records_auto_ingested`, `records_review_queue`, duplicate counters).

Human-readable source page:

- `public/source-list.html`

## 4. Ingestion Pipeline Architecture

Pipeline scripts:

- `scripts/pipeline/fetch-wikipedia-ufo-data.mjs`
- `scripts/pipeline/fetch-global-ufo-data.mjs`
- `scripts/pipeline/run.mjs`

Input contracts:

- `pipeline/input/raw-source-records.json`
- `pipeline/input/raw-source-records-wikipedia.json`
- `pipeline/input/raw-source-records-global.json`
- `pipeline/registry/sources.json`

Output artifacts:

- `public/data/graph.seed.json`
- `public/data/source-list.json`
- `pipeline/out/ingestion-report.json`
- `pipeline/out/review-queue.json`

### 4.1 Processing Stages

1. Load active source registry
2. Merge intake feeds
3. Schema validate (`zod`)
4. URL dedupe + semantic dedupe
5. Confidence scoring and ingest gate
6. Relationship synthesis
7. Graph materialization + reporting

### 4.2 Mention Expansion Strategy

To improve non-incident coverage, the pipeline performs controlled mention expansion:

- pattern-based extraction for `person`, `organization`, `event`, `statement`, `media`
- auto-create missing mention nodes when referenced by records
- link incidents to country-level aggregate location nodes (`LOCATED_IN_COUNTRY`)

This keeps incident coverage high while building richer graph context for personalities and institutions.

## 5. Performance Architecture

### 5.1 Graph Performance Controls

Current graph optimization strategy:

- stable `graphData` to avoid expensive topology rebuilds on selection
- lower simulation cost (`cooldownTicks`, alpha/velocity decay tuning)
- lighter rendering while zooming/panning
- selective link de-emphasis and simplified draw path during transforms
- node-cap filter to control visible topology density without deleting data

### 5.2 Static-First Delivery

- precomputed JSON payloads
- no backend API latency
- CDN delivery via GitHub Pages
- deterministic rebuild path via npm scripts

## 6. Deployment Architecture

Build command:

```bash
npm run build
```

This executes ingestion before bundling, ensuring the deployed app and data artifacts are aligned.

Deployment target:

- GitHub Pages (`main` branch workflow)

Operational behavior:

- each push triggers Pages build
- static bundle and public data artifacts are published together

## 7. Data Storage Strategy (Current + Future)

### 7.1 Current

Static JSON artifacts are the production source of truth for the public site.

### 7.2 Future Migration Path

If query complexity or scale outgrows static delivery:

1. keep pipeline JSON as canonical interchange
2. add optional server-side graph store sync (PostgreSQL graph model or managed graph DB)
3. expose API queries for deeper multi-hop exploration
4. preserve GitHub Pages as lightweight public mirror

## 8. Reliability and Governance

Quality controls currently in place:

- schema validation on intake and graph entities
- review queue for low-confidence records
- per-source scoring and thresholds
- source-level audit visibility in `source-list.json`

## 9. Current Constraints

- no authenticated write/admin surface
- no server-side graph queries
- some entity extraction remains heuristic-based
- source scraping varies by upstream site structure and access policies

## 10. Immediate Next Steps

1. add explicit source quality tiers and confidence provenance to UI detail panel
2. implement graph focus-mode (1–2 hop ego network) for usability
3. add regression checks for entity-type drift in ingestion CI
4. evaluate WebGL-first renderer migration for larger topology windows
