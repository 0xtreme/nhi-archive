import type {
  ArchiveEdge,
  ArchiveGraph,
  ArchiveNode,
  Confidence,
  FilterState,
  NodeType,
} from '../types';

export const NODE_TYPE_ORDER: NodeType[] = [
  'incident',
  'person',
  'organization',
  'location',
  'statement',
  'artifact',
  'designation',
  'event',
  'media',
];

export const CONFIDENCE_ORDER: Confidence[] = ['high', 'medium', 'low', 'disputed'];
export const DEFAULT_GRAPH_NODE_CAP = 260;

export const NODE_COLORS: Record<NodeType, string> = {
  incident: '#f4f4f4',
  person: '#d8d8d8',
  organization: '#bfbfbf',
  location: '#a6a6a6',
  statement: '#8f8f8f',
  artifact: '#797979',
  designation: '#646464',
  event: '#525252',
  media: '#3f3f3f',
};

export const RELATION_COLORS: Record<string, string> = {
  WITNESSED: '#d7d7d7',
  INVESTIGATED: '#bdbdbd',
  MADE_STATEMENT: '#ababab',
  LOCATED_AT: '#999',
  PART_OF: '#878787',
  ASSIGNED_DESIGNATION: '#777',
  RECOVERED: '#676767',
  AFFILIATED_WITH: '#585858',
  REFERENCES: '#4b4b4b',
  CORROBORATES: '#9f9f9f',
  CONTRADICTS: '#6a6a6a',
  PRECEDED: '#888',
};

export function getYear(dateValue?: string | null): number | null {
  if (!dateValue) {
    return null;
  }

  const match = dateValue.match(/(\d{4})/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

export function summarizeLoadedNodes(total: number, loaded: number): string {
  return `${loaded.toLocaleString()} of ${total.toLocaleString()} nodes loaded`;
}

function decodeHtmlEntity(match: string, entity: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };

  if (entity.startsWith('#x') || entity.startsWith('#X')) {
    const value = Number.parseInt(entity.slice(2), 16);
    return Number.isFinite(value) && value >= 0 && value <= 0x10ffff
      ? String.fromCodePoint(value)
      : match;
  }

  if (entity.startsWith('#')) {
    const value = Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(value) && value >= 0 && value <= 0x10ffff
      ? String.fromCodePoint(value)
      : match;
  }

  return namedEntities[entity.toLowerCase()] ?? match;
}

export function decodeHtmlEntities(input: string): string {
  let output = input;

  for (let index = 0; index < 3; index += 1) {
    const next = output.replace(/&([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);?/g, decodeHtmlEntity);
    if (next === output) {
      break;
    }
    output = next;
  }

  return output;
}

function normalizeText(input?: string): string | undefined {
  if (typeof input !== 'string') {
    return input;
  }

  return decodeHtmlEntities(input).replace(/\s+/g, ' ').trim();
}

function isNoisyTag(tag: string): boolean {
  const normalized = tag.toLowerCase();
  const patterns = [
    /^\d{3,4} births$/,
    /^\d{3,4} deaths$/,
    /^\d{3,4} in .+/,
    /\bliving people\b/,
    /\bshort stories\b/,
    /\bfilms?\b/,
    /\bworks\b/,
    /\bhoax(es)?\b/,
    /\bfiction\b/,
    /\bnovels?\b/,
    /\bbooks?\b/,
    /\bcharacters?\b/,
    /\btelevision\b/,
    /\bepisodes?\b/,
    /\bamerican writers\b/,
    /\bscience fiction\b/,
    /\bwikipedia\b/,
  ];
  return patterns.some((pattern) => pattern.test(normalized));
}

export function normalizeGraphData(graph: ArchiveGraph): ArchiveGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      label: normalizeText(node.label) ?? node.label,
      summary: normalizeText(node.summary) ?? node.summary,
      location_name: normalizeText(node.location_name),
      tags: Array.from(
        new Set(
          node.tags
            .map((tag) => normalizeText(tag) ?? tag)
            .filter((tag) => !isNoisyTag(tag)),
        ),
      ),
    })),
  };
}

export function buildDefaultFilters(nodes: ArchiveNode[]): FilterState {
  const years = nodes
    .map((node) => getYear(node.date_start))
    .filter((year): year is number => year !== null);

  const minYear = years.length ? Math.min(...years) : 1900;
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();

  return {
    nodeTypes: [...NODE_TYPE_ORDER],
    confidences: [...CONFIDENCE_ORDER],
    dateFrom: minYear,
    dateTo: maxYear,
    classifications: [],
    tags: [],
    graphNodeCap: DEFAULT_GRAPH_NODE_CAP,
  };
}

export function filterGraph(
  nodes: ArchiveNode[],
  edges: ArchiveEdge[],
  filters: FilterState,
  query: string,
): { nodes: ArchiveNode[]; edges: ArchiveEdge[] } {
  const loweredQuery = query.trim().toLowerCase();
  const queryTokens = loweredQuery.split(/\s+/).filter(Boolean);

  const filteredNodes = nodes.filter((node) => {
    if (!filters.nodeTypes.includes(node.node_type)) {
      return false;
    }

    if (!filters.confidences.includes(node.confidence)) {
      return false;
    }

    const year = getYear(node.date_start);
    if (year !== null && (year < filters.dateFrom || year > filters.dateTo)) {
      return false;
    }

    if (
      filters.classifications.length > 0 &&
      node.classification &&
      !filters.classifications.includes(node.classification)
    ) {
      return false;
    }

    if (filters.tags.length > 0) {
      const hasAnyTag = filters.tags.some((tag) => node.tags.includes(tag));
      if (!hasAnyTag) {
        return false;
      }
    }

    if (queryTokens.length === 0) {
      return true;
    }

    const haystack = [
      node.label,
      node.summary,
      node.location_name,
      node.classification,
      ...node.tags,
      ...(node.sources ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return queryTokens.every((token) => haystack.includes(token));
  });

  const allowedNodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredEdges = edges.filter(
    (edge) => allowedNodeIds.has(edge.from_node_id) && allowedNodeIds.has(edge.to_node_id),
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

export function buildRelationIndex(edges: ArchiveEdge[]): Map<string, ArchiveEdge[]> {
  const index = new Map<string, ArchiveEdge[]>();

  for (const edge of edges) {
    if (!index.has(edge.from_node_id)) {
      index.set(edge.from_node_id, []);
    }
    if (!index.has(edge.to_node_id)) {
      index.set(edge.to_node_id, []);
    }

    index.get(edge.from_node_id)?.push(edge);
    index.get(edge.to_node_id)?.push(edge);
  }

  return index;
}

export function normalizeNodeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}
