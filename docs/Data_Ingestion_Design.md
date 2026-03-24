# NHI Archive Data Ingestion Design

## Objective

Provide a repeatable ingestion process that can continuously expand the graph while preserving provenance, schema consistency, and quality controls.

## Implemented design (this repo)

The repo now includes a working MVP pipeline in `scripts/pipeline/run.mjs` with structured configuration and outputs.

### Stage 1: Source Registry

- Config file: `pipeline/registry/sources.json`
- Defines trust level, crawl frequency, and extraction method per source
- Supports primary/secondary/tertiary scoring in confidence policy

### Stage 2: Intake / Fetch Boundary

- Current input contract: `pipeline/input/raw-source-records.json`
- This file represents normalized crawler output (URL, source id, extracted node payload, mention sets)
- Designed so Crawlee/Scrapy workers can write to this schema directly

### Stage 3: Extraction Normalization

- Runtime: `scripts/pipeline/run.mjs`
- Ensures each record maps to a typed node and mention collections (persons/orgs/events/designations/locations)
- Creates pipeline metadata (`pipeline_source`, `pipeline_confidence`, `status`, `crawled_at`)

### Stage 4: Validation + Deduplication

- Validation: `zod` schemas for source, node, edge, and intake record
- URL dedup: exact URL set check
- Semantic dedup: Jaccard similarity on `label + summary + date + location`
- Behavior:
  - `> 0.92`: merge sources into existing canonical node
  - `0.75 - 0.92`: keep record, add `CORROBORATES` edge
  - `< 0.75`: treat as new node

### Stage 5: Staging + Graph Materialization

- Auto-ingest threshold: `pipeline_confidence >= 0.70`
- Below threshold -> review queue
- Output graph artifact: `public/data/graph.seed.json`
- Monitoring artifacts:
  - `pipeline/out/ingestion-report.json`
  - `pipeline/out/review-queue.json`

## Relationship synthesis rules

- Person -> Incident: `WITNESSED`
- Person -> Statement: `MADE_STATEMENT`
- Org -> Incident: `INVESTIGATED`
- Statement/Event links: `PART_OF`, `REFERENCES`
- Incident -> Location: `LOCATED_AT`
- Incident -> Designation: `ASSIGNED_DESIGNATION`
- Timeline stitching across incidents: `PRECEDED`

## Operational flow

```bash
npm run ingest:wikipedia
npm run ingest
npm run build
```

`npm run build` executes ingestion first, so the published app always includes the latest staged graph output.

## Next production step

Replace seeded intake with scheduled crawl workers (Crawlee + BullMQ), keep this exact stage contract, and preserve review queue gating for low-confidence extractions.
