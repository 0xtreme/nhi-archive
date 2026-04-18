import type { ArchiveEdge, ArchiveNode } from '../types';

/**
 * Client for the Scene Explorer API (server/index.mjs).
 *
 * Every call is a plain fetch against /api/... routes; when running
 * vite dev the proxy forwards to the Fastify server on :8787.
 * Production deploys point VITE_API_BASE at the hosted server, or fall
 * back to the GitHub Pages static path.
 */

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export interface ArchiveMeta {
  built_at: string | null;
  source_generated_at: string | null;
  total_nodes: number;
  total_edges: number;
  node_type_counts: Record<string, number>;
  pipeline_source_counts: Record<string, number>;
  year_range: { min: number | null; max: number | null };
  community_count: number;
}

export interface SearchHit {
  id: string;
  label: string;
  node_type: string;
  date_start: string | null;
  confidence: string | null;
  community_id: number | null;
  degree: number;
  score: number;
}

export interface SearchResponse {
  query: string;
  strategy?: 'AND' | 'OR';
  results: SearchHit[];
}

export interface ScenePayload {
  seed_ids: string[];
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
}

export interface PathPayload {
  path: string[] | null;
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
}

export interface Perspective {
  slug: string;
  title: string;
  description: string;
  sort_order: number;
}

export interface PerspectiveScene extends ScenePayload {
  perspective: { slug: string; title: string; description: string };
}

export interface CommunityHeader {
  id: number;
  label: string;
  size: number;
}

export interface CommunityPayload {
  community: CommunityHeader;
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { ...init, headers: { accept: 'application/json', ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${path} -> ${res.status} ${res.statusText} ${text}`);
  }
  return (await res.json()) as T;
}

export const api = {
  meta: (signal?: AbortSignal) => request<ArchiveMeta>('/api/meta', { signal }),

  search: (q: string, limit = 20, signal?: AbortSignal) =>
    request<SearchResponse>(
      `/api/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      { signal },
    ),

  entity: (id: string, signal?: AbortSignal) =>
    request<{ node: ArchiveNode }>(
      `/api/entity/${encodeURIComponent(id)}`,
      { signal },
    ).then((r) => r.node),

  ego: (id: string, opts: { depth?: number; limit?: number; signal?: AbortSignal } = {}) => {
    const params = new URLSearchParams();
    if (opts.depth) params.set('depth', String(opts.depth));
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return request<ScenePayload>(
      `/api/ego/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`,
      { signal: opts.signal },
    );
  },

  expand: (
    id: string,
    opts: { rel?: string; types?: string[]; limit?: number; signal?: AbortSignal } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.rel) params.set('rel', opts.rel);
    if (opts.types?.length) params.set('types', opts.types.join(','));
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return request<ScenePayload>(
      `/api/expand/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`,
      { signal: opts.signal },
    );
  },

  path: (from: string, to: string, depth = 4, signal?: AbortSignal) =>
    request<PathPayload>(
      `/api/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&depth=${depth}`,
      { signal },
    ),

  community: (id: number, limit = 50, signal?: AbortSignal) =>
    request<CommunityPayload>(
      `/api/community/${id}?limit=${limit}`,
      { signal },
    ),

  topCommunities: (limit = 20, signal?: AbortSignal) =>
    request<{ communities: CommunityHeader[] }>(
      `/api/communities/top?limit=${limit}`,
      { signal },
    ),

  perspectives: (signal?: AbortSignal) =>
    request<{ perspectives: Perspective[] }>(
      '/api/perspectives',
      { signal },
    ).then((r) => r.perspectives),

  perspective: (slug: string, signal?: AbortSignal) =>
    request<PerspectiveScene>(
      `/api/perspective/${encodeURIComponent(slug)}`,
      { signal },
    ),
};
