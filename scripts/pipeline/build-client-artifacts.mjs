#!/usr/bin/env node
/**
 * Stage A — Chunked Client Delivery build step.
 *
 * Reads public/data/graph.seed.json (the canonical monolithic graph) and emits:
 *   - public/data/graph.meta.json       — counts, filter dimensions, schema metadata (~100 KB)
 *   - public/data/graph.nodes.ndjson    — one node per line for streaming parse (~8 MB)
 *   - public/data/graph.edges.ndjson    — one edge per line for streaming parse (~4 MB)
 *   - public/data/graph.search.json     — serialized MiniSearch index (~1-2 MB)
 *
 * See docs/Stage_A_Chunked_Delivery_Plan.md for rationale and deferred-work triggers.
 *
 * This script is pure: runs over graph.seed.json and overwrites the four
 * artifacts. Wire into npm run build so every deploy ships fresh artifacts.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MiniSearch from 'minisearch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const INPUT = path.join(ROOT, 'public/data/graph.seed.json');
const OUT_META = path.join(ROOT, 'public/data/graph.meta.json');
const OUT_NODES = path.join(ROOT, 'public/data/graph.nodes.ndjson');
const OUT_EDGES = path.join(ROOT, 'public/data/graph.edges.ndjson');
const OUT_SEARCH = path.join(ROOT, 'public/data/graph.search.json');

const SCHEMA_VERSION = 1;

function getYear(dateValue) {
  if (!dateValue) return null;
  const match = String(dateValue).match(/(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

function formatMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  console.log(`Reading ${INPUT}`);
  const raw = await fs.readFile(INPUT, 'utf8');
  const graph = JSON.parse(raw);

  console.log(`  ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${formatMB(raw.length)} source`);

  const nodeTypeCounts = {};
  const pipelineSourceCounts = {};
  const confidenceCounts = {};
  const classificationSet = new Set();
  const tagSet = new Set();
  let minYear = Infinity;
  let maxYear = -Infinity;

  for (const node of graph.nodes) {
    nodeTypeCounts[node.node_type] = (nodeTypeCounts[node.node_type] ?? 0) + 1;
    if (node.pipeline_source) {
      pipelineSourceCounts[node.pipeline_source] = (pipelineSourceCounts[node.pipeline_source] ?? 0) + 1;
    }
    if (node.confidence) {
      confidenceCounts[node.confidence] = (confidenceCounts[node.confidence] ?? 0) + 1;
    }
    if (node.classification) classificationSet.add(node.classification);
    if (Array.isArray(node.tags)) {
      for (const tag of node.tags) tagSet.add(tag);
    }
    const year = getYear(node.date_start);
    if (year !== null) {
      if (year < minYear) minYear = year;
      if (year > maxYear) maxYear = year;
    }
  }

  const meta = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    source_generated_at: graph.generated_at,
    total_nodes: graph.nodes.length,
    total_edges: graph.edges.length,
    node_type_counts: nodeTypeCounts,
    pipeline_source_counts: pipelineSourceCounts,
    confidence_counts: confidenceCounts,
    available_classifications: Array.from(classificationSet).sort(),
    available_tags: Array.from(tagSet).sort((a, b) => a.localeCompare(b)),
    year_range: {
      min: Number.isFinite(minYear) ? minYear : 1900,
      max: Number.isFinite(maxYear) ? maxYear : new Date().getFullYear(),
    },
  };

  // NDJSON — one object per line. No trailing newline is idiomatic, but adding
  // one keeps the streaming parser's last-line logic simpler.
  const nodeLines = graph.nodes.map((node) => JSON.stringify(node)).join('\n') + '\n';
  const edgeLines = graph.edges.map((edge) => JSON.stringify(edge)).join('\n') + '\n';

  // Layer 2: indexed fields expanded to consume Layer 1B data. Search now
  // covers aliases, profession/notability tags, video titles, and the full
  // text of transcript quotes — so users typing any name form or content
  // fragment actually reach the right node.
  //
  // Keep in sync with src/lib/chunkedGraph.ts — loadJSON must be called with
  // identical options.
  const mini = new MiniSearch({
    fields: ['label', 'aliases', 'tags', 'summary', 'location_name', 'profession', 'video_title', 'quotes', 'sources'],
    storeFields: ['id', 'matched_field'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.15,
      combineWith: 'AND',
      boost: { label: 5, aliases: 3, tags: 2, video_title: 2, summary: 1, profession: 1, quotes: 0.5 },
    },
  });

  function quotesFrom(node) {
    if (!Array.isArray(node.sources_rich)) return '';
    return node.sources_rich
      .map((r) => (r && typeof r.quote === 'string' ? r.quote : ''))
      .filter(Boolean)
      .join(' ');
  }

  function aliasesFrom(node) {
    const ts = node.type_specific || {};
    const collected = new Set();
    if (Array.isArray(node.aliases)) for (const a of node.aliases) if (a) collected.add(a);
    if (Array.isArray(ts.aliases)) for (const a of ts.aliases) if (a) collected.add(a);
    if (typeof ts.also_known_as === 'string' && ts.also_known_as) collected.add(ts.also_known_as);
    if (Array.isArray(ts.notability_tags)) for (const t of ts.notability_tags) if (t) collected.add(t);
    return Array.from(collected).join(' ');
  }

  function videoTitleFrom(node) {
    if (node.node_type !== 'video') return '';
    const ts = node.type_specific || {};
    return typeof ts.title === 'string' ? ts.title : '';
  }

  mini.addAll(
    graph.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      aliases: aliasesFrom(node),
      tags: Array.isArray(node.tags) ? node.tags.join(' ') : '',
      summary: node.summary,
      location_name: node.location_name ?? '',
      profession: typeof node.profession === 'string' ? node.profession : '',
      video_title: videoTitleFrom(node),
      quotes: quotesFrom(node),
      sources: Array.isArray(node.sources) ? node.sources.join(' ') : '',
    })),
  );

  const searchJson = JSON.stringify(mini);

  const metaJson = JSON.stringify(meta, null, 2) + '\n';

  await Promise.all([
    fs.writeFile(OUT_META, metaJson),
    fs.writeFile(OUT_NODES, nodeLines),
    fs.writeFile(OUT_EDGES, edgeLines),
    fs.writeFile(OUT_SEARCH, searchJson),
  ]);

  console.log(`\nWrote:`);
  console.log(`  ${path.relative(ROOT, OUT_META)}   ${formatMB(metaJson.length)}`);
  console.log(`  ${path.relative(ROOT, OUT_NODES)}  ${formatMB(nodeLines.length)}`);
  console.log(`  ${path.relative(ROOT, OUT_EDGES)}  ${formatMB(edgeLines.length)}`);
  console.log(`  ${path.relative(ROOT, OUT_SEARCH)} ${formatMB(searchJson.length)}`);

  const total = metaJson.length + nodeLines.length + edgeLines.length + searchJson.length;
  console.log(`\nTotal chunked payload: ${formatMB(total)} (vs source ${formatMB(raw.length)})`);
  console.log(`Meta/search fetched eagerly; NDJSON streamed incrementally.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
