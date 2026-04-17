"""Compact node/edge builders for transcript extraction.

Each helper returns a fully-formed node or edge envelope per the schema in
docs/Transcript_Entity_Schema.md. This lets per-video extraction files
declare data densely (e.g. `person("david-grusch", "David Grusch", ...)`)
rather than repeat envelope boilerplate.
"""
from __future__ import annotations

from datetime import datetime, timezone

SOURCE_TYPE = "transcript"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def src(video_id: str, t_start: float = 0, t_end: float | None = None,
        quote: str = "") -> dict:
    """Build a source citation dict."""
    d = {
        "source_type": SOURCE_TYPE,
        "video_id": video_id,
        "timestamp_start": t_start,
    }
    if t_end is not None:
        d["timestamp_end"] = t_end
    if quote:
        d["quote"] = quote[:500]
    return d


def _envelope(id: str, node_type: str, label: str, sources: list[dict],
              summary: str = "", tags: list[str] | None = None,
              confidence: float = 0.9,
              type_specific: dict | None = None,
              canonical_forms: dict | None = None) -> dict:
    """Shared node envelope."""
    n = {
        "id": id,
        "node_type": node_type,
        "label": label,
        "summary": summary,
        "tags": tags or [],
        "pipeline_source": "transcripts",
        "pipeline_confidence": confidence,
        "status": "auto_ingest" if confidence >= 0.7 else "review_queue",
        "crawled_at": now_iso(),
        "sources": sources,
    }
    if canonical_forms:
        n["canonical_forms"] = canonical_forms
    if type_specific:
        n["type_specific"] = type_specific
    return n


def person(slug: str, label: str, sources: list[dict], summary: str = "",
           aliases: list[str] | None = None, profession: str = "",
           notability: list[str] | None = None, **kwargs) -> dict:
    ts: dict = {"aliases": aliases or []}
    if profession:
        ts["profession"] = profession
    if notability:
        ts["notability_tags"] = notability
    ts.update(kwargs)
    return _envelope(f"person-{slug}", "person", label, sources, summary,
                     tags=notability or [], type_specific=ts)


def org(slug: str, label: str, org_type: str, sources: list[dict],
        summary: str = "", acronym: str = "", full_name: str = "",
        **kwargs) -> dict:
    ts = {"org_type": org_type}
    if acronym:
        ts["acronym"] = acronym
    if full_name:
        ts["full_name"] = full_name
    ts.update(kwargs)
    return _envelope(f"organization-{slug}", "organization", label, sources,
                     summary, tags=[org_type], type_specific=ts)


def location(slug: str, label: str, location_type: str, sources: list[dict],
             country: str = "", state: str = "", lat: float | None = None,
             lng: float | None = None, **kwargs) -> dict:
    ts = {"location_type": location_type}
    if country:
        ts["country"] = country
    if state:
        ts["state_or_region"] = state
    ts.update(kwargs)
    n = _envelope(f"location-{slug}", "location", label, sources, tags=[location_type], type_specific=ts)
    if lat is not None:
        n["lat"] = lat
        n["lng"] = lng
    return n


def event(slug: str, label: str, event_type: str, date_approx: str,
          sources: list[dict], summary: str = "", **kwargs) -> dict:
    ts = {"event_type": event_type, "date_approximate": date_approx}
    ts.update(kwargs)
    return _envelope(f"event-{slug}", "event", label, sources, summary,
                     tags=[event_type], type_specific=ts)


def incident(slug: str, label: str, incident_type: str, date_approx: str,
             sources: list[dict], summary: str = "", **kwargs) -> dict:
    ts = {"incident_type": incident_type, "date_approximate": date_approx}
    ts.update(kwargs)
    return _envelope(f"incident-{slug}", "incident", label, sources, summary,
                     tags=[incident_type], type_specific=ts)


def program(slug: str, label: str, sources: list[dict], summary: str = "",
            acronym: str = "", **kwargs) -> dict:
    ts = {}
    if acronym:
        ts["acronym"] = acronym
    ts.update(kwargs)
    return _envelope(f"program-{slug}", "program", label, sources, summary,
                     tags=["program"], type_specific=ts)


def document(slug: str, title: str, doc_type: str, sources: list[dict],
             summary: str = "", author: str = "", year: int | None = None,
             **kwargs) -> dict:
    ts = {"document_type": doc_type}
    if author:
        ts["author"] = author
    if year:
        ts["publication_year"] = year
    ts.update(kwargs)
    return _envelope(f"document-{slug}", "document", title, sources, summary,
                     tags=[doc_type], type_specific=ts)


def concept(slug: str, label: str, domain: str, sources: list[dict],
            summary: str = "", **kwargs) -> dict:
    ts = {"concept_domain": domain}
    ts.update(kwargs)
    return _envelope(f"concept-{slug}", "concept", label, sources, summary,
                     tags=[domain], type_specific=ts)


def technology(slug: str, label: str, tech_type: str, sources: list[dict],
               summary: str = "", **kwargs) -> dict:
    ts = {"technology_type": tech_type}
    ts.update(kwargs)
    return _envelope(f"technology-{slug}", "technology", label, sources,
                     summary, tags=[tech_type], type_specific=ts)


def phenomenon(slug: str, label: str, category: str, sources: list[dict],
               summary: str = "", **kwargs) -> dict:
    ts = {"phenomenon_category": category}
    ts.update(kwargs)
    return _envelope(f"phenomenon-{slug}", "phenomenon", label, sources,
                     summary, tags=[category], type_specific=ts)


def video(video_id: str, title: str, url: str, view_count: int,
          duration: float, host_person_id: str | None = None,
          guest_ids: list[str] | None = None, release_date: str = "",
          summary: str = "") -> dict:
    ts = {
        "video_id": video_id,
        "title": title,
        "url": url,
        "view_count": view_count,
        "duration_seconds": duration,
    }
    if host_person_id:
        ts["host_id"] = host_person_id
    if guest_ids:
        ts["guest_ids"] = guest_ids
    if release_date:
        ts["release_date"] = release_date
    # The video itself cites only itself — video_id points to its own file
    self_src = [src(video_id, 0, duration, f"Video: {title}")]
    return _envelope(f"video-{video_id}", "video", title, self_src, summary,
                     tags=["video", "american-alchemy"], type_specific=ts)


def claim(slug: str, statement: str, asserter_id: str, video_id: str,
          t_start: float, assertability: str, subject_ids: list[str],
          sources: list[dict], quote: str = "",
          claim_type: str = "factual_assertion", **kwargs) -> dict:
    ts = {
        "statement_text": statement,
        "asserted_by_id": asserter_id,
        "source_video_id": video_id,
        "timestamp_start_seconds": t_start,
        "assertability": assertability,
        "claim_type": claim_type,
        "subject_entities": subject_ids,
    }
    ts.update(kwargs)
    return _envelope(f"claim-{video_id}-{slug}", "claim", statement[:100],
                     sources, statement, tags=[assertability, claim_type],
                     type_specific=ts)


def edge(from_id: str, to_id: str, relationship: str, sources: list[dict],
         confidence: float = 0.85, properties: dict | None = None) -> dict:
    eid = f"edge-{from_id}-{relationship}-{to_id}"
    e = {
        "id": eid,
        "from_node_id": from_id,
        "to_node_id": to_id,
        "relationship": relationship,
        "confidence": confidence,
        "sources": sources,
    }
    if properties:
        e["properties"] = properties
    return e
