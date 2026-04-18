import type { NodeProps } from '@xyflow/react';
import type { NetworkTier } from './types';

const TIER_COLOR: Record<NetworkTier, string> = {
  institution: 'var(--nhi-fog)',
  official: 'var(--nhi-amber)',
  witness: 'var(--nhi-sky)',
  advocate: 'var(--nhi-lime)',
};

interface TierHeaderData extends Record<string, unknown> {
  tier: NetworkTier;
  levelLabel: string;
  tierLabel: string;
}

/**
 * Non-interactive row-header node — sits at the far left of each tier
 * row so the 4-level hierarchy reads as an org chart rather than a
 * free-form blob. Pans and zooms with the rest of the canvas.
 */
export function TierHeaderNode({ data }: NodeProps) {
  const d = data as unknown as TierHeaderData;
  const color = TIER_COLOR[d.tier];
  return (
    <div
      style={{
        width: 180,
        padding: '10px 12px',
        pointerEvents: 'none',
        borderLeft: `3px solid ${color}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: 'transparent',
      }}
    >
      <div
        className="nhi-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--nhi-fog)',
        }}
      >
        {d.levelLabel}
      </div>
      <div
        className="nhi-display"
        style={{
          fontSize: 16,
          letterSpacing: '0.04em',
          color,
          fontWeight: 600,
        }}
      >
        {d.tierLabel}
      </div>
    </div>
  );
}
