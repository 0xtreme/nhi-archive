# Transcript Pipeline — Handoff

Status as of 2026-04-18. Branch: `transcripts/entity-extraction` (merged to `main`).

## Where things stand

End-to-end transcript pipeline is complete for all 98 captioned videos on the Jesse Michels / American Alchemy channel.

1. **Canonical seed list** → [transcripts/canonical_entities.json](../transcripts/canonical_entities.json) — 341 curated entries (existing-graph extract + manual top-20 curation).
2. **Raw captions + text conversion + cleaning** → 98 files under `transcripts/raw/`, `transcripts/text/`, `transcripts/text_timestamped/`, `transcripts/cleaned/`.
3. **Per-video entity extraction** → 98 files under `transcripts/entities/`. Driver scripts: deep pilot `_extract_kRO5jOa06Qw.py` and batches `_extract_batch_3to5.py` through `_extract_batch_83to98.py`.
4. **Aggregate extraction bundle** → `pipeline/input/raw-source-records-transcripts.json` (1,544 nodes, 6,475 edges before dedup).
5. **Graph integration** → `scripts/pipeline/integrate-transcripts.mjs` transforms and merges. Current active graph: `public/data/graph.seed.json`. Pre-integration backup: `public/data/graph.seed.original-pre-transcripts.json`. Transcripts-only fragment: `public/data/transcripts-graph-fragment.json`.
6. **Wikidata anchoring** → 172 nodes anchored. Note: only covers entities introduced in batches 1–22; run `node scripts/pipeline/wikidata-anchor.mjs` again to pick up entities from batches 23–98 (~250 more candidates).
7. **UI filter** → `FilterPanel` has a "Data Source" chip section driven by `pipeline_source`; not yet visually verified against the 5,239-node graph.

## Graph state

- 5,239 nodes (+1,526 from transcripts)
- 16,381 edges (+6,475 from transcripts)
- 434 persons, 158 organizations, 83 locations, 79 events, 98 video nodes
- 666 claim nodes, 99 concepts, 77 documents, 30 programs, 23 technologies, 6 phenomena
- 172 nodes with `wikidata_id`

## Pipeline reproducibility

```bash
# Stage 0+1: enumerate and fetch (one-time / refresh)
yt-dlp --flat-playlist --dump-json 'https://www.youtube.com/@JesseMichels/videos' \
  > transcripts/_channel_index.jsonl
yt-dlp --write-auto-sub --write-sub --sub-lang en --sub-format vtt \
  --skip-download --ignore-errors --sleep-subtitles 1 \
  -o 'transcripts/raw/%(id)s.%(ext)s' -a transcripts/_urls.txt

# Stage 2: VTT → text
python3 transcripts/_convert.py

# Stage 3: pattern cleaning
python3 transcripts/_clean.py

# Stage 7: extraction (all 98 already extracted; run individual batch
#   scripts if re-extraction is needed)
python3 transcripts/_extract_kRO5jOa06Qw.py
python3 transcripts/_extract_batch_3to5.py
# ... through _extract_batch_83to98.py

# Merge + integrate + activate
python3 transcripts/_extract_helpers.py merge
node scripts/pipeline/integrate-transcripts.mjs
cp public/data/graph.seed.with-transcripts.json public/data/graph.seed.json

# Wikidata anchoring (idempotent; cache at pipeline/out/wikidata-cache.json)
node scripts/pipeline/wikidata-anchor.mjs
```

## Known limitations

1. **Coreference is correctly handled** inside deep extractions (every claim's `subject_entities` array names the resolved entities regardless of whether the name appears in the verbatim quote). The schema explicitly supports cross-sentence attribution; see `docs/Transcript_Entity_Schema.md`.
2. **Two videos have no captions at all** (`9LGohiMmlu4`, `jyTKETcxj0M`). Addable only via Whisper against the audio.
3. **Paragraph-boundary bleed** from the 400-char cleaning chunker occasionally pins an ad-read sentence next to interview content. Not corrected. Negligible effect on extracted entities since the LLM pass operates over the whole transcript.
4. **Auto-caption misheard names** — YouTube mishears "Grusch" as "grush", "Gillibrand" as various spellings. Canonical-seed mapping in the extraction scripts corrects the big names; long-tail misspellings may produce duplicate fragment nodes.
5. **Wikidata second-pass pending** — 172/~420 person/org/location nodes currently anchored.

## What's next

See:
- [Transcript_Archive_Pipeline.md](./Transcript_Archive_Pipeline.md) — current pipeline state including stages still open (Stage 4 re-chunking, Stage 5 cross-file dedup, Stage 6 combined corpus, Stage 9 AI refinement). All deferred — pattern + inline-LLM pass is the current baseline.
- [Client_Server_Architecture_Plan.md](./Client_Server_Architecture_Plan.md) — frontend feedback and staged migration path. The 12 MB static JSON is near the practical ceiling of the static-first architecture; the plan describes how to move to a chunked/indexed delivery and then to a SQLite-backed API when needed.

The most useful immediate follow-up work:

1. **Re-run Wikidata anchor** to catch up the ~250 persons/orgs introduced in batches 23–98 that are still unanchored.
2. **Spin up `npm run dev` and load the 12 MB graph.** Confirm whether the new node types render correctly and whether `react-force-graph-2d` survives the 5k node load. The UI filter hasn't been visually tested.
3. **Split the static JSON** per Stage A of the Client/Server plan — ~1 day of work, no new infrastructure, most of the perceived performance win.
