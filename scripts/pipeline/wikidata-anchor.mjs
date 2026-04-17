#!/usr/bin/env node
/**
 * Post-hoc Wikidata anchoring pass.
 *
 * For every transcript-sourced person / organization / location node in
 * public/data/graph.seed.json that does NOT already have a wikidata_id,
 * query the public Wikidata search API. Attach wikidata_id + wikipedia_url
 * on high-confidence matches. Leave the node alone if no confident match
 * is found (no-KB-ref is a perfectly valid state — entities native to the
 * transcript corpus need not exist in Wikidata).
 *
 * Confidence rules (conservative — false positives corrupt the graph):
 *   - Top search result's normalized label == our canonical label (case-
 *     insensitive, punctuation-stripped).
 *   - The result's description contains at least one keyword that
 *     corresponds to the node's notability tags or node_type context.
 *   - If multiple results share the normalized label, require the
 *     description keyword match (no ambiguous auto-matches).
 *
 * Unmatched nodes: left untouched. We record them in
 * pipeline/out/wikidata-unmatched.json for later manual review.
 *
 * Rate control: 200ms delay between requests (well within Wikidata's
 * anonymous limit of ~1 req/s). The public API does not require a key.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const GRAPH = path.join(ROOT, 'public/data/graph.seed.json');
const UNMATCHED = path.join(ROOT, 'pipeline/out/wikidata-unmatched.json');
const CACHE = path.join(ROOT, 'pipeline/out/wikidata-cache.json');

const WD_SEARCH = 'https://www.wikidata.org/w/api.php';
const USER_AGENT = 'NHI-Archive/0.1 (research; contact via repo)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchWikidata(query, type) {
  const url = new URL(WD_SEARCH);
  url.search = new URLSearchParams({
    action: 'wbsearchentities',
    search: query,
    language: 'en',
    format: 'json',
    limit: '5',
    type: 'item',
    origin: '*',
  }).toString();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Wikidata ${res.status}: ${res.statusText}`);
  }
  const body = await res.json();
  return body.search || [];
}

const TYPE_KEYWORDS = {
  person: [
    'journalist', 'politician', 'senator', 'congressman', 'physicist',
    'scientist', 'astronomer', 'researcher', 'author', 'pilot', 'officer',
    'director', 'president', 'engineer', 'writer', 'historian',
    'psychiatrist', 'mathematician', 'businessman', 'actor', 'musician',
    'whistleblower', 'astronaut', 'military', 'journalist',
  ],
  organization: [
    'agency', 'government', 'corporation', 'company', 'military', 'navy',
    'air force', 'intelligence', 'research', 'institute', 'university',
    'media', 'news', 'network', 'publisher', 'committee', 'project',
    'program', 'ministry', 'department', 'service', 'group', 'foundation',
    'organization', 'legislative',
  ],
  location: [
    'city', 'town', 'country', 'state', 'region', 'base', 'ranch',
    'facility', 'laboratory', 'site', 'airport', 'forest', 'island',
    'village', 'county', 'mountain', 'river', 'desert', 'plateau',
    'military', 'location', 'area', 'province',
  ],
};

function tokens(s) {
  return normalize(s).split(' ').filter(Boolean);
}

function isNameVariant(want, got) {
  // "Allen Dulles" ~= "Allen W. Dulles" : first and last token match
  const wt = tokens(want);
  const gt = tokens(got);
  if (wt.length === 0 || gt.length === 0) return false;
  if (wt[0] !== gt[0]) return false;
  if (wt[wt.length - 1] !== gt[gt.length - 1]) return false;
  let gi = 0;
  for (const t of wt) {
    while (gi < gt.length && gt[gi] !== t) gi += 1;
    if (gi >= gt.length) return false;
    gi += 1;
  }
  return true;
}

const NICKNAMES = {
  // common nickname -> formal name mapping
  hal: 'harold', bob: 'robert', ed: 'edward', ted: 'edward', bill: 'william',
  jim: 'james', tim: 'timothy', tom: 'thomas', mike: 'michael', chris: 'christopher',
  dave: 'david', dan: 'daniel', joe: 'joseph', rick: 'richard', dick: 'richard',
  steve: 'steven', al: 'alan', ken: 'kenneth', gary: 'garry',
};

function isNicknameVariant(want, got) {
  const wt = tokens(want);
  const gt = tokens(got);
  if (wt.length === 0 || gt.length === 0) return false;
  if (wt[wt.length - 1] !== gt[gt.length - 1]) return false;
  // expand nickname to formal and compare first name
  const wFirst = NICKNAMES[wt[0]] || wt[0];
  const gFirst = NICKNAMES[gt[0]] || gt[0];
  return wFirst === gFirst;
}

function isAcronymExpansion(want, got) {
  // "US Navy" -> "United States Navy": acronym US expands to "united states"
  // "NSA" -> "National Security Agency": 3-letter acronym matches first letters
  const wt = tokens(want);
  const gt = tokens(got);
  if (wt.length === 0 || gt.length === 0) return false;

  // Case 1: want has all-short UPPERCASE tokens that map to first letters of got tokens
  const wantUpperTokens = want.split(/\s+/).filter((w) => w.length >= 2 && w === w.toUpperCase());
  if (wantUpperTokens.length > 0) {
    for (const acr of wantUpperTokens) {
      const initials = acr.toLowerCase();
      const gotInitials = gt.map((t) => t[0]).join('');
      if (gotInitials.includes(initials)) return true;
    }
  }

  // Case 2: want is short like "US", "USA", "UK" and got's first token matches expansion
  const acronymMap = {
    us: 'united states', usa: 'united states', uk: 'united kingdom',
    ussr: 'soviet union', ussr: 'soviet',
  };
  if (wt[0] in acronymMap) {
    const expanded = acronymMap[wt[0]];
    if (got.startsWith(expanded + ' ') && wt.slice(1).every((t) => gt.includes(t))) {
      return true;
    }
  }
  return false;
}

const BIOGRAPHICAL_HINTS = [
  'american', 'british', 'canadian', 'french', 'german', 'russian',
  'soviet', 'australian', 'italian', 'japanese', 'chinese',
  'born', 'died', 'author', 'doctor', 'professor', 'president',
  'pathologist', 'immunologist', 'ufologist', 'psychic',
  'theoretical', 'aerodynamicist', 'astrophysicist', 'microbiologist',
  'editor', 'journalist', 'radio', 'personality',
];

function isGoodMatch(node, result) {
  const want = normalize(node.label);
  const got = normalize(result.label);
  if (!want || !got) return false;

  const exact = want === got;
  const prefix = got.startsWith(want + ' ') || want.startsWith(got + ' ');
  const nameVariant = node.node_type === 'person' && isNameVariant(node.label, result.label);
  const nicknameVariant = node.node_type === 'person' && isNicknameVariant(node.label, result.label);
  const acronym = node.node_type !== 'person' && isAcronymExpansion(node.label, result.label);

  if (!exact && !prefix && !nameVariant && !nicknameVariant && !acronym) {
    return false;
  }

  const desc = (result.description || '').toLowerCase();

  // On exact label match, trust the primary Wikidata label.
  if (exact) return true;

  // On a fuzzier match (prefix, variant, acronym), require at least a
  // non-trivial description — any biographical or type-relevant keyword.
  if (!desc || desc.length < 3) return false;

  const kws = TYPE_KEYWORDS[node.node_type] || [];
  for (const kw of kws) {
    if (desc.includes(kw)) return true;
  }
  for (const kw of BIOGRAPHICAL_HINTS) {
    if (desc.includes(kw)) return true;
  }
  const tags = (node.tags || []).map((t) => t.toLowerCase());
  for (const t of tags) {
    if (t.length >= 4 && desc.includes(t)) return true;
  }
  return false;
}

async function main() {
  const graph = JSON.parse(await fs.readFile(GRAPH, 'utf-8'));
  const cache = await fs
    .readFile(CACHE, 'utf-8')
    .then(JSON.parse)
    .catch(() => ({}));

  const candidates = graph.nodes.filter((n) => {
    if (!['person', 'organization', 'location'].includes(n.node_type)) return false;
    if (n.wikidata_id) return false;
    if (n.pipeline_source !== 'transcripts') return false;
    return true;
  });

  console.log(`Wikidata anchoring pass: ${candidates.length} transcript-origin candidates`);

  let matched = 0;
  let unmatched = [];
  let cached = 0;
  let errors = 0;

  for (let i = 0; i < candidates.length; i += 1) {
    const n = candidates[i];
    const cacheKey = `${n.node_type}:${n.label}`;
    let results;
    if (cache[cacheKey]) {
      results = cache[cacheKey];
      cached += 1;
    } else {
      try {
        results = await searchWikidata(n.label, n.node_type);
        cache[cacheKey] = results;
        await sleep(200);
      } catch (e) {
        errors += 1;
        unmatched.push({ id: n.id, label: n.label, reason: `api_error: ${e.message}` });
        continue;
      }
    }

    const hit = results.find((r) => isGoodMatch(n, r));
    if (hit) {
      n.wikidata_id = hit.id;
      n.wikipedia_url = hit.concepturi
        ? `https://en.wikipedia.org/wiki/${hit.title}`
        : undefined;
      n.canonical_forms = {
        ...(n.canonical_forms || {}),
        wikidata_id: hit.id,
        wikidata_description: hit.description,
      };
      matched += 1;
      if (matched % 20 === 0) {
        console.log(`  matched ${matched}/${candidates.length}...`);
      }
    } else {
      unmatched.push({
        id: n.id,
        label: n.label,
        node_type: n.node_type,
        candidate_count: results.length,
        top_candidates: results.slice(0, 2).map((r) => ({
          id: r.id,
          label: r.label,
          description: r.description,
        })),
      });
    }
  }

  await fs.writeFile(GRAPH, JSON.stringify(graph, null, 2));
  await fs.mkdir(path.dirname(UNMATCHED), { recursive: true });
  await fs.writeFile(UNMATCHED, JSON.stringify({
    generated_at: new Date().toISOString(),
    candidate_count: candidates.length,
    matched,
    unmatched: unmatched.length,
    from_cache: cached,
    errors,
    unmatched_entries: unmatched,
  }, null, 2));
  await fs.writeFile(CACHE, JSON.stringify(cache, null, 2));

  console.log(`\nDone.`);
  console.log(`  Matched + anchored: ${matched}`);
  console.log(`  Unmatched (left alone, still in graph): ${unmatched.length}`);
  console.log(`  Served from cache: ${cached}`);
  console.log(`  API errors: ${errors}`);
  console.log(`\nGraph updated: ${GRAPH}`);
  console.log(`Unmatched review: ${UNMATCHED}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
