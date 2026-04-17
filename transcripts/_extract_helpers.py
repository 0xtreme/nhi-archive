"""Helpers for the transcript → entity extraction stage.

Architecture note: the "LLM call" for extraction is performed inline by
Claude (this session) rather than via an API. This script therefore
contains:

  - load_video()     — fetches the cleaned transcript + manifest metadata
  - validate()       — schema check on one extracted JSON file
  - write_output()   — normalizes and writes <video_id>.json
  - merge_all()      — aggregates all per-video outputs into the ingestion
                       contract (pipeline/input/raw-source-records-transcripts.json)
  - slugify()        — deterministic id generation

A future session with API access can wrap load_video() + write_output()
in a Claude API call loop; this module stays unchanged.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).parent
MANIFEST = ROOT / "manifest.json"
CLEANED = ROOT / "cleaned"
ENTITIES = ROOT / "entities"
ENTITIES.mkdir(exist_ok=True)


VALID_NODE_TYPES = {
    "person", "organization", "location", "event", "incident", "claim",
    "video", "program", "document", "concept", "phenomenon", "role",
    "testimony", "citation", "technology", "statement", "media",
    "designation", "artifact",
}

REQUIRED_ENVELOPE = {"id", "node_type", "label", "pipeline_source",
                     "pipeline_confidence", "status", "sources"}


def slugify(text: str, max_len: int = 60) -> str:
    """Deterministic url-safe id fragment."""
    s = text.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:max_len]


def load_video(video_id: str) -> dict:
    """Return {manifest_entry, cleaned_text} for a given video id."""
    manifest = json.load(open(MANIFEST))
    entry = next((v for v in manifest if v["id"] == video_id), None)
    if entry is None:
        raise ValueError(f"video {video_id} not in manifest")
    text_path = CLEANED / f"{video_id}.txt"
    if not text_path.exists():
        raise ValueError(f"cleaned transcript missing for {video_id}")
    return {
        "manifest": entry,
        "cleaned_text": text_path.read_text(encoding="utf-8"),
    }


def validate(extraction: dict) -> list[str]:
    """Return list of validation error strings; empty = valid."""
    errors = []
    for key in ("video_id", "extracted_at", "nodes", "edges"):
        if key not in extraction:
            errors.append(f"missing top-level key: {key}")
    for i, n in enumerate(extraction.get("nodes", [])):
        missing = REQUIRED_ENVELOPE - set(n.keys())
        if missing:
            errors.append(f"node[{i}] id={n.get('id')} missing: {missing}")
        if n.get("node_type") not in VALID_NODE_TYPES:
            errors.append(f"node[{i}] id={n.get('id')} bad node_type: {n.get('node_type')}")
        if not isinstance(n.get("sources"), list) or not n["sources"]:
            errors.append(f"node[{i}] id={n.get('id')} must have non-empty sources")
    for i, e in enumerate(extraction.get("edges", [])):
        for key in ("id", "from_node_id", "to_node_id", "relationship", "sources"):
            if key not in e:
                errors.append(f"edge[{i}] missing: {key}")
        if not isinstance(e.get("sources"), list) or not e["sources"]:
            errors.append(f"edge[{i}] id={e.get('id')} must have non-empty sources")
    return errors


def write_output(extraction: dict, video_id: str) -> Path:
    """Validate + write transcripts/entities/<video_id>.json."""
    extraction.setdefault("extracted_at", datetime.now(timezone.utc).isoformat())
    extraction.setdefault("extractor_version", "v1-inline-claude")
    errs = validate(extraction)
    if errs:
        raise ValueError(f"validation errors for {video_id}:\n" + "\n".join(errs))
    out = ENTITIES / f"{video_id}.json"
    out.write_text(json.dumps(extraction, indent=2, ensure_ascii=False))
    return out


def merge_all() -> dict:
    """Aggregate every transcripts/entities/*.json into one record bundle."""
    all_nodes: dict[str, dict] = {}
    all_edges: dict[str, dict] = {}
    videos_covered: list[str] = []
    for f in sorted(ENTITIES.glob("*.json")):
        d = json.loads(f.read_text())
        videos_covered.append(d["video_id"])
        for n in d.get("nodes", []):
            nid = n["id"]
            if nid in all_nodes:
                # merge sources
                existing = all_nodes[nid]
                seen_src = {(s.get("video_id"), s.get("timestamp_start"))
                            for s in existing.get("sources", [])}
                for s in n.get("sources", []):
                    key = (s.get("video_id"), s.get("timestamp_start"))
                    if key not in seen_src:
                        existing["sources"].append(s)
                # combine tags
                existing.setdefault("tags", [])
                for tag in n.get("tags", []):
                    if tag not in existing["tags"]:
                        existing["tags"].append(tag)
            else:
                all_nodes[nid] = n
        for e in d.get("edges", []):
            eid = e["id"]
            if eid in all_edges:
                existing = all_edges[eid]
                seen_src = {(s.get("video_id"), s.get("timestamp_start"))
                            for s in existing.get("sources", [])}
                for s in e.get("sources", []):
                    key = (s.get("video_id"), s.get("timestamp_start"))
                    if key not in seen_src:
                        existing["sources"].append(s)
            else:
                all_edges[eid] = e
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "videos_covered": videos_covered,
        "total_videos": len(videos_covered),
        "nodes": list(all_nodes.values()),
        "edges": list(all_edges.values()),
        "node_count": len(all_nodes),
        "edge_count": len(all_edges),
    }


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: _extract_helpers.py <video_id> | merge")
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "merge":
        bundle = merge_all()
        out = ROOT.parent / "pipeline" / "input" / "raw-source-records-transcripts.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(bundle, indent=2, ensure_ascii=False))
        print(f"Merged {bundle['total_videos']} videos -> {out}")
        print(f"  nodes: {bundle['node_count']}")
        print(f"  edges: {bundle['edge_count']}")
    else:
        data = load_video(cmd)
        print(f"Video: {data['manifest']['title']}")
        print(f"Chars: {len(data['cleaned_text']):,}")
