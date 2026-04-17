# Transcript Pipeline — Handoff

Status as of 2026-04-17. Branch: `transcripts/entity-extraction`. Nothing has been pushed to main, nothing has been merged; `graph.seed.json` on `main` is untouched until you merge the branch.

## What was built end-to-end

1. **Canonical seed list** → [transcripts/canonical_entities.json](../transcripts/canonical_entities.json) — 341 entries (134 persons, 98 orgs, 32 locations, 51 events, 10 programs, 9 documents, plus media/statements) sourced from the existing graph + manual UAP community curation.
2. **Deep extraction of video #1** (kRO5jOa06Qw, the Grusch interview) → 174 nodes, 137 edges. Done inline by Claude reading the full transcript. Files: [transcripts/_extract_v1_builders.py](../transcripts/_extract_v1_builders.py), [transcripts/_extract_kRO5jOa06Qw.py](../transcripts/_extract_kRO5jOa06Qw.py).
3. **Batch extraction on 97 remaining videos** → 322 unique entities discovered across the corpus via deterministic seed-list pattern matching. Files: [transcripts/_extract_batch.py](../transcripts/_extract_batch.py), [transcripts/entities/*.json](../transcripts/entities/) (98 files).
4. **Merged extraction bundle** → [pipeline/input/raw-source-records-transcripts.json](../pipeline/input/raw-source-records-transcripts.json): 496 unique nodes, 4,513 edges.
5. **Graph integration** → [scripts/pipeline/integrate-transcripts.mjs](../scripts/pipeline/integrate-transcripts.mjs) transforms the extraction to match `graph.seed.json` shape. 478 new nodes added, 18 merged with existing nodes (canonicalization worked on Alex Dietrich, AARO, AATIP, etc).
6. **Activated merged graph** → [public/data/graph.seed.json](../public/data/graph.seed.json) is now 4,191 nodes / 14,419 edges (was 3,713 / 9,906). Pre-integration backup at [public/data/graph.seed.original-pre-transcripts.json](../public/data/graph.seed.original-pre-transcripts.json).
7. **UI pipeline_source filter** → added a "Data Source" filter section to FilterPanel so users can toggle transcripts on/off independently. Types expanded in [src/types.ts](../src/types.ts), colors + filter logic in [src/lib/archive.ts](../src/lib/archive.ts). TypeScript compiles clean.
8. **Everything committed on the branch**, not pushed.

## On your coreference question

You flagged a real limitation and I want to answer honestly.

The schema's rule "claim must reference ≥1 named entity" is a *structural* constraint — the claim node's `subject_entities` array must contain at least one named-entity id. It does not require the entity's name to appear in the same sentence as the assertion. Cross-sentence coreference is explicitly supported: if paragraph N establishes "David Grusch testified..." and paragraph N+2 says "he also said the isotope ratios are engineered," the extractor should attribute that claim to `person-david-grusch` with the earlier context as supporting evidence.

**Where this is handled correctly**: video #1 (Grusch deep extraction). I read the whole transcript and authored the 28 claim nodes with proper subject resolution across paragraph boundaries. E.g., the `grush-nuclear-ufo-interest` claim doesn't mention Grusch by name in the quoted span — but he's the asserter and the subject because context made that unambiguous.

**Where this is NOT handled** (honest admission): the batch extractor for videos 2–98 is pattern-matching only. It emits exactly one synthesized "discussion-summary" claim per video that references the top-3 matched persons; it does not resolve coreference chains and does not decompose the transcript into individual per-claim assertions. The claim density is shallow on 97 of 98 videos.

**What this means practically**: entities, organizations, and locations are well-populated across the whole corpus (the pattern-matching works for those). Claim-level graph structure is demo-quality, not production-quality, for videos 2–98.

**How to fix it**: run an LLM extraction pass using the already-written schema + seed list. The deterministic node ids mean re-extraction will overwrite the shallow claims for videos 2–98 without duplicating entities. A script scaffold should take ~1 evening to build on top of the existing `_extract_v1_builders.py`. Cost estimate at ~$15 with Claude Sonnet / ~$5 with Haiku / ~$75 with Opus (one-time, prompt-cached).

## Known gaps / what I deliberately skipped

- **Wikidata anchoring pass**: planned as Step 7 but skipped here to stay within session budget. It's strictly additive — one script that queries `https://www.wikidata.org/w/api.php?action=wbsearchentities` for every person/org/location node with no `wikidata_id`, attaches the id + canonical name on high-confidence matches, and routes low-confidence to a review list. No extraction or schema changes required.
- **The two transcripts we couldn't fetch** (9LGohiMmlu4, jyTKETcxj0M) — no English captions on YouTube. To include them you need Whisper on the audio.
- **Ingest via `scripts/pipeline/run.mjs`**: I bypassed this because the Zod schemas there only accept the 9 legacy node types and URL-array sources. Extending the schemas to accept the 16-type vocabulary + structured sources is doable but was out-of-scope risk for this session. `integrate-transcripts.mjs` does the same merge job without touching the legacy pipeline.
- **UI rendering for new node types**: The filter works, but node color/shape styling for `video`, `claim`, `program`, etc. is pragmatic defaults. A designer pass to make video nodes visually distinct (e.g. thumbnail icons) would improve UX meaningfully.

## Where things live

**Entry points (run these to re-run the pipeline):**
- `python3 transcripts/_clean.py` — Stage 3 cleaning (idempotent)
- `python3 transcripts/_extract_kRO5jOa06Qw.py` — Stage 7 deep pilot for video #1
- `python3 transcripts/_extract_batch.py` — Stage 7 batch for remaining videos (skips existing)
- `python3 transcripts/_extract_helpers.py merge` — aggregate per-video JSONs
- `node scripts/pipeline/integrate-transcripts.mjs` — Stage 8 merge into graph

**Docs (read these first next session):**
- [CLAUDE.md](../CLAUDE.md) — repo orientation
- [docs/Transcript_Archive_Pipeline.md](./Transcript_Archive_Pipeline.md) — pipeline design (updated through Stage 3)
- [docs/Transcript_Entity_Schema.md](./Transcript_Entity_Schema.md) — schema v1, the contract
- This file — what's done and what remains

**Data state:**
- `transcripts/raw/` — WEBVTT snapshots, immutable
- `transcripts/text/`, `transcripts/text_timestamped/` — Stage 2 outputs, immutable
- `transcripts/cleaned/` — Stage 3 output, working set
- `transcripts/entities/` — Stage 7 output, per-video JSON
- `public/data/graph.seed.json` — active graph (now includes transcripts)
- `public/data/graph.seed.original-pre-transcripts.json` — rollback target

## Recommended next session agenda (when you return)

1. Start dev server (`npm run dev`), open the app, confirm the new "Data Source" filter shows `transcripts` and toggling it works as expected in all three views (graph, map, timeline).
2. Spot-check video #1 (Grusch) in the graph — you should find ~170 transcript-tagged nodes clustered around `person-david-grusch` with relations into existing graph nodes.
3. If the pilot looks right visually, decide on the deeper-extraction pass: do you want the ~$15 Sonnet batch run for full claim-level richness on videos 2–98? That's the single biggest quality improvement available.
4. Wikidata anchoring can go in parallel — it has no schema risk.
5. Merge the `transcripts/entity-extraction` branch to `main` after visual review.

Good luck. Branch is clean, everything committed.
