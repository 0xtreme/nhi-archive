import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { getYear } from '../lib/archive';
import { NODE_TYPE_META } from '../lib/taxonomy';
import type { ArchiveEdge, ArchiveNode, NodeType } from '../types';
import { NodeGlyph } from './NodeGlyph';

interface TimelineViewProps {
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

const LANE_TYPES: NodeType[] = [
  'incident',
  'person',
  'program',
  'document',
  'video',
  'event',
  'statement',
  'organization',
];

/**
 * Timeline view — chronological swimlanes per node type, density strip
 * colored by era, alternate above/below label staggering to reduce
 * collisions, cross-lane connection lines when a node is selected.
 *
 * Ported from mockup/screen-views.jsx TimelineView; adapted for real
 * ArchiveNode/ArchiveEdge.
 */
export function TimelineView({
  nodes,
  edges,
  selectedId,
  onSelect,
  breakpoint,
}: TimelineViewProps) {
  const isMobile = breakpoint === 'mobile';
  const [laneSet, setLaneSet] = useState<Set<NodeType>>(() => new Set(LANE_TYPES));
  const [labelMode, setLabelMode] = useState<'hover' | 'all'>('hover');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const toggleLane = (l: NodeType) => {
    setLaneSet((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      if (next.size === 0) return new Set(LANE_TYPES);
      return next;
    });
  };

  const lanes = LANE_TYPES.filter((l) => laneSet.has(l));

  const nodesWithYear = useMemo(() => {
    return nodes
      .map((n) => ({ n, year: getYear(n.date_start) }))
      .filter((x): x is { n: ArchiveNode; year: number } => x.year !== null)
      .filter((x) => laneSet.has(x.n.node_type));
  }, [nodes, laneSet]);

  const minY = 1945;
  const maxY = new Date().getFullYear();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const LANE_LABEL_W = isMobile ? 100 : 132;
  const baseInner = Math.max(600, w - LANE_LABEL_W - 24);
  const laneInner = baseInner * zoom;
  const fullWidth = LANE_LABEL_W + laneInner + 24;
  const xAt = (y: number) => LANE_LABEL_W + ((y - minY) / (maxY - minY)) * laneInner;
  const LANE_H = 72;

  const years = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
  const decades = [1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
  const decadeHot: Record<number, number> = {
    1940: 0.2,
    1950: 0.3,
    1960: 0.4,
    1970: 0.45,
    1980: 0.65,
    1990: 0.7,
    2000: 0.85,
    2010: 0.95,
    2020: 1,
  };

  const selected = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) : null),
    [selectedId, nodes],
  );

  const relatedIds = useMemo(() => {
    if (!selected) return new Set<string>();
    const set = new Set<string>();
    for (const e of edges) {
      if (e.from_node_id === selected.id) set.add(e.to_node_id);
      else if (e.to_node_id === selected.id) set.add(e.from_node_id);
    }
    return set;
  }, [selected, edges]);

  const laneMap = useMemo(() => {
    const m: Record<string, Array<{ n: ArchiveNode; year: number }>> = {};
    for (const l of lanes) {
      m[l] = nodesWithYear
        .filter((x) => x.n.node_type === l)
        .sort((a, b) => a.year - b.year);
    }
    return m;
  }, [lanes, nodesWithYear]);

  const labelVisible = (id: string) => {
    if (id === hoverId) return true;
    if (id === selectedId) return true;
    if (selected && relatedIds.has(id)) return true;
    if (labelMode === 'all') return true;
    return false;
  };

  const offsetFor = (i: number) => {
    const side = i % 2 === 0 ? -1 : 1;
    const step = 18;
    return side === -1 ? -step - 6 : step + 4;
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: 'var(--nhi-ink)',
      }}
    >
      <div
        style={{
          padding: isMobile ? '10px 12px' : '12px 20px',
          borderBottom: '1px solid var(--nhi-hairline)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="nhi-micro">FILTER · LANES</span>
          <span className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog)' }}>
            {lanes.length}/{LANE_TYPES.length} ACTIVE
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LANE_TYPES.map((l) => {
            const on = laneSet.has(l);
            return (
              <button
                key={l}
                onClick={() => toggleLane(l)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 9px',
                  border: '1px solid ' + (on ? 'var(--nhi-hairline-hot)' : 'var(--nhi-hairline)'),
                  background: on ? 'rgba(125,211,252,0.08)' : 'transparent',
                  color: on ? 'var(--nhi-bone)' : 'var(--nhi-fog)',
                  fontFamily: 'var(--nhi-f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                }}
              >
                <span style={{ color: on ? 'var(--nhi-sky)' : 'var(--nhi-fog)' }}>
                  <NodeGlyph type={l} size={10} />
                </span>
                {NODE_TYPE_META[l]?.label ?? l}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="nhi-micro">LABELS</span>
          {(['hover', 'all'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setLabelMode(m)}
              style={{
                padding: '3px 8px',
                border:
                  '1px solid ' +
                  (labelMode === m ? 'var(--nhi-hairline-hot)' : 'var(--nhi-hairline)'),
                background: labelMode === m ? 'rgba(196,181,253,0.10)' : 'transparent',
                fontFamily: 'var(--nhi-f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                color: labelMode === m ? 'var(--nhi-bone)' : 'var(--nhi-fog)',
              }}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="nhi-micro">ZOOM</span>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            style={{
              width: 24,
              height: 22,
              border: '1px solid var(--nhi-hairline)',
              fontFamily: 'var(--nhi-f-mono)',
              color: 'var(--nhi-fog-2)',
            }}
          >
            −
          </button>
          <span
            className="nhi-mono"
            style={{ fontSize: 11, color: 'var(--nhi-sky)', width: 40, textAlign: 'center' }}
          >
            {zoom.toFixed(2)}×
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            style={{
              width: 24,
              height: 22,
              border: '1px solid var(--nhi-hairline)',
              fontFamily: 'var(--nhi-f-mono)',
              color: 'var(--nhi-fog-2)',
            }}
          >
            +
          </button>
        </div>
      </div>

      <div
        style={{
          padding: isMobile ? '10px 12px 22px' : '12px 20px 22px',
          borderBottom: '1px solid var(--nhi-hairline)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="nhi-micro">DENSITY · BY ERA</span>
          <span className="nhi-mono" style={{ fontSize: 10, color: 'var(--nhi-fog)' }}>
            {minY} → {maxY} · {nodesWithYear.length} NODES
          </span>
        </div>
        <div style={{ marginTop: 8, height: 14, display: 'flex', gap: 2, position: 'relative' }}>
          {decades.map((d) => (
            <div
              key={d}
              style={{
                flex: 1,
                position: 'relative',
                background: `linear-gradient(90deg, color-mix(in oklab, var(--nhi-sky) ${decadeHot[d] * 80}%, transparent), color-mix(in oklab, var(--nhi-violet) ${decadeHot[d] * 80}%, transparent))`,
              }}
            >
              <span
                className="nhi-mono"
                style={{
                  position: 'absolute',
                  bottom: -16,
                  left: 0,
                  fontSize: 9,
                  color: 'var(--nhi-fog)',
                  letterSpacing: '0.1em',
                }}
              >
                {d}s
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="nhi-scroll"
        style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}
      >
        <div
          style={{
            position: 'relative',
            width: fullWidth,
            minHeight: lanes.length * LANE_H + 32,
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              height: 24,
              background: 'var(--nhi-ink)',
              borderBottom: '1px solid var(--nhi-hairline)',
              zIndex: 20,
            }}
          >
            {years.map((y) => (
              <div
                key={y}
                style={{
                  position: 'absolute',
                  left: xAt(y),
                  top: 0,
                  transform: 'translateX(-50%)',
                }}
              >
                <div
                  style={{
                    width: 1,
                    height: 6,
                    background: 'var(--nhi-hairline-2)',
                    margin: '0 auto',
                  }}
                />
                <span
                  className="nhi-mono"
                  style={{
                    fontSize: 9,
                    color: 'var(--nhi-fog-2)',
                    letterSpacing: '0.12em',
                  }}
                >
                  {y}
                </span>
              </div>
            ))}
          </div>

          {years.map((y) => (
            <div
              key={'g' + y}
              style={{
                position: 'absolute',
                left: xAt(y),
                top: 24,
                bottom: 0,
                width: 1,
                background: 'rgba(148,163,216,0.05)',
              }}
            />
          ))}

          {lanes.map((lane, li) => {
            const items = laneMap[lane] ?? [];
            const top = 24 + li * LANE_H;
            return (
              <div
                key={lane}
                style={{
                  position: 'absolute',
                  left: 0,
                  top,
                  width: fullWidth,
                  height: LANE_H,
                  borderBottom: '1px dashed var(--nhi-hairline)',
                }}
              >
                <div
                  style={{
                    position: 'sticky',
                    left: 0,
                    width: LANE_LABEL_W,
                    height: LANE_H,
                    padding: '10px 12px',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    background: 'linear-gradient(90deg, var(--nhi-ink) 85%, transparent)',
                    zIndex: 10,
                  }}
                >
                  <span style={{ color: 'var(--nhi-sky)' }}>
                    <NodeGlyph type={lane} size={14} />
                  </span>
                  <div>
                    <div
                      className="nhi-mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        color: 'var(--nhi-fog-2)',
                      }}
                    >
                      {NODE_TYPE_META[lane]?.label ?? lane}
                    </div>
                    <div
                      className="nhi-mono"
                      style={{
                        fontSize: 8,
                        color: 'var(--nhi-fog)',
                        letterSpacing: '0.14em',
                      }}
                    >
                      {items.length} NODES
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: LANE_LABEL_W,
                    right: 12,
                    top: LANE_H / 2,
                    height: 1,
                    background: 'var(--nhi-hairline)',
                  }}
                />
                {items.map(({ n, year }, i) => {
                  const left = xAt(year);
                  const isSelected = n.id === selectedId;
                  const rel = selected && relatedIds.has(n.id);
                  const isHover = n.id === hoverId;
                  const showLabel = labelVisible(n.id);
                  const yOffset = offsetFor(i);
                  return (
                    <Fragment key={n.id}>
                      <button
                        onClick={() => onSelect(n.id)}
                        onMouseEnter={() => setHoverId(n.id)}
                        onMouseLeave={() => setHoverId((h) => (h === n.id ? null : h))}
                        title={`${n.label} · ${year}`}
                        style={{
                          position: 'absolute',
                          left,
                          top: LANE_H / 2 - (isSelected || isHover ? 8 : 5),
                          transform: 'translateX(-50%)',
                          width: isSelected || isHover ? 16 : 10,
                          height: isSelected || isHover ? 16 : 10,
                          border:
                            '1px solid ' +
                            (isSelected
                              ? 'var(--nhi-sky)'
                              : rel
                                ? 'var(--nhi-violet)'
                                : isHover
                                  ? 'var(--nhi-bone)'
                                  : 'var(--nhi-hairline-hot)'),
                          background: isSelected
                            ? 'var(--nhi-sky)'
                            : rel
                              ? 'rgba(196,181,253,0.5)'
                              : 'rgba(14,20,36,0.9)',
                          boxShadow: isSelected
                            ? '0 0 12px var(--nhi-sky)'
                            : isHover
                              ? '0 0 8px var(--nhi-bone)'
                              : 'none',
                          zIndex: isSelected || isHover ? 15 : 5,
                          transition: 'all 120ms var(--nhi-ease)',
                        }}
                      />
                      {showLabel && (
                        <div
                          style={{
                            position: 'absolute',
                            left,
                            top: LANE_H / 2 + yOffset,
                            transform: 'translateX(-50%)',
                            fontFamily: 'var(--nhi-f-body)',
                            fontSize: 11,
                            lineHeight: 1.2,
                            color: isSelected
                              ? 'var(--nhi-sky)'
                              : rel
                                ? 'var(--nhi-violet)'
                                : 'var(--nhi-bone)',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            textAlign: 'center',
                            padding: '2px 6px',
                            background: 'rgba(10,14,26,0.92)',
                            border:
                              '1px solid ' +
                              (isSelected
                                ? 'var(--nhi-sky)'
                                : rel
                                  ? 'var(--nhi-violet)'
                                  : 'var(--nhi-hairline-hot)'),
                            zIndex: 16,
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {n.label}
                          <span
                            className="nhi-mono"
                            style={{
                              fontSize: 8,
                              color: 'var(--nhi-fog)',
                              marginLeft: 6,
                              letterSpacing: '0.12em',
                            }}
                          >
                            {year}
                          </span>
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
