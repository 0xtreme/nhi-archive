#!/usr/bin/env node
/**
 * Build the SQLite database that backs the Scene Explorer API.
 *
 * Reads:  public/data/graph.seed.json (canonical graph)
 * Writes: data/graph.db (SQLite file, not served via GitHub Pages)
 *
 * The DB is the source of truth for the Fastify API. Community detection
 * and perspective registration are separate passes that UPDATE this DB
 * in place; see scripts/pipeline/detect-communities.mjs and
 * scripts/pipeline/register-perspectives.mjs.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const GRAPH = path.join(ROOT, 'public/data/graph.seed.json');
const DB_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DB_DIR, 'graph.db');

const SCHEMA = `
CREATE TABLE node (
  id                  TEXT PRIMARY KEY,
  node_type           TEXT NOT NULL,
  label               TEXT NOT NULL,
  summary             TEXT,
  confidence          TEXT,
  pipeline_source     TEXT,
  pipeline_confidence REAL,
  date_start          TEXT,
  date_end            TEXT,
  lat                 REAL,
  lng                 REAL,
  location_name       TEXT,
  classification      TEXT,
  case_status         TEXT,
  wikidata_id         TEXT,
  wikipedia_url       TEXT,
  profession          TEXT,
  status              TEXT,
  crawled_at          TEXT,
  community_id        INTEGER,
  degree              INTEGER NOT NULL DEFAULT 0,
  raw_json            TEXT NOT NULL
);
CREATE INDEX idx_node_type        ON node(node_type);
CREATE INDEX idx_node_pipeline    ON node(pipeline_source);
CREATE INDEX idx_node_community   ON node(community_id);
CREATE INDEX idx_node_degree      ON node(degree DESC);
CREATE INDEX idx_node_date        ON node(date_start);
CREATE INDEX idx_node_confidence  ON node(confidence);
CREATE INDEX idx_node_wikidata    ON node(wikidata_id);

CREATE TABLE edge (
  id             TEXT PRIMARY KEY,
  from_node_id   TEXT NOT NULL,
  to_node_id     TEXT NOT NULL,
  relationship   TEXT NOT NULL,
  confidence     TEXT,
  raw_json       TEXT NOT NULL
);
CREATE INDEX idx_edge_from ON edge(from_node_id);
CREATE INDEX idx_edge_to   ON edge(to_node_id);
CREATE INDEX idx_edge_rel  ON edge(relationship);

CREATE TABLE source_rich (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id           TEXT NOT NULL,
  source_type       TEXT,
  video_id          TEXT,
  timestamp_start   REAL,
  timestamp_end     REAL,
  quote             TEXT,
  url               TEXT
);
CREATE INDEX idx_source_rich_node  ON source_rich(node_id);
CREATE INDEX idx_source_rich_video ON source_rich(video_id);

CREATE TABLE alias (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id  TEXT NOT NULL,
  alias    TEXT NOT NULL
);
CREATE INDEX idx_alias_node ON alias(node_id);
CREATE INDEX idx_alias_text ON alias(alias COLLATE NOCASE);

CREATE TABLE tag (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id  TEXT NOT NULL,
  tag      TEXT NOT NULL
);
CREATE INDEX idx_tag_node ON tag(node_id);
CREATE INDEX idx_tag_text ON tag(tag COLLATE NOCASE);

CREATE TABLE community (
  id            INTEGER PRIMARY KEY,
  label         TEXT,
  size          INTEGER,
  top_node_ids  TEXT
);

CREATE TABLE perspective (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  node_ids     TEXT NOT NULL,
  sort_order   INTEGER,
  kind         TEXT
);

CREATE VIRTUAL TABLE node_fts USING fts5(
  label,
  aliases,
  tags,
  summary,
  profession,
  quotes,
  location_name,
  content='',
  tokenize='porter unicode61 remove_diacritics 2'
);

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

async function main() {
  console.log(`Reading ${GRAPH}`);
  const graph = JSON.parse(await fs.readFile(GRAPH, 'utf-8'));
  console.log(`  ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    await fs.unlink(DB_PATH);
  } catch {
    // ok if it doesn't exist
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = OFF');
  db.exec(SCHEMA);

  // Degree map
  const degree = new Map();
  for (const e of graph.edges) {
    degree.set(e.from_node_id, (degree.get(e.from_node_id) ?? 0) + 1);
    degree.set(e.to_node_id, (degree.get(e.to_node_id) ?? 0) + 1);
  }

  const insertNode = db.prepare(`
    INSERT INTO node (
      id, node_type, label, summary, confidence, pipeline_source,
      pipeline_confidence, date_start, date_end, lat, lng, location_name,
      classification, case_status, wikidata_id, wikipedia_url, profession,
      status, crawled_at, degree, raw_json
    ) VALUES (
      @id, @node_type, @label, @summary, @confidence, @pipeline_source,
      @pipeline_confidence, @date_start, @date_end, @lat, @lng, @location_name,
      @classification, @case_status, @wikidata_id, @wikipedia_url, @profession,
      @status, @crawled_at, @degree, @raw_json
    )
  `);
  const insertEdge = db.prepare(`
    INSERT INTO edge (id, from_node_id, to_node_id, relationship, confidence, raw_json)
    VALUES (@id, @from_node_id, @to_node_id, @relationship, @confidence, @raw_json)
  `);
  const insertSourceRich = db.prepare(`
    INSERT INTO source_rich (node_id, source_type, video_id, timestamp_start, timestamp_end, quote, url)
    VALUES (@node_id, @source_type, @video_id, @timestamp_start, @timestamp_end, @quote, @url)
  `);
  const insertAlias = db.prepare(`INSERT INTO alias (node_id, alias) VALUES (?, ?)`);
  const insertTag = db.prepare(`INSERT INTO tag (node_id, tag) VALUES (?, ?)`);
  const insertFts = db.prepare(`
    INSERT INTO node_fts (rowid, label, aliases, tags, summary, profession, quotes, location_name)
    VALUES ((SELECT rowid FROM node WHERE id = @id), @label, @aliases, @tags, @summary, @profession, @quotes, @location_name)
  `);

  const ingest = db.transaction(() => {
    for (const n of graph.nodes) {
      const sourcesRich = Array.isArray(n.sources_rich) ? n.sources_rich : [];
      const aliases = Array.isArray(n.aliases) ? n.aliases : [];
      const tags = Array.isArray(n.tags) ? n.tags : [];
      const quotes = sourcesRich.map((r) => r.quote).filter(Boolean).join(' ');

      insertNode.run({
        id: n.id,
        node_type: n.node_type ?? null,
        label: n.label ?? '',
        summary: n.summary ?? null,
        confidence: n.confidence ?? null,
        pipeline_source: n.pipeline_source ?? null,
        pipeline_confidence: n.pipeline_confidence ?? null,
        date_start: n.date_start ?? null,
        date_end: n.date_end ?? null,
        lat: n.lat ?? null,
        lng: n.lng ?? null,
        location_name: n.location_name ?? null,
        classification: n.classification ?? null,
        case_status: n.case_status ?? null,
        wikidata_id: n.wikidata_id ?? null,
        wikipedia_url: n.wikipedia_url ?? null,
        profession: n.profession ?? null,
        status: n.status ?? null,
        crawled_at: n.crawled_at ?? null,
        degree: degree.get(n.id) ?? 0,
        raw_json: JSON.stringify(n),
      });

      for (const r of sourcesRich) {
        insertSourceRich.run({
          node_id: n.id,
          source_type: r.source_type ?? null,
          video_id: r.video_id ?? null,
          timestamp_start: typeof r.timestamp_start === 'number' ? r.timestamp_start : null,
          timestamp_end: typeof r.timestamp_end === 'number' ? r.timestamp_end : null,
          quote: r.quote ?? null,
          url: r.url ?? null,
        });
      }

      for (const a of aliases) {
        if (typeof a === 'string' && a.trim()) insertAlias.run(n.id, a.trim());
      }
      for (const t of tags) {
        if (typeof t === 'string' && t.trim()) insertTag.run(n.id, t.trim());
      }

      insertFts.run({
        id: n.id,
        label: n.label ?? '',
        aliases: aliases.join(' '),
        tags: tags.join(' '),
        summary: n.summary ?? '',
        profession: n.profession ?? '',
        quotes,
        location_name: n.location_name ?? '',
      });
    }

    for (const e of graph.edges) {
      insertEdge.run({
        id: e.id,
        from_node_id: e.from_node_id,
        to_node_id: e.to_node_id,
        relationship: e.relationship ?? 'RELATED_TO',
        confidence: e.confidence ?? null,
        raw_json: JSON.stringify(e),
      });
    }
  });
  ingest();

  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?)`).run('built_at', new Date().toISOString());
  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?)`).run(
    'source_generated_at',
    graph.generated_at ?? '',
  );
  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?)`).run(
    'node_count',
    String(graph.nodes.length),
  );
  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?)`).run(
    'edge_count',
    String(graph.edges.length),
  );

  db.exec(`ANALYZE;`);
  db.close();

  const stat = await fs.stat(DB_PATH);
  console.log(`\nWrote ${DB_PATH} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
