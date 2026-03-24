#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const PATHS = {
  registry: path.join(ROOT, 'pipeline/registry/sources.json'),
  baseline: path.join(ROOT, 'pipeline/input/baseline-entities.json'),
  rawRecords: path.join(ROOT, 'pipeline/input/raw-source-records.json'),
  rawRecordsWikipedia: path.join(ROOT, 'pipeline/input/raw-source-records-wikipedia.json'),
  rawRecordsGlobal: path.join(ROOT, 'pipeline/input/raw-source-records-global.json'),
  outReport: path.join(ROOT, 'pipeline/out/ingestion-report.json'),
  outReviewQueue: path.join(ROOT, 'pipeline/out/review-queue.json'),
  outGraph: path.join(ROOT, 'public/data/graph.seed.json'),
  outSourceList: path.join(ROOT, 'public/data/source-list.json'),
};

const sourceSchema = z.object({
  source_id: z.string(),
  name: z.string(),
  url: z.string().url(),
  source_type: z.enum([
    'structured_db',
    'news_archive',
    'government_foia',
    'wiki',
    'forum',
    'pdf_archive',
    'social_feed',
  ]),
  trust_level: z.enum(['primary', 'secondary', 'tertiary']),
  crawl_frequency: z.enum(['daily', 'weekly', 'monthly', 'on_demand']),
  extraction_method: z.enum(['structured_scrape', 'llm_extract', 'rss_feed', 'api', 'pdf_parse']),
  auto_ingest_min_score: z.number().min(0).max(1).optional(),
  active: z.boolean(),
});

const nodeTypeEnum = z.enum([
  'incident',
  'person',
  'organization',
  'location',
  'statement',
  'artifact',
  'designation',
  'event',
  'media',
]);

const confidenceEnum = z.enum(['high', 'medium', 'low', 'disputed']);

const nodeSchema = z.object({
  id: z.string(),
  node_type: nodeTypeEnum,
  label: z.string().min(1).max(120),
  summary: z.string().min(10).max(2000),
  tags: z.array(z.string()).default([]),
  date_start: z.string().optional(),
  date_end: z.string().nullable().optional(),
  confidence: confidenceEnum,
  sources: z.array(z.string().url()).min(1),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  location_name: z.string().optional(),
  classification: z.string().optional(),
  witness_count: z.number().int().optional(),
  duration_minutes: z.number().int().nullable().optional(),
  official_explanation: z.string().nullable().optional(),
  case_status: z.enum(['open', 'closed', 'unexplained']).optional(),
});

const edgeSchema = z.object({
  id: z.string(),
  from_node_id: z.string(),
  to_node_id: z.string(),
  relationship: z.string(),
  confidence: confidenceEnum.optional(),
  notes: z.string().optional(),
  sources: z.array(z.string().url()).optional(),
});

const recordSchema = z.object({
  record_id: z.string(),
  source_id: z.string(),
  url: z.string().url(),
  extraction_confidence: z.enum(['high', 'medium', 'low']),
  date_resolved: z.boolean(),
  geocoded: z.boolean(),
  node: nodeSchema,
  mentions: z.object({
    persons: z.array(z.string()).default([]),
    organizations: z.array(z.string()).default([]),
    events: z.array(z.string()).default([]),
    designations: z.array(z.string()).default([]),
    locations: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
          location_name: z.string(),
        }),
      )
      .default([]),
  }),
});

const trustScore = {
  primary: 0.3,
  secondary: 0.15,
  tertiary: 0.05,
};

const extractionScore = {
  high: 0.25,
  medium: 0.15,
  low: 0.05,
};

const COUNTRY_NAMES = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
  NZ: 'New Zealand',
  BR: 'Brazil',
  AR: 'Argentina',
  CL: 'Chile',
  PE: 'Peru',
  UY: 'Uruguay',
  MX: 'Mexico',
  RU: 'Russia',
  FI: 'Finland',
  BE: 'Belgium',
  IR: 'Iran',
  ZW: 'Zimbabwe',
  IT: 'Italy',
  DE: 'Germany',
  FR: 'France',
  ZA: 'South Africa',
};

