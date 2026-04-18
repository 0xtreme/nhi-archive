#!/usr/bin/env node
/**
 * Register curated perspectives — named scenes the Scene Explorer shows
 * on its landing hub. Each perspective is a hand-authored list of node
 * label+type pairs that we resolve against the live DB to produce a
 * JSON array of pinned node ids.
 *
 * Resolution is tolerant: we look up by exact label first, then by
 * label contains-ignore-case, and log anything we can't find so the
 * curator can tighten the list.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DB_PATH = path.join(ROOT, 'data/graph.db');

// A perspective is `{ slug, title, description, members: [[label, type], ...] }`.
// The resolver picks the first matching node for each pair.
const PERSPECTIVES = [
  {
    slug: 'canonical-incidents',
    title: 'Canonical incidents',
    description:
      'The headline UFO/UAP events that anchor most of the public record. A good first thread to pull.',
    sort_order: 10,
    members: [
      ['Roswell incident', 'incident'],
      ['Nimitz / Tic-Tac Incident', 'incident'],
      ['Rendlesham Forest Incident', 'incident'],
      ['Phoenix Lights', 'incident'],
      ['GIMBAL Encounter', 'incident'],
      ['GOFAST Encounter', 'incident'],
      ['JAL1628', 'incident'],
      ['Kenneth Arnold', 'person'],
      ['Roswell, New Mexico', 'location'],
    ],
  },
  {
    slug: 'key-figures',
    title: 'Key figures',
    description:
      'The most-cited people across the corpus — whistleblowers, scientists, investigators, witnesses.',
    sort_order: 20,
    members: [
      ['David Grusch', 'person'],
      ['Hal Puthoff', 'person'],
      ['Jacques Vallée', 'person'],
      ['Bob Lazar', 'person'],
      ['Luis Elizondo', 'person'],
      ['Christopher Mellon', 'person'],
      ['J. Allen Hynek', 'person'],
      ['Tom DeLonge', 'person'],
      ['Jesse Michels', 'person'],
      ['Avi Loeb', 'person'],
    ],
  },
  {
    slug: 'gov-programs',
    title: 'Government programs',
    description:
      'Named DoD and IC programs mentioned across testimony, FOIA, and transcript sources.',
    sort_order: 30,
    members: [
      ['AATIP', 'program'],
      ['AAWSAP', 'program'],
      ['AARO', 'program'],
      ['Project Blue Book', 'program'],
      ['Project Blue Book', 'organization'],
      ['NICAP', 'organization'],
      ['MUFON', 'organization'],
      ['NUFORC', 'organization'],
    ],
  },
  {
    slug: '2023-disclosure',
    title: '2023 disclosure testimony',
    description:
      'David Grusch, the July 2023 Congressional hearing, and the network of figures + programs cited under oath.',
    sort_order: 40,
    members: [
      ['David Grusch', 'person'],
      ['July 2023 Congressional UAP Hearing', 'event'],
      ['Ross Coulthart', 'person'],
      ['Christopher Mellon', 'person'],
      ['Luis Elizondo', 'person'],
      ['Non-Human Intelligence', 'phenomenon'],
      ['Crash Retrieval', 'concept'],
    ],
  },
  {
    slug: 'american-alchemy',
    title: 'American Alchemy corpus',
    description:
      'Jesse Michels, the 98 interview episodes, and the hosts/guests who anchor the transcript extraction.',
    sort_order: 50,
    members: [
      ['Jesse Michels', 'person'],
      ['Hal Puthoff', 'person'],
      ['Jacques Vallée', 'person'],
      ['Eric Weinstein', 'person'],
      ['David Grusch', 'person'],
      ['Bob Lazar', 'person'],
      ['Avi Loeb', 'person'],
      ['Tom DeLonge', 'person'],
      ['T. Townsend Brown', 'person'],
    ],
  },
  {
    slug: 'crash-retrieval',
    title: 'Crash-retrieval narrative',
    description:
      'The cluster of claims, programs, and people tied to the "non-human biologics recovered" storyline.',
    sort_order: 60,
    members: [
      ['Crash Retrieval', 'concept'],
      ['Non-Human Biologics', 'phenomenon'],
      ['Non-Human Intelligence', 'phenomenon'],
      ['David Grusch', 'person'],
      ['Jesse Marcel', 'person'],
      ['Roswell incident', 'incident'],
      ['AATIP', 'program'],
      ['The Day After Roswell', 'document'],
    ],
  },
  {
    slug: 'propulsion-antigravity',
    title: 'Propulsion & antigravity',
    description:
      'Researchers, claims, and programs associated with exotic propulsion and the antigravity tradition.',
    sort_order: 70,
    members: [
      ['T. Townsend Brown', 'person'],
      ['Hal Puthoff', 'person'],
      ['Antigravity', 'concept'],
      ['Skinwalker Ranch', 'location'],
      ['AAWSAP', 'program'],
    ],
  },
];

function resolveMember(db, label, type) {
  // Exact match on label + type
  const exact = db
    .prepare(`SELECT id FROM node WHERE label = ? AND node_type = ? LIMIT 1`)
    .get(label, type);
  if (exact) return { id: exact.id, how: 'exact' };

  // Exact match on label, any type (accept with a warning)
  const anyType = db.prepare(`SELECT id, node_type FROM node WHERE label = ? LIMIT 1`).get(label);
  if (anyType) return { id: anyType.id, how: `type-drift (${anyType.node_type})` };

  // Case-insensitive contains with same type
  const looseSameType = db
    .prepare(
      `SELECT id FROM node WHERE lower(label) LIKE ? AND node_type = ? ORDER BY degree DESC LIMIT 1`,
    )
    .get(`%${label.toLowerCase()}%`, type);
  if (looseSameType) return { id: looseSameType.id, how: 'substring' };

  return null;
}

function registerHubsPerspective(db, insert) {
  // Top 20 most-connected entities anywhere in the graph.
  // Excludes incident nodes where possible (NUFORC feed dominates those
  // with the biggest-degree hubs but they're not the hubs users want to
  // start from) — we bias toward person / organization / program /
  // document / video / concept / phenomenon.
  const rows = db
    .prepare(
      `SELECT id, label, node_type, degree
         FROM node
         WHERE node_type IN ('person','organization','program','document','video','concept','phenomenon','technology')
         ORDER BY degree DESC
         LIMIT 20`,
    )
    .all();
  const ids = rows.map((r) => r.id);
  insert.run(
    'hubs',
    'The hubs',
    'The twenty most-connected people, programs, documents, and concepts in the archive — the gravity wells the rest of the graph orbits around.',
    JSON.stringify(ids),
    5,
    'auto-hubs',
  );
  console.log(`[hubs] ${ids.length} top-degree entities · ${rows.slice(0, 3).map((r) => r.label).join(' · ')}`);
}

function registerCommunityPerspectives(db, insert) {
  // Auto-generate perspectives from Louvain communities. We skip:
  //   - the regional-NUFORC noise clusters (communities where a clear
  //     majority of members are global-ufo-scrubbed incidents)
  //   - communities smaller than 15 nodes (not enough structure to be
  //     interesting)
  //   - the single biggest community (typically the noisy NUFORC hub)
  const communities = db
    .prepare(`SELECT id, label, size, top_node_ids FROM community ORDER BY size DESC`)
    .all();
  const incidentRatio = db.prepare(`
    SELECT
      SUM(CASE WHEN pipeline_source = 'global-ufo-scrubbed' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS ratio,
      COUNT(*) AS total
    FROM node WHERE community_id = ?
  `);

  let registered = 0;
  let sortOrder = 100;
  for (const c of communities) {
    if (c.size < 15) continue;
    if (c.size > 1200) continue; // skip the single giant NUFORC cluster
    const { ratio } = incidentRatio.get(c.id);
    if (ratio > 0.5) continue;

    const ids = JSON.parse(c.top_node_ids ?? '[]').slice(0, 6);
    if (ids.length < 3) continue;

    const topLabels = c.label?.split(' · ').slice(0, 3).filter(Boolean) ?? [];
    const title = topLabels.length > 0 ? topLabels[0] + ' cluster' : `Community ${c.id}`;
    insert.run(
      `community-${c.id}`,
      title,
      `Auto-derived from Louvain community detection — ${c.size.toLocaleString()} entities cluster around ${topLabels.slice(0, 3).join(', ')}.`,
      JSON.stringify(ids),
      sortOrder,
      'auto-community',
    );
    console.log(`[community-${c.id}] ${c.size} nodes — ${title}`);
    registered += 1;
    sortOrder += 1;
    if (registered >= 8) break;
  }
  console.log(`\n${registered} community perspectives registered.`);
}

function main() {
  const db = new Database(DB_PATH);

  db.exec(`DELETE FROM perspective`);

  const insert = db.prepare(`
    INSERT INTO perspective (slug, title, description, node_ids, sort_order, kind)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const p of PERSPECTIVES) {
    const ids = [];
    const misses = [];
    for (const [label, type] of p.members) {
      const hit = resolveMember(db, label, type);
      if (!hit) {
        misses.push(`${type}:${label}`);
        continue;
      }
      if (!ids.includes(hit.id)) ids.push(hit.id);
    }
    insert.run(p.slug, p.title, p.description, JSON.stringify(ids), p.sort_order, 'curated');
    console.log(`[${p.slug}] ${ids.length}/${p.members.length} resolved${misses.length ? ' — misses: ' + misses.join(', ') : ''}`);
  }

  registerHubsPerspective(db, insert);
  registerCommunityPerspectives(db, insert);

  db.close();
  console.log('\nPerspectives registered.');
}

main();
