import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PortraitNode } from './PortraitNode';
import { TypedEdge, EDGE_META } from './TypedEdge';
import type {
  NetworkEdge,
  NetworkEdgeType,
  NetworkEdgesPayload,
  NetworkNode,
  NetworkNodesPayload,
  NetworkTier,
} from './types';

interface NetworkViewProps {
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

const ALL_EDGE_TYPES: NetworkEdgeType[] = [
  'testified_together',
  'same_program',
  'advised_advocated',
  'contradicted',
  'succeeded_in_role',
];

const TIER_COLOR: Record<NetworkTier, string> = {
  witness: '#7dd3fc',
  official: '#fbbf24',
  advocate: '#86efac',
  institution: '#9aa4c7',
};

/**
 * Relationship Map — 4th view alongside Graph / Map / Timeline. See
 * NHI-ARCH-RELMAP-001 for the full spec. Phase 1 MVP: renders the
 * hand-authored portrait network, supports pan/zoom/select, filter by
 * edge type, and an inline side panel.
 */
export function NetworkView({ breakpoint }: NetworkViewProps) {
  const isMobile = breakpoint === 'mobile';
  const [nodesData, setNodesData] = useState<NetworkNode[]>([]);
  const [edgesData, setEdgesData] = useState<NetworkEdge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeEdgeTypes, setActiveEdgeTypes] = useState<Set<NetworkEdgeType>>(
    () => new Set(ALL_EDGE_TYPES),
  );

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      fetch('./data/network/nodes.json', { signal: ctrl.signal, cache: 'no-store' }).then(
        (r) => (r.ok ? (r.json() as Promise<NetworkNodesPayload>) : Promise.reject(r.status)),
      ),
      fetch('./data/network/edges.json', { signal: ctrl.signal, cache: 'no-store' }).then(
        (r) => (r.ok ? (r.json() as Promise<NetworkEdgesPayload>) : Promise.reject(r.status)),
      ),
    ])
      .then(([np, ep]) => {
        setNodesData(np.nodes ?? []);
        setEdgesData(ep.edges ?? []);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (e && typeof e === 'object' && (e as { name?: string }).name === 'AbortError') return;
        setError(typeof e === 'number' ? `fetch failed (${e})` : String(e));
      });
    return () => ctrl.abort();
  }, []);

  const toggleType = useCallback((t: NetworkEdgeType) => {
    setActiveEdgeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        // Never allow all filters off — keep at least one active.
        if (next.size <= 1) return prev;
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setActiveEdgeTypes(new Set(ALL_EDGE_TYPES));
  }, []);

  // Map into React Flow shapes. Edges that fail the current filter get
  // `dim: true` so the TypedEdge component fades them rather than
  // removing — preserves spatial context for the reader.
  const rfNodes = useMemo<Node[]>(
    () =>
      nodesData.map((n) => ({
        id: n.id,
        type: 'portrait',
        position: n.position,
        data: n as unknown as Record<string, unknown>,
        selected: n.id === selectedId,
        draggable: false,
      })),
    [nodesData, selectedId],
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      edgesData.map((e) => ({
        id: e.id,
        type: 'typed',
        source: e.source,
        target: e.target,
        data: {
          type: e.type,
          dim: !activeEdgeTypes.has(e.type),
          label: e.label,
          year: e.year,
        },
      })),
    [edgesData, activeEdgeTypes],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedId(node.id);
  }, []);

  const onPaneClick = useCallback(() => setSelectedId(null), []);

  const nodeTypes = useMemo(() => ({ portrait: PortraitNode }), []);
  const edgeTypes = useMemo(() => ({ typed: TypedEdge }), []);

  const selectedNode = selectedId
    ? nodesData.find((n) => n.id === selectedId) ?? null
    : null;

  const selectedConnections = useMemo(() => {
    if (!selectedNode) return [] as Array<{ edge: NetworkEdge; other: NetworkNode }>;
    const lookup = new Map(nodesData.map((n) => [n.id, n]));
    const out: Array<{ edge: NetworkEdge; other: NetworkNode }> = [];
    for (const e of edgesData) {
      let otherId: string | null = null;
      if (e.source === selectedNode.id) otherId = e.target;
      else if (e.target === selectedNode.id) otherId = e.source;
      if (!otherId) continue;
      const other = lookup.get(otherId);
      if (other) out.push({ edge: e, other });
    }
    return out;
  }, [selectedNode, nodesData, edgesData]);

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--nhi-fog)',
          fontFamily: 'var(--nhi-f-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
        }}
      >
        NETWORK DATA UNAVAILABLE · {error.toUpperCase()}
      </div>
    );
  }

  if (nodesData.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--nhi-fog)',
          fontFamily: 'var(--nhi-f-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
        }}
      >
        LOADING NETWORK <span className="nhi-blink">▍</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: 'relative', background: 'var(--nhi-ink)', minHeight: 0 }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.4}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={28} color="var(--nhi-edge-dim)" />
          <Controls showInteractive={false} position="bottom-right" />
          {!isMobile && (
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => TIER_COLOR[(n.data as unknown as NetworkNode).tier]}
              nodeStrokeWidth={0}
              maskColor="rgba(10, 14, 26, 0.55)"
              style={{ background: 'var(--nhi-ink-2)' }}
            />
          )}
        </ReactFlow>

        <Legend
          active={activeEdgeTypes}
          onToggle={toggleType}
          onReset={resetFilters}
          isMobile={isMobile}
        />

        {selectedNode && (
          <SidePanel
            node={selectedNode}
            connections={selectedConnections}
            onClose={() => setSelectedId(null)}
            onPickConnection={(id) => setSelectedId(id)}
            isMobile={isMobile}
          />
        )}
      </ReactFlowProvider>
    </div>
  );
}

