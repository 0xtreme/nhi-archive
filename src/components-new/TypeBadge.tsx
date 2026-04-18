import { NODE_TYPE_META } from '../lib/taxonomy';
import type { NodeType } from '../types';
import { NodeGlyph } from './NodeGlyph';

interface TypeBadgeProps {
  type: NodeType;
  variant?: 'icon' | 'dot' | 'letter';
  size?: number;
}

export function TypeBadge({ type, variant = 'icon', size = 11 }: TypeBadgeProps) {
  const meta = NODE_TYPE_META[type];
  if (!meta) return null;
  return (
    <span className="nhi-chip" style={{ color: 'var(--nhi-fog-2)', fontSize: size - 1 }}>
      <span style={{ display: 'inline-flex', color: 'var(--nhi-sky)' }}>
        <NodeGlyph type={type} variant={variant} size={12} />
      </span>
      {meta.label}
    </span>
  );
}
