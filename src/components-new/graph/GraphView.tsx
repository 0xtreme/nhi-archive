import { useState } from 'react';
import type { ArchiveEdge, ArchiveNode, Confidence, FilterState, NodeType } from '../../types';
import { FilterPanel } from './FilterPanel';
import { GraphCanvas } from './GraphCanvas';

type GraphSubView = 'canvas' | 'focus' | 'matrix';

interface GraphViewProps {
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filters: FilterState;
  totalNodes: number;
  availablePipelineSources: string[];
  onToggleNodeType: (t: NodeType) => void;
  onToggleConfidence: (c: Confidence) => void;
  onTogglePipelineSource: (s: string) => void;
  onGraphNodeCapChange: (n: number) => void;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
}

const SUBVIEWS: { k: GraphSubView; label: string; sub: string }[] = [
  { k: 'canvas', label: 'CONSTELLATION', sub: 'force-directed' },
  { k: 'focus',  label: 'FOCUS',         sub: 'radial · 1-hop' },
  { k: 'matrix', label: 'MATRIX',        sub: 'adjacency' },
];

/**
 * Graph screen wrapper — left rail FilterPanel (mobile drawer) + sub-view
 * tab bar (Constellation / Focus / Matrix) + active sub-view.
 *
 * Focus and Matrix are stubbed in this commit — they render a "coming in
 * next commit" placeholder. Constellation is the fully functional canvas.
 */
export function GraphView({
  nodes,
  edges,
  selectedId,
  onSelect,
  filters,
  totalNodes,
  availablePipelineSources,
  onToggleNodeType,
  onToggleConfidence,
  onTogglePipelineSource,
  onGraphNodeCapChange,
  breakpoint,
  filtersOpen,
  setFiltersOpen,
}: GraphViewProps) {
  const [subView, setSubView] = useState<GraphSubView>('canvas');
  const isMobile = breakpoint === 'mobile';

  const filterPanelProps = {
    filters,
    totalNodes,
    availablePipelineSources,
    onToggleNodeType,
    onToggleConfidence,
    onTogglePipelineSource,
    onGraphNodeCapChange,
  };

  return (
    <div
      className="nhi-root"
      style={{ position: 'relative', display: 'flex', flex: 1, minHeight: 0 }}
    >
      {!isMobile && <FilterPanel {...filterPanelProps} />}

      {isMobile && filtersOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(5,7,13,0.8)' }}
            onClick={() => setFiltersOpen(false)}
          />
          <div
            style={{
              position: 'relative',
              height: '70%',
              marginTop: 'auto',
              borderTop: '1px solid var(--nhi-hairline-hot)',
              background: 'var(--nhi-ink-1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 14px',
                borderBottom: '1px solid var(--nhi-hairline)',
              }}
            >
              <span className="nhi-micro">FILTERS · DRAWER</span>
              <button
                onClick={() => setFiltersOpen(false)}
                className="nhi-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'var(--nhi-fog-2)',
                }}
              >
                CLOSE ✕
              </button>
            </div>
            <FilterPanel {...filterPanelProps} inDrawer />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--nhi-hairline)',
            background: 'rgba(10,14,26,0.6)',
            backdropFilter: 'blur(4px)',
            flexShrink: 0,
          }}
        >
          {SUBVIEWS.map((v, i) => {
            const active = subView === v.k;
            return (
              <button
                key={v.k}
                onClick={() => setSubView(v.k)}
                style={{
                  flex: isMobile ? 1 : 'initial',
                  padding: isMobile ? '8px 10px' : '10px 18px',
                  textAlign: 'left',
                  background: active ? 'var(--nhi-ink-2)' : 'transparent',
                  borderRight: i < SUBVIEWS.length - 1 ? '1px solid var(--nhi-hairline)' : 'none',
                  borderBottom: '2px solid ' + (active ? 'var(--nhi-sky)' : 'transparent'),
                  color: active ? 'var(--nhi-bone)' : 'var(--nhi-fog-2)',
                  fontFamily: 'var(--nhi-f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? 2 : 8,
                  alignItems: isMobile ? 'flex-start' : 'baseline',
                }}
              >
                <span>{v.label}</span>
                <span style={{ fontSize: 8, color: 'var(--nhi-fog)', letterSpacing: '0.14em' }}>
                  {v.sub}
                </span>
              </button>
            );
          })}
        </div>

        {subView === 'canvas' && (
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            onSelect={onSelect}
            densityCap={filters.graphNodeCap}
            totalNodes={totalNodes}
          />
        )}
        {subView === 'focus' && <ComingSoon label="RADIAL FOCUS" note="1-hop + 2-hop rings around a center node. Lands in the next commit." />}
        {subView === 'matrix' && <ComingSoon label="ADJACENCY MATRIX" note="Row/column entity grid with relationship-type-colored cells. Lands in the next commit." />}
      </div>
    </div>
  );
}

function ComingSoon({ label, note }: { label: string; note: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        padding: 20,
        background: 'var(--nhi-ink)',
      }}
    >
      <div
        className="nhi-display"
        style={{ fontSize: 18, color: 'var(--nhi-fog-2)', letterSpacing: '0.18em' }}
      >
        {label}
      </div>
      <div
        className="nhi-mono"
        style={{
          fontSize: 11,
          color: 'var(--nhi-fog)',
          maxWidth: 440,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        {note}
      </div>
    </div>
  );
}
