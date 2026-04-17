"""Pattern-based transcript cleaner.

Input:  transcripts/text/<id>.txt  (never modified)
Output: transcripts/cleaned/<id>.txt

Goals:
- Preserve substance: names, years, locations, claims, technical terms.
- Preserve speaker-turn markers (>>) where they exist.
- Remove: stage directions, sponsor reads, outro/CTA blocks,
  stutters, standalone disfluencies, HTML entities, excess whitespace.

No AI — pure regex + rule patterns. Conservative over aggressive: if a
pattern is ambiguous we leave the text alone.
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
IN_DIR = ROOT / "text"
OUT_DIR = ROOT / "cleaned"
OUT_DIR.mkdir(exist_ok=True)

# -- Patterns ---------------------------------------------------------------

# Bracketed stage directions. Only match short, known-style annotations so
# we don't nuke arbitrary bracketed content like "[Name]".
STAGE_DIRECTION = re.compile(
    r"\[(?:"
    r"music|laughter|applause|snort(?:s|ing)?|chuckle(?:s|d|ing)?|"
    r"cough(?:s|ing)?|inaudible|crosstalk|sighs?|laughs?|cheers?|"
    r"pause|silence|beep|sound\s+effects?"
    r")\]",
    re.IGNORECASE,
)

# Standalone filler utterances between punctuation/spaces. Very safe:
# "uh" / "um" / "erm" / "hmm". We only strip when set off by spaces or commas
# so we don't eat things like "hummus" or "umbrella".
FILLER_STANDALONE = re.compile(
    r"(?<![A-Za-z'])(?:uh|um|erm|hmm|uhh+|umm+)(?![A-Za-z'])",
    re.IGNORECASE,
)

# Doubled/tripled words: "the the", "and and and", "in a in a".
# Only apply to short words (length 1-4) to avoid collapsing legitimate
# content repetitions like "really really important" (leave those alone).
DOUBLED_WORD = re.compile(
    r"\b(\w{1,4})(?:\s+\1\b)+",
    re.IGNORECASE,
)

# Stutters joined by hyphen: "I-I-I", "th-th-the"
STUTTER_HYPHEN = re.compile(r"\b(\w{1,3})(?:-\1){1,}\b", re.IGNORECASE)

# Multiple spaces → single
MULTI_SPACE = re.compile(r"[ \t]{2,}")

# Ad-read signal patterns. We score each paragraph: strong hits add 2,
# weak hits add 1, content hits subtract 2. A paragraph scores high when
# it's dominated by marketing/CTA language.

# Classic sponsor openers/brand refs. Strong signal — almost never said
# in organic conversation.
AD_STRONG_PATTERNS = [
    # "sponsored by" is only strong when followed by a brand, not a person
    # (e.g., "bill sponsored by Schumer" is content). Require non-capital
    # word after, or just rely on scoring — scoring handles this case.
    r"this (?:episode|video) is (?:brought to you|sponsored)",
    r"today'?s (?:episode|sponsor) is",
    r"brought to you by",
    r"(?:our |today'?s )?sponsor is (?!a )\w",
    r"smash that like button",
    r"hit that like button",
    r"hit the subscribe button",
    r"please subscribe to (?:my|our|the) channel",
    r"don'?t forget to subscribe",
    r"head (?:on )?over to (?:our|my) (?:substack|patreon)",
    r"american alchemy magazine",
    r"support (?:the channel|us) on patreon",
    r"full link in the description",
    # Recurring sponsor brand names seen in this channel
    r"\bincogn\b",
    r"expressvpn",
    r"factormeals?",
    r"\bmudwtr\b",
    r"\bmudwater\b",
    r"cornbread hemp",
    r"\bi[- ]?restore\b",
    r"betterhelp",
    r"\bmasterclass\b",
    r"rocket money",
    r"magic mind",
    r"athletic greens",
    r"\bag1\b",
    r"surf shark",
    r"\bnord ?vpn\b",
]
AD_STRONG = re.compile("|".join(AD_STRONG_PATTERNS), re.IGNORECASE)

# Weaker marketing language. Can appear incidentally in content.
AD_WEAK_PATTERNS = [
    # "sponsored by" without a specific brand phrase — score it weak so
    # legislative/artistic uses ("bill sponsored by Schumer") aren't hit
    # unless other ad signals are present.
    r"\bsponsored by\b",
    r"use (?:promo |discount )?code \w",
    r"\bcode \w+ at checkout",
    r"\d{1,2}%\s*off\b",
    r"go to \w[\w./-]+\.(?:com|net|org|io)\b",
    r"(?:sign up|subscribe) at \w[\w./-]+\.(?:com|net|org|io)",
    r"\bvisit \w[\w./-]+\.(?:com|net|org|io)",
    r"\b\w+\.com/(?:jesse|alchemy|amerialchemy|ameanalchemy)\b",
    r"thanks? for watching",
    r"see you (?:next time|in the next (?:one|video))",
    r"new videos? (?:every|each) (?:week|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
    r"link in the description",
    r"(?:data brokers?|your (?:personal )?(?:data|information))",
    r"delete your (?:personal )?(?:data|information)",
    r"annual plan",
    r"privacy team",
    r"unlimited takedowns",
    r"starter kit",
    r"free shipping",
    r"exclusive (?:deal|discount|offer)",
    r"money[- ]back guarantee",
    r"risk[- ]free",
    r"limited time (?:offer|only)",
]
AD_WEAK = re.compile("|".join(AD_WEAK_PATTERNS), re.IGNORECASE)


# -- Core cleaning ----------------------------------------------------------

def split_header_body(text: str) -> tuple[str, str]:
    """Our text files start with a header block (# title, url, views,
    video_id) followed by a blank line. Keep header verbatim."""
    parts = text.split("\n\n", 1)
    if len(parts) == 2 and parts[0].startswith("#"):
        return parts[0] + "\n", parts[1]
    return "", text


def decode_entities(s: str) -> str:
    # Decode &gt; &lt; &amp; &#39; &quot; &nbsp; etc. After unescape, the
    # non-breaking space (U+00A0) comes out as a distinct char — normalize
    # it to a regular space so searching and downstream tools behave.
    # Then lift the doubled angle-bracket speaker marker onto its own line
    # so paragraph splitting respects turn boundaries.
    s = html.unescape(s)
    s = s.replace("\u00a0", " ")
    s = re.sub(r"\s*>>\s*", "\n\n>> ", s)
    return s


def strip_stage_directions(s: str) -> str:
    return STAGE_DIRECTION.sub("", s)


def strip_fillers(s: str) -> str:
    s = FILLER_STANDALONE.sub("", s)
    # clean up stray comma/space artifacts left behind
    s = re.sub(r"\s+,", ",", s)
    s = re.sub(r",\s*,", ",", s)
    return s


def collapse_stutters(s: str) -> str:
    s = STUTTER_HYPHEN.sub(r"\1", s)
    # apply doubled-word collapse repeatedly until stable (handles
    # overlapping repeats that aren't caught in one pass)
    prev = None
    while prev != s:
        prev = s
        s = DOUBLED_WORD.sub(r"\1", s)
    return s


# Content-resumption signals. Strong indicators a paragraph is real
# interview content, not continued ad copy. Plurals and variants included
# because auto-captions use lowercase and varied forms ("ufos", "aliens").
CONTENT_KEYWORDS = re.compile(
    r"\b(?:UFOs?|UAPs?|NHI|aliens?|Pentagon|Roswell|Grusch|Lazar|Puthoff|"
    r"Weinstein|Oppenheimer|Hastings|disclosure|abductions?|crash retrieval|"
    r"non[- ]?human|extraterrestrials?|witness(?:es)?|whistleblowers?|"
    r"congress(?:ional)?|classified|telepath(?:y|ic)|consciousness|occult|psychic|"
    r"paranormal|phenomena|sightings?|Skinwalker|cryptid|poltergeist|"
    r"Manhattan Project|Area 51|anti[- ]?gravity|wormhole|simulation|"
    r"quantum|CIA|FBI|NASA|DIA|AARO|AAWSAP|AATIP|"
    r"Schumer|Gillibrand|Rubio|Burchett|Luna|Harry Reid|Elizondo|Mellon|"
    r"UAP Disclosure Act|Fravor|Nimitz|Tic Tac|Bigelow|Skinwalker Ranch)\b",
    re.IGNORECASE,
)
YEAR = re.compile(r"\b(?:19\d{2}|20\d{2})\b")
SPEAKER_TURN = re.compile(r"^\s*>>")


def looks_like_content(p: str) -> bool:
    """Heuristic: does this paragraph read as interview content rather
    than continued ad/outro copy? Used to exit sponsor/outro block mode."""
    if SPEAKER_TURN.search(p):
        return True
    if YEAR.search(p):
        return True
    if CONTENT_KEYWORDS.search(p):
        return True
    return False


MAX_BLOCK_PARAS = 8  # safety cap; stops runaway removal


def ad_score(p: str) -> int:
    """Signed ad-likelihood score for a paragraph.

    strong hits: +2 each
    weak hits:   +1 each
    content hits: -2 each (hard negative to protect interview paragraphs
                           that incidentally cite a URL)

    A score >= 2 is an ad paragraph. The thresholding keeps us from
    nuking paragraphs that merely say "please subscribe" as an aside.
    """
    score = 0
    score += 2 * len(AD_STRONG.findall(p))
    score += 1 * len(AD_WEAK.findall(p))
    score -= 2 * len(CONTENT_KEYWORDS.findall(p))
    score -= 1 * len(YEAR.findall(p))
    return score


AD_SCORE_THRESHOLD = 2


def remove_sponsor_and_outro(body: str) -> tuple[str, dict]:
    """Two-pass paragraph-level ad removal.

    Ads span multiple 400-char paragraph chunks. The brand name or promo
    code (the anchor) might be in any one of them; the others are neutral
    lifestyle/framing copy. So:

    Pass 1: find anchors (paragraphs with ad_score >= threshold).
    Pass 2: expand each anchor forward AND backward through neutral or
            ad-positive paragraphs until we hit content (score < 0) or
            the per-anchor cap.

    Backwards expansion catches ad intros ("I want to take a moment to
    talk about..."), forward expansion catches ad continuations.
    """
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    stats = {"sponsor_dropped": 0, "outro_dropped": 0}

    scores = [ad_score(p) for p in paras]
    removed = set()

    for i, s in enumerate(scores):
        if s < AD_SCORE_THRESHOLD:
            continue
        removed.add(i)
        # extend forward
        j = i + 1
        while j < len(paras) and (j - i) < MAX_BLOCK_PARAS:
            if scores[j] < 0:
                break
            removed.add(j)
            j += 1
        # extend backward (capped tighter — interview context often
        # immediately precedes an ad read)
        j = i - 1
        while j >= 0 and (i - j) <= 3:
            if scores[j] < 0:
                break
            if scores[j] == 0 and j in removed:
                j -= 1
                continue
            # only backward-absorb neutral or ad-positive paragraphs
            removed.add(j)
            j -= 1

    kept = [p for i, p in enumerate(paras) if i not in removed]
    stats["sponsor_dropped"] = len(removed)
    return "\n\n".join(kept), stats


def normalize_whitespace(s: str) -> str:
    s = MULTI_SPACE.sub(" ", s)
    # strip trailing spaces per line
    s = "\n".join(line.rstrip() for line in s.split("\n"))
    # collapse 3+ newlines to 2
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip() + "\n"


def clean_text(raw: str) -> tuple[str, dict]:
    header, body = split_header_body(raw)
    body = decode_entities(body)
    body = strip_stage_directions(body)
    body, drop_stats = remove_sponsor_and_outro(body)
    body = strip_fillers(body)
    body = collapse_stutters(body)
    body = normalize_whitespace(body)
    out = (header + "\n" + body) if header else body
    return out, drop_stats


# -- Runner -----------------------------------------------------------------

def main():
    manifest = json.load(open(ROOT / "manifest.json"))
    meta_by_id = {v["id"]: v for v in manifest}

    results = []
    for src in sorted(IN_DIR.glob("*.txt")):
        vid = src.stem
        raw = src.read_text(encoding="utf-8")
        cleaned, stats = clean_text(raw)
        (OUT_DIR / f"{vid}.txt").write_text(cleaned, encoding="utf-8")
        meta = meta_by_id.get(vid, {})
        results.append({
            "id": vid,
            "title": meta.get("title", vid),
            "raw_chars": len(raw),
            "clean_chars": len(cleaned),
            "reduction_pct": round(100 * (1 - len(cleaned) / max(len(raw), 1)), 1),
            "sponsor_dropped": stats["sponsor_dropped"],
            "outro_dropped": stats["outro_dropped"],
        })

    total_raw = sum(r["raw_chars"] for r in results)
    total_clean = sum(r["clean_chars"] for r in results)
    print(f"Cleaned {len(results)} files")
    print(f"Total raw:   {total_raw:>12,} chars")
    print(f"Total clean: {total_clean:>12,} chars")
    print(f"Reduction:   {100 * (1 - total_clean / total_raw):.1f}%")
    print(f"Sponsor paragraphs dropped: {sum(r['sponsor_dropped'] for r in results)}")
    print(f"Outro paragraphs dropped:   {sum(r['outro_dropped'] for r in results)}")
    print()
    print("Biggest reductions (may be over-aggressive — sample-check these):")
    for r in sorted(results, key=lambda r: -r["reduction_pct"])[:5]:
        print(f"  {r['reduction_pct']:>5.1f}%  {r['id']}  {r['title'][:60]}")
    print()
    print("Smallest reductions (low-fluff videos, or cleaner is missing them):")
    for r in sorted(results, key=lambda r: r["reduction_pct"])[:5]:
        print(f"  {r['reduction_pct']:>5.1f}%  {r['id']}  {r['title'][:60]}")

    # Write per-file stats
    with open(ROOT / "_clean_stats.json", "w") as f:
        json.dump(results, f, indent=2)


if __name__ == "__main__":
    main()
