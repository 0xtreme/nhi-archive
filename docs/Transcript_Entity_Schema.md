# Transcript Entity Schema

## Objective

Define the node types, relationship types, and properties that the transcript extraction pipeline (Stage 7 in `docs/Transcript_Archive_Pipeline.md`) will produce. Establish this before writing extraction prompts or running LLMs over the 98-video corpus so that output is consistent and mergeable into the core archive graph.

This document is the canonical contract. The extractor outputs must conform to it. The core archive graph (`public/data/graph.seed.json`) will accept these records via `pipeline/input/raw-source-records-transcripts.json` and the existing Zod-validated ingestion in `scripts/pipeline/run.mjs`.

## Research foundation (standard practices)

Based on current literature on KG extraction from transcripts and unstructured text:

1. **Schema-first extraction.** Define entity types, relationship types, and attributes before running extractors. Schemas act as the blueprint and dramatically reduce noise. Every modern pipeline does this first.
2. **For corpora under 1,500 documents** (we have 98), the standard recommendation is **LLM extraction with prompt engineering**, not fine-tuning. No bespoke model training needed.
3. **Start simple, iterate.** Begin with a small set of core types and expand only when extraction results demand it. Document every schema change with a date and reason.
4. **Use tool-based / structured output.** Have the LLM emit JSON against a strict schema rather than free-form text. This is what Neo4j's LLMGraphTransformer, LangChain's structured output, and Anthropic's tool use all do. It reduces extraction errors materially (cited figures: 64% accuracy improvement, 92% error reduction on retries vs free-form extraction).
5. **Provenance on every fact.** Every node and every edge must cite its source(s): video id, timestamp range, speaker. Industry standard for provenance is W3C PROV-O — we adopt a pragmatic subset.
6. **Entity canonicalization is non-negotiable.** Auto-captions produce "grush", "Grush", and "Grusch" all for David Grusch. If we skip canonicalization we get three nodes instead of one and our graph fragments. This must be a first-class step, not an afterthought.
7. **Confidence scoring per edge, not just per node.** A single speaker's claim about a third party is lower-confidence than a testimony under oath. Model this on the edge.
8. **Validation against external references** to reduce hallucinations. For known figures, cross-check extracted attributes against Wikidata/Wikipedia where possible.

