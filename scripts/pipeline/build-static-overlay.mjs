#!/usr/bin/env node
/**
 * Static overlay — reads data/graph.db and exports the community +
 * perspective data as static JSON under public/data/ so the Scene
 * Explorer still works on GitHub Pages (where the Fastify server
 * can't run).
 *
 * Outputs:
 *   public/data/perspectives.json  — perspective list + fully-baked
 *                                    scenes (seed_ids + nodes + edges)
 *   public/data/communities.json   — { node_id: community_id, ... }
 *                                    + top community headers
 *
 * Commit both files. The client loader (src/lib/chunkedGraph.ts)
 * merges communities onto nodes after load, and the static API
 * fallback (src/lib/api-static.ts) serves perspective scenes straight
 * from perspectives.json when the /api endpoints aren't reachable.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DB_PATH = path.join(ROOT, 'data/graph.db');
const OUT_PERS = path.join(ROOT, 'public/data/perspectives.json');
const OUT_COMM = path.join(ROOT, 'public/data/communities.json');

function hydrateNode(row) {
  const node = JSON.parse(row.raw_json);
  node.community_id = row.community_id ?? null;
  node.degree = row.degree ?? 0;
  return node;
}

function hydrateEdge(row) {
  return JSON.parse(row.raw_json);
}

function neighborhoodOf(db, seedIds, limit = 80) {
  const frontier = new Set(seedIds);
  const visited = new Set(seedIds);
  for (const id of frontier) {
    const edges = db
      .prepare(`SELECT * FROM edge WHERE from_node_id = ? OR to_node_id = ?`)
      .all(id, id);
    for (const e of edges) {
      const other = e.from_node_id === id ? e.to_node_id : e.from_node_id;
      if (!visited.has(other)) visited.add(other);
      if (visited.size >= limit) break;
    }
    if (visited.size >= limit) break;
  }
  const nodeIds = [...visited];
  if (nodeIds.length === 0) return { nodes: [], edges: [] };
  const placeholders = '?,'.repeat(nodeIds.length).slice(0, -1);
  const nodes = db
    .prepare(`SELECT * FROM node WHERE id IN (${placeholders})`)
    .all(...nodeIds)
    .map(hydrateNode);
  const edges = db
    .prepare(
      `SELECT * FROM edge WHERE from_node_id IN (${placeholders}) AND to_node_id IN (${placeholders})`,
    )
    .all(...nodeIds, ...nodeIds)
    .map(hydrateEdge);
  return { nodes, edges };
}

async function main() {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

  const perspectives = db
    .prepare(`SELECT slug, title, description, node_ids, sort_order, kind FROM perspective ORDER BY sort_order, slug`)
    .all();

  const scenes = {};
  for (const p of perspectives) {
    const seedIds = JSON.parse(p.node_ids);
    const n = neighborhoodOf(db, seedIds, 80);
    scenes[p.slug] = {
      perspective: { slug: p.slug, title: p.title, description: p.description },
      seed_ids: seedIds,
      nodes: n.nodes,
      edges: n.edges,
    };
  }

  const communitiesMeta = db
    .prepare(`SELECT id, label, size, top_node_ids FROM community ORDER BY size DESC`)
    .all();
  const nodeCommunity = Object.fromEntries(
    db
      .prepare(`SELECT id, community_id FROM node WHERE community_id IS NOT NULL`)
      .all()
      .map((r) => [r.id, r.community_id]),
  );

  const persOut = {
    generated_at: new Date().toISOString(),
    perspectives: perspectives.map(({ slug, title, description, sort_order, kind }) => ({
      slug,
      title,
      description,
      sort_order,
      kind,
    })),
    scenes,
  };

  const commOut = {
    generated_at: new Date().toISOString(),
    by_node: nodeCommunity,
    communities: communitiesMeta.map((c) => ({
      id: c.id,
      label: c.label,
      size: c.size,
      top_node_ids: JSON.parse(c.top_node_ids ?? '[]'),
    })),
  };

  await fs.writeFile(OUT_PERS, JSON.stringify(persOut));
  await fs.writeFile(OUT_COMM, JSON.stringify(commOut));

  const persSize = (JSON.stringify(persOut).length / 1024 / 1024).toFixed(2);
  const commSize = (JSON.stringify(commOut).length / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${OUT_PERS} (${persSize} MB)`);
  console.log(`  ${perspectives.length} perspectives, ${Object.keys(scenes).length} scenes baked`);
  console.log(`Wrote ${OUT_COMM} (${commSize} MB)`);
  console.log(`  ${Object.keys(nodeCommunity).length} nodes tagged, ${communitiesMeta.length} communities`);

  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
