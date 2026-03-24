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
  outReport: path.join(ROOT, 'pipeline/out/ingestion-report.json'),
  outReviewQueue: path.join(ROOT, 'pipeline/out/review-queue.json'),
  outGraph: path.join(ROOT, 'public/data/graph.seed.json'),
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

function buildEdgeId(prefix, from, to, relationship) {
  return `${prefix}-${from}-${to}-${relationship}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
}

function ensureArrayUnique(values) {
  return Array.from(new Set(values));
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
  const [sourceRegistryRaw, baselineRaw, rawRecordsPayload, rawRecordsWikipediaPayload] = await Promise.all([
    readJson(PATHS.registry),
    readJson(PATHS.baseline),
    readJson(PATHS.rawRecords),
    readJsonIfExists(PATHS.rawRecordsWikipedia, { records: [] }),
  ]);

  const sources = z.array(sourceSchema).parse(sourceRegistryRaw).filter((source) => source.active);
  const sourceLookup = new Map(sources.map((source) => [source.source_id, source]));

  const baselineNodes = z.array(nodeSchema).parse(baselineRaw.nodes);
  const baselineEdges = z.array(edgeSchema).parse(baselineRaw.edges);
  const records = z.array(recordSchema).parse([
    ...(rawRecordsPayload.records ?? []),
    ...(rawRecordsWikipediaPayload.records ?? []),
  ]);

  const nodesById = new Map(baselineNodes.map((node) => [node.id, structuredClone(node)]));
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

    if (processedUrlSet.has(record.url)) {
      report.records_skipped_url_duplicate += 1;
      continue;
    }
    processedUrlSet.add(record.url);

    const existingNodeList = Array.from(nodesById.values()).filter(
      (node) => node.node_type === record.node.node_type,
    );

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
    report.records_auto_ingested += 1;

    for (const location of record.mentions.locations) {
      if (!nodesById.has(location.id)) {
        nodesById.set(location.id, {
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
        });
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

    for (const personId of record.mentions.persons) {
      if (!nodesById.has(personId)) {
        continue;
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

    for (const organizationId of record.mentions.organizations) {
      if (!nodesById.has(organizationId)) {
        continue;
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

    for (const eventId of record.mentions.events) {
      if (!nodesById.has(eventId)) {
        continue;
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

    for (const designationId of record.mentions.designations) {
      if (!nodesById.has(designationId)) {
        continue;
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

  await Promise.all([
    writeJson(PATHS.outGraph, graphPayload),
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