References consulted:
- [Neo4j: Knowledge Graph Extraction and Challenges](https://neo4j.com/blog/developer/knowledge-graph-extraction-challenges/)
- [CLARE: Context-Aware, Interactive Knowledge Graph Construction from Transcripts](https://www.mdpi.com/2078-2489/16/10/866)
- [Knowledge Graph Construction: Extraction, Learning, and Evaluation (MDPI 2025)](https://www.mdpi.com/2076-3417/15/7/3727)
- [LLM-empowered knowledge graph construction: A survey (arXiv 2025)](https://arxiv.org/html/2510.20345v1)
- [PARSE: LLM-Driven Schema Optimization for Reliable Entity Extraction](https://arxiv.org/html/2510.08623v1)
- [Neo4j Developer Guide: Creating Knowledge Graphs from Unstructured Data](https://neo4j.com/developer/genai-ecosystem/importing-graph-from-unstructured-data/)

## Design principles for this schema

1. **Union, not subset, of the existing graph types.** The existing graph uses `incident`, `person`, `organization`, `location`, `statement`, `artifact`, `designation`, `event`, `media`. We keep all of these and add more rather than narrowing to them.
2. **Every node is defensively cited.** A node with no source is not allowed to enter the graph. This lets the UI show "where did this come from" on every hover.
3. **Claims are first-class.** The existing graph has `statement` but treats it generically. For interview content, the atomic unit is a claim made by a specific person on a specific video at a specific timestamp, with an assertability level (testified under oath vs speculated vs hearsay). We model this explicitly.
4. **Temporal validity.** A role like "Deputy Under Secretary of the Navy" is valid over a date range. Don't bake role into the person node — model it as a time-bounded edge.
5. **Keep the schema a superset of, not conflicting with, the core graph.** New types use names that don't collide with existing ones. New edge relations are verb-cased consistent with existing (`INVESTIGATED`, `WITNESSED`, `REFERENCES`).

## Node types

All 16 types below are in scope from the first extraction pass. Each type lists required and optional properties. All node types share the universal envelope defined later.

#### `person`
Individuals referenced in interviews. Covers researchers, witnesses, officials, military personnel, scientists, abductees, journalists, skeptics, hosts, guests, and historical figures.

- **Required**: `canonical_name`
- **Optional**: `aliases[]`, `also_known_as`, `date_of_birth`, `date_of_death`, `nationality`, `profession`, `primary_affiliation` (org ref), `biography_summary`, `notability_tags[]` (e.g., `whistleblower`, `researcher`, `official`, `witness`, `debunker`, `host`), `wikidata_id`, `wikipedia_url`

#### `organization`
Military units, intelligence agencies, civilian research groups, corporations, media outlets, think tanks, foundations.

- **Required**: `canonical_name`, `org_type` (one of `government_agency`, `military_unit`, `intelligence_agency`, `research_org`, `civilian_group`, `corporation`, `media_outlet`, `think_tank`, `foundation`, `legislative_body`, `other`)
- **Optional**: `acronym`, `full_name`, `country`, `parent_org` (org ref), `founded_date`, `dissolved_date`, `classification_level`, `stated_mission`, `description`, `wikidata_id`, `wikipedia_url`

#### `location`
Physical places referenced. Includes bases, crash sites, ranches, buildings, cities, states, countries, celestial bodies if relevant.

- **Required**: `canonical_name`, `location_type` (one of `military_base`, `research_facility`, `ranch`, `crash_site`, `city`, `state`, `country`, `region`, `building`, `observation_site`, `airspace_region`, `celestial_body`, `other`)
- **Optional**: `lat`, `lng`, `country`, `state_or_region`, `operated_by` (org ref), `classification_level`, `description`, `wikidata_id`

#### `event`
Specific happenings with a known or estimable time. Congressional hearings, press conferences, expeditions, testimony sessions, disclosure events, founding/dissolution events of programs.

- **Required**: `canonical_name`, `event_type` (one of `hearing`, `press_conference`, `testimony`, `expedition`, `launch`, `disclosure`, `meeting`, `founding`, `disbandment`, `publication`, `leak`, `other`), `date_start` (or `date_approximate`)
- **Optional**: `date_end`, `location_id`, `participants[]` (person refs), `organizing_org_id`, `description`, `outcome`

#### `incident`
Specific UFO/UAP/NHI encounters. Sightings, abductions, close encounters, craft recoveries. This matches the existing core graph's `incident` type and must remain compatible.

- **Required**: `canonical_name`, `incident_type` (one of `sighting`, `abduction`, `close_encounter`, `crash_retrieval`, `implant`, `telepathic_contact`, `mass_sighting`, `other`), `date_approximate`
- **Optional**: `date_start`, `date_end`, `location_id`, `witnesses[]` (person refs), `phenomena_observed[]` (phenomenon refs), `description`, `corroboration_level` (enum: `uncorroborated`, `single_witness`, `multiple_witnesses`, `physical_evidence`, `official_investigation`)

#### `claim`
The core unit of transcript data. An assertion made by a specific person on a specific video at a specific timestamp. This is **new** — the existing `statement` type is retained but `claim` adds the assertion-level semantics we need for conversational content.

**Extraction rule**: only extract a claim when it references at least one named entity — a person, organization, program, location, document, or dated event. Generic philosophical assertions without named entities are dropped at extraction time (they produce too much noise and have no links to anchor them in the graph).

**Speculation rule**: if the speaker clearly frames the assertion as speculation ("I think", "I suspect", "my guess is", "it's possible that"), extract it with `assertability: speculation` so the UI can display it distinctly. If the framing is ambiguous between assertion and speculation, **drop the claim** rather than guess — we keep only claims we can label with confidence.

- **Required**: `statement_text`, `asserted_by_id` (person ref), `source_video_id`, `timestamp_start_seconds`, `assertability` (enum: `testimony_under_oath`, `on_record_statement`, `personal_account`, `speculation`, `hearsay`, `cited_from_document`), `subject_entities[]` (**must contain at least one reference** to a named entity node)
- **Optional**: `timestamp_end_seconds`, `claim_type` (enum: `factual_assertion`, `personal_experience`, `hypothesis`, `prediction`, `denial`), `contradicts_ids[]` (claim refs), `supports_ids[]` (claim refs), `evidence_cited_ids[]` (document/media refs), `confidence_self_reported` (how certain the speaker sounded)

#### `video`
Jesse Michels episodes themselves are first-class nodes. They're both source (for everything extracted from them) and subject (we can talk about an episode).

- **Required**: `video_id`, `title`, `url`, `release_date`
- **Optional**: `view_count`, `duration_seconds`, `host_id` (person ref), `guest_ids[]` (person refs), `topic_ids[]` (concept refs), `transcript_path`, `has_manual_captions` (boolean), `description`

#### `program`
Named research programs, projects, or initiatives — AATIP, AAWSAP, Project Blue Book, Project Mogul, the Galileo Project, Skywatch, etc. These are distinct enough from `organization` to warrant their own type.

- **Required**: `canonical_name`, `acronym`
- **Optional**: `run_by_id` (org ref), `funded_by_ids[]` (org refs), `start_date`, `end_date`, `classification_level`, `stated_mission`, `actual_focus`, `budget`, `description`, `successor_id` (program ref), `predecessor_id` (program ref)

#### `document`
Books, papers, leaked documents, legislation, official reports, memos, video documentaries cited as evidence.

- **Required**: `canonical_title`, `document_type` (enum: `book`, `paper`, `report`, `memo`, `legislation`, `leaked_document`, `patent`, `court_filing`, `transcript`, `broadcast`, `other`)
- **Optional**: `author_ids[]` (person refs), `publisher_org_id`, `publication_date`, `classification_level`, `url`, `isbn_or_doi`, `summary`

#### `concept`
Abstract ideas referenced across interviews: disclosure, reverse engineering, the simulation hypothesis, anti-gravity, consciousness-mediated propulsion, psychological operations, non-human intelligence.

- **Required**: `canonical_name`, `concept_domain` (enum: `physics`, `consciousness`, `metaphysics`, `technology`, `politics`, `history`, `psychology`, `biology`, `theology`, `other`)
- **Optional**: `definition`, `related_concept_ids[]`, `originated_by_id` (person ref), `year_introduced`

### Additional node types

#### `phenomenon`
Named phenomena or experience categories: orbs, tic-tacs, missing time, telepathic contact, downloads (as described by experiencers), triangular craft. Useful for clustering witness reports but adds extraction surface.

- **Required**: `canonical_name`, `phenomenon_category` (enum: `craft_morphology`, `experiential`, `physical_trace`, `electromagnetic`, `biological`, `temporal`, `psychic`, `other`)
- **Optional**: `typical_characteristics[]`, `first_documented_date`, `description`

#### `role`
A time-bounded position held by a person at an organization (see "Temporal validity" principle). Created automatically when a `HELD_ROLE` edge is extracted.

- **Required**: `title`, `person_id`, `organization_id`
- **Optional**: `date_start`, `date_end`, `description`

#### `testimony`
A specific piece of testimony given under oath at a specific event (e.g., Grusch's July 2023 Congressional hearing). Subset of `claim` with stricter provenance — legally attested rather than casually spoken.

- **Required**: `testimony_text`, `person_id`, `event_id`
- **Optional**: `date`, `subject_ids[]` (node refs), `document_id` (source transcript), `summary`

#### `citation`
When a person in a video cites an external work (book, paper, report). This is a relationship enough that modeling as an edge is fine, but if we want to track things like "how many times was *UFOs & Nukes* cited?" a node type helps.

- **Required**: `cited_document_id`, `citing_video_id`, `citing_person_id`, `timestamp_seconds`
- **Optional**: `context_quote`, `citation_purpose` (enum: `evidence`, `background`, `recommendation`, `critique`, `other`)

#### `technology`
Craft types, propulsion theories, sensor systems, weapons, named devices (e.g., "element 115", "tic-tac-shaped object", specific drone models). Distinct from `concept` because these are physical/engineered, not abstract.

- **Required**: `canonical_name`, `technology_type` (enum: `craft`, `propulsion`, `sensor`, `weapon`, `material`, `communications`, `energy`, `other`)
- **Optional**: `claimed_capabilities[]`, `associated_programs[]`, `technology_readiness_level`, `classification`, `description`

## Relationship types (edges)

Edges are typed, directed, and carry their own properties (provenance, confidence, temporal validity). Relationship names are verb-cased SHOUTING per the existing graph convention.

### Personal and organizational

- `EMPLOYED_BY` — person → organization (time-bounded via edge properties `start_date`, `end_date`)
- `HELD_ROLE` — person → role node (or directly person → organization with `role_title` edge property)
- `MEMBER_OF` — person → organization / program
- `FOUNDED` — person / organization → organization / program
- `KNOWS` — person ↔ person (symmetric; extracted when interviewer speaks about known relationship)
- `WORKED_WITH` — person → person (weaker than KNOWS; task-specific collaboration)
- `MENTORED_BY` — person → person
- `FAMILY_OF` — person → person (with `relation_type` edge property)
- `SUCCEEDED` — person → person (in a role)

### Events, incidents, and testimony

- `WITNESSED` — person → incident / event
- `INVESTIGATED` — person / organization → incident / event / phenomenon
- `TESTIFIED_AT` — person → event (e.g., Congressional hearing)
- `TESTIFIED_ABOUT` — person → claim / incident / program
- `ORGANIZED` — person / organization → event
- `ATTENDED` — person → event
- `OCCURRED_AT` — event / incident → location
- `OCCURRED_ON` — event / incident → (date as edge property)
- `PARTICIPATED_IN` — person / organization → event

### Programs, documents, and claims

- `PART_OF` — program → organization; incident → event; entity → concept
- `RUN_BY` — program → organization
- `FUNDED_BY` — program / organization → organization / person
- `SUCCEEDED_PROGRAM` — program → program
- `AUTHORED` — person → document
- `PUBLISHED` — organization → document
- `CITES` — video / document / claim → document / claim
- `REFERENCES` — video / claim → any entity
- `ASSERTED` — person → claim (primary provenance edge for claims)
- `CORROBORATES` — claim → claim (two claims align)
- `CONTRADICTS` — claim → claim (two claims conflict — worth surfacing)
- `REFINES` — claim → claim (claim B specifies or amends claim A)
- `DENIED_BY` — claim → person (person rejected this claim)

### Video-specific

- `APPEARED_IN` — person → video (with `appearance_type` edge property: `guest`, `clip_used`, `mentioned`)
- `HOSTED_BY` — video → person
- `INTERVIEWED` — person (host) → person (guest) via video (ternary, usually modeled as two edges from video: `HOSTED_BY` and `APPEARED_IN`)
- `DISCUSSES` — video → any entity (major topic of conversation; threshold by mention count / time discussed)
- `MENTIONS` — video → any entity (weaker than DISCUSSES; brief reference)

### Location, spatial

- `LOCATED_AT` — any → location (point-level)
- `LOCATED_IN` — location → location (containment: base is in state, state is in country)
- `LOCATED_IN_COUNTRY` — any → location (country-level, matches existing graph convention)
- `OPERATED_BY` — location → organization

### Technology and concepts

- `DEVELOPED` — person / organization / program → technology
- `USES_TECHNOLOGY` — craft / incident → technology
- `BASED_ON_CONCEPT` — technology → concept
- `RELATED_TO_CONCEPT` — any → concept

### Temporal ordering (matches existing)

- `PRECEDED` — event / incident → event / incident

## Universal node envelope

Every node, regardless of type, carries these fields. This is enforced at the validation boundary.

```json
{
  "id": "person-david-grusch",
  "node_type": "person",
  "label": "David Grusch",
  "summary": "Former intelligence officer, UAP whistleblower.",
  "tags": ["whistleblower", "uap", "intelligence"],
  "pipeline_source": "transcripts",
  "pipeline_confidence": 0.95,
  "status": "auto_ingest",
  "crawled_at": "2026-04-17T19:00:00Z",
  "sources": [
    {
      "source_type": "transcript",
      "video_id": "kRO5jOa06Qw",
      "timestamp_start": 42.5,
      "timestamp_end": 68.2,
      "quote": "He handled presidential daily briefings."
    }
  ],
  "canonical_forms": {
    "wikidata_id": "Q123456",
    "wikipedia_url": "https://en.wikipedia.org/wiki/David_Grusch"
  },
  "type_specific": {
    "aliases": ["Dave Grusch", "grush"],
    "profession": "Intelligence officer",
    "notability_tags": ["whistleblower", "witness"]
  }
}
```

Compatibility with the existing core graph: `id`, `node_type`, `label`, `summary`, `tags`, `pipeline_source`, `pipeline_confidence`, `status`, `crawled_at`, and the `sources` array are shared. `type_specific` holds the per-type properties defined in the Node types section. `canonical_forms` is new but optional and carries external KB identifiers for entity resolution.

## Universal edge envelope

```json
{
  "id": "edge-person-david-grusch-event-july-2023-congressional-hearing-TESTIFIED_AT",
  "from_node_id": "person-david-grusch",
  "to_node_id": "event-2023-07-congressional-uap-hearing",
  "relationship": "TESTIFIED_AT",
  "confidence": 0.97,
  "sources": [
    {
      "source_type": "transcript",
      "video_id": "kRO5jOa06Qw",
      "timestamp_start": 124.0,
      "timestamp_end": 140.3,
      "quote": "he testified about his findings under oath in front of Congress this summer"
    }
  ],
  "properties": {
    "date_start": "2023-07-26",
    "role_during_event": "whistleblower witness"
  }
}
```

## Provenance model

Every node and every edge must have a non-empty `sources` array. For transcript-derived entities each source entry contains:

- `source_type`: `"transcript"` (future: `"wikipedia"`, `"document"`, etc.)
- `video_id`: the YouTube video id
- `timestamp_start`, `timestamp_end`: seconds into the video where the assertion/mention was made
- `quote`: the verbatim or near-verbatim excerpt (max 500 chars) supporting the extraction

A node can have multiple source entries. When the same person is mentioned in 10 videos, the node accumulates 10 source entries — each traceable to the exact moment. This is how the UI will be able to link back into the transcript viewer for any entity.

## Confidence model

Two confidence dimensions:

1. **Extraction confidence** (field: `pipeline_confidence`, range 0.0-1.0): how confident the extractor (LLM) was that this entity/edge was correctly identified. Captured per-record at extraction time. Low confidence routes to review queue, not live graph.

2. **Assertability level** (claim nodes only, field: `assertability`): the legal/epistemic weight of the claim itself:
   - `testimony_under_oath` — highest
   - `on_record_statement` — named person, public forum
   - `personal_account` — lived experience described
   - `speculation` — "I think", "I suspect", "it's possible"
   - `hearsay` — "I heard that", "someone told me"
   - `cited_from_document` — reported from a specific document

These are **independent**. A piece of speculation can be extracted with 0.99 confidence (we're sure the speaker speculated); the speculation itself is still low-assertability. The UI surfaces both.

## Entity canonicalization

Auto-captions mangle proper nouns. `David Grusch` may appear as `David Grusch`, `Dave Grusch`, `grush`, `grusch`, `Dave grush`, and `the grush guy`. Without canonicalization, our graph gets fragmented.

Strategy (multi-stage):

1. **At extraction time**: the LLM is given a curated seed list of 200-500 high-priority names (UFO community figures, relevant politicians, researchers, whistleblowers) and instructed to map observed mentions to the canonical form from the list. New people not on the seed list are created fresh.
2. **At merge time** (in `run.mjs`): use Jaccard similarity on `label + summary + key_metadata`, with a lower threshold for `person` nodes (we expect typo variants). Two candidate matches are merged.
3. **Post-hoc**: after batch extraction, surface a canonicalization review UI showing clusters of suspected duplicates (e.g., similar names, overlapping sources, same notability tags) for human approval.
4. **External anchoring**: when a Wikidata id is confidently assigned, it becomes the merge key. Two nodes with the same Wikidata id are automatically merged.

Document the seed list in `transcripts/canonical_entities.json` — see "Next actions" below.

## Extraction contract (LLM output format)

The LLM will be prompted to emit a single JSON object per transcript with the following top-level structure:

```json
{
  "video_id": "kRO5jOa06Qw",
  "extracted_at": "2026-04-17T19:00:00Z",
  "extractor_version": "v1",
  "nodes": [
    { "id": "person-david-grusch", "node_type": "person", "label": "David Grusch", ... }
  ],
  "edges": [
    { "from_node_id": "person-david-grusch", "to_node_id": "event-2023-07-congressional-uap-hearing", "relationship": "TESTIFIED_AT", ... }
  ],
  "unresolved_mentions": [
    { "surface_form": "Dr. Roger Lear", "context_quote": "...", "best_guess_type": "person" }
  ]
}
```

`unresolved_mentions` captures candidates the LLM was unsure how to model — these go to a review queue, not the graph.

Per-transcript output is written to `transcripts/entities/<video_id>.json`. A merge step aggregates all 98 into `pipeline/input/raw-source-records-transcripts.json` in the shape expected by `run.mjs`.

## Relationship to existing core graph

- Existing `incident`, `person`, `organization`, `location`, `event`, `media`, `statement`, `artifact`, `designation` node types all remain. Transcript extraction produces records of these types that get merged with existing nodes via the canonicalization rules above.
- New node types introduced by this schema: `claim`, `video`, `program`, `document`, `concept`, `phenomenon`, `role`, `testimony`, `citation`, `technology`.
- New edge relations are additive. Existing `WITNESSED`, `INVESTIGATED`, `REFERENCES`, `PART_OF`, `LOCATED_AT`, `LOCATED_IN_COUNTRY`, `PRECEDED`, `CORROBORATES`, `MADE_STATEMENT` all retained.
- `pipeline_source: "transcripts"` tags every transcript-origin record so the UI can toggle a transcript layer independently.

## Resolved design decisions (2026-04-17)

The six questions that were open in the initial draft are now resolved. The schema above already reflects these decisions — this section records the rationale for future maintainers.

1. **All 16 node types are in scope from day one.** Rationale: if we'll need them anyway, adding them now avoids a future schema migration that would force re-extraction across all 98 videos.
2. **Claims require at least one named-entity reference** (see the `claim` definition's Extraction rule). Generic assertions ("consciousness is fundamental", "disclosure is near") without named entities are dropped. A claim must anchor to at least one person, organization, program, location, document, or dated event.
3. **Speculation is kept only when the speaker frames it clearly.** Assertions tagged `assertability: speculation` are extracted and displayed distinctly. Ambiguous assertions that can't be cleanly labeled as fact vs speculation are dropped. See the Speculation rule in the `claim` definition.
4. **Wikidata anchoring is post-hoc.** After extraction converges (and after entity canonicalization within our own corpus), a separate pass queries Wikidata for high-confidence person/organization/location nodes and attaches `wikidata_id` where found. Doing this at extraction time adds latency, cost, and rate-limit handling for every extraction run; post-hoc is one batch query per canonical node.
5. **Canonical seed list = existing graph nodes + manual top-20 curation.** Bootstrap from `public/data/graph.seed.json` by extracting all `person`, `organization`, `location`, and event-like records. Supplement with a manual pass over the top 20 most-viewed videos' titles and known guest lists to catch UAP-community figures not yet in the graph. This gives the extractor a warm start with names already vetted in our archive.
6. **Jesse Michels is a regular `person` node.** No special "host" class. He carries notability tags (`journalist`, `researcher`, `interviewer`) like any other person with those properties. The `video.host_id` reference points to his person node. The fact that a claim comes from an interview is captured entirely in the source envelope (video_id, timestamp, quote) — it does not need to be reflected in node typing or segregate the data. Transcript-origin entities merge naturally with the rest of the archive graph.

## Schema evolution plan

This schema will change. When it does:

1. Every change goes in a `SCHEMA_CHANGELOG.md` section at the bottom of this file with a date, a summary, and the reason.
2. Extractor output carries `extractor_version` so we can re-run older extractions against newer schemas.
3. Breaking changes require a re-run of all 98 videos. Additive changes (new optional properties, new edge types) don't.

## Next actions

Schema is approved. Implementation sequence:

1. **Build canonical seed list** → `transcripts/canonical_entities.json`
   - Extract all `person`, `organization`, `location`, `event`, and incident-referenced entities from `public/data/graph.seed.json`. Normalize names, keep `wikidata_id`/`wikipedia_url` if present.
   - Manual top-20 pass: for each of the 20 most-viewed videos, add host + guest (if not already present) and any prominent named figure from the title/description.
   - Output shape: `{ "persons": [...], "organizations": [...], "locations": [...], "programs": [...], "documents": [...] }`, each entry with `canonical_name`, `aliases[]`, `description`, external KB refs if any.
2. **Write the extraction script** → `transcripts/_extract.py`
   - Target: Claude API with structured tool output (one tool call per video, emitting the extraction contract JSON).
   - System prompt: schema rules from this document + seed list (use prompt caching on the static parts).
   - User prompt: the cleaned transcript + video metadata (title, url, release date, view count, host).
   - Output: `transcripts/entities/<video_id>.json` per the Extraction contract section.
3. **Pilot on top 5 videos**. Manually review output against the cleaned transcripts. Iterate on the system prompt until the output quality is acceptable on all 5.
4. **Batch on all 98 videos**. Prompt caching keeps cost bounded; per-video output is independent so batch can be parallelized.
5. **Merge per-video JSONs** into `pipeline/input/raw-source-records-transcripts.json` in the shape expected by `scripts/pipeline/run.mjs`.
6. **Run through `scripts/pipeline/run.mjs`** to validate (Zod), dedupe against existing nodes, score confidence, and materialize into `public/data/graph.seed.json`.
7. **Post-hoc Wikidata pass**: for each high-confidence canonical node in the merged graph, query Wikidata once and attach `wikidata_id` where confidently matched.
8. **UI**: add `pipeline_source` filter to existing views so users can optionally restrict to transcript-origin content (even though transcripts merge naturally, having the filter is useful for provenance review).

## Schema changelog

- **2026-04-17** (draft): Initial draft. 10 core + 6 extended node types. ~35 edge relations. Open questions listed for user review.
- **2026-04-17** (v1): Open questions resolved. All 16 node types now in scope from first extraction pass. Claim extraction requires ≥1 named-entity reference. Speculation kept only when clearly framed; ambiguous claims dropped. Wikidata anchoring confirmed as post-hoc step. Seed list strategy: existing graph nodes + manual top-20 curation. Jesse Michels modeled as a regular `person` node with notability tags — no special host class.
