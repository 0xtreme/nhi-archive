import type { Confidence, NodeType } from '../types';

export interface NodeTypeMeta {
  label: string;
  hue: number;
}

export const NODE_TYPE_META: Record<NodeType, NodeTypeMeta> = {
  person:       { label: 'PERSON',      hue: 210 },
  incident:     { label: 'INCIDENT',    hue: 350 },
  claim:        { label: 'CLAIM',       hue: 45 },
  video:        { label: 'VIDEO',       hue: 290 },
  program:      { label: 'PROGRAM',     hue: 260 },
  document:     { label: 'DOCUMENT',    hue: 30 },
  organization: { label: 'ORG',         hue: 180 },
  location:     { label: 'LOCATION',    hue: 140 },
  event:        { label: 'EVENT',       hue: 20 },
  statement:    { label: 'STATEMENT',   hue: 320 },
  artifact:     { label: 'ARTIFACT',    hue: 0 },
  designation:  { label: 'DESIGNATION', hue: 60 },
  media:        { label: 'MEDIA',       hue: 300 },
  concept:      { label: 'CONCEPT',     hue: 200 },
  phenomenon:   { label: 'PHENOMENON',  hue: 270 },
  technology:   { label: 'TECHNOLOGY',  hue: 160 },
  role:         { label: 'ROLE',        hue: 100 },
  testimony:    { label: 'TESTIMONY',   hue: 330 },
  citation:     { label: 'CITATION',    hue: 80 },
};

export interface ConfidenceMeta {
  label: string;
  color: string;
  bars: 1 | 2 | 3 | 4;
  inkClass: 'nhi-ink-confirmed' | 'nhi-ink-probable' | 'nhi-ink-unverified' | 'nhi-ink-disputed';
}

export const CONFIDENCE_META: Record<Confidence, ConfidenceMeta> = {
  high:     { label: 'CONFIRMED',  color: '#7dd3fc', bars: 4, inkClass: 'nhi-ink-confirmed'  },
  medium:   { label: 'PROBABLE',   color: '#c4b5fd', bars: 3, inkClass: 'nhi-ink-probable'   },
  low:      { label: 'UNVERIFIED', color: '#fda4af', bars: 2, inkClass: 'nhi-ink-unverified' },
  disputed: { label: 'DISPUTED',   color: '#fbbf24', bars: 1, inkClass: 'nhi-ink-disputed'   },
};
