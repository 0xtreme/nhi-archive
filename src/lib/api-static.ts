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
import { loadChunkedGraph, searchNodesRanked } from './chunkedGraph';
import type { ArchiveEdge, ArchiveNode } from '../types';

/**
 * Static / offline implementation of the Scene Explorer API.
 *
 * Exposes the same shape as the Fastify server (server/index.mjs) but
 * computes everything client-side from chunked JSON + the precomputed
 * perspectives.json and communities.json overlay files. This is what
 * runs on GitHub Pages and on any dev setup that doesn't have the
 * server started — the app itself behaves identically either way.
 */

interface StaticOverlay {
  perspectives: Perspective[];
  scenes: Record<string, PerspectiveScene>;
  communities: CommunityHeader[];
}

interface StaticCore {
  nodesById: Map<string, ArchiveNode>;
  edges: ArchiveEdge[];
  // from-node-id → edges starting/ending at that id
  adjacency: Map<string, ArchiveEdge[]>;
  // node-id → community_id
  communityByNode: Map<string, number>;
  // Community id → members (ids)
  communityMembers: Map<number, string[]>;
  // communityHeaders for /api/communities/top
  communities: CommunityHeader[];
  search: Awaited<ReturnType<typeof loadChunkedGraph>>['searchIndex'];
  perspectives: Perspective[];
  scenes: Record<string, PerspectiveScene>;
  meta: ArchiveMeta;
}

let corePromise: Promise<StaticCore> | null = null;

async function loadOverlay(signal?: AbortSignal): Promise<{ perspectives: Perspective[]; scenes: Record<string, PerspectiveScene>; communities: CommunityHeader[]; byNode: Map<string, number> }> {
  const [persResp, commResp] = await Promise.all([
    fetch('./data/perspectives.json', { signal, cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error(`perspectives.json -> ${r.status}`);
      return r.json();
    }),
    fetch('./data/communities.json', { signal, cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error(`communities.json -> ${r.status}`);
      return r.json();
    }),
  ]);

  const overlay: StaticOverlay = {
    perspectives: persResp.perspectives ?? [],
    scenes: persResp.scenes ?? {},
    communities: (commResp.communities ?? []) as CommunityHeader[],
  };
  const byNode = new Map<string, number>();
  for (const [id, cid] of Object.entries(commResp.by_node ?? {})) {
    byNode.set(id, Number(cid));
  }
  return { ...overlay, byNode };
}

async function bootstrap(): Promise<StaticCore> {
  const controller = new AbortController();
  const [chunked, overlay] = await Promise.all([
    loadChunkedGraph(controller.signal),
    loadOverlay(controller.signal),
  ]);

  // Decorate every node with its precomputed community_id (and overlay
  // degree, which is more accurate than what chunkedGraph computes).
  const nodesById = new Map<string, ArchiveNode>();
  for (const n of chunked.graph.nodes) {
    const cid = overlay.byNode.get(n.id);
    if (cid !== undefined) (n as ArchiveNode & { community_id?: number }).community_id = cid;
    nodesById.set(n.id, n);
  }

  const adjacency = new Map<string, ArchiveEdge[]>();
  for (const e of chunked.graph.edges) {
    if (!adjacency.has(e.from_node_id)) adjacency.set(e.from_node_id, []);
    if (!adjacency.has(e.to_node_id)) adjacency.set(e.to_node_id, []);
    adjacency.get(e.from_node_id)!.push(e);
    adjacency.get(e.to_node_id)!.push(e);
  }

  const communityMembers = new Map<number, string[]>();
  for (const [nodeId, cid] of overlay.byNode) {
    if (!communityMembers.has(cid)) communityMembers.set(cid, []);
    communityMembers.get(cid)!.push(nodeId);
  }

  // Compute node-type counts / pipeline-source counts for /api/meta
  const typeCounts: Record<string, number> = {};
  const pipelineCounts: Record<string, number> = {};
  let minYear = Infinity;
  let maxYear = -Infinity;
  for (const n of chunked.graph.nodes) {
    typeCounts[n.node_type] = (typeCounts[n.node_type] ?? 0) + 1;
    const ps = (n as ArchiveNode & { pipeline_source?: string }).pipeline_source;
    if (ps) pipelineCounts[ps] = (pipelineCounts[ps] ?? 0) + 1;
    const ys = typeof n.date_start === 'string' ? parseInt(n.date_start.slice(0, 4), 10) : NaN;
    if (Number.isFinite(ys)) {
      if (ys < minYear) minYear = ys;
      if (ys > maxYear) maxYear = ys;
    }
  }

  const meta: ArchiveMeta = {
    built_at: null,
    source_generated_at: chunked.graph.generated_at ?? null,
    total_nodes: chunked.graph.nodes.length,
    total_edges: chunked.graph.edges.length,
    node_type_counts: typeCounts,
    pipeline_source_counts: pipelineCounts,
    year_range: {
      min: Number.isFinite(minYear) ? minYear : null,
      max: Number.isFinite(maxYear) ? maxYear : null,
    },
    community_count: overlay.communities.length,
  };

  return {
    nodesById,
    edges: chunked.graph.edges,
    adjacency,
    communityByNode: overlay.byNode,
    communityMembers,
    communities: overlay.communities,
    search: chunked.searchIndex,
    perspectives: overlay.perspectives,
    scenes: overlay.scenes,
    meta,
  };
}

