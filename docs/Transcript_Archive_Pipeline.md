# Transcript Archive Pipeline

## Objective

Build a structured, searchable corpus of UFO/UAP interview transcripts from focused researcher channels (initially Jesse Michels' *American Alchemy*) that can eventually feed named entities, claims, citations, and cross-interview patterns into the main NHI Archive graph as a parallel data source.

This pipeline is **adjacent to**, not part of, the existing Wikipedia/NUFORC ingestion path (`docs/Data_Ingestion_Design.md`). It operates on long-form conversational data rather than incident records, and its current output is plain-text corpora — not yet graph nodes.

## Scope

### Source selection (current)

- Channel: `https://www.youtube.com/@JesseMichels`
- Filter: English captions only; videos with ≥100,000 views
- Result: 142 total videos on channel → 100 qualifying → 98 fetched (2 have no captions of any kind on YouTube)

### Why this channel

Jesse Michels conducts long-form interviews with UFO researchers, whistleblowers, and scientists. Each episode references many named figures, studies, years, locations, and concepts. The goal is to surface these references as structured links — both within individual transcripts and across them.

### Why a separate space in the archive

Conversational research content does not share the incident/sighting/witness model used by the core graph. Forcing it into that model would lose the density of cross-references each interview contains. The plan is a dedicated view or data surface that can cite back into the core graph when a mentioned entity already exists there.

## Pipeline stages

### Stage 0: Channel enumeration

- Tool: `yt-dlp --flat-playlist --dump-json` against the channel `/videos` URL
- Output: `transcripts/_channel_index.jsonl` — one JSON object per video with id, title, view_count, duration, upload timestamp
- Filter applied: `view_count >= 100000`

### Stage 1: Raw subtitle fetch

- Tool: `yt-dlp --write-auto-sub --write-sub --sub-lang en --sub-format vtt --skip-download`
- Rate control: `--sleep-subtitles 1`
- Output: `transcripts/raw/<video_id>.en.vtt` — one WEBVTT per video with word-level timestamps
- Behavior: falls back from manual to auto-generated captions; skips videos with neither

### Stage 2: VTT → plain text conversion

- Script: `transcripts/_convert.py`
- Output:
  - `transcripts/text/<video_id>.txt` — clean prose, ~400-char paragraph chunks
  - `transcripts/text_timestamped/<video_id>.txt` — same body with `[HH:MM:SS]` markers per chunk

Key design decision — **rolling-caption deduplication**: YouTube auto-caption VTTs emit each spoken phrase 2–3 times as the display rolls. Each cue block typically contains the prior cue's roll-up line plus the new words. The converter takes *only the last non-empty line* of each cue block, which — strung together — yields the full transcript exactly once. This drops auto-caption files from ~3× their true length to ~1×.

### Stage 3: Pattern-based cleaning

- Script: `transcripts/_clean.py`
- Input: `transcripts/text/*.txt` (never modified)
- Output: `transcripts/cleaned/<video_id>.txt`, plus `transcripts/_clean_stats.json`

Transformations (regex-only — no AI):

1. HTML entity decode (`&gt;&gt;` → `>>`, `&nbsp;` → space)
2. Speaker-turn normalization: lift `>>` onto its own line for paragraph splitting
3. Stage-direction removal: `[music]`, `[laughter]`, `[applause]`, `[snorts]`, etc.
4. Standalone filler removal: `uh`, `um`, `erm`, `hmm`
5. Stutter collapse: `the the the` → `the`, `I-I-I` → `I`
6. Sponsor/outro block removal (see "Ad-scoring system" below)
7. Whitespace normalization

### Ad-scoring system (Stage 3 detail)

Each paragraph gets a signed score:

- `+2` per **strong** ad phrase: `sponsored by`, `brought to you by`, explicit sponsor brand names (Incogn, ExpressVPN, mudwtr, Cornbread hemp, etc.), CTA phrases (`smash that like button`, `head over to our Substack`)
- `+1` per **weak** ad phrase: `use code X`, `43% off`, `annual plan`, `free shipping`, standalone URLs, `data brokers`, etc.
- `-2` per **content** keyword: UFOs, UAPs, named figures (Grusch, Puthoff, Weinstein, Schumer, Gillibrand, etc.), content concepts (disclosure, abduction, quantum, telepathy), institutions (CIA, NASA, AARO)
- `-1` per year reference (19XX, 20XX)

Paragraphs scoring ≥2 are **anchors**. The cleaner then does **bidirectional block expansion**: from each anchor it removes adjacent paragraphs forward (up to 8) and backward (up to 3) through neutral (`score = 0`) or ad-positive (`score ≥ 1`) paragraphs, stopping when it hits a content-positive paragraph (`score < 0`). This catches multi-paragraph ad reads where the brand-name anchor is mid-block.

Rationale: content keywords act as a **hard guard** — any paragraph with real interview vocabulary (UFO, a guest name, a year) is protected even if it incidentally contains `use code` or `subscribe`. This prevents the common failure mode of eating real content because an ad phrase appeared in an interview aside.

## Current file layout

```
transcripts/
├── manifest.json                    # 100 qualifying videos + metadata + transcript paths
├── _channel_index.jsonl             # full 142-video channel dump (intermediate)
├── _urls.txt                        # URL list for re-fetching (intermediate)
├── _fetch.log                       # yt-dlp batch log
├── _clean_stats.json                # per-file cleaning stats (chars, reduction %, paras dropped)
├── _convert.py                      # Stage 2 script
├── _clean.py                        # Stage 3 script
├── raw/<id>.en.vtt                  # 98 × WEBVTT with timestamps (98 MB)
├── text/<id>.txt                    # 98 × plain prose (11 MB)
├── text_timestamped/<id>.txt        # 98 × prose with [HH:MM:SS] markers (11 MB)
└── cleaned/<id>.txt                 # 98 × ad/filler removed (10 MB) — current working set
```

### manifest.json entries

```
{
  "id": "kRO5jOa06Qw",
  "title": "David Grusch Breaks Silence: Inside Secret UFO Programs",
  "url": "https://www.youtube.com/watch?v=kRO5jOa06Qw",
  "view_count": 2996472,
  "duration": ...,
  "release_timestamp": ...,
  "transcript_available": true,
  "transcript_path": "text/<id>.txt",
  "transcript_timestamped_path": "text_timestamped/<id>.txt",
  "raw_vtt_path": "raw/<id>.en.vtt"
}
```

Two entries have `transcript_available: false` with `transcript_unavailable_reason: "no English subtitles on YouTube (manual or auto)"`.

## Reproduction commands

```bash
# Stage 0 + 1: enumerate and fetch
yt-dlp --flat-playlist --dump-json "https://www.youtube.com/@JesseMichels/videos" \
  > transcripts/_channel_index.jsonl
# (filter + write manifest.json and _urls.txt via short Python)
yt-dlp --write-auto-sub --write-sub --sub-lang en --sub-format vtt \
  --skip-download --ignore-errors --sleep-subtitles 1 \
  -o "transcripts/raw/%(id)s.%(ext)s" -a transcripts/_urls.txt

# Stage 2: VTT → text
python3 transcripts/_convert.py

# Stage 3: pattern-based cleaning
python3 transcripts/_clean.py
```

## Results (as of current state)

- 98 / 100 qualifying videos transcribed
- 10 MB cleaned prose corpus (54,626 lines)
- 919 sponsor/CTA paragraphs removed across the corpus
- Verified content preservation: key figures (Grusch, Puthoff, Weinstein, Lazar, Hastings, Oppenheimer, Schumer, Gillibrand) and topics (Skinwalker, Roswell, Area 51, Tic Tac, Manhattan Project) all present with same file-level counts in `text/` and `cleaned/`
- Verified brand removal: Incogn, ExpressVPN, factormeals, mudwtr, BetterHelp, Rocket Money, Cornbread hemp all at zero mentions in cleaned corpus

## Known limitations

1. **Two videos have no captions at all** (`9LGohiMmlu4` — "Mushrooms Are Alien Mind Control Capsules"; `jyTKETcxj0M` — "UFOs & Nukes: The Bizarre Truth"). Adding these requires speech-to-text (Whisper) on the audio, not subtitle fetch.
2. **Paragraph-boundary bleed**: Stage 2 chunks prose into arbitrary ~400-char paragraphs. When an interview sentence and an ad sentence fall into the same chunk, the cleaner cannot surgically separate them — it keeps the whole paragraph to preserve the interview content. ~4 files have a trailing ad sentence retained inside an otherwise valid content paragraph.
3. **Auto-caption transcription errors**: YouTube auto-captions mishear proper nouns, especially names (`Grusch` → `grush`, `Gillibrand` → misspellings). This is inherent to the upstream source.
4. **No speaker diarization on auto-caption videos**: Only manually-captioned videos have `>>` speaker markers. Auto-caption videos present as a single flow of text with no attribution.
5. **No cross-video deduplication yet**: Some claims and stock intros repeat across interviews. Not addressed in the current pipeline.

## Pipeline state (current)

### Completed stages

**Stage 0–3** (fetch + text conversion + cleaning): 98 of 100 qualifying videos have cleaned transcripts under `transcripts/cleaned/`. Pattern-based cleaner removes sponsor reads, fillers, stutters, and CTAs; `_clean_stats.json` tracks per-file reduction.

**Stage 7 (entity extraction, via inline LLM)**: every cleaned transcript has a structured extraction file at `transcripts/entities/<video_id>.json`. A deep pilot (`_extract_kRO5jOa06Qw.py`) established the schema in practice, then ten batches (`_extract_batch_3to5.py`, `_extract_batch_6to12.py`, ...`_extract_batch_83to98.py`) carried the same envelope forward across the remaining 97 videos. Each batch reads transcript intros, authors typed person/org/location/program/document/concept/technology/phenomenon/incident/event nodes and named-entity-anchored claims, and writes through `_extract_helpers.write_output()` with schema validation.

**Stage 8 (graph integration)**: `transcripts/_extract_helpers.py merge` aggregates all per-video JSON into `pipeline/input/raw-source-records-transcripts.json`. `scripts/pipeline/integrate-transcripts.mjs` then transforms into `graph.seed.json` shape (structured-source → URL-deeplink array, numeric confidence → enum, new node types preserved) and produces both `public/data/transcripts-graph-fragment.json` (transcripts-only) and `public/data/graph.seed.with-transcripts.json` (merged). Activation is `cp` into `public/data/graph.seed.json`.

**Wikidata anchoring** (`scripts/pipeline/wikidata-anchor.mjs`): 172 persons/orgs/locations have `wikidata_id` + `wikipedia_url`. The matcher uses exact normalized label, prefix, middle-initial variant, nickname expansion (hal→harold, etc.), and acronym expansion, plus type-relevant description keywords. **Note: this pass was run after batches 1–22; the 400+ new transcript-origin entities introduced by batches 23–98 have not yet been anchored.** Re-run the script to catch up.

### Active graph metrics

- **5,239 nodes** (up from 3,713 pre-transcripts) — +1,526 transcript-origin
- **16,381 edges** (up from 9,906) — +6,475 transcript-origin
- Node-type distribution:
  `incident: 3478, person: 434, organization: 158, location: 83, event: 79, video: 98, program: 30, document: 77, claim: 666, concept: 99, technology: 23, phenomenon: 6, statement: 4, media: 3, designation: 1`
- `pipeline_source: "transcripts"` on 1,526 nodes (filterable via UI)
- 172 nodes carry `wikidata_id`

### Still open

**Stage 4 — paragraph re-chunking by natural boundaries.** Deferred. The arbitrary 400-char paragraphs occasionally trap ad residue next to interview content; not a blocker for the LLM-extraction path that's now primary, so unresolved.

**Stage 5/6 — cross-file dedup & combined corpus.** Not built. The graph's `ASSERTED` and `REFERENCES` edges already deduplicate by deterministic node id (so "David Grusch" extracted in 20 videos becomes one node with 20 source citations rather than 20 duplicate nodes), but the raw text corpus itself still contains repeated stock intros across files. Useful if someone wants to feed the flat corpus to an LLM without paying for duplicated context.

**Wikidata second-pass.** Re-run `wikidata-anchor.mjs` after new extractions to anchor the ~250 additional persons/orgs from batches 23–98. Script is idempotent and uses `pipeline/out/wikidata-cache.json` so re-runs are cheap.

**Two uncaptioned videos** (`9LGohiMmlu4`, `jyTKETcxj0M`): YouTube has no English captions. Fetchable only via Whisper against the audio. Would add ~40 more entity nodes plus claims at current density.

**Stage 9 — AI-assisted refinement.** Speaker diarization on auto-caption videos; cross-video claim de-duplication at semantic level; name disambiguation (which "John Lear" / which "John"); transcription-error correction against a known-names glossary. Deliberately deferred — pattern + inline-LLM pass is the current state, everything else is refinement.

**Frontend rendering at scale.** The 12 MB `graph.seed.json` is downloaded per visit and rendered fully client-side. Not tested with all 5,239 nodes; force-graph simulation cost on 5k nodes is non-trivial. See [Client_Server_Architecture_Plan.md](./Client_Server_Architecture_Plan.md).

## Design notes for future maintainers

- **Never modify `transcripts/raw/` or `transcripts/text/`.** `raw/` is the upstream snapshot; `text/` is the deterministic VTT parse. All cleaning and derivation happens in new folders so every stage is re-runnable from the prior one.
- **The cleaner's content-keyword list is load-bearing.** Adding new known figures or topics makes cleaning safer (fewer false positives). Adding new sponsor brand names makes it more thorough. Both regex lists are in `_clean.py`.
- **Test surface**: after any `_clean.py` change, re-run and compare `grep -l -i <brand>` counts in `text/` vs `cleaned/` for known sponsor brands, and spot-check paragraph count diffs for the top-reduction files.
- **The 2 uncaptioned videos can be added later** without re-running anything else — Stage 1 writes to `raw/`, Stage 2 and 3 pick them up automatically.

## Relationship to main archive

The transcript pipeline does **not** currently write to `public/data/graph.seed.json` or integrate with `scripts/pipeline/run.mjs`. Integration is gated on Stage 7 (entity extraction) producing a validatable schema. Until then, the transcript corpus is an independent artifact inside `transcripts/` and the main archive is unaffected.
