# NHI Archive

NHI Archive is a public UFO/UAP intelligence platform MVP built from `docs/UFO_Archive_Platform_Spec.md`.

It includes:

- Graph view (progressive skeleton loading)
- Map view (clustered geospatial incident markers)
- Timeline view (chronological lane cards)
- Shared search/filter/detail workflow
- Automated ingestion pipeline scaffold for graph growth

## Tech stack

- Frontend: React + TypeScript + Vite
- Graph rendering: Sigma.js + Graphology
- Map rendering: MapLibre GL
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