function core(): Promise<StaticCore> {
  if (!corePromise) corePromise = bootstrap();
  return corePromise;
}

function degree(c: StaticCore, id: string) {
  return c.adjacency.get(id)?.length ?? 0;
}

function neighborhood(c: StaticCore, seedIds: string[], depth: number, limit: number): ScenePayload {
  let frontier = new Set(seedIds);
  const visited = new Set(seedIds);
  for (let d = 0; d < depth; d += 1) {
    const next = new Set<string>();
    for (const id of frontier) {
      const edges = c.adjacency.get(id) ?? [];
      for (const e of edges) {
        const other = e.from_node_id === id ? e.to_node_id : e.from_node_id;
        if (visited.has(other)) continue;
        visited.add(other);
        next.add(other);
        if (visited.size >= limit) break;
      }
      if (visited.size >= limit) break;
    }
    if (visited.size >= limit) break;
    if (next.size === 0) break;
    frontier = next;
  }

  const ids = [...visited];
  const idSet = new Set(ids);
  const nodes = ids.map((id) => c.nodesById.get(id)).filter((n): n is ArchiveNode => !!n);
  const edges = c.edges.filter(
    (e) => idSet.has(e.from_node_id) && idSet.has(e.to_node_id),
  );
  return { seed_ids: seedIds, nodes, edges };
}