interface LegendProps {
  active: Set<NetworkEdgeType>;
  onToggle: (t: NetworkEdgeType) => void;
  onReset: () => void;
  isMobile: boolean;
}

function Legend({ active, onToggle, onReset, isMobile }: LegendProps) {
  return (
    <div
      className="nhi-panel"
      style={{
        position: 'absolute',
        top: 14,
        left: 14,
        padding: '10px 12px',
        minWidth: isMobile ? 160 : 200,
        zIndex: 5,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span className="nhi-micro">RELATIONSHIPS</span>
        <button
          onClick={onReset}
          className="nhi-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.14em',
            color: 'var(--nhi-fog-2)',
          }}
          title="Show all relationship types"
        >
          RESET
        </button>
      </div>
      {ALL_EDGE_TYPES.map((t) => {
        const meta = EDGE_META[t];
        const isOn = active.has(t);
        return (
          <button
            key={t}
            onClick={() => onToggle(t)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '4px 0',
              opacity: isOn ? 1 : 0.45,
              textAlign: 'left',
            }}
          >
            <svg width={28} height={8} style={{ flexShrink: 0 }}>
              <line
                x1="0"
                y1="4"
                x2="28"
                y2="4"
                stroke={meta.style.stroke}
                strokeWidth={meta.style.width}
                strokeDasharray={meta.style.dash}
              />
            </svg>
            <span
              style={{
                fontFamily: 'var(--nhi-f-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                color: isOn ? 'var(--nhi-bone)' : 'var(--nhi-fog)',
              }}
            >
              {meta.label.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface SidePanelProps {
  node: NetworkNode;
  connections: Array<{ edge: NetworkEdge; other: NetworkNode }>;
  onClose: () => void;
  onPickConnection: (id: string) => void;
  isMobile: boolean;
}

function SidePanel({ node, connections, onClose, onPickConnection, isMobile }: SidePanelProps) {
  return (
    <div
      className="nhi-scroll"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: isMobile ? '100%' : 360,
        background: 'var(--nhi-ink-1)',
        borderLeft: '1px solid var(--nhi-hairline)',
        padding: '16px 18px',
        overflowY: 'auto',
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <div className="nhi-micro" style={{ marginBottom: 4 }}>
            {node.tier.toUpperCase()}
          </div>
          <div
            className="nhi-display"
            style={{ fontSize: 20, color: 'var(--nhi-bone)', letterSpacing: '0.02em' }}
          >
            {node.name}
          </div>
          <div
            style={{
              fontFamily: 'var(--nhi-f-body)',
              fontSize: 13,
              color: 'var(--nhi-fog-2)',
              marginTop: 2,
            }}
          >
            {node.role}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="nhi-mono"
          style={{
            fontSize: 14,
            color: 'var(--nhi-fog)',
            padding: '2px 8px',
            border: '1px solid var(--nhi-hairline)',
          }}
        >
          ×
        </button>
      </div>

      {node.hoverSummary && (
        <>
          <div className="nhi-micro" style={{ marginBottom: 6 }}>
            SUMMARY
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--nhi-f-body)',
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--nhi-fog-2)',
            }}
          >
            {node.hoverSummary}
          </p>
        </>
      )}

      {node.tags && node.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
          {node.tags.map((t) => (
            <span
              key={t}
              className="nhi-mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.12em',
                padding: '2px 6px',
                border: '1px solid var(--nhi-hairline)',
                color: 'var(--nhi-fog-2)',
              }}
            >
              {t.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {connections.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="nhi-micro" style={{ marginBottom: 6 }}>
            CONNECTIONS · {connections.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {connections.map(({ edge, other }) => {
              const meta = EDGE_META[edge.type];
              return (
                <button
                  key={edge.id}
                  onClick={() => onPickConnection(other.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 6px',
                    textAlign: 'left',
                    borderBottom: '1px solid var(--nhi-hairline)',
                  }}
                >
                  <svg width={22} height={6} style={{ flexShrink: 0 }}>
                    <line
                      x1="0"
                      y1="3"
                      x2="22"
                      y2="3"
                      stroke={meta.style.stroke}
                      strokeWidth={meta.style.width}
                      strokeDasharray={meta.style.dash}
                    />
                  </svg>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: 'var(--nhi-f-body)',
                        fontSize: 13,
                        color: 'var(--nhi-bone)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {other.name}
                    </span>
                    <span
                      className="nhi-mono"
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.12em',
                        color: 'var(--nhi-fog)',
                      }}
                    >
                      {meta.label.toUpperCase()}
                      {edge.year ? ` · ${edge.year}` : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
