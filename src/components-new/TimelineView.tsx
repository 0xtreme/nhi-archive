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

// Parse date_start into a fractional year (for x positioning) and a
// precision flag ('year' | 'month' | 'day').
function parseDate(raw: string | null | undefined): { year: number; frac: number; precision: 'year' | 'month' | 'day' } | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const fullMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (fullMatch) {
    const y = Number(fullMatch[1]);
    const m = Number(fullMatch[2]);
    const d = Number(fullMatch[3]);
    const frac = y + ((m - 1) * 30 + (d - 1)) / 365;
    return { year: y, frac, precision: 'day' };
  }
  const monthMatch = s.match(/^(\d{4})-(\d{1,2})$/);
  if (monthMatch) {
    const y = Number(monthMatch[1]);
    const m = Number(monthMatch[2]);
    return { year: y, frac: y + (m - 1) / 12, precision: 'month' };
  }
  const y = getYear(s);
  if (y === null) return null;
  return { year: y, frac: y + 0.5, precision: 'year' };
}

interface LaidDot {
  id: string;
  node: ArchiveNode;
  year: number;
  frac: number;
  precision: 'year' | 'month' | 'day';
  lane: number;
  x: number;
  y: number;
}

/**
 * Collision-packed timeline — every record with a parseable date_start
 * gets a dot in its type swimlane, and within each lane we run a
 * greedy y-distribution so nodes that share a year (or share a
 * close-in-time bucket) don't pile onto the same pixel. Dates with
 * month or day precision get placed at their true fractional x, so
 * "Nov 14 2004" and "Jun 30 2004" actually sit at different x's.
 *
 * Replaces the prior "same x → stack at same offset" version that the
 * user correctly called out as unreadable.
 */
