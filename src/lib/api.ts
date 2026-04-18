import { apiStatic } from './api-static';
import type {
  ArchiveMeta,
  CommunityHeader,
  CommunityPayload,
  PathPayload,
  Perspective,
  PerspectiveScene,
  ScenePayload,
  SearchResponse,
} from './api-types';
import type { ArchiveNode } from '../types';

export type {
  ArchiveMeta,
  CommunityHeader,
  CommunityPayload,
  PathPayload,
  Perspective,
  PerspectiveScene,
  ScenePayload,
  SearchHit,
  SearchResponse,
} from './api-types';

/**
 * Scene Explorer API client with transparent fallback.
 *
 * Runs against the Fastify server (via /api/... routes + vite proxy on
 * :8787) when that server is reachable, and falls back to a pure
 * client-side implementation (api-static.ts) that computes everything
 * from the chunked JSON + perspectives.json + communities.json overlay
 * otherwise.
 *
 * This is why the GitHub Pages deploy works the same as `npm run dev`
 * without needing `npm run server`. The server exists as an optional
 * perf layer for large graphs + a future write path, not as a hard
 * dependency.
 *
 * Probe runs once per session. If /api/healthz answers within 800 ms
 * the server is preferred; otherwise static for the rest of the
 * session. Force either side with ?api=server or ?api=static in the
 * URL bar.
 */

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const PROBE_TIMEOUT_MS = 800;

type Impl = 'server' | 'static';
let decidedImpl: Impl | null = null;
let probePromise: Promise<Impl> | null = null;

function forcedImpl(): Impl | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const forced = q.get('api');
  if (forced === 'server' || forced === 'static') return forced;
  return null;
}

async function probe(): Promise<Impl> {
  const forced = forcedImpl();
  if (forced) return forced;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(`${API_BASE}/api/healthz`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) return 'server';
  } catch {
    // fall through to static
  }
  return 'static';
}

export async function whichApi(): Promise<Impl> {
  if (decidedImpl) return decidedImpl;
  if (!probePromise) probePromise = probe();
  decidedImpl = await probePromise;
  if (typeof console !== 'undefined') {
    console.info(`[nhi] API impl: ${decidedImpl}`);
  }
  return decidedImpl;
}

async function serverRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { accept: 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${path} -> ${res.status} ${res.statusText} ${text}`);
  }
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  meta: async (signal?: AbortSignal): Promise<ArchiveMeta> => {
    if ((await whichApi()) === 'server') {
      return serverRequest<ArchiveMeta>('/api/meta', { signal });
    }
    return apiStatic.meta(signal);
  },

  search: async (q: string, limit = 20, signal?: AbortSignal): Promise<SearchResponse> => {
    if ((await whichApi()) === 'server') {
      return serverRequest<SearchResponse>(
        `/api/search${qs({ q, limit })}`,
        { signal },
      );
    }
    return apiStatic.search(q, limit);
  },

  entity: async (id: string, signal?: AbortSignal): Promise<ArchiveNode> => {
    if ((await whichApi()) === 'server') {
      const res = await serverRequest<{ node: ArchiveNode }>(
        `/api/entity/${encodeURIComponent(id)}`,
        { signal },
      );
      return res.node;
    }
    return apiStatic.entity(id);
  },

  ego: async (
    id: string,
    opts: { depth?: number; limit?: number; signal?: AbortSignal } = {},
  ): Promise<ScenePayload> => {
    if ((await whichApi()) === 'server') {
      return serverRequest<ScenePayload>(
        `/api/ego/${encodeURIComponent(id)}${qs({ depth: opts.depth, limit: opts.limit })}`,
        { signal: opts.signal },
      );
    }
    return apiStatic.ego(id, opts);
  },

  expand: async (
    id: string,
    opts: { rel?: string; types?: string[]; limit?: number; signal?: AbortSignal } = {},
  ): Promise<ScenePayload> => {
    if ((await whichApi()) === 'server') {
      return serverRequest<ScenePayload>(
        `/api/expand/${encodeURIComponent(id)}${qs({
          rel: opts.rel,
          types: opts.types?.join(','),
          limit: opts.limit,
        })}`,
        { signal: opts.signal },
      );
    }
    return apiStatic.expand(id, opts);
  },

  path: async (from: string, to: string, depth = 4, signal?: AbortSignal): Promise<PathPayload> => {
    if ((await whichApi()) === 'server') {
      return serverRequest<PathPayload>(
        `/api/path${qs({ from, to, depth })}`,
        { signal },
      );
    }
    return apiStatic.path(from, to, depth);
  },

  community: async (id: number, limit = 50, signal?: AbortSignal): Promise<CommunityPayload> => {
    if ((await whichApi()) === 'server') {
      return serverRequest<CommunityPayload>(
        `/api/community/${id}${qs({ limit })}`,
        { signal },
      );
    }
    return apiStatic.community(id, limit);
  },

  topCommunities: async (limit = 20, signal?: AbortSignal): Promise<{ communities: CommunityHeader[] }> => {
    if ((await whichApi()) === 'server') {
      return serverRequest<{ communities: CommunityHeader[] }>(
        `/api/communities/top${qs({ limit })}`,
        { signal },
      );
    }
    return apiStatic.topCommunities(limit);
  },

  perspectives: async (signal?: AbortSignal): Promise<Perspective[]> => {
    if ((await whichApi()) === 'server') {
      const res = await serverRequest<{ perspectives: Perspective[] }>('/api/perspectives', {
        signal,
      });
      return res.perspectives;
    }
    return apiStatic.perspectives();
  },

  perspective: async (slug: string, signal?: AbortSignal): Promise<PerspectiveScene> => {
    if ((await whichApi()) === 'server') {
      return serverRequest<PerspectiveScene>(
        `/api/perspective/${encodeURIComponent(slug)}`,
        { signal },
      );
    }
    return apiStatic.perspective(slug);
  },
};