export const apiStatic = {
  meta: async (_signal?: AbortSignal): Promise<ArchiveMeta> => {
    void _signal;
    return (await core()).meta;
  },

  search: async (q: string, limit = 20): Promise<SearchResponse> => {
    const c = await core();
    const ranked = searchNodesRanked(c.search, q, limit);
    const results = ranked
      .map((r) => {
        const n = c.nodesById.get(r.id);
        if (!n) return null;
        return {
          id: n.id,
          label: n.label,
          node_type: n.node_type,
          date_start: n.date_start ?? null,
          confidence: n.confidence ?? null,
          community_id: (n as ArchiveNode & { community_id?: number }).community_id ?? null,
          degree: degree(c, n.id),
          score: r.score,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return { query: q, strategy: 'AND', results };
  },

  entity: async (id: string): Promise<ArchiveNode> => {
    const c = await core();
    const n = c.nodesById.get(id);
    if (!n) throw new Error('node not found');
    return n;
  },

  ego: async (
    id: string,
    opts: { depth?: number; limit?: number; signal?: AbortSignal } = {},
  ): Promise<ScenePayload> => {
    const c = await core();
    if (!c.nodesById.has(id)) throw new Error('node not found');
    return neighborhood(c, [id], opts.depth ?? 1, opts.limit ?? 60);
  },

  expand: async (
    id: string,
    opts: { rel?: string; types?: string[]; limit?: number; signal?: AbortSignal } = {},
  ): Promise<ScenePayload> => {
    const c = await core();
    if (!c.nodesById.has(id)) throw new Error('node not found');
    const edges = (c.adjacency.get(id) ?? []).filter((e) => !opts.rel || e.relationship === opts.rel);
    const limit = opts.limit ?? 40;
    const keepIds = new Set<string>([id]);
    const keepEdges: ArchiveEdge[] = [];
    for (const e of edges) {
      const other = e.from_node_id === id ? e.to_node_id : e.from_node_id;
      const otherNode = c.nodesById.get(other);
      if (!otherNode) continue;
      if (opts.types && !opts.types.includes(otherNode.node_type)) continue;
      keepIds.add(other);
      keepEdges.push(e);
      if (keepIds.size > limit) break;
    }
    const nodes = [...keepIds].map((k) => c.nodesById.get(k)).filter((n): n is ArchiveNode => !!n);
    return { seed_ids: [id], nodes, edges: keepEdges };
  },

  path: async (from: string, to: string, depth = 4): Promise<PathPayload> => {
    const c = await core();
    if (!c.nodesById.has(from) || !c.nodesById.has(to))
      throw new Error('node not found');
    if (from === to) {
      return { path: [from], nodes: [c.nodesById.get(from)!], edges: [] };
    }
    const parents = new Map<string, { via: string; edgeId: string } | null>();
    parents.set(from, null);
    let frontier = [from];
    let found = false;
    for (let d = 0; d < depth && !found; d += 1) {
      const next: string[] = [];
      for (const cur of frontier) {
        const edges = c.adjacency.get(cur) ?? [];
        for (const e of edges) {
          const other = e.from_node_id === cur ? e.to_node_id : e.from_node_id;
          if (parents.has(other)) continue;
          parents.set(other, { via: cur, edgeId: e.id });
          if (other === to) {
            found = true;
            break;
          }
          next.push(other);
        }
        if (found) break;
      }
      frontier = next;
    }
    if (!found) return { path: null, nodes: [], edges: [] };

    const pathIds: string[] = [to];
    const edgeIds: string[] = [];
    let step = parents.get(to);
    while (step) {
      edgeIds.unshift(step.edgeId);
      pathIds.unshift(step.via);
      step = parents.get(step.via) ?? null;
    }
    const edgeById = new Map(c.edges.map((e) => [e.id, e]));
    const edges = edgeIds.map((id) => edgeById.get(id)).filter((e): e is ArchiveEdge => !!e);
    const nodes = pathIds
      .map((id) => c.nodesById.get(id))
      .filter((n): n is ArchiveNode => !!n);
    return { path: pathIds, nodes, edges };
  },

  community: async (id: number, limit = 50): Promise<CommunityPayload> => {
    const c = await core();
    const header = c.communities.find((x) => x.id === id);
    if (!header) throw new Error('community not found');
    const memberIds = (c.communityMembers.get(id) ?? [])
      .map((mid) => ({ id: mid, deg: degree(c, mid) }))
      .sort((a, b) => b.deg - a.deg)
      .slice(0, limit)
      .map((x) => x.id);
    const idSet = new Set(memberIds);
    const nodes = memberIds
      .map((mid) => c.nodesById.get(mid))
      .filter((n): n is ArchiveNode => !!n);
    const edges = c.edges.filter(
      (e) => idSet.has(e.from_node_id) && idSet.has(e.to_node_id),
    );
    return { community: header, nodes, edges };
  },

  topCommunities: async (limit = 20): Promise<{ communities: CommunityHeader[] }> => {
    const c = await core();
    return { communities: c.communities.slice(0, limit) };
  },

  perspectives: async (): Promise<Perspective[]> => {
    const c = await core();
    return c.perspectives;
  },

  perspective: async (slug: string): Promise<PerspectiveScene> => {
    const c = await core();
    const scene = c.scenes[slug];
    if (!scene) throw new Error('perspective not found');
    // Decorate nodes with community_id from overlay if they somehow missed it
    const decoratedNodes = scene.nodes.map((n) => {
      const cid = c.communityByNode.get(n.id);
      if (cid !== undefined) (n as ArchiveNode & { community_id?: number }).community_id = cid;
      return n;
    });
    return { ...scene, nodes: decoratedNodes };
  },
};
