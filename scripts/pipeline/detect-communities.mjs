#!/usr/bin/env node
/**
 * Community detection pass — Louvain modularity over the canonicalized
 * graph. Writes community_id onto every node in data/graph.db and
 * populates the community table with size + top-K labels per community.
 *
 * Louvain produces non-overlapping clusters. The top-K labels per
 * community become the human-readable "cluster name" surfaced in the
 * Scene Explorer's community overlays.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DB_PATH = path.join(ROOT, 'data/graph.db');

function main() {
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = OFF');

  const rows = db.prepare(`SELECT id, node_type, label, degree FROM node`).all();
  const edges = db.prepare(`SELECT id, from_node_id, to_node_id FROM edge`).all();

  console.log(`Loaded ${rows.length} nodes, ${edges.length} edges`);

  const g = new Graph({ type: 'undirected', multi: false });
  for (const n of rows) g.addNode(n.id, { label: n.label, node_type: n.node_type, degree: n.degree });
  for (const e of edges) {
    if (!g.hasNode(e.from_node_id) || !g.hasNode(e.to_node_id)) continue;
    if (e.from_node_id === e.to_node_id) continue;
    if (g.hasEdge(e.from_node_id, e.to_node_id)) continue;
    g.addEdgeWithKey(e.id, e.from_node_id, e.to_node_id);
  }

  console.log(`Graph built: ${g.order} nodes, ${g.size} edges`);
  console.log('Running Louvain modularity optimisation...');

  const assignments = louvain(g, { resolution: 1.0 });

  const counts = new Map();
  for (const id of Object.values(assignments)) counts.set(id, (counts.get(id) ?? 0) + 1);
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const remap = new Map();
  ordered.forEach(([oldId], i) => remap.set(oldId, i));

  console.log(
    `Found ${counts.size} communities (largest: ${ordered[0]?.[1]} nodes, smallest: ${ordered[ordered.length - 1]?.[1]})`,
  );

  db.exec(`UPDATE node SET community_id = NULL`);
  const updateNode = db.prepare(`UPDATE node SET community_id = ? WHERE id = ?`);
  const tx = db.transaction(() => {
    for (const [nodeId, oldCommId] of Object.entries(assignments)) {
      updateNode.run(remap.get(oldCommId), nodeId);
    }
  });
  tx();

  db.exec(`DELETE FROM community`);
  const insertCommunity = db.prepare(
    `INSERT INTO community (id, label, size, top_node_ids) VALUES (?, ?, ?, ?)`,
  );
  const topPerComm = db.prepare(`
    SELECT id, label, node_type FROM node
    WHERE community_id = ?
    ORDER BY degree DESC, id ASC
    LIMIT 8
  `);
  const sizePerComm = db.prepare(`SELECT COUNT(*) as n FROM node WHERE community_id = ?`);

  const tx2 = db.transaction(() => {
    for (let i = 0; i < ordered.length; i += 1) {
      const size = sizePerComm.get(i).n;
      const top = topPerComm.all(i);
      const label = top
        .slice(0, 3)
        .map((r) => r.label)
        .join(' · ');
      insertCommunity.run(i, label, size, JSON.stringify(top.map((r) => r.id)));
    }
  });
  tx2();

  console.log('Top 10 communities (by size):');
  const top10 = db
    .prepare(`SELECT id, size, label FROM community ORDER BY size DESC LIMIT 10`)
    .all();
  for (const c of top10) {
    console.log(`  [${String(c.id).padStart(3)}] ${String(c.size).padStart(4)} nodes — ${c.label}`);
  }

  db.close();
  console.log('\nCommunity detection complete.');
}

main();
