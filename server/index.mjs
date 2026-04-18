#!/usr/bin/env node
/**
 * NHI Archive API server.
 *
 * Reads data/graph.db (SQLite, built by scripts/pipeline/build-sqlite.mjs
 * + detect-communities.mjs + register-perspectives.mjs) and serves the
 * Scene Explorer endpoints used by the frontend.
 *
 * Endpoints (all JSON):
 *   GET  /api/meta                         — counts + build metadata
 *   GET  /api/search?q=...&limit=20        — FTS5 full-text search
 *   GET  /api/entity/:id                   — node + sources_rich + aliases + tags
 *   GET  /api/ego/:id?depth=1&limit=60     — seed + N-hop neighborhood (scene payload)
 *   GET  /api/expand/:id?rel=X&types=a,b   — one-step expansion from a node
 *   GET  /api/path?from=X&to=Y&depth=4     — shortest-path between two nodes
 *   GET  /api/community/:id?limit=50       — a community's top members
 *   GET  /api/perspectives                 — list curated perspectives
 *   GET  /api/perspective/:slug            — scene payload for one perspective
 *
 * Run:
 *   npm run server
 * or standalone:
 *   node server/index.mjs --port 8787
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.NHI_DB_PATH ?? path.join(ROOT, 'data/graph.db');
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';

const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
db.pragma('journal_mode = WAL');

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  },
});

await fastify.register(cors, {
  origin: true, // dev convenience; tighten for production deploy
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hydrateNode(row) {
  if (!row) return null;
  const node = JSON.parse(row.raw_json);
  node.community_id = row.community_id ?? null;
  node.degree = row.degree ?? 0;
  return node;
}

function hydrateEdge(row) {
  if (!row) return null;
  return JSON.parse(row.raw_json);
}

function parseDepth(input, fallback = 1) {
  const n = Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(3, Math.floor(n)));
}

function parseLimit(input, fallback = 60, cap = 200) {
  const n = Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(cap, Math.floor(n)));
}

// Safely escape an FTS5 query fragment — we build a MATCH string from
// user input so we have to strip characters that alter the FTS5 query
// grammar (", -, ^, :, parens, etc). Rather than perfect escaping we
// tokenize and OR+AND manually.
function buildFtsMatch(query) {
  const tokens = String(query)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return null;
  const quoted = tokens.map((t) => `"${t}"`);
  return {
    and: quoted.join(' AND '),
    or: quoted.join(' OR '),
    tokens,
  };
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------
const stmts = {
  meta: db.prepare(`SELECT key, value FROM meta`),
  nodeCountByType: db.prepare(`SELECT node_type, COUNT(*) n FROM node GROUP BY node_type`),
  totalEdges: db.prepare(`SELECT COUNT(*) n FROM edge`),
  availableSources: db.prepare(
    `SELECT pipeline_source, COUNT(*) n FROM node WHERE pipeline_source IS NOT NULL GROUP BY pipeline_source ORDER BY n DESC`,
  ),
  yearRange: db.prepare(
    `SELECT MIN(CAST(substr(date_start,1,4) AS INTEGER)) AS min_year,
            MAX(CAST(substr(date_start,1,4) AS INTEGER)) AS max_year
       FROM node WHERE date_start IS NOT NULL`,
  ),
  communityCount: db.prepare(`SELECT COUNT(*) n FROM community`),

  nodeById: db.prepare(`SELECT * FROM node WHERE id = ?`),
  nodeBrief: db.prepare(`SELECT id, label, node_type, degree, community_id, confidence, date_start FROM node WHERE id = ?`),
  sourcesRichForNode: db.prepare(
    `SELECT source_type, video_id, timestamp_start, timestamp_end, quote, url FROM source_rich WHERE node_id = ? ORDER BY video_id, timestamp_start`,
  ),
  aliasesForNode: db.prepare(`SELECT alias FROM alias WHERE node_id = ?`),
  tagsForNode: db.prepare(`SELECT tag FROM tag WHERE node_id = ?`),

  edgesFromOrTo: db.prepare(`SELECT * FROM edge WHERE from_node_id = ? OR to_node_id = ?`),
  edgesAmong: (n) =>
    db.prepare(
      `SELECT * FROM edge WHERE from_node_id IN (${'?,'.repeat(n).slice(0, -1)}) AND to_node_id IN (${'?,'.repeat(n).slice(0, -1)})`,
    ),

  fts: db.prepare(`
    SELECT n.*, bm25(node_fts) AS rank
      FROM node_fts
      JOIN node n ON n.rowid = node_fts.rowid
      WHERE node_fts MATCH ?
      ORDER BY rank LIMIT ?
  `),

  perspectivesList: db.prepare(`SELECT slug, title, description, sort_order FROM perspective ORDER BY sort_order, slug`),
  perspectiveBySlug: db.prepare(`SELECT * FROM perspective WHERE slug = ?`),

  communityById: db.prepare(`SELECT * FROM community WHERE id = ?`),
  communityMembersByDegree: db.prepare(
    `SELECT * FROM node WHERE community_id = ? ORDER BY degree DESC LIMIT ?`,
  ),
  communitiesTop: db.prepare(
    `SELECT id, label, size FROM community ORDER BY size DESC LIMIT ?`,
  ),
};

function neighborhood(seedIds, depth, limit) {
  const frontier = new Set(seedIds);
  const visited = new Set(seedIds);
  for (let d = 0; d < depth; d += 1) {
    const nextFrontier = new Set();
    for (const id of frontier) {
      const edges = stmts.edgesFromOrTo.all(id, id);
      for (const e of edges) {
        const other = e.from_node_id === id ? e.to_node_id : e.from_node_id;
        if (visited.has(other)) continue;
        visited.add(other);
        nextFrontier.add(other);
        if (visited.size >= limit) break;
      }
      if (visited.size >= limit) break;
    }
    if (visited.size >= limit) break;
    if (nextFrontier.size === 0) break;
    frontier.clear();
    for (const id of nextFrontier) frontier.add(id);
  }

  const nodeIds = [...visited];
  const placeholders = '?,'.repeat(nodeIds.length).slice(0, -1);
  const nodeRows = db
    .prepare(`SELECT * FROM node WHERE id IN (${placeholders})`)
    .all(...nodeIds);
  const edgeRows = db
    .prepare(
      `SELECT * FROM edge WHERE from_node_id IN (${placeholders}) AND to_node_id IN (${placeholders})`,
    )
    .all(...nodeIds, ...nodeIds);

  return {
    seed_ids: seedIds,
    nodes: nodeRows.map(hydrateNode),
    edges: edgeRows.map(hydrateEdge),
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
fastify.get('/api/meta', async () => {
  const meta = Object.fromEntries(stmts.meta.all().map((r) => [r.key, r.value]));
  const yearRange = stmts.yearRange.get();
  return {
    built_at: meta.built_at ?? null,
    source_generated_at: meta.source_generated_at ?? null,
    total_nodes: Number(meta.node_count ?? 0),
    total_edges: stmts.totalEdges.get().n,
    node_type_counts: Object.fromEntries(
      stmts.nodeCountByType.all().map((r) => [r.node_type, r.n]),
    ),
    pipeline_source_counts: Object.fromEntries(
      stmts.availableSources.all().map((r) => [r.pipeline_source, r.n]),
    ),
    year_range: { min: yearRange.min_year ?? null, max: yearRange.max_year ?? null },
    community_count: stmts.communityCount.get().n,
  };
});

fastify.get('/api/search', async (req) => {
  const q = String(req.query.q ?? '').trim();
  const limit = parseLimit(req.query.limit, 20, 100);
  const match = buildFtsMatch(q);
  if (!match) return { query: q, results: [] };

  let rows = stmts.fts.all(match.and, limit);
  if (rows.length === 0 && match.tokens.length > 1) {
    rows = stmts.fts.all(match.or, limit);
  }
  return {
    query: q,
    strategy: rows.length > 0 ? 'AND' : 'OR',
    results: rows.map((r) => ({
      id: r.id,
      label: r.label,
      node_type: r.node_type,
      date_start: r.date_start,
      confidence: r.confidence,
      community_id: r.community_id,
      degree: r.degree,
      score: r.rank,
    })),
  };
});

fastify.get('/api/entity/:id', async (req, reply) => {
  const row = stmts.nodeById.get(req.params.id);
  if (!row) return reply.code(404).send({ error: 'node not found' });
  const node = hydrateNode(row);
  node.sources_rich = stmts.sourcesRichForNode.all(node.id);
  node.aliases = stmts.aliasesForNode.all(node.id).map((r) => r.alias);
  node.tags = stmts.tagsForNode.all(node.id).map((r) => r.tag);
  return { node };
});

fastify.get('/api/ego/:id', async (req, reply) => {
  const id = req.params.id;
  const row = stmts.nodeBrief.get(id);
  if (!row) return reply.code(404).send({ error: 'node not found' });
  const depth = parseDepth(req.query.depth, 1);
  const limit = parseLimit(req.query.limit, 60);
  return neighborhood([id], depth, limit);
});

fastify.get('/api/expand/:id', async (req, reply) => {
  const id = req.params.id;
  const row = stmts.nodeBrief.get(id);
  if (!row) return reply.code(404).send({ error: 'node not found' });
  const rel = req.query.rel ? String(req.query.rel) : null;
  const typesParam = req.query.types ? String(req.query.types).split(',').filter(Boolean) : null;
  const limit = parseLimit(req.query.limit, 40, 120);

  const edgeFilter = rel ? 'AND e.relationship = ?' : '';
  const rows = db
    .prepare(
      `SELECT e.*, n.node_type AS neighbor_type
         FROM edge e
         JOIN node n ON n.id = (CASE WHEN e.from_node_id = ? THEN e.to_node_id ELSE e.from_node_id END)
         WHERE (e.from_node_id = ? OR e.to_node_id = ?) ${edgeFilter}
         ORDER BY n.degree DESC
         LIMIT ?`,
    )
    .all(id, id, id, ...(rel ? [rel] : []), limit * 2); // overfetch, type-filter below

  const keepIds = new Set([id]);
  const keepEdges = [];
  for (const e of rows) {
    const other = e.from_node_id === id ? e.to_node_id : e.from_node_id;
    if (typesParam && !typesParam.includes(e.neighbor_type)) continue;
    keepIds.add(other);
    keepEdges.push(e);
    if (keepIds.size > limit) break;
  }

  const placeholders = '?,'.repeat([...keepIds].length).slice(0, -1);
  const nodes = db
    .prepare(`SELECT * FROM node WHERE id IN (${placeholders})`)
    .all(...keepIds);

  return {
    seed_ids: [id],
    nodes: nodes.map(hydrateNode),
    edges: keepEdges.map(hydrateEdge),
  };
});

fastify.get('/api/path', async (req, reply) => {
  const from = String(req.query.from ?? '');
  const to = String(req.query.to ?? '');
  if (!from || !to) return reply.code(400).send({ error: 'from and to required' });
  const maxDepth = parseDepth(req.query.depth, 4);

  const a = stmts.nodeBrief.get(from);
  const b = stmts.nodeBrief.get(to);
  if (!a || !b) return reply.code(404).send({ error: 'node not found' });
  if (from === to) return { path: [from], edges: [] };

  // BFS
  const parents = new Map([[from, null]]);
  const frontier = [from];
  let found = false;
  for (let d = 0; d < maxDepth && !found; d += 1) {
    const next = [];
    for (const cur of frontier) {
      const edges = stmts.edgesFromOrTo.all(cur, cur);
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
    frontier.length = 0;
    frontier.push(...next);
  }
  if (!found) return { path: null, edges: [] };

  const pathIds = [to];
  let step = parents.get(to);
  const edgeIds = [];
  while (step !== null && step) {
    edgeIds.unshift(step.edgeId);
    pathIds.unshift(step.via);
    step = parents.get(step.via);
  }

  const nodePlaceholders = '?,'.repeat(pathIds.length).slice(0, -1);
  const nodes = db
    .prepare(`SELECT * FROM node WHERE id IN (${nodePlaceholders})`)
    .all(...pathIds);
  const edgePlaceholders = '?,'.repeat(edgeIds.length).slice(0, -1);
  const edges = edgeIds.length
    ? db.prepare(`SELECT * FROM edge WHERE id IN (${edgePlaceholders})`).all(...edgeIds)
    : [];

  // Sort nodes to match path order
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pathNodes = pathIds.map((id) => byId.get(id)).filter(Boolean);

  return {
    path: pathIds,
    nodes: pathNodes.map(hydrateNode),
    edges: edges.map(hydrateEdge),
  };
});

fastify.get('/api/community/:id', async (req, reply) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return reply.code(400).send({ error: 'invalid community id' });
  const comm = stmts.communityById.get(id);
  if (!comm) return reply.code(404).send({ error: 'community not found' });
  const limit = parseLimit(req.query.limit, 50, 200);
  const members = stmts.communityMembersByDegree.all(id, limit).map(hydrateNode);
  const memberIds = members.map((n) => n.id);
  const edgePlaceholders = memberIds.length
    ? '?,'.repeat(memberIds.length).slice(0, -1)
    : null;
  const edges = edgePlaceholders
    ? db
        .prepare(
          `SELECT * FROM edge WHERE from_node_id IN (${edgePlaceholders}) AND to_node_id IN (${edgePlaceholders})`,
        )
        .all(...memberIds, ...memberIds)
        .map(hydrateEdge)
    : [];
  return {
    community: { id: comm.id, label: comm.label, size: comm.size },
    nodes: members,
    edges,
  };
});

fastify.get('/api/communities/top', async (req) => {
  const limit = parseLimit(req.query.limit, 20, 50);
  return { communities: stmts.communitiesTop.all(limit) };
});

fastify.get('/api/perspectives', async () => {
  const rows = stmts.perspectivesList.all();
  return { perspectives: rows };
});

fastify.get('/api/perspective/:slug', async (req, reply) => {
  const row = stmts.perspectiveBySlug.get(req.params.slug);
  if (!row) return reply.code(404).send({ error: 'perspective not found' });
  const ids = JSON.parse(row.node_ids);
  const scene = neighborhood(ids, 1, 80);
  return {
    perspective: { slug: row.slug, title: row.title, description: row.description },
    seed_ids: ids,
    nodes: scene.nodes,
    edges: scene.edges,
  };
});

fastify.get('/api/healthz', async () => ({ ok: true, db: path.basename(DB_PATH) }));

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`DB: ${DB_PATH}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