const ENTITY_PATTERN_SETS = {
  person: [
    { id: 'person-j-allen-hynek', label: 'J. Allen Hynek', patterns: [/\bhynek\b/i] },
    { id: 'person-jacques-vallee', label: 'Jacques Vallée', patterns: [/\bjacques vall[ée]e\b/i] },
    { id: 'person-luis-elizondo', label: 'Luis Elizondo', patterns: [/\b(luis|lou|lue) elizondo\b/i] },
    { id: 'person-david-grusch', label: 'David Grusch', patterns: [/\bdavid grusch\b/i] },
    { id: 'person-david-fravor', label: 'David Fravor', patterns: [/\bdavid fravor\b/i] },
    { id: 'person-alex-dietrich', label: 'Alex Dietrich', patterns: [/\balex dietrich\b/i] },
    { id: 'person-bob-lazar', label: 'Bob Lazar', patterns: [/\bbob lazar\b/i] },
    { id: 'person-travis-walton', label: 'Travis Walton', patterns: [/\btravis walton\b/i] },
    { id: 'person-stanton-friedman', label: 'Stanton Friedman', patterns: [/\bstanton friedman\b/i] },
    { id: 'person-christopher-mellon', label: 'Christopher Mellon', patterns: [/\bchristopher mellon\b/i] },
    { id: 'person-harry-reid', label: 'Harry Reid', patterns: [/\bharry reid\b/i] },
    { id: 'person-ryan-graves', label: 'Ryan Graves', patterns: [/\bryan graves\b/i] },
    { id: 'person-karl-nell', label: 'Karl Nell', patterns: [/\bkarl nell\b/i] },
    { id: 'person-george-knapp', label: 'George Knapp', patterns: [/\bgeorge knapp\b/i] },
    { id: 'person-jeremy-corbell', label: 'Jeremy Corbell', patterns: [/\bjeremy corbell\b/i] },
    { id: 'person-john-podesta', label: 'John Podesta', patterns: [/\bjohn podesta\b/i] },
    { id: 'person-steven-greer', label: 'Steven Greer', patterns: [/\bsteven greer\b/i] },
    { id: 'person-nick-pope', label: 'Nick Pope', patterns: [/\bnick pope\b/i] },
    { id: 'person-kenneth-arnold', label: 'Kenneth Arnold', patterns: [/\bkenneth arnold\b/i] },
    { id: 'person-betty-hill', label: 'Betty Hill', patterns: [/\bbetty hill\b/i] },
    { id: 'person-barney-hill', label: 'Barney Hill', patterns: [/\bbarney hill\b/i] },
    { id: 'person-whitley-strieber', label: 'Whitley Strieber', patterns: [/\bwhitley strieber\b/i] },
    { id: 'person-john-mack', label: 'John Mack', patterns: [/\bjohn mack\b/i] },
    { id: 'person-charles-halt', label: 'Charles Halt', patterns: [/\bcharles halt\b/i] },
    { id: 'person-robert-salas', label: 'Robert Salas', patterns: [/\brobert salas\b/i] },
    { id: 'person-gary-nolan', label: 'Gary Nolan', patterns: [/\bgary nolan\b/i] },
    { id: 'person-barack-obama', label: 'Barack Obama', patterns: [/\bbarack obama\b/i] },
    { id: 'person-donald-trump', label: 'Donald Trump', patterns: [/\bdonald trump\b/i] },
    { id: 'person-bill-clinton', label: 'Bill Clinton', patterns: [/\bbill clinton\b/i] },
    { id: 'person-jimmy-carter', label: 'Jimmy Carter', patterns: [/\bjimmy carter\b/i] },
    { id: 'person-hillary-clinton', label: 'Hillary Clinton', patterns: [/\bhillary clinton\b/i] },
    { id: 'person-paul-hellyer', label: 'Paul Hellyer', patterns: [/\bpaul hellyer\b/i] },
  ],
  organization: [
    { id: 'org-project-blue-book', label: 'Project Blue Book', patterns: [/\bproject blue book\b/i] },
    { id: 'org-aatip', label: 'AATIP', patterns: [/\baatip\b/i, /advanced aerospace threat identification program/i] },
    { id: 'org-aaro', label: 'AARO', patterns: [/\baaro\b/i, /all-domain anomaly resolution office/i] },
    { id: 'org-uaptf', label: 'UAP Task Force', patterns: [/\buap task force\b/i, /\buaptf\b/i] },
    { id: 'org-mufon', label: 'MUFON', patterns: [/\bmufon\b/i] },
    { id: 'org-nuforc', label: 'NUFORC', patterns: [/\bnuforc\b/i] },
    { id: 'org-nasa', label: 'NASA', patterns: [/\bnasa\b/i] },
    { id: 'org-dod', label: 'US Department of Defense', patterns: [/\bdepartment of defense\b/i, /\bdod\b/i, /\bpentagon\b/i] },
    { id: 'org-usaf', label: 'US Air Force', patterns: [/\b(usaf|u\.s\. air force|united states air force)\b/i] },
    { id: 'org-us-navy', label: 'US Navy', patterns: [/\b(us navy|u\.s\. navy|united states navy)\b/i] },
    { id: 'org-cia', label: 'CIA', patterns: [/\bcia\b/i] },
    { id: 'org-fbi', label: 'FBI', patterns: [/\bfbi\b/i] },
    { id: 'org-dia', label: 'DIA', patterns: [/\bdia\b/i, /defense intelligence agency/i] },
    { id: 'org-norad', label: 'NORAD', patterns: [/\bnorad\b/i] },
    { id: 'org-condon-committee', label: 'Condon Committee', patterns: [/\bcondon committee\b/i] },
    { id: 'org-nicap', label: 'NICAP', patterns: [/\bnicap\b/i] },
    { id: 'org-to-the-stars-academy', label: 'To The Stars Academy', patterns: [/\bto the stars academy\b/i, /\bttsa\b/i] },
  ],
  event: [
    { id: 'event-1947-wave', label: '1947 US Sighting Wave', patterns: [/\b1947\b/i, /\bwave of 1947\b/i] },
    { id: 'event-congress-hearing-2023', label: 'US Congressional UAP Hearing 2023', patterns: [/\bcongressional uap hearing\b/i, /\bhearing\b.*\b2023\b/i] },
    { id: 'event-house-hearing-2024', label: 'US Congressional UAP Hearing 2024', patterns: [/\bhearing\b.*\b2024\b/i] },
  ],
  statement: [
    {
      id: 'statement-odni-2021',
      label: 'ODNI Preliminary Assessment (2021)',
      patterns: [/\bodni\b/i, /\bpreliminary assessment\b/i],
    },
    {
      id: 'statement-grusch-2023',
      label: 'Grusch Congressional Testimony (2023)',
      patterns: [/\bgrusch\b.*\btestimony\b/i, /\btestimony\b.*\bgrusch\b/i],
    },
  ],
  media: [
    { id: 'media-the-phenomenon-2020', label: 'The Phenomenon (2020)', patterns: [/\bthe phenomenon\b/i] },
    { id: 'media-unidentified-2019', label: 'Unidentified (2019)', patterns: [/\bunidentified\b/i] },
    { id: 'media-the-program-2015', label: 'The Program (2015)', patterns: [/\bthe program\b/i] },
  ],
};

