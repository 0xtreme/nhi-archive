import { NODE_TYPE_META } from '../lib/taxonomy';
import type { NodeType } from '../types';

interface NodeGlyphProps {
  type: NodeType;
  size?: number;
  stroke?: number;
  variant?: 'icon' | 'dot' | 'letter';
}

/**
 * 16 distinct geometric marks, one per node type. Adopted from the mockup
 * (mockup/atoms.jsx). Uses currentColor so the parent sets the hue.
 */
export function NodeGlyph({ type, size = 14, stroke = 1.5, variant = 'icon' }: NodeGlyphProps) {
  const s = size;
  const c = s / 2;
  const pass = {
    stroke: 'currentColor',
    strokeWidth: stroke,
    fill: 'none',
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };

  if (variant === 'dot') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={c} cy={c} r={s * 0.38} fill="currentColor" />
      </svg>
    );
  }

  if (variant === 'letter') {
    const ch = (NODE_TYPE_META[type]?.label || '?')[0];
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={0.5} y={0.5} width={s - 1} height={s - 1} rx={1} {...pass} />
        <text
          x={c}
          y={c + 0.5}
          fontFamily="JetBrains Mono"
          fontSize={s * 0.62}
          fontWeight={600}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
        >
          {ch}
        </text>
      </svg>
    );
  }

  const paths: Record<NodeType, React.ReactNode> = {
    person: <circle cx={c} cy={c} r={s * 0.36} {...pass} />,
    incident: (
      <polygon points={`${c},${s * 0.14} ${s * 0.88},${s * 0.84} ${s * 0.12},${s * 0.84}`} {...pass} />
    ),
    claim: (
      <polygon
        points={`${c},${s * 0.12} ${s * 0.88},${c} ${c},${s * 0.88} ${s * 0.12},${c}`}
        {...pass}
      />
    ),
    video: <rect x={s * 0.18} y={s * 0.18} width={s * 0.64} height={s * 0.64} {...pass} />,
    program: (
      <polygon
        points={`${c},${s * 0.12} ${s * 0.88},${s * 0.32} ${s * 0.88},${s * 0.68} ${c},${s * 0.88} ${s * 0.12},${s * 0.68} ${s * 0.12},${s * 0.32}`}
        {...pass}
      />
    ),
    document: (
      <g>
        <rect x={s * 0.22} y={s * 0.14} width={s * 0.56} height={s * 0.72} {...pass} />
        <line x1={s * 0.34} y1={s * 0.38} x2={s * 0.66} y2={s * 0.38} {...pass} />
        <line x1={s * 0.34} y1={s * 0.52} x2={s * 0.66} y2={s * 0.52} {...pass} />
      </g>
    ),
    organization: (
      <g>
        <circle cx={c} cy={c} r={s * 0.38} {...pass} />
        <circle cx={c} cy={c} r={s * 0.18} {...pass} />
      </g>
    ),
    location: (
      <g>
        <path
          d={`M${c} ${s * 0.12} C ${s * 0.24} ${s * 0.12}, ${s * 0.24} ${s * 0.54}, ${c} ${s * 0.88} C ${s * 0.76} ${s * 0.54}, ${s * 0.76} ${s * 0.12}, ${c} ${s * 0.12} Z`}
          {...pass}
        />
        <circle cx={c} cy={s * 0.4} r={s * 0.1} {...pass} />
      </g>
    ),
    event: (
      <g>
        <line x1={c} y1={s * 0.08} x2={c} y2={s * 0.92} {...pass} />
        <line x1={s * 0.08} y1={c} x2={s * 0.92} y2={c} {...pass} />
        <line x1={s * 0.2} y1={s * 0.2} x2={s * 0.8} y2={s * 0.8} {...pass} />
        <line x1={s * 0.8} y1={s * 0.2} x2={s * 0.2} y2={s * 0.8} {...pass} />
      </g>
    ),
    statement: (
      <path
        d={`M${s * 0.2} ${s * 0.26} L ${s * 0.8} ${s * 0.26} L ${s * 0.8} ${s * 0.68} L ${s * 0.42} ${s * 0.68} L ${s * 0.28} ${s * 0.86} L ${s * 0.3} ${s * 0.68} L ${s * 0.2} ${s * 0.68} Z`}
        {...pass}
      />
    ),
    artifact: (
      <g>
        <line x1={c} y1={s * 0.14} x2={c} y2={s * 0.86} {...pass} />
        <line x1={s * 0.14} y1={c} x2={s * 0.86} y2={c} {...pass} />
      </g>
    ),
    designation: (
      <g>
        <path
          d={`M${s * 0.24} ${s * 0.2} L ${s * 0.14} ${s * 0.2} L ${s * 0.14} ${s * 0.8} L ${s * 0.24} ${s * 0.8}`}
          {...pass}
        />
        <path
          d={`M${s * 0.76} ${s * 0.2} L ${s * 0.86} ${s * 0.2} L ${s * 0.86} ${s * 0.8} L ${s * 0.76} ${s * 0.8}`}
          {...pass}
        />
      </g>
    ),
    media: (
      <g>
        <circle cx={c} cy={c} r={s * 0.4} {...pass} />
        <polygon
          points={`${s * 0.42},${s * 0.34} ${s * 0.68},${c} ${s * 0.42},${s * 0.66}`}
          fill="currentColor"
        />
      </g>
    ),
    concept: (
      <g>
        <circle cx={c} cy={c} r={s * 0.38} {...pass} />
        <circle cx={c} cy={c} r={s * 0.22} {...pass} />
        <circle cx={c} cy={c} r={s * 0.06} fill="currentColor" />
      </g>
    ),
    phenomenon: (
      <g>
        {[0, 45, 90, 135].map((a) => {
          const r1 = s * 0.14;
          const r2 = s * 0.44;
          const rad = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={c + Math.cos(rad) * r1}
              y1={c + Math.sin(rad) * r1}
              x2={c + Math.cos(rad) * r2}
              y2={c + Math.sin(rad) * r2}
              {...pass}
            />
          );
        })}
        <circle cx={c} cy={c} r={s * 0.08} fill="currentColor" />
      </g>
    ),
    technology: (
      <g>
        <rect x={s * 0.24} y={s * 0.24} width={s * 0.52} height={s * 0.52} {...pass} />
        {[0.34, 0.5, 0.66].map((y) => (
          <line key={'h' + y} x1={s * 0.12} y1={s * y} x2={s * 0.24} y2={s * y} {...pass} />
        ))}
        {[0.34, 0.5, 0.66].map((y) => (
          <line key={'hr' + y} x1={s * 0.76} y1={s * y} x2={s * 0.88} y2={s * y} {...pass} />
        ))}
      </g>
    ),
    // Types not in the original 16-glyph mockup set — reuse sensible fallbacks.
    role: <circle cx={c} cy={c} r={s * 0.3} {...pass} />,
    testimony: (
      <path
        d={`M${s * 0.2} ${s * 0.26} L ${s * 0.8} ${s * 0.26} L ${s * 0.8} ${s * 0.68} L ${s * 0.42} ${s * 0.68} L ${s * 0.28} ${s * 0.86} L ${s * 0.3} ${s * 0.68} L ${s * 0.2} ${s * 0.68} Z`}
        {...pass}
      />
    ),
    citation: (
      <g>
        <rect x={s * 0.22} y={s * 0.22} width={s * 0.56} height={s * 0.56} {...pass} />
        <line x1={s * 0.3} y1={s * 0.36} x2={s * 0.7} y2={s * 0.36} {...pass} />
        <line x1={s * 0.3} y1={s * 0.5} x2={s * 0.7} y2={s * 0.5} {...pass} />
        <line x1={s * 0.3} y1={s * 0.64} x2={s * 0.55} y2={s * 0.64} {...pass} />
      </g>
    ),
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      {paths[type] ?? paths.concept}
    </svg>
  );
}