export function TimelineView({ nodes, edges, selectedId, onSelect, breakpoint }: TimelineViewProps) {
  const isMobile = breakpoint === 'mobile';
  const [laneSet, setLaneSet] = useState<Set<NodeType>>(() => new Set(LANE_TYPES));
  const [labelMode, setLabelMode] = useState<'hover' | 'all' | 'selected'>('hover');
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

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const LANE_LABEL_W = isMobile ? 100 : 132;
  const LANE_H = 86;
  const baseInner = Math.max(600, w - LANE_LABEL_W - 24);
  const laneInner = baseInner * zoom;
  const fullWidth = LANE_LABEL_W + laneInner + 24;

  // Year axis domain adapts to the filtered data, but clamped to 1945–now.
  const dates = useMemo(
    () =>
      nodes
        .map((n) => ({ node: n, parsed: parseDate(n.date_start) }))
        .filter((x): x is { node: ArchiveNode; parsed: NonNullable<ReturnType<typeof parseDate>> } => !!x.parsed),
    [nodes],
  );

  const minY = 1945;
  const maxY = Math.max(new Date().getFullYear(), ...dates.map((x) => x.parsed.year));

  const xAt = (yearFrac: number) => LANE_LABEL_W + ((yearFrac - minY) / (maxY - minY)) * laneInner;

  // Per-lane collision packing: assign y within each lane so nearby-in-x
  // nodes distribute vertically. Greedy: seed all at lane center; sort
  // by x; iterate pushing overlapping neighbors apart.
  const laid = useMemo<LaidDot[]>(() => {
    if (dates.length === 0 || laneInner <= 0) return [];
    const laidByLane: LaidDot[][] = lanes.map(() => []);
    const perLane = new Map<NodeType, Array<{ node: ArchiveNode; parsed: NonNullable<ReturnType<typeof parseDate>> }>>();
    for (const l of lanes) perLane.set(l, []);
    for (const d of dates) {
      const bucket = perLane.get(d.node.node_type);
      if (bucket) bucket.push(d);
    }

    const DOT_R = 6.5;
    for (let li = 0; li < lanes.length; li += 1) {
      const lane = lanes[li];
      const items = (perLane.get(lane) ?? []).slice().sort((a, b) => a.parsed.frac - b.parsed.frac);
      const laneCenter = li * LANE_H + LANE_H / 2 + 24;

      const dots: LaidDot[] = items.map((d) => ({
        id: d.node.id,
        node: d.node,
        year: d.parsed.year,
        frac: d.parsed.frac,
        precision: d.parsed.precision,
        lane: li,
        x: xAt(d.parsed.frac),
        y: laneCenter,
      }));

      // Greedy resolve: for each dot, look at prior dots whose x is within 2R,
      // and pick a y offset that doesn't overlap any of them.
      for (let i = 0; i < dots.length; i += 1) {
        const a = dots[i];
        const tried = new Set<number>();
        let attempt = 0;
        // offsets in order: 0, -r, +r, -2r, +2r, -3r, +3r, ...
        const maxBand = (LANE_H - 8) / 2;
        let ok = false;
        while (!ok && attempt < 40) {
          const sign = attempt % 2 === 0 ? 1 : -1;
          const mag = Math.ceil(attempt / 2);
          const offset = sign * mag * (DOT_R * 1.6);
          if (Math.abs(offset) > maxBand) break;
          const candidate = laneCenter + offset;
          // Check against prior dots in this lane whose x overlaps
          let collides = false;
          for (let j = i - 1; j >= 0; j -= 1) {
            const b = dots[j];
            if (a.x - b.x > DOT_R * 2) break;
            if (Math.abs(b.y - candidate) < DOT_R * 1.8) {
              collides = true;
              break;
            }
          }
          if (!collides) {
            a.y = candidate;
            ok = true;
          }
          tried.add(offset);
          attempt += 1;
        }
        if (!ok) {
          // Heavy pileup — just place at lane center (and accept overlap visually;
          // the bucket indicator below flags these ranges).
          a.y = laneCenter;
        }
      }

      laidByLane[li] = dots;
    }
    return laidByLane.flat();
    // xAt is a pure fn of laneInner + minY + maxY so no need to depend on it
  }, [dates, lanes, laneInner, minY, maxY, LANE_H]);

  // Density buckets — count dots per (lane, 3-year bucket) for the wide-zoom badge.
  // Used as a "there are N more events within ±1.5 years" hint.
  const densityByLaneYear = useMemo(() => {
    const m = new Map<string, LaidDot[]>();
    for (const d of laid) {
      const bucket = Math.round(d.frac / 3) * 3;
      const k = d.lane + ':' + bucket;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(d);
    }
    return m;
  }, [laid]);

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

  // Two passes for labels:
  //   - "forced" labels always render (hover, selected, related-to-selected)
  //   - other labels ("all" mode) go through a greedy per-lane collision
  //     pass so we don't stack six names on top of each other.
  const labelApproxWidth = (s: string) => Math.min(220, 22 + s.length * 6.2);

  const { forcedLabelIds, ambientLabelIds } = useMemo(() => {
    const forced = new Set<string>();
    for (const d of laid) {
      if (d.id === hoverId) forced.add(d.id);
      if (d.id === selectedId) forced.add(d.id);
      if (selected && relatedIds.has(d.id)) forced.add(d.id);
    }
    if (labelMode !== 'all') {
      return { forcedLabelIds: forced, ambientLabelIds: new Set<string>() };
    }
    // Per-lane greedy placement: keep a label if its horizontal band
    // doesn't collide with a previously-kept label at a similar y.
    const ambient = new Set<string>();
    const byLane = new Map<number, LaidDot[]>();
    for (const d of laid) {
      if (!byLane.has(d.lane)) byLane.set(d.lane, []);
      byLane.get(d.lane)!.push(d);
    }
    for (const [, dots] of byLane) {
      const sorted = [...dots].sort((a, b) => a.x - b.x);
      const kept: { x0: number; x1: number; y: number }[] = [];
      for (const d of sorted) {
        const half = labelApproxWidth(d.node.label) / 2;
        const x0 = d.x - half;
        const x1 = d.x + half;
        const collides = kept.some(
          (k) => !(x1 < k.x0 - 4 || x0 > k.x1 + 4) && Math.abs(k.y - d.y) < 16,
        );
        if (collides && !forced.has(d.id)) continue;
        ambient.add(d.id);
        kept.push({ x0, x1, y: d.y });
      }
    }
    return { forcedLabelIds: forced, ambientLabelIds: ambient };
  }, [laid, hoverId, selectedId, selected, relatedIds, labelMode]);

  const labelVisible = (id: string) => {
    if (forcedLabelIds.has(id)) return true;
    if (labelMode === 'all' && ambientLabelIds.has(id)) return true;
    return false;
  };

  const years = zoom >= 2 ? [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020] : [1950, 1970, 1990, 2010];

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
            {lanes.length}/{LANE_TYPES.length} ACTIVE · {laid.length} NODES
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
          {(['hover', 'selected', 'all'] as const).map((m) => (
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
            onClick={() => setZoom((z) => Math.min(6, z + 0.25))}
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
        ref={wrapRef}
        className="nhi-scroll"
        style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}
      >
        <div
          style={{
            position: 'relative',
            width: fullWidth,
            minHeight: lanes.length * LANE_H + 50,
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
                      style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--nhi-fog-2)' }}
                    >
                      {NODE_TYPE_META[lane]?.label ?? lane}
                    </div>
                    <div
                      className="nhi-mono"
                      style={{ fontSize: 8, color: 'var(--nhi-fog)', letterSpacing: '0.14em' }}
                    >
                      {laid.filter((d) => d.lane === li).length} NODES
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
              </div>
            );
          })}

          {laid.map((d) => {
            const isSelected = d.id === selectedId;
            const rel = selected ? relatedIds.has(d.id) : false;
            const isHover = d.id === hoverId;
            const showLabel = labelVisible(d.id);
            const absTop = d.y;
            return (
              <Fragment key={d.id}>
                <button
                  onClick={() => onSelect(d.id)}
                  onMouseEnter={() => setHoverId(d.id)}
                  onMouseLeave={() => setHoverId((h) => (h === d.id ? null : h))}
                  title={`${d.node.label} · ${d.node.date_start ?? d.year}`}
                  style={{
                    position: 'absolute',
                    left: d.x,
                    top: absTop - (isSelected || isHover ? 10 : 7),
                    transform: 'translateX(-50%)',
                    width: isSelected || isHover ? 20 : 14,
                    height: isSelected || isHover ? 20 : 14,
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
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
                {showLabel && (
                  <div
                    style={{
                      position: 'absolute',
                      left: d.x,
                      top: absTop + (d.y % 16 < 8 ? 14 : -28),
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
                      maxWidth: 220,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {d.node.label}
                    <span
                      className="nhi-mono"
                      style={{
                        fontSize: 8,
                        color: 'var(--nhi-fog)',
                        marginLeft: 6,
                        letterSpacing: '0.12em',
                      }}
                    >
                      {d.node.date_start ?? d.year}
                    </span>
                  </div>
                )}
              </Fragment>
            );
          })}

          {/* Wide-zoom density badges: when zoomed out, show a small
              "×N" chip next to dense 3-year buckets so users know
              there's more there than any single dot suggests. */}
          {zoom < 1.2 &&
            Array.from(densityByLaneYear.entries()).map(([k, items]) => {
              if (items.length < 4) return null;
              const any = items[0];
              const cx = xAt(any.frac);
              const laneCenterY = 24 + any.lane * LANE_H + LANE_H / 2;
              return (
                <div
                  key={'bucket-' + k}
                  style={{
                    position: 'absolute',
                    left: cx + 10,
                    top: laneCenterY + 8,
                    fontFamily: 'var(--nhi-f-mono)',
                    fontSize: 9,
                    padding: '1px 5px',
                    color: 'var(--nhi-violet)',
                    border: '1px solid var(--nhi-hairline-2)',
                    background: 'rgba(196,181,253,0.08)',
                    letterSpacing: '0.1em',
                    pointerEvents: 'none',
                    zIndex: 6,
                  }}
                >
                  ×{items.length}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
