export type NetworkTier = 'witness' | 'official' | 'advocate' | 'institution';

export type NetworkEdgeType =
  | 'testified_together'
  | 'same_program'
  | 'advised_advocated'
  | 'contradicted'
  | 'succeeded_in_role';

export interface NetworkNode {
  id: string;
  name: string;
  role: string;
  tier: NetworkTier;
  position: { x: number; y: number };
  archiveNodeId?: string;
  portrait?: string;
  hoverSummary?: string;
  tags?: string[];
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: NetworkEdgeType;
  label?: string;
  year?: number;
}

export interface NetworkNodesPayload {
  generated_at?: string;
  notes?: string;
  nodes: NetworkNode[];
}

export interface NetworkEdgesPayload {
  generated_at?: string;
  notes?: string;
  edges: NetworkEdge[];
}