const ENTITY_CATALOG = new Map(
  Object.entries(ENTITY_PATTERN_SETS).flatMap(([nodeType, entities]) =>
    entities.map((entity) => [
      entity.id,
      {
        node_type: nodeType,
        label: entity.label,
      },
    ]),
  ),
);

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jaccardSimilarity(left, right) {
  const leftSet = new Set(normalizeText(left).split(' ').filter(Boolean));
  const rightSet = new Set(normalizeText(right).split(' ').filter(Boolean));

  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const item of leftSet) {
    if (rightSet.has(item)) {
      intersection += 1;
    }
  }

  const union = leftSet.size + rightSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function semanticSignature(node) {
  return [node.label, node.summary, node.date_start ?? '', node.location_name ?? ''].join(' ');
}

function recordYear(value) {
  if (!value) {
    return 'unknown';
  }
  const match = String(value).match(/\b(18|19|20)\d{2}\b/);
  return match ? match[0] : 'unknown';
}

function bucketKey(node) {
  return `${node.node_type}:${recordYear(node.date_start)}`;
}

function buildEdgeId(prefix, from, to, relationship) {
  return `${prefix}-${from}-${to}-${relationship}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
}

function ensureArrayUnique(values) {
  return Array.from(new Set(values));
}

function toTitleCase(value) {
  return String(value)
    .split(/\s+/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function buildEntityLabelFromId(entityId, fallbackType) {
  const fromCatalog = ENTITY_CATALOG.get(entityId)?.label;
  if (fromCatalog) {
    return fromCatalog;
  }

  const prefix = `${fallbackType}-`;
  const raw = entityId.startsWith(prefix) ? entityId.slice(prefix.length) : entityId;
  const spaced = raw.replace(/[_-]+/g, ' ').trim();
  return toTitleCase(spaced || entityId);
}

function inferEntityMentions(node) {
  const haystack = `${node.label ?? ''} ${node.summary ?? ''} ${(node.tags ?? []).join(' ')}`.toLowerCase();
  const picked = {
    persons: [],
    organizations: [],
    events: [],
    designations: [],
    statements: [],
    media: [],
  };

  for (const entity of ENTITY_PATTERN_SETS.person) {
    if (entity.patterns.some((pattern) => pattern.test(haystack))) {
      picked.persons.push(entity.id);
    }
  }
  for (const entity of ENTITY_PATTERN_SETS.organization) {
    if (entity.patterns.some((pattern) => pattern.test(haystack))) {
      picked.organizations.push(entity.id);
    }
  }
  for (const entity of ENTITY_PATTERN_SETS.event) {
    if (entity.patterns.some((pattern) => pattern.test(haystack))) {
      picked.events.push(entity.id);
    }
  }
  for (const entity of ENTITY_PATTERN_SETS.statement) {
    if (entity.patterns.some((pattern) => pattern.test(haystack))) {
      picked.statements.push(entity.id);
    }
  }
  for (const entity of ENTITY_PATTERN_SETS.media) {
    if (entity.patterns.some((pattern) => pattern.test(haystack))) {
      picked.media.push(entity.id);
    }
  }

  return {
    persons: ensureArrayUnique(picked.persons),
    organizations: ensureArrayUnique(picked.organizations),
    events: ensureArrayUnique(picked.events),
    designations: ensureArrayUnique(picked.designations),
    statements: ensureArrayUnique(picked.statements),
    media: ensureArrayUnique(picked.media),
  };
}

function extractCountryCode(tags) {
  for (const tag of tags ?? []) {
    if (typeof tag !== 'string' || !tag.startsWith('country:')) {
      continue;
    }
    const code = tag.slice('country:'.length).trim().toUpperCase();
    if (code.length === 2) {
      return code;
    }
  }
  return null;
}

function makeCountryLocationId(countryCode) {
  return `location-country-${countryCode.toLowerCase()}`;
}

function sanitizeSummary(record) {
  const rawSummary = typeof record?.node?.summary === 'string' ? record.node.summary : '';
  const compact = rawSummary.replace(/\s+/g, ' ').trim();
  if (compact.length >= 10) {
    return compact;
  }

  const label = typeof record?.node?.label === 'string' ? record.node.label : 'Incident';
  const sourceId = typeof record?.source_id === 'string' ? record.source_id : 'unknown-source';
  return `${label} record imported from ${sourceId}.`;
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function readJsonIfExists(filePath, fallbackValue) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return fallbackValue;
    }
    throw error;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function inferPersonRelationship(nodeType) {
  if (nodeType === 'incident') {
    return 'WITNESSED';
  }
  if (nodeType === 'statement') {
    return 'MADE_STATEMENT';
  }
  return 'REFERENCES';
}

function inferOrganizationRelationship(nodeType) {
  if (nodeType === 'incident') {
    return 'INVESTIGATED';
  }
  if (nodeType === 'statement') {
    return 'REFERENCES';
  }
  return 'AFFILIATED_WITH';
}

function ensureMentionNode({
  nodesById,
  nodeBuckets,
  entityId,
  fallbackType,
  sourceUrl,
  contextNode,
}) {
  if (!entityId || nodesById.has(entityId)) {
    return false;
  }

  const catalog = ENTITY_CATALOG.get(entityId);
  const nodeType = catalog?.node_type ?? fallbackType;
  const label = catalog?.label ?? buildEntityLabelFromId(entityId, fallbackType);
  const confidence = catalog ? 'medium' : 'low';
  const mentionNode = {
    id: entityId,
    node_type: nodeType,
    label,
    summary: `${label} entity extracted from cross-source archival records.`,
    tags: ['pipeline-generated', 'entity-extracted'],
    date_start: contextNode?.date_start,
    confidence,
    sources: [sourceUrl],
  };

  nodesById.set(mentionNode.id, mentionNode);
  const key = bucketKey(mentionNode);
  const entries = nodeBuckets.get(key) ?? [];
  entries.push(mentionNode);
  nodeBuckets.set(key, entries);
  return true;
}

function computePipelineScore({ source, record, hasCorroboration, schemaPassed }) {
  let score = 0;

  score += trustScore[source.trust_level] ?? 0;
  score += extractionScore[record.extraction_confidence] ?? 0;
  if (record.geocoded) {
    score += 0.1;
  }
  if (record.date_resolved) {
    score += 0.1;
  }
  if (hasCorroboration) {
    score += 0.15;
  }
  if (schemaPassed) {
    score += 0.1;
  }

  return Number(score.toFixed(2));
}

function dedupeByEdgeId(edges) {
  const map = new Map();
  for (const edge of edges) {
    map.set(edge.id, edge);
  }
  return Array.from(map.values());
}

function sortNodes(nodes) {
  return [...nodes].sort((left, right) => left.label.localeCompare(right.label));
}

function sortEdges(edges) {
  return [...edges].sort((left, right) => left.id.localeCompare(right.id));
}

async function main() {
  const [sourceRegistryRaw, baselineRaw, rawRecordsPayload, rawRecordsWikipediaPayload, rawRecordsGlobalPayload] =
    await Promise.all([
      readJson(PATHS.registry),
      readJson(PATHS.baseline),
      readJson(PATHS.rawRecords),
      readJsonIfExists(PATHS.rawRecordsWikipedia, { records: [] }),
      readJsonIfExists(PATHS.rawRecordsGlobal, { records: [] }),
    ]);

  const sources = z.array(sourceSchema).parse(sourceRegistryRaw).filter((source) => source.active);
  const sourceLookup = new Map(sources.map((source) => [source.source_id, source]));
  const sourceStats = new Map(
    sources.map((source) => [
      source.source_id,
      {
        records_processed: 0,
        records_auto_ingested: 0,
        records_review_queue: 0,
        records_url_duplicate: 0,
        records_semantic_duplicate: 0,
      },
    ]),
  );

  const baselineNodes = z.array(nodeSchema).parse(baselineRaw.nodes);
  const baselineEdges = z.array(edgeSchema).parse(baselineRaw.edges);
  const mergedRecords = [
    ...(rawRecordsPayload.records ?? []),
    ...(rawRecordsWikipediaPayload.records ?? []),
    ...(rawRecordsGlobalPayload.records ?? []),
  ].map((record) => {
    if (!record || typeof record !== 'object' || !('node' in record) || !record.node) {
      return record;
    }

    return {
      ...record,
      node: {
        ...record.node,
        summary: sanitizeSummary(record),
      },
    };
  });

  const records = z.array(recordSchema).parse(mergedRecords);

  const nodesById = new Map(baselineNodes.map((node) => [node.id, structuredClone(node)]));
  const nodeBuckets = new Map();
  for (const node of nodesById.values()) {
    const key = bucketKey(node);
    const entries = nodeBuckets.get(key) ?? [];
    entries.push(node);
    nodeBuckets.set(key, entries);
  }
  const edges = [...baselineEdges.map((edge) => structuredClone(edge))];

  const processedUrlSet = new Set();
  const reviewQueue = [];

  const report = {
    generated_at: new Date().toISOString(),
    sources_considered: sources.length,
    records_received: records.length,
    records_processed: 0,
    records_auto_ingested: 0,
    records_review_queue: 0,
    records_skipped_url_duplicate: 0,
    records_skipped_semantic_duplicate: 0,
    corroboration_edges_created: 0,
    location_nodes_created: 0,
    country_location_nodes_created: 0,
    country_location_edges_created: 0,
    entity_nodes_created: 0,
    statement_media_edges_created: 0,
    relationship_edges_created: 0,
    source_breakdown: {},
  };

  for (const record of records) {
    const source = sourceLookup.get(record.source_id);
    if (!source) {
      reviewQueue.push({
        record_id: record.record_id,
        reason: 'Unknown source_id in registry',
        record,
      });
      report.records_review_queue += 1;
      continue;
    }

    report.records_processed += 1;
    report.source_breakdown[source.source_id] = (report.source_breakdown[source.source_id] ?? 0) + 1;
    {
      const stat = sourceStats.get(source.source_id);
      if (stat) {
        stat.records_processed += 1;
      }
    }

    if (processedUrlSet.has(record.url)) {
      report.records_skipped_url_duplicate += 1;
      const stat = sourceStats.get(source.source_id);
      if (stat) {
        stat.records_url_duplicate += 1;
      }
      continue;
    }
    processedUrlSet.add(record.url);

    const bucketEntries = nodeBuckets.get(bucketKey(record.node)) ?? [];
    const existingNodeList =
      bucketEntries.length > 0
        ? bucketEntries
        : Array.from(nodesById.values()).filter((node) => node.node_type === record.node.node_type);

    let bestMatch = null;
    let bestScore = 0;

    for (const existing of existingNodeList) {
      const score = jaccardSimilarity(semanticSignature(record.node), semanticSignature(existing));
      if (score > bestScore) {
        bestScore = score;
        bestMatch = existing;
      }
    }

    if (bestMatch && bestScore > 0.92) {
      const mergedSources = ensureArrayUnique([...(bestMatch.sources ?? []), ...record.node.sources]);
      bestMatch.sources = mergedSources;
      nodesById.set(bestMatch.id, bestMatch);
      report.records_skipped_semantic_duplicate += 1;
      const stat = sourceStats.get(source.source_id);
      if (stat) {
        stat.records_semantic_duplicate += 1;
      }
      continue;
    }

    const schemaCheck = nodeSchema.safeParse(record.node);
    if (!schemaCheck.success) {
      reviewQueue.push({
        record_id: record.record_id,
        reason: 'Schema validation failed',
        errors: schemaCheck.error.flatten(),
        record,
      });
      report.records_review_queue += 1;
      const stat = sourceStats.get(source.source_id);
      if (stat) {
        stat.records_review_queue += 1;
      }
      continue;
    }

    const hasCorroboration = bestScore >= 0.75 && bestScore <= 0.92;
    const pipelineConfidence = computePipelineScore({
      source,
      record,
      hasCorroboration,
      schemaPassed: true,
    });

    const minScore = source.auto_ingest_min_score ?? 0.7;

    if (pipelineConfidence < minScore) {
      reviewQueue.push({
        record_id: record.record_id,
        reason: 'Pipeline confidence below threshold',
        pipeline_confidence: pipelineConfidence,
        min_score_required: minScore,
        source: source.source_id,
        node: record.node,
      });
      report.records_review_queue += 1;
      const stat = sourceStats.get(source.source_id);
      if (stat) {
        stat.records_review_queue += 1;
      }
      continue;
    }

    const nodeToIngest = {
      ...record.node,
      sources: ensureArrayUnique([...record.node.sources, record.url]),
      pipeline_source: source.source_id,
      pipeline_confidence: pipelineConfidence,
      status: 'auto_ingested',
      crawled_at: new Date().toISOString(),
    };

    nodesById.set(nodeToIngest.id, nodeToIngest);
    {
      const key = bucketKey(nodeToIngest);
      const entries = nodeBuckets.get(key) ?? [];
      entries.push(nodeToIngest);
      nodeBuckets.set(key, entries);
    }
    report.records_auto_ingested += 1;
    {
      const stat = sourceStats.get(source.source_id);
      if (stat) {
        stat.records_auto_ingested += 1;
      }
    }

    const inferredMentions = inferEntityMentions(nodeToIngest);
    const personMentions = ensureArrayUnique([
      ...record.mentions.persons,
      ...inferredMentions.persons,
    ]);
    const organizationMentions = ensureArrayUnique([
      ...record.mentions.organizations,
      ...inferredMentions.organizations,
    ]);
    const eventMentions = ensureArrayUnique([
      ...record.mentions.events,
      ...inferredMentions.events,
    ]);
    const designationMentions = ensureArrayUnique([
      ...record.mentions.designations,
      ...inferredMentions.designations,
    ]);
    const statementMentions = inferredMentions.statements;
    const mediaMentions = inferredMentions.media;

    const countryCode = extractCountryCode(nodeToIngest.tags);
    if (nodeToIngest.node_type === 'incident' && countryCode) {
      const countryLocationId = makeCountryLocationId(countryCode);
      const countryLabel = COUNTRY_NAMES[countryCode] ?? countryCode;
      if (!nodesById.has(countryLocationId)) {
        const countryNode = {
          id: countryLocationId,
          node_type: 'location',
          label: countryLabel,
          summary: `Country-level grouping node for incidents tagged to ${countryLabel}.`,
          tags: ['country-aggregate', 'pipeline-generated'],
          date_start: nodeToIngest.date_start,
          confidence: 'medium',
          sources: [record.url],
          location_name: countryLabel,
          lat: nodeToIngest.lat,
          lng: nodeToIngest.lng,
        };
        nodesById.set(countryLocationId, countryNode);
        const key = bucketKey(countryNode);
        const entries = nodeBuckets.get(key) ?? [];
        entries.push(countryNode);
        nodeBuckets.set(key, entries);
        report.country_location_nodes_created += 1;
      } else {
        const countryNode = nodesById.get(countryLocationId);
        if (countryNode) {
          countryNode.sources = ensureArrayUnique([...(countryNode.sources ?? []), record.url]);
          if (typeof nodeToIngest.lat === 'number' && typeof nodeToIngest.lng === 'number') {
            const currentLat = typeof countryNode.lat === 'number' ? countryNode.lat : nodeToIngest.lat;
            const currentLng = typeof countryNode.lng === 'number' ? countryNode.lng : nodeToIngest.lng;
            countryNode.lat = Number(((currentLat + nodeToIngest.lat) / 2).toFixed(5));
            countryNode.lng = Number(((currentLng + nodeToIngest.lng) / 2).toFixed(5));
          }
          nodesById.set(countryNode.id, countryNode);
        }
      }

      edges.push({
        id: buildEdgeId('edge', nodeToIngest.id, countryLocationId, 'LOCATED_IN_COUNTRY'),
        from_node_id: nodeToIngest.id,
        to_node_id: countryLocationId,
        relationship: 'LOCATED_IN_COUNTRY',
        confidence: 'medium',
        sources: [record.url],
      });
      report.country_location_edges_created += 1;
      report.relationship_edges_created += 1;
    }

    for (const location of record.mentions.locations) {
      if (!nodesById.has(location.id)) {
        const locationNode = {
          id: location.id,
          node_type: 'location',
          label: location.label,
          summary: `Geocoded location for ${nodeToIngest.label}`,
          tags: ['geocoded', 'pipeline-generated'],
          date_start: nodeToIngest.date_start,
          confidence: 'medium',
          sources: [record.url],
          lat: location.lat,
          lng: location.lng,
          location_name: location.location_name,
        };
        nodesById.set(location.id, locationNode);
        {
          const key = bucketKey({
            node_type: 'location',
            date_start: nodeToIngest.date_start,
          });
          const entries = nodeBuckets.get(key) ?? [];
          entries.push(locationNode);
          nodeBuckets.set(key, entries);
        }
        report.location_nodes_created += 1;
      }

      edges.push({
        id: buildEdgeId('edge', nodeToIngest.id, location.id, 'LOCATED_AT'),
        from_node_id: nodeToIngest.id,
        to_node_id: location.id,
        relationship: 'LOCATED_AT',
        confidence: 'high',
        sources: [record.url],
      });
      report.relationship_edges_created += 1;
    }

    for (const personId of personMentions) {
      if (!personId || personId === nodeToIngest.id) {
        continue;
      }
      const created = ensureMentionNode({
        nodesById,
        nodeBuckets,
        entityId: personId,
        fallbackType: 'person',
        sourceUrl: record.url,
        contextNode: nodeToIngest,
      });
      if (created) {
        report.entity_nodes_created += 1;
      }

      edges.push({
        id: buildEdgeId('edge', personId, nodeToIngest.id, inferPersonRelationship(nodeToIngest.node_type)),
        from_node_id: personId,
        to_node_id: nodeToIngest.id,
        relationship: inferPersonRelationship(nodeToIngest.node_type),
        confidence: 'medium',
        sources: [record.url],
      });
      report.relationship_edges_created += 1;
    }

    for (const organizationId of organizationMentions) {
      if (!organizationId || organizationId === nodeToIngest.id) {
        continue;
      }
      const created = ensureMentionNode({
        nodesById,
        nodeBuckets,
        entityId: organizationId,
        fallbackType: 'organization',
        sourceUrl: record.url,
        contextNode: nodeToIngest,
      });
      if (created) {
        report.entity_nodes_created += 1;
      }

      edges.push({
        id: buildEdgeId(
          'edge',
          organizationId,
          nodeToIngest.id,
          inferOrganizationRelationship(nodeToIngest.node_type),
        ),
        from_node_id: organizationId,
        to_node_id: nodeToIngest.id,
        relationship: inferOrganizationRelationship(nodeToIngest.node_type),
        confidence: 'medium',
        sources: [record.url],
      });
      report.relationship_edges_created += 1;
    }

    for (const eventId of eventMentions) {
      if (!eventId || eventId === nodeToIngest.id) {
        continue;
      }
      const created = ensureMentionNode({
        nodesById,
        nodeBuckets,
        entityId: eventId,
        fallbackType: 'event',
        sourceUrl: record.url,
        contextNode: nodeToIngest,
      });
      if (created) {
        report.entity_nodes_created += 1;
      }

      edges.push({
        id: buildEdgeId('edge', nodeToIngest.id, eventId, 'PART_OF'),
        from_node_id: nodeToIngest.id,
        to_node_id: eventId,
        relationship: 'PART_OF',
        confidence: 'medium',
        sources: [record.url],
      });
      report.relationship_edges_created += 1;
    }

    for (const designationId of designationMentions) {
      if (!designationId || designationId === nodeToIngest.id) {
        continue;
      }
      const created = ensureMentionNode({
        nodesById,
        nodeBuckets,
        entityId: designationId,
        fallbackType: 'designation',
        sourceUrl: record.url,
        contextNode: nodeToIngest,
      });
      if (created) {
        report.entity_nodes_created += 1;
      }

      edges.push({
        id: buildEdgeId('edge', nodeToIngest.id, designationId, 'ASSIGNED_DESIGNATION'),
        from_node_id: nodeToIngest.id,
        to_node_id: designationId,
        relationship: 'ASSIGNED_DESIGNATION',
        confidence: 'low',
        sources: [record.url],
      });
      report.relationship_edges_created += 1;
    }

    for (const statementId of statementMentions) {
      if (!statementId || statementId === nodeToIngest.id) {
        continue;
      }
      const created = ensureMentionNode({
        nodesById,
        nodeBuckets,
        entityId: statementId,
        fallbackType: 'statement',
        sourceUrl: record.url,
        contextNode: nodeToIngest,
      });
      if (created) {
        report.entity_nodes_created += 1;
      }

      edges.push({
        id: buildEdgeId('edge', statementId, nodeToIngest.id, 'REFERENCES'),
        from_node_id: statementId,
        to_node_id: nodeToIngest.id,
        relationship: 'REFERENCES',
        confidence: 'medium',
        sources: [record.url],
      });
      report.statement_media_edges_created += 1;
      report.relationship_edges_created += 1;
    }

    for (const mediaId of mediaMentions) {
      if (!mediaId || mediaId === nodeToIngest.id) {
        continue;
      }
      const created = ensureMentionNode({
        nodesById,
        nodeBuckets,
        entityId: mediaId,
        fallbackType: 'media',
        sourceUrl: record.url,
        contextNode: nodeToIngest,
      });
      if (created) {
        report.entity_nodes_created += 1;
      }

      edges.push({
        id: buildEdgeId('edge', mediaId, nodeToIngest.id, 'REFERENCES'),
        from_node_id: mediaId,
        to_node_id: nodeToIngest.id,
        relationship: 'REFERENCES',
        confidence: 'low',
        sources: [record.url],
      });
      report.statement_media_edges_created += 1;
      report.relationship_edges_created += 1;
    }

    if (hasCorroboration && bestMatch) {
      edges.push({
        id: buildEdgeId('edge', nodeToIngest.id, bestMatch.id, 'CORROBORATES'),
        from_node_id: nodeToIngest.id,
        to_node_id: bestMatch.id,
        relationship: 'CORROBORATES',
        confidence: 'low',
        sources: [record.url],
      });
      report.corroboration_edges_created += 1;
    }
  }

  if (nodesById.has('statement-odni-2021') && nodesById.has('incident-nimitz-2004')) {
    edges.push({
      id: 'edge-statement-odni-references-nimitz',
      from_node_id: 'statement-odni-2021',
      to_node_id: 'incident-nimitz-2004',
      relationship: 'REFERENCES',
      confidence: 'high',
      sources: [
        'https://www.dni.gov/index.php/newsroom/reports-publications/reports-publications-2021/item/2214-preliminary-assessment-unidentified-aerial-phenomena',
      ],
    });
  }

  if (nodesById.has('statement-grusch-2023') && nodesById.has('incident-nimitz-2004')) {
    edges.push({
      id: 'edge-statement-grusch-references-nimitz',
      from_node_id: 'statement-grusch-2023',
      to_node_id: 'incident-nimitz-2004',
      relationship: 'REFERENCES',
      confidence: 'medium',
      sources: [
        'https://oversight.house.gov/hearing/unidentified-anomalous-phenomena-implications-on-national-security-public-safety-and-government-transparency/',
      ],
    });
  }

  if (nodesById.has('media-the-phenomenon-2020') && nodesById.has('incident-phoenix-lights-1997')) {
    edges.push({
      id: 'edge-media-references-phoenix',
      from_node_id: 'media-the-phenomenon-2020',
      to_node_id: 'incident-phoenix-lights-1997',
      relationship: 'REFERENCES',
      confidence: 'medium',
      sources: ['https://www.imdb.com/title/tt13095604/'],
    });
  }

  if (nodesById.has('media-the-phenomenon-2020') && nodesById.has('incident-rendlesham-1980')) {
    edges.push({
      id: 'edge-media-references-rendlesham',
      from_node_id: 'media-the-phenomenon-2020',
      to_node_id: 'incident-rendlesham-1980',
      relationship: 'REFERENCES',
      confidence: 'medium',
      sources: ['https://www.imdb.com/title/tt13095604/'],
    });
  }

  const incidents = Array.from(nodesById.values())
    .filter((node) => node.node_type === 'incident' && node.date_start)
    .sort((left, right) => (left.date_start ?? '').localeCompare(right.date_start ?? ''));

  for (let index = 0; index < incidents.length - 1; index += 1) {
    const current = incidents[index];
    const next = incidents[index + 1];

    edges.push({
      id: buildEdgeId('edge', current.id, next.id, 'PRECEDED'),
      from_node_id: current.id,
      to_node_id: next.id,
      relationship: 'PRECEDED',
      confidence: 'medium',
      sources: current.sources,
    });
  }

  const finalNodes = sortNodes(Array.from(nodesById.values()));
  const finalEdges = sortEdges(dedupeByEdgeId(edges)).filter(
    (edge) => nodesById.has(edge.from_node_id) && nodesById.has(edge.to_node_id),
  );

  const graphPayload = {
    generated_at: new Date().toISOString(),
    metadata: {
      pipeline: 'automated-web-intelligence-mvp',
      records_processed: report.records_processed,
      auto_ingested: report.records_auto_ingested,
      review_queue: report.records_review_queue,
      total_nodes: finalNodes.length,
      total_edges: finalEdges.length,
    },
    nodes: finalNodes,
    edges: finalEdges,
  };

  const sourceListPayload = {
    generated_at: new Date().toISOString(),
    total_sources: sources.length,
    notes: 'Generated from pipeline registry and ingestion run statistics.',
    sources: sources
      .map((source) => {
        const stats = sourceStats.get(source.source_id) ?? {
          records_processed: 0,
          records_auto_ingested: 0,
          records_review_queue: 0,
          records_url_duplicate: 0,
          records_semantic_duplicate: 0,
        };
        return {
          ...source,
          ...stats,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name)),
  };

  await Promise.all([
    writeJson(PATHS.outGraph, graphPayload),
    writeJson(PATHS.outSourceList, sourceListPayload),
    writeJson(PATHS.outReport, report),
    writeJson(PATHS.outReviewQueue, {
      generated_at: new Date().toISOString(),
      review_queue: reviewQueue,
    }),
  ]);

  console.log('Pipeline complete');
  console.log(`- Records processed: ${report.records_processed}`);
  console.log(`- Auto-ingested: ${report.records_auto_ingested}`);
  console.log(`- Review queue: ${report.records_review_queue}`);
  console.log(`- Output nodes: ${finalNodes.length}`);
  console.log(`- Output edges: ${finalEdges.length}`);
  console.log(`- Graph output: ${path.relative(ROOT, PATHS.outGraph)}`);
}

main().catch((error) => {
  console.error('Pipeline failed:', error);
  process.exitCode = 1;
});
