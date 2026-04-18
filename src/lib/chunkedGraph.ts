import MiniSearch from 'minisearch';
import type { ArchiveEdge, ArchiveGraph, ArchiveNode } from '../types';

// Keep in sync with scripts/pipeline/build-client-artifacts.mjs — the index
// serialized at build time must be loaded with identical field config.
const MINISEARCH_OPTIONS = {
  fields: ['label', 'aliases', 'tags', 'summary', 'location_name', 'profession', 'video_title', 'quotes', 'sources'],
  storeFields: ['id', 'matched_field'],
  searchOptions: {
    prefix: true,
    fuzzy: 0.15,
    combineWith: 'AND' as const,
    boost: { label: 5, aliases: 3, tags: 2, video_title: 2, summary: 1, profession: 1, quotes: 0.5 },
  },
};

export interface GraphMeta {
  schema_version: number;
  generated_at: string;
  source_generated_at: string;
  total_nodes: number;
  total_edges: number;
  node_type_counts: Record<string, number>;
  pipeline_source_counts: Record<string, number>;
  confidence_counts: Record<string, number>;
  available_classifications: string[];
  available_tags: string[];
  year_range: { min: number; max: number };
}

export interface ChunkedGraphResult {
  graph: ArchiveGraph;
  meta: GraphMeta;
  searchIndex: MiniSearch;
}

interface ProgressCallbacks {
  onProgress?: (pct: number) => void;
}

async function* streamNDJSON<T>(response: Response): AsyncGenerator<T> {
  if (!response.body) throw new Error('No response body for NDJSON stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield JSON.parse(line) as T;
    }
  }
  const tail = buffer.trim();
  if (tail) yield JSON.parse(tail) as T;
}

async function fetchNDJSON<T>(url: string, signal: AbortSignal): Promise<T[]> {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  const items: T[] = [];
  for await (const item of streamNDJSON<T>(response)) items.push(item);
  return items;
}

export async function loadChunkedGraph(
  signal: AbortSignal,
  { onProgress }: ProgressCallbacks = {},
): Promise<ChunkedGraphResult> {
  onProgress?.(1);

  // Meta is small — fetch and parse first so the app can populate filter
  // dimensions before the heavier artifacts arrive.
  const metaResponse = await fetch('./data/graph.meta.json', { signal, cache: 'no-store' });
  if (!metaResponse.ok) throw new Error(`meta -> ${metaResponse.status}`);
  const meta = (await metaResponse.json()) as GraphMeta;
  onProgress?.(8);

  // Kick off the three heavy fetches in parallel. Search index is a single
  // JSON fetch; nodes and edges stream.
  const [searchText, nodes, edges] = await Promise.all([
    fetch('./data/graph.search.json', { signal, cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`search -> ${r.status}`);
        return r.text();
      })
      .then((text) => {
        onProgress?.(40);
        return text;
      }),
    fetchNDJSON<ArchiveNode>('./data/graph.nodes.ndjson', signal).then((result) => {
      onProgress?.(70);
      return result;
    }),
    fetchNDJSON<ArchiveEdge>('./data/graph.edges.ndjson', signal).then((result) => {
      onProgress?.(92);
      return result;
    }),
  ]);

  const searchIndex = MiniSearch.loadJSON(searchText, MINISEARCH_OPTIONS);
  onProgress?.(100);

  const graph: ArchiveGraph = {
    generated_at: meta.source_generated_at,
    metadata: {
      total_nodes: meta.total_nodes,
      total_edges: meta.total_edges,
    },
    nodes,
    edges,
  };

  return { graph, meta, searchIndex };
}

// Cap the OR-fallback result set. Without a cap a query like "James Allen
// Hynek" matches "James" across every node mentioning any James, returning
// hundreds of weak hits and drowning the canonical Hynek node. Score-ranked
// top N keeps the strong matches and drops the noise.
const LOOSE_FALLBACK_CAP = 25;
// Require the loose match to score at least this fraction of the best hit.
// Stops single-token weak matches (e.g. "Dr." alone) from polluting results.
const LOOSE_SCORE_FLOOR = 0.35;

function filterLooseResults<T extends { id: unknown; score: number }>(
  results: T[],
  cap: number,
): T[] {
  if (results.length === 0) return results;
  const top = results[0].score;
  const floor = top * LOOSE_SCORE_FLOOR;
  const kept: T[] = [];
  for (const r of results) {
    if (kept.length >= cap) break;
    if (r.score < floor) break;
    kept.push(r);
  }
  return kept;
}

export function searchNodeIds(index: MiniSearch, query: string): Set<string> {
  const trimmed = query.trim();
  if (!trimmed) return new Set();

  const strict = index.search(trimmed);
  if (strict.length >= 3) {
    return new Set(strict.map((r) => r.id as string));
  }

  // Fall back to OR when strict returned little — broadens to any-token match.
  // Capped + score-floored so we surface best matches without dragging in the
  // long tail of weak single-token hits.
  const loose = filterLooseResults(
    index.search(trimmed, { combineWith: 'OR' }),
    LOOSE_FALLBACK_CAP,
  );
  const merged = new Set<string>(strict.map((r) => r.id as string));
  for (const r of loose) merged.add(r.id as string);
  return merged;
}

export function searchNodesRanked(
  index: MiniSearch,
  query: string,
  limit = 8,
): Array<{ id: string; score: number }> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const strict = index.search(trimmed).slice(0, limit);
  if (strict.length >= limit) {
    return strict.map((r) => ({ id: r.id as string, score: r.score }));
  }

  const looseAll = index.search(trimmed, { combineWith: 'OR' });
  const loose = filterLooseResults(looseAll, limit * 2);

  const seen = new Set<string>();
  const out: Array<{ id: string; score: number }> = [];
  for (const r of strict) {
    const id = r.id as string;
    if (!seen.has(id)) {
      seen.add(id);
      out.push({ id, score: r.score });
    }
  }
  for (const r of loose) {
    if (out.length >= limit) break;
    const id = r.id as string;
    if (!seen.has(id)) {
      seen.add(id);
      out.push({ id, score: r.score });
    }
  }
  return out;
}
