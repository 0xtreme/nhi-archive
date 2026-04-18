import type { ArchiveEdge, ArchiveNode } from '../types';

export interface ArchiveMeta {
  built_at: string | null;
  source_generated_at: string | null;
  total_nodes: number;
  total_edges: number;
  node_type_counts: Record<string, number>;
  pipeline_source_counts: Record<string, number>;
  year_range: { min: number | null; max: number | null };
  community_count: number;
}

export interface SearchHit {
  id: string;
  label: string;
  node_type: string;
  date_start: string | null;
  confidence: string | null;
  community_id: number | null;
  degree: number;
  score: number;
}

export interface SearchResponse {
  query: string;
  strategy?: 'AND' | 'OR';
  results: SearchHit[];
}

export interface ScenePayload {
  seed_ids: string[];
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
}

export interface PathPayload {
  path: string[] | null;
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
}

export interface Perspective {
  slug: string;
  title: string;
  description: string;
  sort_order: number;
}

export interface PerspectiveScene extends ScenePayload {
  perspective: { slug: string; title: string; description: string };
}

export interface CommunityHeader {
  id: number;
  label: string;
  size: number;
}

export interface CommunityPayload {
  community: CommunityHeader;
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
}
