# Automated Web Intelligence Pipeline (MVP)

This folder contains a runnable ingestion pipeline scaffold aligned to Section 15 of `docs/UFO_Archive_Platform_Spec.md`.

## Stages implemented

1. Source registry loading (`pipeline/registry/sources.json`)
2. Record intake (`pipeline/input/raw-source-records.json`)
3. Schema validation (`zod` in `scripts/pipeline/run.mjs`)
4. URL + semantic deduplication
5. Pipeline confidence scoring and review queue routing
6. Relationship synthesis (person/org/event/designation/location edge generation)
7. Graph materialization to `public/data/graph.seed.json`

## Run

```bash
npm run ingest
```

## Outputs

- `public/data/graph.seed.json`: UI-ready nodes and edges
- `pipeline/out/ingestion-report.json`: processing counters and quality stats
- `pipeline/out/review-queue.json`: records below auto-ingest threshold or schema-invalid

## Confidence policy

Auto-ingest threshold is `>= 0.70`, using the score model from the product spec:

- Source trust level
- Extraction confidence
- Date resolution signal
- Geocoding signal
- Corroboration signal
- Schema pass signal

## Extending to live crawl

To move from sample inputs to live ingestion:

1. Add scheduled Crawlee fetch jobs per active source in `pipeline/registry/sources.json`
2. Persist raw HTML/PDF artifacts before extraction
3. Replace seeded `raw-source-records.json` with crawler output normalized to the current record schema
4. Add queue orchestration (BullMQ + Redis) around each stage
5. Keep review queue as a mandatory safety gate for low-confidence records
