# NHI Archive

NHI Archive is a public UFO/UAP intelligence platform MVP built from `docs/UFO_Archive_Platform_Spec.md`.

It includes:

- Graph view (progressive skeleton loading)
- Map view (dark basemap + geospatial incident markers)
- Timeline view (density bars + interactive rail)
- Shared search/filter/detail workflow
- Automated ingestion pipeline scaffold for graph growth

## Tech stack

- Frontend: React + TypeScript + Vite
- Graph rendering: react-force-graph-2d
- Map rendering: Leaflet + OpenStreetMap/CARTO
- Pipeline validation: Zod
- Hosting: GitHub Pages via Actions

## Local development

```bash
npm install
npm run refresh:data
npm run dev
```

## Build

```bash
npm run build
```

Build runs ingestion first, then generates static assets in `dist/`.

## Data pipeline

```bash
npm run ingest
```

To refresh with bulk internet data (Wikipedia category ingestion + pipeline merge):

```bash
npm run refresh:data
```

This refresh now includes:

- `ingest:wikipedia`: expanded UFO/UAP category crawl with tag-noise filtering and country centroid fallback for missing article coordinates
- `ingest:global`: Scrubbed global sightings feed (Hugging Face mirror of NUFORC-derived records) with country-balanced selection

Inputs:

- `pipeline/registry/sources.json`
- `pipeline/input/raw-source-records.json`
- `pipeline/input/baseline-entities.json`

Outputs:

- `public/data/graph.seed.json`
- `pipeline/out/ingestion-report.json`
- `pipeline/out/review-queue.json`

## Deployment

Push to `main` triggers `.github/workflows/deploy-pages.yml` and publishes GitHub Pages.

For repository `nhi-archive`, the site URL is:

- `https://<github-username>.github.io/nhi-archive/`
