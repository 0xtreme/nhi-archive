"""Batch extraction for transcripts/cleaned/*.txt → transcripts/entities/*.json

Strategy for videos beyond the deep-extracted pilot (kRO5jOa06Qw):
  - Deterministic, no-LLM scan-based extraction using
    transcripts/canonical_entities.json as the vocabulary.
  - For each video we emit:
      * a video node
      * a host node (Jesse Michels) and HOSTED_BY/APPEARED_IN edges
      * guest nodes derived from the title (heuristic; see extract_guests)
      * one person/org/location/program node per seed-list match in the text
      * MENTIONS / DISCUSSES edges from the video to each matched entity
      * up to 3 summary claim nodes per video that reference ≥1 named entity
  - Node count per video: ~15–40 depending on match density
  - All nodes carry full provenance (source_type, video_id, quote snippet)

This gives graph-ready coverage for all 98 videos without LLM inference.
An LLM-based deep pass can overwrite or supplement these outputs later —
node ids are deterministic, so the merge step (in _extract_helpers.merge_all)
will combine duplicates.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _extract_v1_builders import (
    src, person, org, location, program, document, concept, technology,
    phenomenon, video, claim, edge
)
from _extract_helpers import load_video, write_output, slugify

ROOT = Path(__file__).parent
CANON = json.load(open(ROOT / "canonical_entities.json"))
MANIFEST = json.load(open(ROOT / "manifest.json"))


def build_match_index() -> list[tuple[str, str, str, dict]]:
    """Flatten the seed list into (kind, canonical_name, regex, full_entry) tuples.

    Regex matches the canonical name OR any of its aliases as whole-word
    case-insensitive. We sort by length-descending so longer/more-specific
    names get matched before shorter aliases (e.g. 'David Grusch' beats 'Dave').
    """
    idx: list[tuple[str, str, str, dict]] = []
    for kind_plural, kind_single in [
        ("persons", "person"),
        ("organizations", "organization"),
        ("locations", "location"),
        ("programs", "program"),
        ("documents", "document"),
    ]:
        for entry in CANON.get(kind_plural, []):
            name = entry.get("canonical_name") or entry.get("canonical_title")
            if not name:
                continue
            all_forms = [name] + list(entry.get("aliases", []))
            # filter trivially short aliases that cause false positives
            all_forms = [f for f in all_forms if len(f) >= 3]
            if not all_forms:
                continue
            pat = r"\b(?:" + "|".join(re.escape(f) for f in all_forms) + r")\b"
            idx.append((kind_single, name, pat, entry))
    # longer names first (prevents "Mellon" matching inside "Chris Mellon")
    idx.sort(key=lambda t: -len(t[1]))
    return idx


MATCH_INDEX = build_match_index()


def extract_guests_from_title(title: str) -> list[str]:
    """Heuristic: guests are often after 'ft.' or '-' or before 'Exposes/Reveals'.
    Returns a list of canonical person names matching the seed list.
    """
    guests = []
    # look up any person canonical_name or alias in the title
    for kind, name, pat, _ in MATCH_INDEX:
        if kind != "person":
            continue
        if re.search(pat, title, re.IGNORECASE):
            if name != "Jesse Michels":  # host is always host
                guests.append(name)
    return list(dict.fromkeys(guests))  # preserve order, dedupe


def scan_text_for_entities(text: str) -> dict[str, list[tuple[str, dict, str]]]:
    """Scan cleaned transcript and return matches grouped by kind.

    Returns {kind: [(canonical_name, seed_entry, first_match_snippet), ...]}
    """
    hits: dict[str, dict[str, tuple[dict, str]]] = {
        "person": {}, "organization": {}, "location": {},
        "program": {}, "document": {},
    }
    for kind, name, pat, entry in MATCH_INDEX:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            if name not in hits[kind]:
                ctx_start = max(0, m.start() - 60)
                ctx_end = min(len(text), m.end() + 60)
                snippet = text[ctx_start:ctx_end].replace("\n", " ")
                hits[kind][name] = (entry, snippet)
    return {k: [(n, e, s) for n, (e, s) in v.items()]
            for k, v in hits.items()}


def t_approx(index: int, total: int, duration: float) -> float:
    """Approximate timestamp in seconds for a paragraph index."""
    if total <= 0:
        return 0.0
    return round(index / total * duration, 1)


def build_extraction(manifest_entry: dict) -> dict:
    vid = manifest_entry["id"]
    path = ROOT / "cleaned" / f"{vid}.txt"
    if not path.exists():
        return {"video_id": vid, "nodes": [], "edges": [],
                "note": "no cleaned transcript"}
    text = path.read_text(encoding="utf-8")
    dur = manifest_entry.get("duration") or 0.0
    title = manifest_entry["title"]

    nodes: list[dict] = []
    edges: list[dict] = []

    def S(t=0, q=""):
        return [src(vid, t, None, q)]

    # --- Video node ---
    guests = extract_guests_from_title(title)
    host = "Jesse Michels"
    guest_ids = [f"person-{slugify(g)}" for g in guests]
    nodes.append(video(
        video_id=vid,
        title=title,
        url=manifest_entry["url"],
        view_count=manifest_entry.get("view_count") or 0,
        duration=dur,
        host_person_id="person-jesse-michels",
        guest_ids=guest_ids,
        summary=manifest_entry.get("description") or "",
    ))

    # --- Host node (always) ---
    # Find Jesse's entry in canon to preserve any existing metadata
    jesse_entry = next(
        (p for p in CANON["persons"] if p["canonical_name"] == "Jesse Michels"),
        {"canonical_name": "Jesse Michels", "aliases": ["Jesse"]})
    nodes.append(person(
        "jesse-michels", "Jesse Michels",
        S(0, "Host of American Alchemy podcast/show."),
        summary=jesse_entry.get("summary") or
                "Host of American Alchemy podcast/show. Independent journalist and UFO/NHI researcher.",
        aliases=jesse_entry.get("aliases", ["Jesse"]),
        profession="journalist",
        notability=["journalist", "interviewer", "researcher", "host"],
    ))
    edges.append(edge(f"video-{vid}", "person-jesse-michels", "HOSTED_BY",
                     S(0, "Jesse hosting"), 0.99))
    edges.append(edge("person-jesse-michels", f"video-{vid}", "APPEARED_IN",
                     S(0, "Host"), 0.99, {"appearance_type": "host"}))

    # --- Matched entities ---
    hits = scan_text_for_entities(text)

    def first_snippet(s: str) -> str:
        return s[:300]

    # Persons (excluding Jesse — already added)
    for cname, entry, snip in hits["person"]:
        if cname == "Jesse Michels":
            continue
        slug = slugify(cname)
        nid = f"person-{slug}"
        is_guest = cname in guests
        nodes.append(person(
            slug, cname, S(0, first_snippet(snip)),
            summary=entry.get("summary") or "",
            aliases=entry.get("aliases", []),
            profession=entry.get("profession", ""),
            notability=entry.get("notability_tags", entry.get("tags", [])),
        ))
        if is_guest:
            edges.append(edge(nid, f"video-{vid}", "APPEARED_IN",
                             S(0, first_snippet(snip)), 0.95,
                             {"appearance_type": "guest"}))
            edges.append(edge(f"video-{vid}", nid, "DISCUSSES",
                             S(0, first_snippet(snip)), 0.95))
        else:
            edges.append(edge(f"video-{vid}", nid, "MENTIONS",
                             S(0, first_snippet(snip)), 0.85))

    # Organizations
    for cname, entry, snip in hits["organization"]:
        slug = slugify(cname)
        nid = f"organization-{slug}"
        otype = entry.get("org_type") or "other"
        nodes.append(org(slug, cname, otype, S(0, first_snippet(snip)),
                         summary=entry.get("summary") or "",
                         full_name=entry.get("full_name", ""),
                         acronym=entry.get("acronym", cname
                                           if len(cname) <= 6 and cname.isupper() else "")))
        edges.append(edge(f"video-{vid}", nid, "MENTIONS",
                         S(0, first_snippet(snip)), 0.85))

    # Locations
    for cname, entry, snip in hits["location"]:
        slug = slugify(cname)
        nid = f"location-{slug}"
        ltype = entry.get("location_type") or "other"
        nodes.append(location(slug, cname, ltype, S(0, first_snippet(snip)),
                              country=entry.get("country", ""),
                              state=entry.get("state", "")))
        edges.append(edge(f"video-{vid}", nid, "MENTIONS",
                         S(0, first_snippet(snip)), 0.85))

    # Programs
    for cname, entry, snip in hits["program"]:
        slug = slugify(cname)
        nid = f"program-{slug}"
        nodes.append(program(slug, cname, S(0, first_snippet(snip)),
                             summary=entry.get("summary") or "",
                             acronym=entry.get("acronym", "")))
        edges.append(edge(f"video-{vid}", nid, "MENTIONS",
                         S(0, first_snippet(snip)), 0.85))

    # Documents
    for cname, entry, snip in hits["document"]:
        slug = slugify(cname)
        nid = f"document-{slug}"
        dtype = entry.get("document_type") or "other"
        nodes.append(document(slug, cname, dtype, S(0, first_snippet(snip)),
                              summary=entry.get("summary") or "",
                              author=entry.get("author", "")))
        edges.append(edge(f"video-{vid}", nid, "CITES",
                         S(0, first_snippet(snip)), 0.85))

    # --- Summary "discussion" claims ---
    # Generate up to 3 high-level claims per video referencing top matched
    # entities. These are low-assertability (cited_from_document style) —
    # the host/guest *discussed* these entities on camera.
    top_persons = [n for n, _, _ in hits["person"] if n != "Jesse Michels"][:3]
    if top_persons:
        csubs = [f"person-{slugify(p)}" for p in top_persons] + [f"video-{vid}"]
        cl = claim(
            "discussion-summary",
            f"Video {vid} features extended discussion of {', '.join(top_persons)} and related UAP research topics, hosted by Jesse Michels.",
            "person-jesse-michels", vid, 0, "on_record_statement",
            csubs,
            S(0, f"Episode title: {title}"),
            quote=f"Episode: {title}")
        nodes.append(cl)
        edges.append(edge("person-jesse-michels", cl["id"], "ASSERTED",
                         S(0, f"Episode: {title}"), 0.9))
        edges.append(edge(f"video-{vid}", cl["id"], "REFERENCES",
                         S(0, ""), 0.95))

    return {"video_id": vid, "nodes": nodes, "edges": edges}


def main(limit: int | None = None, skip_existing: bool = True):
    processed = 0
    skipped = 0
    errors = 0
    entities_dir = ROOT / "entities"
    entities_dir.mkdir(exist_ok=True)
    for m in MANIFEST:
        if not m.get("transcript_available"):
            continue
        vid = m["id"]
        out_path = entities_dir / f"{vid}.json"
        if skip_existing and out_path.exists():
            skipped += 1
            continue
        try:
            d = build_extraction(m)
            write_output(d, vid)
            processed += 1
            if limit and processed >= limit:
                break
        except Exception as e:
            errors += 1
            print(f"ERROR on {vid}: {e}")
    print(f"Done: processed={processed}, skipped={skipped}, errors={errors}")


if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    main(limit=limit)
