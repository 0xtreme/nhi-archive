export type NodeType =
  | 'incident'
  | 'person'
  | 'organization'
  | 'location'
  | 'statement'
  | 'artifact'
  | 'designation'
  | 'event'
  | 'media';

export type Confidence = 'high' | 'medium' | 'low' | 'disputed';

export interface ArchiveNode {
  id: string;
  node_type: NodeType;
  label: string;
  summary: string;
  tags: string[];
  date_start?: string;
  date_end?: string | null;
  confidence: Confidence;
  sources: string[];
  created_at?: string;
  updated_at?: string;
  lat?: number;
  lng?: number;
  location_name?: string;
  craft_description?: string;
  witness_count?: number;
  duration_minutes?: number | null;
  classification?: string;
  official_explanation?: string | null;
  case_status?: 'open' | 'closed' | 'unexplained';
  [key: string]: unknown;
}

export interface ArchiveEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relationship: string;
  notes?: string;
  confidence?: Confidence;
  sources?: string[];
}

export interface ArchiveGraph {
  generated_at: string;
  metadata?: Record<string, unknown>;
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
}

export type ViewMode = 'graph' | 'map' | 'timeline';

export interface FilterState {
  nodeTypes: NodeType[];
  confidences: Confidence[];
  dateFrom: number;
  dateTo: number;
  classifications: string[];
  tags: string[];
}
