#!/usr/bin/env node
/**
 * Transform the transcripts extraction bundle into graph.seed.json format
 * and produce a merged graph file for review.
 *
 * Inputs:
 *   pipeline/input/raw-source-records-transcripts.json  (from _extract_helpers.merge_all)
 *   public/data/graph.seed.json                         (existing graph)
 *
 * Outputs:
 *   public/data/transcripts-graph-fragment.json         (transcripts only, converted)
 *   public/data/graph.seed.with-transcripts.json        (existing + transcripts, merged)
 *
 * The existing graph.seed.json is not touched. The user reviews the
 * .with-transcripts.json and swaps it in when ready.
 *
 * Transformations:
 *   - Structured source objects -> URL array (with ?t=<timestamp>s deeplink)
 *     AND preserved separately as sources_rich[] (see Layer 1B below)
 *   - Numeric pipeline_confidence -> confidence enum (high/medium/low)
 *   - Empty summary -> safe placeholder to satisfy min(10) constraint
 *   - New node types (video, program, document, concept, phenomenon, technology,
 *     claim) preserved; existing graph frontend can render or filter them.
 *
 * Layer 1B (2026-04-18): preserve rich extraction data alongside the lossy
 * legacy shape so downstream (search index, future detail panel) can surface
 * quotes, aliases, and type_specific metadata without re-reading the raw
 * transcripts/entities/*.json files.
 *   - sources[]       URL strings, existing shape — consumers unchanged
 *   - sources_rich[]  { source_type, video_id, timestamp_start, timestamp_end, quote }
 *   - aliases[]       lifted from type_specific.aliases + also_known_as
 *   - type_specific   preserved as-is (nested object)
 *   - canonical_forms preserved (wikidata_id, wikipedia_url, etc.)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const INP = path.join(ROOT, 'pipeline/input/raw-source-records-transcripts.json');
const GRAPH = path.join(ROOT, 'public/data/graph.seed.json');
const OUT_FRAGMENT = path.join(ROOT, 'public/data/transcripts-graph-fragment.json');
const OUT_MERGED = path.join(ROOT, 'public/data/graph.seed.with-transcripts.json');

function confToEnum(num) {
  if (num >= 0.9) return 'high';
  if (num >= 0.7) return 'medium';
  return 'low';
}

function srcsToUrls(sources) {
  const urls = [];
  for (const s of sources || []) {
    if (s.video_id) {
      const t = Math.floor(s.timestamp_start || 0);
      urls.push(`https://www.youtube.com/watch?v=${s.video_id}&t=${t}s`);
    } else if (s.url) {
      urls.push(s.url);
    }
  }
  return [...new Set(urls)];
}

function srcsToRich(sources) {
  const rich = [];
  for (const s of sources || []) {
    if (!s || typeof s !== 'object') continue;
    const entry = {};
    if (s.source_type) entry.source_type = s.source_type;
    if (s.video_id) entry.video_id = s.video_id;
    if (typeof s.timestamp_start === 'number') entry.timestamp_start = s.timestamp_start;
    if (typeof s.timestamp_end === 'number') entry.timestamp_end = s.timestamp_end;
    if (s.quote) entry.quote = s.quote;
    if (s.url) entry.url = s.url;
    if (Object.keys(entry).length > 0) rich.push(entry);
  }
  return rich;
}

function extractAliases(typeSpecific) {
  if (!typeSpecific || typeof typeSpecific !== 'object') return [];
  const out = new Set();
  if (Array.isArray(typeSpecific.aliases)) {
    for (const a of typeSpecific.aliases) {
      if (typeof a === 'string' && a.trim()) out.add(a.trim());
    }
  }
  if (typeof typeSpecific.also_known_as === 'string' && typeSpecific.also_known_as.trim()) {
    out.add(typeSpecific.also_known_as.trim());
  }
  return Array.from(out);
}

function padSummary(s) {
  const fallback = 'Extracted from Jesse Michels American Alchemy transcript corpus.';
  if (!s || s.length < 10) return fallback;
  return s.length > 2000 ? s.slice(0, 1997) + '...' : s;
}

function padLabel(s) {
  if (!s) return '(unnamed)';
  return s.length > 120 ? s.slice(0, 117) + '...' : s;
}

function transformNode(n) {
  const sources = srcsToUrls(n.sources);
  const sourcesRich = srcsToRich(n.sources);
  // If no URL sources, synthesize from video_id if we can read it from type_specific
  const vidFromTs = n.type_specific?.source_video_id;
  if (sources.length === 0 && vidFromTs) {
    sources.push(`https://www.youtube.com/watch?v=${vidFromTs}`);
  }
  if (sources.length === 0) {
    sources.push('https://www.youtube.com/@JesseMichels');
  }
  const aliases = extractAliases(n.type_specific);
  const out = {
    id: n.id,
    node_type: n.node_type,
    label: padLabel(n.label),
    summary: padSummary(n.summary || n.type_specific?.statement_text || ''),
    tags: Array.from(new Set([...(n.tags || []), 'transcripts'])),
    confidence: confToEnum(n.pipeline_confidence ?? 0.7),
    sources: sources,
    pipeline_source: n.pipeline_source || 'transcripts',
    pipeline_confidence: n.pipeline_confidence ?? 0.7,
    status: n.status || 'auto_ingest',
    crawled_at: n.crawled_at || new Date().toISOString(),
  };
  if (sourcesRich.length > 0) out.sources_rich = sourcesRich;
  if (aliases.length > 0) out.aliases = aliases;
  if (n.type_specific && Object.keys(n.type_specific).length > 0) {
    out.type_specific = n.type_specific;
  }
  if (n.canonical_forms && Object.keys(n.canonical_forms).length > 0) {
    out.canonical_forms = n.canonical_forms;
  }
  if (n.lat !== undefined && n.lng !== undefined) {
    out.lat = n.lat;
    out.lng = n.lng;
  }
  if (n.type_specific) {
    // flatten useful per-type fields that the frontend may want
    const ts = n.type_specific;
    if (ts.acronym) out.acronym = ts.acronym;
    if (ts.full_name) out.full_name = ts.full_name;
    if (ts.profession) out.profession = ts.profession;
    if (ts.org_type) out.org_type = ts.org_type;
    if (ts.location_type) out.location_type = ts.location_type;
    if (ts.date_approximate) out.date_start = ts.date_approximate;
    if (ts.concept_domain) out.concept_domain = ts.concept_domain;
    if (ts.document_type) out.document_type = ts.document_type;
    if (ts.assertability) out.assertability = ts.assertability;
    if (ts.statement_text) out.statement_text = ts.statement_text;
  }
  return out;
}

function transformEdge(e) {
  const sources = srcsToUrls(e.sources);
  const sourcesRich = srcsToRich(e.sources);
  if (sources.length === 0) {
    sources.push('https://www.youtube.com/@JesseMichels');
  }
  const out = {
    id: e.id,
    from_node_id: e.from_node_id,
    to_node_id: e.to_node_id,
    relationship: e.relationship,
    confidence: confToEnum(e.confidence ?? 0.7),
    sources,
  };
  if (sourcesRich.length > 0) out.sources_rich = sourcesRich;
  if (e.properties) out.properties = e.properties;
  return out;
}

function tally(nodes) {
  const counts = {};
  for (const n of nodes) counts[n.node_type] = (counts[n.node_type] || 0) + 1;
  return counts;
}

async function main() {
  const extraction = JSON.parse(await fs.readFile(INP, 'utf-8'));
  const existing = JSON.parse(await fs.readFile(GRAPH, 'utf-8'));

  const tNodes = extraction.nodes.map(transformNode);
  const tEdges = extraction.edges.map(transformEdge);

  // Write the transcripts-only fragment
  const fragment = {
    generated_at: new Date().toISOString(),
    metadata: {
      source: 'transcripts-pipeline',
      videos_covered: extraction.videos_covered,
      total_videos: extraction.total_videos,
    },
    nodes: tNodes,
    edges: tEdges,
  };
  await fs.writeFile(OUT_FRAGMENT, JSON.stringify(fragment, null, 2));

  // Build merged graph. Dedup by node id; if id collides, keep the existing
  // (Wikipedia/NUFORC-origin) node but add transcript sources to it.
  const existingById = new Map(existing.nodes.map((n) => [n.id, n]));
  const existingEdgeIds = new Set(existing.edges.map((e) => e.id));

  let addedNodes = 0;
  let mergedNodes = 0;
  for (const tn of tNodes) {
    const ex = existingById.get(tn.id);
    if (ex) {
      // Merge sources + tags
      const srcSet = new Set([...(ex.sources || []), ...(tn.sources || [])]);
      ex.sources = [...srcSet];
      ex.tags = [...new Set([...(ex.tags || []), 'transcripts'])];
      // Layer 1B: merge rich transcript fields into the existing node so
      // the detail panel and search index can cite transcript quotes even
      // for nodes that originated in a different source.
      if (tn.sources_rich && tn.sources_rich.length > 0) {
        const existingRich = ex.sources_rich || [];
        const dedup = new Map();
        for (const r of [...existingRich, ...tn.sources_rich]) {
          const key = `${r.video_id || r.url || ''}:${r.timestamp_start ?? ''}:${(r.quote || '').slice(0, 40)}`;
          if (!dedup.has(key)) dedup.set(key, r);
        }
        ex.sources_rich = Array.from(dedup.values());
      }
      if (tn.aliases && tn.aliases.length > 0) {
        ex.aliases = Array.from(new Set([...(ex.aliases || []), ...tn.aliases]));
      }
      if (tn.type_specific) {
        ex.type_specific = { ...(ex.type_specific || {}), ...tn.type_specific };
      }
      if (tn.canonical_forms) {
        ex.canonical_forms = { ...(ex.canonical_forms || {}), ...tn.canonical_forms };
      }
      mergedNodes++;
    } else {
      existingById.set(tn.id, tn);
      addedNodes++;
    }
  }

  let addedEdges = 0;
  for (const te of tEdges) {
    if (!existingEdgeIds.has(te.id)) {
      existing.edges.push(te);
      addedEdges++;
    }
  }

  const merged = {
    generated_at: new Date().toISOString(),
    metadata: {
      ...(existing.metadata || {}),
      transcripts_integrated_at: new Date().toISOString(),
      transcripts_added_nodes: addedNodes,
      transcripts_merged_nodes: mergedNodes,
      transcripts_added_edges: addedEdges,
    },
    nodes: [...existingById.values()],
    edges: existing.edges,
  };
  await fs.writeFile(OUT_MERGED, JSON.stringify(merged, null, 2));

  console.log('Fragment written:', OUT_FRAGMENT);
  console.log(`  Nodes by type:`, tally(tNodes));
  console.log(`  Nodes: ${tNodes.length}, Edges: ${tEdges.length}`);
  console.log('\nMerged graph written:', OUT_MERGED);
  console.log(`  Previously existing nodes: ${existing.nodes.length}`);
  console.log(`  Transcripts added (new) nodes: ${addedNodes}`);
  console.log(`  Transcripts merged (existing id) nodes: ${mergedNodes}`);
  console.log(`  Transcripts added edges: ${addedEdges}`);
  console.log(`  Merged total nodes: ${merged.nodes.length}`);
  console.log(`  Merged total edges: ${merged.edges.length}`);
  console.log('\nOriginal graph.seed.json is UNTOUCHED. Review graph.seed.with-transcripts.json and swap when ready.');
}

main().catch((e) => { console.error(e); process.exit(1); });
