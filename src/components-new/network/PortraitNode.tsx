import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetworkNode, NetworkTier } from './types';

const TIER_BORDER: Record<NetworkTier, string> = {
  witness: 'var(--nhi-sky)',
  official: 'var(--nhi-amber)',
  advocate: 'var(--nhi-lime)',
  institution: 'var(--nhi-fog)',
};

const TIER_MONOGRAM_BG: Record<NetworkTier, string> = {
  witness: 'rgba(125,211,252,0.22)',
  official: 'rgba(251,191,36,0.22)',
  advocate: 'rgba(134,239,172,0.22)',
  institution: 'rgba(154,164,199,0.22)',
};

function initials(name: string): string {
  const parts = name
    .replace(/\b(Sen\.|Rep\.|Dr\.|Cmdr\.|Lt\.|R\. Adm\.|Adm\.|Capt\.|Fmr\.)\b/gi, ' ')
    .trim()
    .split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Portrait card — React Flow node component. Phase 1 uses a monogram
 * fallback instead of real photos (see NHI-ARCH-RELMAP-001 §13 on
 * licensing). When `portrait` is present the card prefers the image
 * and falls back to the monogram on load error.
 */
export function PortraitNode({ data, selected }: NodeProps) {
  const n = data as unknown as NetworkNode;
  const border = TIER_BORDER[n.tier];
  const monoBg = TIER_MONOGRAM_BG[n.tier];
  const thicker = n.tier === 'institution';
  return (
    <div
      role="button"
      aria-label={`${n.name}, ${n.role}`}
      title={n.hoverSummary ?? n.name}
      style={{
        width: 160,
        padding: 12,
        background: 'var(--nhi-panel-bg-deep)',
        border: `${selected ? 2 : thicker ? 1.5 : 1}px solid ${selected ? 'var(--nhi-sky)' : border}`,
        borderRadius: 12,
        textAlign: 'center',
        color: 'var(--nhi-bone)',
        fontFamily: 'var(--nhi-f-body)',
        transition: 'transform 150ms var(--nhi-ease), box-shadow 150ms var(--nhi-ease)',
        boxShadow: selected ? '0 4px 14px rgba(125,211,252,0.25)' : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          margin: '0 auto 10px',
          background: monoBg,
          border: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--nhi-f-display)',
          fontSize: 22,
          letterSpacing: '0.04em',
          color: border,
          overflow: 'hidden',
        }}
      >
        {n.portrait ? (
          <img
            src={n.portrait}
            alt={n.name}
            width={64}
            height={64}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          initials(n.name)
        )}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.25,
          color: 'var(--nhi-bone)',
        }}
      >
        {n.name}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--nhi-fog-2)',
          marginTop: 2,
          lineHeight: 1.25,
        }}
      >
        {n.role}
      </div>
    </div>
  );
}
