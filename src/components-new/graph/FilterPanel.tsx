import { NODE_TYPE_ORDER } from '../../lib/archive';
import { CONFIDENCE_META, NODE_TYPE_META } from '../../lib/taxonomy';
import type { Confidence, FilterState, NodeType } from '../../types';
import { NodeGlyph } from '../NodeGlyph';

interface FilterPanelProps {
  filters: FilterState;
  totalNodes: number;
  availablePipelineSources: string[];
  onToggleNodeType: (t: NodeType) => void;
  onToggleConfidence: (c: Confidence) => void;
  onTogglePipelineSource: (s: string) => void;
  onGraphNodeCapChange: (n: number) => void;
  inDrawer?: boolean;
}

const CONFIDENCE_ORDER: Confidence[] = ['high', 'medium', 'low', 'disputed'];

/**
 * Rebuilt filter panel — mockup's DIMENSIONS aesthetic. Density cap +
 * 16-type node grid + confidence bars + pipeline-source chips + legend.
 * Bridges to App.tsx's existing FilterState so all other views (map,
 * timeline, detail) continue to see the same filter state.
 */
export function FilterPanel({
  filters,
  totalNodes,
  availablePipelineSources,
  onToggleNodeType,
  onToggleConfidence,
  onTogglePipelineSource,
  onGraphNodeCapChange,
  inDrawer,
}: FilterPanelProps) {
  const allTypesActive = filters.nodeTypes.length === NODE_TYPE_ORDER.length;
  const allConfActive = filters.confidences.length === CONFIDENCE_ORDER.length;

  return (
    <div
      className="nhi-root nhi-scroll"
      style={{
        width: inDrawer ? '100%' : 260,
        height: '100%',
        overflowY: 'auto',
        borderRight: inDrawer ? 'none' : '1px solid var(--nhi-hairline)',
        background: 'var(--nhi-ink-1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--nhi-hairline)' }}>
        <div className="nhi-micro">FILTERS</div>
        <div
          className="nhi-display"
          style={{
            marginTop: 4,
            fontSize: 14,
            letterSpacing: '0.12em',
            color: 'var(--nhi-bone)',
          }}
        >
          DIMENSIONS
        </div>
      </div>

      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--nhi-hairline)' }}>
        <div className="nhi-micro" style={{ marginBottom: 10 }}>
          DENSITY CAP
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span className="nhi-mono" style={{ fontSize: 20, color: 'var(--nhi-sky)' }}>
            {filters.graphNodeCap}
          </span>
          <span className="nhi-mono" style={{ fontSize: 10, color: 'var(--nhi-fog)' }}>
            of {totalNodes.toLocaleString()} total
          </span>
        </div>
        <input
          type="range"
          min={20}
          max={Math.max(20, totalNodes)}
          step={10}
          value={filters.graphNodeCap}
          onChange={(e) => onGraphNodeCapChange(+e.target.value)}
          style={{ width: '100%', accentColor: 'var(--nhi-sky)' }}
        />
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog)' }}>
            LO-DEG FADED
          </span>
          <span className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog)' }}>
            {totalNodes === 0 ? 0 : Math.round((100 * filters.graphNodeCap) / totalNodes)}%
          </span>
        </div>
      </div>

      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--nhi-hairline)' }}>
        <div className="nhi-micro" style={{ marginBottom: 10 }}>
          NODE TYPE · {NODE_TYPE_ORDER.length}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {NODE_TYPE_ORDER.map((k) => {
            const active = allTypesActive || filters.nodeTypes.includes(k);
            return (
              <button
                key={k}
                onClick={() => onToggleNodeType(k)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 7px',
                  textAlign: 'left',
                  border:
                    '1px solid ' + (active ? 'var(--nhi-hairline-2)' : 'var(--nhi-hairline)'),
                  opacity: active ? 1 : 0.35,
                  color: 'var(--nhi-fog-2)',
                }}
              >
                <span style={{ color: 'var(--nhi-sky)' }}>
                  <NodeGlyph type={k} size={12} />
                </span>
                <span
                  className="nhi-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    color: 'var(--nhi-fog-2)',
                  }}
                >
                  {NODE_TYPE_META[k]?.label ?? k}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--nhi-hairline)' }}>
        <div className="nhi-micro" style={{ marginBottom: 10 }}>
          CONFIDENCE
        </div>
        {CONFIDENCE_ORDER.map((k) => {
          const meta = CONFIDENCE_META[k];
          const active = allConfActive || filters.confidences.includes(k);
          return (
            <button
              key={k}
              onClick={() => onToggleConfidence(k)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '6px 8px',
                textAlign: 'left',
                border:
                  '1px solid ' + (active ? 'var(--nhi-hairline-2)' : 'var(--nhi-hairline)'),
                marginBottom: 4,
                opacity: active ? 1 : 0.35,
              }}
            >
              <span className="nhi-bars" style={{ color: meta.color }}>
                {[0, 1, 2, 3].map((i) => (
                  <i key={i} style={{ opacity: i < meta.bars ? 1 : 0.18 }} />
                ))}
              </span>
              <span
                className="nhi-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'var(--nhi-fog-2)',
                }}
              >
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {availablePipelineSources.length > 0 && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--nhi-hairline)' }}>
          <div className="nhi-micro" style={{ marginBottom: 10 }}>
            DATA SOURCE
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {availablePipelineSources.map((s) => {
              const active =
                filters.pipelineSources.length === 0 || filters.pipelineSources.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => onTogglePipelineSource(s)}
                  style={{
                    padding: '4px 8px',
                    border:
                      '1px solid ' + (active ? 'var(--nhi-hairline-2)' : 'var(--nhi-hairline)'),
                    fontFamily: 'var(--nhi-f-mono)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--nhi-fog-2)' : 'var(--nhi-fog)',
                    background: 'transparent',
                    opacity: active ? 1 : 0.4,
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: '12px 14px' }}>
        <div className="nhi-micro" style={{ marginBottom: 8 }}>
          LEGEND
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '4px 8px',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--nhi-sky)' }}>
            <NodeGlyph type="person" size={12} />
          </span>
          <span className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog-2)' }}>
            CORE NODE · ≥2 degree
          </span>
          <span style={{ color: 'var(--nhi-fog)' }}>
            <svg width="12" height="12">
              <circle cx="6" cy="6" r="2.5" fill="currentColor" />
            </svg>
          </span>
          <span className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog-2)' }}>
            PERIPHERAL · faded
          </span>
          <span style={{ color: 'var(--nhi-violet)' }}>─</span>
          <span className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog-2)' }}>
            1-HOP NEIGHBOR
          </span>
        </div>
      </div>
    </div>
  );
}
