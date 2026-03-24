import type { ArchiveEdge, ArchiveNode, Confidence, FilterState, NodeType } from '../types';

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

export const NODE_COLORS: Record<NodeType, string> = {
  incident: '#FF6A3D',
  person: '#00C8FF',
  organization: '#4E63D8',
  location: '#00E5A0',
  statement: '#FFB800',
  artifact: '#C0C8D0',
  designation: '#B782FF',
  event: '#FFE45C',
  media: '#00D4C4',
};

export const RELATION_COLORS: Record<string, string> = {
  WITNESSED: '#00C8FF',
  INVESTIGATED: '#FFB800',
  MADE_STATEMENT: '#FFE45C',
  LOCATED_AT: '#00E5A0',
  PART_OF: '#7B2FBE',
  ASSIGNED_DESIGNATION: '#B782FF',
  RECOVERED: '#C0C8D0',
  AFFILIATED_WITH: '#4E63D8',
  REFERENCES: '#00D4C4',
  CORROBORATES: '#00E5A0',
  CONTRADICTS: '#FF4444',
  PRECEDED: '#9EC5FF',
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
      const hasAllTags = filters.tags.every((tag) => node.tags.includes(tag));
      if (!hasAllTags) {
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
