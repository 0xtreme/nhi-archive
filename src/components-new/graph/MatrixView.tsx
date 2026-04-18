import { useMemo } from 'react';
import type { ArchiveEdge, ArchiveNode } from '../../types';
import { NodeGlyph } from '../NodeGlyph';

interface MatrixViewProps {
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
  onSelect: (id: string) => void;
  setFocusId: (id: string) => void;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

const REL_COLORS: Record<string, string> = {
  WITNESSED: '#7dd3fc',
  INVESTIGATED: '#c4b5fd',
  APPEARED_IN: '#fda4af',
  MADE_STATEMENT: '#fde68a',
  OCCURRED_AT: '#94a3b8',
  DOCUMENTED_BY: '#86efac',
  CLASSIFIED_AS: '#a5b4fc',
  REPORTED_BY: '#fbbf24',
  AFFILIATED_WITH: '#818cf8',
  RELATED_TO: '#94a3b8',
  CITED_IN: '#f0abfc',
  CONTRADICTS: '#fb7185',
  REFERENCES: '#80afa8',
  ASSERTED: '#c4b5fd',
  CORROBORATES: '#67b89a',
  PART_OF: '#998aaa',
  PRECEDED: '#8d98a6',
  LOCATED_AT: '#71af9a',
  LOCATED_IN: '#71af9a',
  LOCATED_IN_COUNTRY: '#71af9a',
};

/**
 * Matrix (adjacency) view — top-N hubs + their top-connected neighbors,
 * grouped into clusters for block structure. Cells colored by
 * relationship type. Click any cell to refocus on that row.
 *
 * Ported from mockup/graph-views-new.jsx MatrixView; adapted for
 * ArchiveNode/ArchiveEdge.
 */
export function MatrixView({ nodes, edges, onSelect, setFocusId, breakpoint }: MatrixViewProps) {
  const isMobile = breakpoint === 'mobile';

  const top = useMemo(() => {
    if (nodes.length === 0) return [];
    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.from_node_id, (degree.get(e.from_node_id) ?? 0) + 1);
      degree.set(e.to_node_id, (degree.get(e.to_node_id) ?? 0) + 1);
    }

    const seedCount = isMobile ? 6 : 10;
    const byDegree = [...nodes].sort(
      (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0),
    );
    const seeds = byDegree.slice(0, seedCount);

    interface Picked {
      node: ArchiveNode;
      cluster: number;
      score: number;
    }
    const picked = new Map<string, Picked>();
    seeds.forEach((s, i) => {
      picked.set(s.id, { node: s, cluster: i, score: 1000 - i });
    });

    const wantTotal = isMobile ? 22 : 40;
    const perSeed = Math.ceil((wantTotal - seeds.length) / Math.max(1, seeds.length));
    seeds.forEach((s, i) => {
      const neighbors: string[] = [];
      for (const e of edges) {
        if (e.from_node_id === s.id) neighbors.push(e.to_node_id);
        else if (e.to_node_id === s.id) neighbors.push(e.from_node_id);
      }
      const byId = new Map(nodes.map((n) => [n.id, n]));
      neighbors
        .map((id) => byId.get(id))
        .filter((n): n is ArchiveNode => !!n)
        .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
        .slice(0, perSeed + 2)
        .forEach((n, j) => {
          if (!picked.has(n.id)) picked.set(n.id, { node: n, cluster: i, score: 500 - j });
        });
    });
    return [...picked.values()]
      .sort((a, b) => a.cluster - b.cluster || b.score - a.score)
      .slice(0, wantTotal)
      .map((x) => x.node);
  }, [nodes, edges, isMobile]);

  const adj = useMemo(() => {
    const m = new Map<string, string>();
    const idSet = new Set(top.map((n) => n.id));
    const k = (a: string, b: string) => a + '·' + b;
    for (const e of edges) {
      if (!idSet.has(e.from_node_id) || !idSet.has(e.to_node_id)) continue;
      m.set(k(e.from_node_id, e.to_node_id), e.relationship);
      m.set(k(e.to_node_id, e.from_node_id), e.relationship);
    }
    return m;
  }, [edges, top]);

  const cellSize = isMobile ? 14 : 20;

  if (top.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--nhi-ink)',
          color: 'var(--nhi-fog)',
          fontFamily: 'var(--nhi-f-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
        }}
      >
        NO DATA · ADJUST FILTERS
      </div>
    );
  }

  return (
    <div
      className="nhi-scroll"
      style={{ position: 'relative', flex: 1, overflow: 'auto', background: 'var(--nhi-ink)' }}
    >
      <div
        style={{
          padding: isMobile ? '10px 12px' : '14px 20px',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--nhi-hairline)',
        }}
      >
        <span className="nhi-micro">ADJACENCY MATRIX</span>
        <span
          className="nhi-mono"
          style={{ fontSize: 10, color: 'var(--nhi-fog-2)', letterSpacing: '0.12em' }}
        >
          {top.length} × {top.length}
        </span>
        <div style={{ flex: 1 }} />
        <div
          className="nhi-mono"
          style={{ fontSize: 9, color: 'var(--nhi-fog)', letterSpacing: '0.14em' }}
        >
          CELL COLOR · RELATIONSHIP TYPE
        </div>
      </div>
      <div style={{ padding: 20, display: 'inline-block', minWidth: '100%' }}>
        <div style={{ position: 'relative', marginLeft: isMobile ? 120 : 160 }}>
          <div style={{ height: isMobile ? 100 : 140, position: 'relative' }}>
            {top.map((n, i) => (
              <div
                key={n.id}
                style={{
                  position: 'absolute',
                  left: i * cellSize + cellSize / 2,
                  bottom: 4,
                  transform: 'rotate(-55deg)',
                  transformOrigin: 'left bottom',
                  fontFamily: 'var(--nhi-f-body)',
                  fontSize: isMobile ? 9 : 10,
                  color: 'var(--nhi-fog-2)',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {n.label.length > 20 ? n.label.slice(0, 18) + '…' : n.label}
              </div>
            ))}
          </div>

          {top.map((row, ri) => (
            <div
              key={row.id}
              style={{
                position: 'relative',
                height: cellSize,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: '100%',
                  paddingRight: 8,
                  fontFamily: 'var(--nhi-f-body)',
                  fontSize: isMobile ? 9 : 10,
                  color: 'var(--nhi-fog-2)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ color: 'var(--nhi-sky)' }}>
                  <NodeGlyph type={row.node_type} size={10} />
                </span>
                {row.label.length > 20 ? row.label.slice(0, 18) + '…' : row.label}
              </div>
              {top.map((col, ci) => {
                const rel = adj.get(row.id + '·' + col.id);
                const isDiag = ri === ci;
                const color = rel ? REL_COLORS[rel] ?? '#94a3b8' : 'transparent';
                return (
                  <button
                    key={col.id}
                    onClick={() => {
                      setFocusId(row.id);
                      onSelect(row.id);
                    }}
                    title={rel ? `${row.label} · ${rel} · ${col.label}` : ''}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      padding: 0,
                      border: '0.5px solid rgba(148,163,216,0.08)',
                      background: isDiag ? 'rgba(125,211,252,0.18)' : color,
                      opacity: rel ? 0.75 : 1,
                      cursor: rel ? 'pointer' : 'default',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(REL_COLORS).map(([k, c]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: c }} />
              <span
                className="nhi-mono"
                style={{ fontSize: 8, color: 'var(--nhi-fog-2)', letterSpacing: '0.14em' }}
              >
                {k}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
