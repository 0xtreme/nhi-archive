"""Convert YouTube VTT subtitles to clean plain text.

YouTube auto-caption VTTs contain heavy duplication (rolling cues) and
inline timestamp tags. This script dedupes and strips them, keeping
both a timestamped .txt.ts variant and a clean reading .txt.
"""
import json
import os
import re
from pathlib import Path

RAW = Path(__file__).parent / "raw"
OUT = Path(__file__).parent / "text"
OUT_TS = Path(__file__).parent / "text_timestamped"
OUT.mkdir(exist_ok=True)
OUT_TS.mkdir(exist_ok=True)

TAG_RE = re.compile(r"<[^>]+>")
TS_LINE_RE = re.compile(r"^(\d\d:\d\d:\d\d\.\d\d\d) --> (\d\d:\d\d:\d\d\.\d\d\d)")


def hms_to_seconds(hms: str) -> float:
    h, m, s = hms.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def seconds_to_hms(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def parse_vtt(path: Path):
    """Yield (start_sec, end_sec, text) tuples, cleaned.

    YouTube rolling-caption cues have up to 2 lines of text: the prior
    cue's roll-up line (for display continuity) and a new line being
    populated with inline <c> tags. We want only the newest line — the
    last non-empty line of each cue block — which, strung together,
    yields the full transcript once without duplication.
    """
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    i = 0
    while i < len(lines):
        m = TS_LINE_RE.match(lines[i])
        if not m:
            i += 1
            continue
        start = hms_to_seconds(m.group(1))
        end = hms_to_seconds(m.group(2))
        i += 1
        block = []
        while i < len(lines) and not TS_LINE_RE.match(lines[i]):
            stripped = lines[i].strip()
            if stripped:
                block.append(lines[i])
            i += 1
        if not block:
            continue
        last = block[-1]
        text = TAG_RE.sub("", last).strip()
        if text:
            yield start, end, text


def dedupe_cues(cues):
    """YouTube rolling captions emit each final line many times. Keep only
    the longest version per unique normalized text, ordered by time."""
    seen = set()
    result = []
    for start, end, text in cues:
        norm = " ".join(text.split()).lower()
        if not norm or norm in seen:
            continue
        seen.add(norm)
        result.append((start, end, text))
    return result


def collapse_lines(cues):
    """Merge consecutive cues into paragraph-like chunks (~80 chars)."""
    paras = []
    buf = []
    buf_start = None
    buf_len = 0
    for start, end, text in cues:
        if buf_start is None:
            buf_start = start
        buf.append(text)
        buf_len += len(text) + 1
        if buf_len > 400:
            paras.append((buf_start, end, " ".join(buf)))
            buf = []
            buf_start = None
            buf_len = 0
    if buf:
        paras.append((buf_start, cues[-1][1] if cues else buf_start, " ".join(buf)))
    return paras


def main():
    manifest = json.load(open(RAW.parent / "manifest.json"))
    meta_by_id = {v["id"]: v for v in manifest}
    results = []
    for vtt in sorted(RAW.glob("*.en.vtt")):
        vid = vtt.name.split(".")[0]
        meta = meta_by_id.get(vid, {})
        cues = list(parse_vtt(vtt))
        cues = dedupe_cues(cues)
        if not cues:
            continue

        title = meta.get("title", vid)
        views = meta.get("view_count")
        url = meta.get("url", f"https://www.youtube.com/watch?v={vid}")
        header = f"# {title}\n{url}\nviews: {views:,}\nvideo_id: {vid}\n\n" if views else f"# {title}\n{url}\nvideo_id: {vid}\n\n"

        # Timestamped version: [HH:MM:SS] text per chunk
        paras = collapse_lines(cues)
        ts_text = header + "\n\n".join(
            f"[{seconds_to_hms(s)}] {t}" for s, _, t in paras
        )
        (OUT_TS / f"{vid}.txt").write_text(ts_text, encoding="utf-8")

        # Clean version: just prose
        clean_text = header + "\n\n".join(t for _, _, t in paras)
        (OUT / f"{vid}.txt").write_text(clean_text, encoding="utf-8")

        results.append({
            "id": vid,
            "title": title,
            "cues": len(cues),
            "chars": len(clean_text),
        })

    results.sort(key=lambda r: -r["chars"])
    print(f"Converted {len(results)} transcripts.")
    print(f"Total chars: {sum(r['chars'] for r in results):,}")
    print(f"Longest 3:")
    for r in results[:3]:
        print(f"  {r['chars']:>8,} chars  {r['cues']:>5} cues  {r['id']}  {r['title'][:60]}")
    print(f"Shortest 3:")
    for r in results[-3:]:
        print(f"  {r['chars']:>8,} chars  {r['cues']:>5} cues  {r['id']}  {r['title'][:60]}")


if __name__ == "__main__":
    main()
