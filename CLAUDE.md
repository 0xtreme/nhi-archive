# NHI Archive — Orientation for Claude

This repo has two parallel workstreams. Before doing anything, know which one the user is asking about.

## 1. Core archive (graph/map/timeline app)

Static-first React + Vite app that ingests UFO/UAP data (Wikipedia + NUFORC feeds) into a graph, renders it three ways, and deploys via GitHub Pages.

- Overview: `README.md`
- Full spec: `docs/UFO_Archive_Platform_Spec.md`
- Architecture: `docs/Architecture_Design.md`
- Ingestion: `docs/Data_Ingestion_Design.md`
- Storage: `docs/Data_Storage_Strategy.md`
- Code: `src/`, `scripts/pipeline/`, `pipeline/`, `public/data/`

## 2. Transcript corpus (Jesse Michels / American Alchemy)

Parallel, long-form interview corpus being built up as a separate data surface. **Not yet integrated with the core graph.** This was the active workstream in recent sessions.

- Pipeline doc (fetch → clean): `docs/Transcript_Archive_Pipeline.md` ← **read this first if the user's question is about transcripts, cleaning, or Jesse Michels**
- Entity schema (for extraction stage): `docs/Transcript_Entity_Schema.md` ← **read this before building or running any entity extraction**
- Data lives under `transcripts/`
- Current state: 98 cleaned transcripts in `transcripts/cleaned/`. Schema drafted. Entity extraction not yet run; graph integration not yet done.

## Key conventions

- `transcripts/raw/` and `transcripts/text/` are **immutable snapshots** — never modify them. All derived work goes in new folders (e.g., `transcripts/cleaned/`).
- Transcripts pipeline scripts (`transcripts/_convert.py`, `transcripts/_clean.py`) are re-runnable and self-contained.
- Core archive is TypeScript/React; transcripts tooling is Python stdlib only.
