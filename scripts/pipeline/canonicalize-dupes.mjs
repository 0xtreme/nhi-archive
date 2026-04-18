#!/usr/bin/env node
/**
 * Canonicalization pass — merge same-label duplicate nodes where one side
 * is a content-free stub left behind by extraction collisions.
 *
 * Reads:  public/data/graph.seed.json
 * Writes: public/data/graph.seed.json (in place)
 *         pipeline/out/canonicalization-report.json
 *
 * Merge rules (validated against the actual data):
 *
 *   1. Group nodes by normalized label (lowercase, collapsed whitespace).
 *
 *   2. Within a group, classify each node as STUB or RICH:
 *        STUB = no sources_rich, no wikidata_id, and summary either missing
 *               or <= 80 chars of placeholder text.
 *        RICH = anything else.
 *
 *   3. Decide per group:
 *        a. All nodes share the same node_type + have unique summaries →
 *           treat as legitimately distinct events, leave alone
 *           (e.g. 10 "Albuquerque sighting (2014)" from global-ufo-scrubbed
 *            feed, each a different witness report).
 *        b. Group is pure `organization + program` with both sides non-stub
 *           → legitimate dual-role (AATIP, AARO, Condon Committee). Leave
 *           alone; a downstream PART_OF edge can link them if desired.
 *        c. At least one RICH node + one or more STUB nodes (same or
 *           different types) → merge all stubs into the richest RICH node.
 *           Richness score: has_wikidata*100 + sources_rich_count*2 +
 *           summary_length_bucket*4 + edges_degree*0.5.
 *        d. Multiple RICH nodes of the same node_type with identical
 *           (or near-identical) summaries → merge all into the richest.
 *        e. Multiple RICH nodes with different summaries → leave alone.
 *
 *   4. When merging node B into canonical A:
 *        - Union sources, sources_rich (dedupe by video_id+timestamp+quote
 *          head), aliases.
 *        - Union tags.
 *        - Preserve canonical's type_specific; shallow-merge B's fields
 *          that are missing on A.
 *        - Preserve canonical's wikidata_id; if A lacks it and B has it,
 *          copy B's.
 *        - Rewrite every edge that referenced B to reference A; drop the
 *          resulting self-loops; dedupe resulting duplicate edges by
 *          (from, to, relationship).
 *
 *   5. Write the merged graph back in place, and a report listing every
 *      merge decision to pipeline/out/canonicalization-report.json.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const GRAPH = path.join(ROOT, 'public/data/graph.seed.json');
const REPORT = path.join(ROOT, 'pipeline/out/canonicalization-report.json');

function normalizeLabel(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function summaryLenBucket(summary) {
  const len = (summary || '').length;
  if (len <= 50) return 0;
  if (len <= 200) return 1;
  if (len <= 500) return 2;
  return 3;
}

function richness(node, degreeMap) {
  const wikidata = node.wikidata_id ? 100 : 0;
  const richSources = Array.isArray(node.sources_rich) ? node.sources_rich.length : 0;
  const summary = summaryLenBucket(node.summary);
  const deg = degreeMap.get(node.id) ?? 0;
  return wikidata + richSources * 2 + summary * 4 + deg * 0.5;
}

// CONTENT-FREE: a canonicalization artifact — empty record with no
// provenance, no summary, no external anchor. This is what we're safe
// to merge away. Short-but-meaningful summaries (e.g. NUFORC witness
// reports that are 30-80 chars long) are NOT stubs.
function isContentFree(node) {
  const hasRich = Array.isArray(node.sources_rich) && node.sources_rich.length > 0;
  if (hasRich) return false;
  if (node.wikidata_id) return false;
  const summary = (node.summary ?? '').trim();
  if (summary.length === 0) return true;
  if (summary.length < 20) return true;
  if (summary.startsWith('Extracted from Jesse Michels')) return true;
  // A synonym for the shell placeholder the integration script inserts
  if (summary === '(unnamed)') return true;
  return false;
}

// When the same label shows up under a person-type AND under some other
// type (organization / incident / event / concept / phenomenon /
// technology / designation), the non-person side is almost always an
// extraction error — the entity is a human and one pipeline mis-typed
// it. We do NOT collapse person↔location (organization based AT a
// place is different) or person↔document (a document about a person is
// distinct from the person), and we do NOT collapse the legitimate
// dual-role pairs (org+program, incident+location).
const MERGEABLE_INTO_PERSON = new Set([
  'organization',
  'incident',
  'event',
  'concept',
  'phenomenon',
  'technology',
  'designation',
  'role',
  'citation',
]);

const MERGEABLE_INTO_DOCUMENT = new Set([
  'incident',
  'event',
  'statement',
  'testimony',
  'artifact',
]);

const LEGIT_DUAL_PAIRS = [
  new Set(['organization', 'program']),
  new Set(['incident', 'location']),
  new Set(['location', 'organization']),
  new Set(['document', 'person']),
];

function isLegitDualPair(types) {
  if (types.size !== 2) return false;
  for (const pair of LEGIT_DUAL_PAIRS) {
    if (types.size === pair.size && [...types].every((t) => pair.has(t))) return true;
  }
  return false;
}

// "Distinct events" heuristic: among same-type nodes, if every node has
// a non-empty summary AND the summaries are collectively unique enough
// (<=1 duplicate pair), treat them as legitimately distinct records.
function looksLikeDistinctEvents(nodes) {
  if (nodes.length < 2) return false;
  const type = nodes[0].node_type;
  if (!nodes.every((n) => n.node_type === type)) return false;
  const sumSet = new Set();
  let empties = 0;
  for (const n of nodes) {
    const s = (n.summary ?? '').trim();
    if (s.length < 15) empties += 1;
    else sumSet.add(s.slice(0, 200));
  }
  if (empties > 0) return false;
  // Tolerate at most 1 repeated summary in a same-type group — two witnesses
  // reporting the same incident is possible; more than that and we've got
  // genuine duplication.
  return sumSet.size >= nodes.length - 1;
}

function mergeSourcesRich(a = [], b = []) {
  const seen = new Set();
  const out = [];
  for (const r of [...a, ...b]) {
    if (!r || typeof r !== 'object') continue;
    const key = `${r.video_id ?? r.url ?? ''}:${r.timestamp_start ?? ''}:${(r.quote ?? '').slice(0, 60)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function mergeArrays(a = [], b = []) {
  return Array.from(new Set([...(a ?? []), ...(b ?? [])]));
}

function mergeNode(canonical, other) {
  canonical.sources = mergeArrays(canonical.sources, other.sources);
  canonical.tags = mergeArrays(canonical.tags, other.tags);
  if (other.sources_rich && other.sources_rich.length > 0) {
    canonical.sources_rich = mergeSourcesRich(canonical.sources_rich ?? [], other.sources_rich);
  }
  if (other.aliases && other.aliases.length > 0) {
    canonical.aliases = mergeArrays(canonical.aliases ?? [], other.aliases);
  }
  if (!canonical.wikidata_id && other.wikidata_id) {
    canonical.wikidata_id = other.wikidata_id;
    if (other.wikipedia_url) canonical.wikipedia_url = other.wikipedia_url;
  }
  if (other.canonical_forms) {
    canonical.canonical_forms = {
      ...(other.canonical_forms ?? {}),
      ...(canonical.canonical_forms ?? {}),
    };
  }
  if (other.type_specific) {
    canonical.type_specific = {
      ...(other.type_specific ?? {}),
      ...(canonical.type_specific ?? {}),
    };
  }
  if (!canonical.date_start && other.date_start) canonical.date_start = other.date_start;
  if (canonical.lat == null && other.lat != null) {
    canonical.lat = other.lat;
    canonical.lng = other.lng;
  }
  if (!canonical.location_name && other.location_name) canonical.location_name = other.location_name;
  return canonical;
}

async function main() {
  console.log(`Reading ${GRAPH}`);
  const graph = JSON.parse(await fs.readFile(GRAPH, 'utf-8'));
  console.log(`  ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  // Degree map
  const degree = new Map();
  for (const e of graph.edges) {
    degree.set(e.from_node_id, (degree.get(e.from_node_id) ?? 0) + 1);
    degree.set(e.to_node_id, (degree.get(e.to_node_id) ?? 0) + 1);
  }

  // Group by normalized label
  const groups = new Map();
  for (const n of graph.nodes) {
    const k = normalizeLabel(n.label);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(n);
  }

  // Plan merges
  const mergeMap = new Map(); // old_id -> canonical_id
  const decisions = [];

  for (const [label, nodes] of groups) {
    if (nodes.length === 1) continue;

    const types = new Set(nodes.map((n) => n.node_type));
    const contentFree = nodes.filter(isContentFree);
    const contentBearing = nodes.filter((n) => !isContentFree(n));

    // Rule A: same-type group that looks like legitimately distinct events
    // (NUFORC/global-ufo-scrubbed feed: "Albuquerque sighting (2014)"
    // repeated with different witness reports / coordinates). SKIP.
    if (types.size === 1 && looksLikeDistinctEvents(contentBearing) && contentFree.length === 0) {
      decisions.push({
        label,
        action: 'skip-legitimately-distinct',
        node_count: nodes.length,
        type: [...types][0],
      });
      continue;
    }

    // Rule B: pure org+program and both sides content-bearing — legitimate
    // dual-role (AATIP, AARO). SKIP.
    if (
      types.size === 2 &&
      types.has('organization') &&
      types.has('program') &&
      contentFree.length === 0
    ) {
      decisions.push({ label, action: 'skip-dual-role-org-program', node_count: nodes.length });
      continue;
    }

    // Rule B2: cross-type group where a `person` side exists alongside
    // a mis-typed side of a human name (org, incident, event, etc.) —
    // person is canonical regardless of the non-person side's richness.
    // This catches "Bob Lazar" typed as organization, "Kenneth Arnold"
    // typed as incident, "Carl Sagan" typed as incident, etc.
    const personNodes = nodes.filter((n) => n.node_type === 'person');
    if (personNodes.length > 0 && !isLegitDualPair(types)) {
      const mergeable = nodes.filter(
        (n) => n.node_type !== 'person' && MERGEABLE_INTO_PERSON.has(n.node_type),
      );
      const skippable = nodes.filter(
        (n) => n.node_type !== 'person' && !MERGEABLE_INTO_PERSON.has(n.node_type),
      );
      // If every non-person is mergeable into person, proceed. Otherwise,
      // some non-person sides are protected (e.g. document), so leave
      // the whole group and let downstream rules handle the rest.
      if (mergeable.length > 0 && skippable.length === 0) {
        const personCanon = [...personNodes]
          .map((n) => ({ n, score: richness(n, degree) }))
          .sort((a, b) => b.score - a.score)[0].n;
        const others = nodes.filter((n) => n.id !== personCanon.id);
        for (const o of others) mergeMap.set(o.id, personCanon.id);
        decisions.push({
          label,
          action: 'merge-into-person',
          canonical: personCanon.id,
          canonical_type: 'person',
          canonical_score: richness(personCanon, degree),
          merged: others.map((o) => ({ id: o.id, type: o.node_type })),
        });
        continue;
      }
    }

    // Rule B3: cross-type group where a `document` side exists alongside
    // an incident/event/etc. version of the same named work. Document
    // canonical. Catches "The Day After Roswell" (book) vs
    // "the day after roswell" (incident).
    const documentNodes = nodes.filter((n) => n.node_type === 'document');
    if (documentNodes.length > 0 && personNodes.length === 0 && !isLegitDualPair(types)) {
      const mergeable = nodes.filter(
        (n) => n.node_type !== 'document' && MERGEABLE_INTO_DOCUMENT.has(n.node_type),
      );
      const skippable = nodes.filter(
        (n) => n.node_type !== 'document' && !MERGEABLE_INTO_DOCUMENT.has(n.node_type),
      );
      if (mergeable.length > 0 && skippable.length === 0) {
        const docCanon = [...documentNodes]
          .map((n) => ({ n, score: richness(n, degree) }))
          .sort((a, b) => b.score - a.score)[0].n;
        const others = nodes.filter((n) => n.id !== docCanon.id);
        for (const o of others) mergeMap.set(o.id, docCanon.id);
        decisions.push({
          label,
          action: 'merge-into-document',
          canonical: docCanon.id,
          canonical_type: 'document',
          canonical_score: richness(docCanon, degree),
          merged: others.map((o) => ({ id: o.id, type: o.node_type })),
        });
        continue;
      }
    }

    // Rule C: content-free + content-bearing mix → merge the empties into
    // the richest content-bearing node. This is the canonical cross-type
    // cleanup (e.g. `organization-bob-lazar` + `person-bob-lazar`, where
    // the organization-side entry is an extraction artifact).
    if (contentFree.length > 0 && contentBearing.length > 0) {
      const canonical = [...contentBearing]
        .map((n) => ({ n, score: richness(n, degree) }))
        .sort((a, b) => b.score - a.score)[0].n;
      const canonScore = richness(canonical, degree);
      for (const cf of contentFree) mergeMap.set(cf.id, canonical.id);
      decisions.push({
        label,
        action: 'merge-stubs',
        canonical: canonical.id,
        canonical_type: canonical.node_type,
        canonical_score: canonScore,
        merged: contentFree.map((o) => ({ id: o.id, type: o.node_type })),
      });
      continue;
    }

    // Rule D: all content-free → collapse to a single deterministic winner
    // (the one with the most existing edges, ties broken by id).
    if (contentBearing.length === 0) {
      const canonical = [...nodes]
        .map((n) => ({ n, score: degree.get(n.id) ?? 0 }))
        .sort((a, b) => b.score - a.score || a.n.id.localeCompare(b.n.id))[0].n;
      const others = nodes.filter((n) => n.id !== canonical.id);
      for (const o of others) mergeMap.set(o.id, canonical.id);
      decisions.push({
        label,
        action: 'merge-all-content-free',
        canonical: canonical.id,
        canonical_type: canonical.node_type,
        merged: others.map((o) => ({ id: o.id, type: o.node_type })),
      });
      continue;
    }

    // Rule E: multiple content-bearing nodes, not clearly distinct events.
    // Only merge when they share (a) the same node_type AND (b) an
    // identical summary prefix — i.e. extraction-time duplication that
    // slipped through the pipeline's own dedupe.
    if (types.size === 1) {
      const byPrefix = new Map();
      for (const n of nodes) {
        const key = (n.summary ?? '').trim().slice(0, 120);
        if (!byPrefix.has(key)) byPrefix.set(key, []);
        byPrefix.get(key).push(n);
      }
      let mergedAny = false;
      for (const [, bucket] of byPrefix) {
        if (bucket.length < 2) continue;
        const canonical = [...bucket]
          .map((n) => ({ n, score: richness(n, degree) }))
          .sort((a, b) => b.score - a.score)[0].n;
        for (const o of bucket) if (o.id !== canonical.id) mergeMap.set(o.id, canonical.id);
        decisions.push({
          label,
          action: 'merge-same-type-same-summary',
          canonical: canonical.id,
          canonical_type: canonical.node_type,
          merged: bucket
            .filter((o) => o.id !== canonical.id)
            .map((o) => ({ id: o.id, type: o.node_type })),
        });
        mergedAny = true;
      }
      if (!mergedAny) {
        decisions.push({
          label,
          action: 'skip-same-type-distinct-content',
          node_count: nodes.length,
          type: [...types][0],
        });
      }
      continue;
    }

    // Rule F: cross-type group where every node is content-bearing and
    // they're not org+program — leave alone. Over-merging would destroy
    // legitimate dual concepts.
    decisions.push({
      label,
      action: 'skip-cross-type-both-rich',
      node_count: nodes.length,
      types: [...types],
    });
  }

  console.log(`\nPlanned merges: ${mergeMap.size} nodes will be merged`);
  console.log(`Decisions logged: ${decisions.length}`);

  // Apply merges — mutate canonical nodes with data from merged-away nodes
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const [oldId, canonicalId] of mergeMap) {
    const canonical = byId.get(canonicalId);
    const other = byId.get(oldId);
    if (!canonical || !other) continue;
    mergeNode(canonical, other);
  }

  // Remove merged-away nodes
  const removed = new Set(mergeMap.keys());
  const newNodes = graph.nodes.filter((n) => !removed.has(n.id));

  // Rewrite edges + dedupe + drop self-loops
  const rewriteId = (id) => mergeMap.get(id) ?? id;
  const edgeKey = (e) => `${e.from_node_id}|${e.to_node_id}|${e.relationship}`;
  const seenEdges = new Set();
  const newEdges = [];
  let selfLoopDropped = 0;
  let edgeDupeDropped = 0;

  for (const e of graph.edges) {
    const from = rewriteId(e.from_node_id);
    const to = rewriteId(e.to_node_id);
    if (from === to) {
      selfLoopDropped += 1;
      continue;
    }
    const rewritten = { ...e, from_node_id: from, to_node_id: to };
    const k = edgeKey(rewritten);
    if (seenEdges.has(k)) {
      edgeDupeDropped += 1;
      continue;
    }
    seenEdges.add(k);
    newEdges.push(rewritten);
  }

  const merged = {
    ...graph,
    generated_at: new Date().toISOString(),
    metadata: {
      ...(graph.metadata ?? {}),
      canonicalization_pass_at: new Date().toISOString(),
      canonicalization_merged_nodes: mergeMap.size,
      canonicalization_dropped_self_loops: selfLoopDropped,
      canonicalization_dropped_dup_edges: edgeDupeDropped,
    },
    nodes: newNodes,
    edges: newEdges,
  };

  await fs.writeFile(GRAPH, JSON.stringify(merged, null, 2));
  await fs.mkdir(path.dirname(REPORT), { recursive: true });
  await fs.writeFile(
    REPORT,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        input: { nodes: graph.nodes.length, edges: graph.edges.length },
        output: { nodes: newNodes.length, edges: newEdges.length },
        merged_nodes: mergeMap.size,
        self_loops_dropped: selfLoopDropped,
        dup_edges_dropped: edgeDupeDropped,
        decisions,
      },
      null,
      2,
    ),
  );

  console.log(`\nWrote ${GRAPH}`);
  console.log(`  nodes: ${graph.nodes.length} -> ${newNodes.length}`);
  console.log(`  edges: ${graph.edges.length} -> ${newEdges.length}`);
  console.log(`  self-loops dropped: ${selfLoopDropped}`);
  console.log(`  dup edges dropped: ${edgeDupeDropped}`);
  console.log(`\nReport: ${REPORT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
