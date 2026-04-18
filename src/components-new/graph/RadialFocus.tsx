import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CONFIDENCE_META } from '../../lib/taxonomy';
import type { ArchiveEdge, ArchiveNode } from '../../types';
import { NodeGlyph } from '../NodeGlyph';

interface RadialFocusProps {
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
  focusId: string | null;
  setFocusId: (id: string) => void;
  onSelect: (id: string) => void;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

/**
 * Radial focus view — one focal node at center, 1-hop ring outside it,
 * 2-hop ring beyond that. Animates when the focus changes. Click any
 * neighbor to refocus.
 *
 * Ported from mockup/graph-views-new.jsx RadialFocus; adapted for real
 * ArchiveNode/ArchiveEdge and the shared App filter state.
 */
export function RadialFocus({
  nodes,
  edges,
  focusId,
  setFocusId,
  onSelect,
  breakpoint,
}: RadialFocusProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [t, setT] = useState(1);
  const prevPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  // User-dragged positions override the computed ring positions until reset.
  const [overrides, setOverrides] = useState<Map<string, { x: number; y: number }>>(
    () => new Map(),
  );

  const isMobile = breakpoint === 'mobile';

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Build indexes on every filter/data change
  const { byId, degree } = useMemo(() => {
    const idx = new Map<string, ArchiveNode>();
    for (const n of nodes) idx.set(n.id, n);
    const deg = new Map<string, number>();
    for (const e of edges) {
      deg.set(e.from_node_id, (deg.get(e.from_node_id) ?? 0) + 1);
      deg.set(e.to_node_id, (deg.get(e.to_node_id) ?? 0) + 1);
    }
    return { byId: idx, degree: deg };
  }, [nodes, edges]);

  // Default to the most-connected node when no focus is set
  const effectiveFocusId = useMemo(() => {
    if (focusId && byId.has(focusId)) return focusId;
    let best: string | null = null;
    let bestDeg = -1;
    for (const n of nodes) {
      const d = degree.get(n.id) ?? 0;
      if (d > bestDeg) {
        bestDeg = d;
        best = n.id;
      }
    }
    return best;
  }, [focusId, byId, degree, nodes]);

  const focus = effectiveFocusId ? byId.get(effectiveFocusId) : null;

  // Compute 1-hop + 2-hop rings
  const { ring1, ring2, r1r2EdgeSet } = useMemo(() => {
    if (!effectiveFocusId) return { ring1: [], ring2: [], r1r2EdgeSet: [] };
    const r1 = new Set<string>();
    const r2 = new Set<string>();
    const connects1 = new Map<string, string>();
    for (const e of edges) {
      if (e.from_node_id === effectiveFocusId) {
        r1.add(e.to_node_id);
        connects1.set(e.to_node_id, e.relationship);
      } else if (e.to_node_id === effectiveFocusId) {
        r1.add(e.from_node_id);
        connects1.set(e.from_node_id, e.relationship);
      }
    }
    const edgeSet: { from: string; to: string; type: string }[] = [];
    for (const e of edges) {
      if (r1.has(e.from_node_id) && e.to_node_id !== effectiveFocusId && !r1.has(e.to_node_id)) {
        r2.add(e.to_node_id);
        edgeSet.push({ from: e.from_node_id, to: e.to_node_id, type: e.relationship });
      }
      if (r1.has(e.to_node_id) && e.from_node_id !== effectiveFocusId && !r1.has(e.from_node_id)) {
        r2.add(e.from_node_id);
        edgeSet.push({ from: e.to_node_id, to: e.from_node_id, type: e.relationship });
      }
    }
    const ring1Cap = isMobile ? 8 : 14;
    const ring2Cap = isMobile ? 12 : 22;
    const r1List = [...r1]
      .map((id) => ({ node: byId.get(id), rel: connects1.get(id) }))
      .filter((x): x is { node: ArchiveNode; rel: string } => !!x.node)
      .sort((a, b) => (degree.get(b.node.id) ?? 0) - (degree.get(a.node.id) ?? 0))
      .slice(0, ring1Cap);
    const keptR1 = new Set(r1List.map((x) => x.node.id));
    const r2List = [...r2]
      .map((id) => byId.get(id))
      .filter((n): n is ArchiveNode => !!n)
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, ring2Cap);
    const filteredEdgeSet = edgeSet.filter(
      (e) => keptR1.has(e.from) && r2List.some((n) => n.id === e.to),
    );
    return { ring1: r1List, ring2: r2List, r1r2EdgeSet: filteredEdgeSet };
  }, [effectiveFocusId, edges, byId, degree, isMobile]);

  const cx = size.w / 2;
  const cy = size.h / 2;
  const maxR = Math.min(size.w, size.h) / 2 - (isMobile ? 70 : 110);
  const r1Radius = Math.max(60, maxR * 0.55);
  const r2Radius = Math.max(90, maxR * 0.92);

  const sortedR1 = useMemo(
    () =>
      [...ring1].sort((a, b) => (a.rel + a.node.label).localeCompare(b.rel + b.node.label)),
    [ring1],
  );

  const positionsNew = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    if (effectiveFocusId) m.set(effectiveFocusId, { x: cx, y: cy });
    sortedR1.forEach((x, i) => {
      const a = (i / Math.max(1, sortedR1.length)) * Math.PI * 2 - Math.PI / 2;
      m.set(x.node.id, { x: cx + Math.cos(a) * r1Radius, y: cy + Math.sin(a) * r1Radius });
    });
    ring2.forEach((n, i) => {
      const a = (i / Math.max(1, ring2.length)) * Math.PI * 2 - Math.PI / 2;
      m.set(n.id, { x: cx + Math.cos(a) * r2Radius, y: cy + Math.sin(a) * r2Radius });
    });
    return m;
  }, [sortedR1, ring2, cx, cy, r1Radius, r2Radius, effectiveFocusId]);

  // Animate on focus change
  useEffect(() => {
    setT(0);
    let start: number | null = null;
    let raf = 0;
    const dur = 520;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setT(e);
      if (p < 1) raf = requestAnimationFrame(step);
      else prevPosRef.current = new Map(positionsNew);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFocusId]);

  const getPos = (id: string) => {
    const override = overrides.get(id);
    if (override) return override;
    const to = positionsNew.get(id);
    if (!to) return null;
    const from = prevPosRef.current.get(id) ?? { x: cx, y: cy };
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  };

  const pickFocus = (id: string) => {
    prevPosRef.current = new Map(positionsNew);
    setFocusId(id);
    onSelect(id);
    // Refocus clears the drag overrides — new ring positions would make
    // the old overrides meaningless anyway.
    setOverrides(new Map());
  };

  const resetOverrides = () => setOverrides(new Map());

  const setNodeOverride = (id: string, pos: { x: number; y: number }) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(id, pos);
      return next;
    });
  };

  const ready = size.w > 0 && size.h > 0;

  if (!focus) {
    return (
      <div
        ref={wrapRef}
        style={{
          position: 'relative',
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
        NO NODE TO FOCUS · ADJUST FILTERS OR SEARCH
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', flex: 1, overflow: 'hidden', background: 'var(--nhi-ink)', minWidth: 0 }}
    >
      {ready && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 50% 50%, rgba(125,211,252,0.05), rgba(5,7,13,0.0) 45%, rgba(5,7,13,0.7) 85%)',
              pointerEvents: 'none',
            }}
          />
          <svg width={size.w} height={size.h} style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <radialGradient id="focus-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(125,211,252,0.55)" />
                <stop offset="60%" stopColor="rgba(125,211,252,0.0)" />
              </radialGradient>
            </defs>
            <circle cx={cx} cy={cy} r={r1Radius} fill="none" stroke="rgba(149,166,224,0.1)" strokeDasharray="2 4" />
            <circle cx={cx} cy={cy} r={r2Radius} fill="none" stroke="rgba(149,166,224,0.06)" strokeDasharray="2 6" />

            {sortedR1.map(({ node }) => {
              const p = getPos(node.id);
              if (!p) return null;
              return (
                <line
                  key={'e1-' + node.id}
                  x1={cx}
                  y1={cy}
                  x2={p.x}
                  y2={p.y}
                  stroke="rgba(196,181,253,0.35)"
                  strokeWidth={1}
                />
              );
            })}
            {r1r2EdgeSet.map((e, i) => {
              const a = getPos(e.from);
              const b = getPos(e.to);
              if (!a || !b) return null;
              return (
                <line
                  key={'e2-' + i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="rgba(148,163,216,0.12)"
                  strokeWidth={0.6}
                />
              );
            })}

            <circle cx={cx} cy={cy} r={80} fill="url(#focus-glow)" />
          </svg>

          <NodeBubble
            n={focus}
            x={cx}
            y={cy}
            size={isMobile ? 56 : 72}
            isFocus
            onClick={() => onSelect(focus.id)}
          />
          {sortedR1.map(({ node, rel }) => {
            const p = getPos(node.id);
            if (!p) return null;
            return (
              <NodeBubble
                key={node.id}
                n={node}
                x={p.x}
                y={p.y}
                size={isMobile ? 36 : 44}
                rel={rel}
                onClick={() => pickFocus(node.id)}
                onDrag={(pos) => setNodeOverride(node.id, pos)}
                onHover={setHoverId}
                hover={hoverId === node.id}
              />
            );
          })}
          {ring2.map((n) => {
            const p = getPos(n.id);
            if (!p) return null;
            return (
              <NodeBubble
                key={n.id}
                n={n}
                x={p.x}
                y={p.y}
                size={isMobile ? 22 : 26}
                dim
                onClick={() => pickFocus(n.id)}
                onDrag={(pos) => setNodeOverride(n.id, pos)}
                onHover={setHoverId}
                hover={hoverId === n.id}
              />
            );
          })}

          <div
            className="nhi-mono"
            style={{
              position: 'absolute',
              left: 10,
              top: 10,
              fontSize: 10,
              color: 'var(--nhi-fog)',
              letterSpacing: '0.14em',
            }}
          >
            FOCUS · {focus.label}
            <span style={{ color: 'var(--nhi-fog-2)', marginLeft: 8 }}>
              · {sortedR1.length} 1-HOP · {ring2.length} 2-HOP
            </span>
          </div>
          <div
            className="nhi-mono"
            style={{
              position: 'absolute',
              left: 10,
              bottom: 10,
              fontSize: 9,
              color: 'var(--nhi-fog)',
              letterSpacing: '0.14em',
            }}
          >
            CLICK → REFOCUS · DRAG → REARRANGE · ⌘K → SEARCH
          </div>

          {overrides.size > 0 && (
            <button
              onClick={resetOverrides}
              className="nhi-mono"
              title="Reset drag positions to the computed ring layout"
              style={{
                position: 'absolute',
                right: 10,
                bottom: 10,
                fontSize: 10,
                letterSpacing: '0.14em',
                padding: '4px 10px',
                color: 'var(--nhi-sky)',
                background: 'rgba(125,211,252,0.08)',
                border: '1px solid var(--nhi-hairline-hot)',
              }}
            >
              ↺ RESET LAYOUT · {overrides.size} MOVED
            </button>
          )}
        </>
      )}
    </div>
  );
}

interface NodeBubbleProps {
  n: ArchiveNode;
  x: number;
  y: number;
  size: number;
  isFocus?: boolean;
  dim?: boolean;
  rel?: string;
  hover?: boolean;
  onClick?: () => void;
  onHover?: (id: string | null) => void;
  onDrag?: (pos: { x: number; y: number }) => void;
}

function NodeBubble({ n, x, y, size, isFocus, dim, rel, hover, onClick, onHover, onDrag }: NodeBubbleProps) {
  const label = n.label.length > 28 ? n.label.slice(0, 27) + '…' : n.label;
  void CONFIDENCE_META;
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onDrag || isFocus) return;
    // Only primary button; ignore right-click / middle-click
    if (e.button !== 0) return;
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: x,
      startY: y,
      moved: false,
      pointerId: e.pointerId,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || !onDrag) return;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    onDrag({ x: d.startX + dx, y: d.startY + dy });
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(d.pointerId);
    } catch {
      // pointer already released — ignore
    }
    const wasDrag = d.moved;
    dragRef.current = null;
    if (!wasDrag && onClick) onClick();
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => (dragRef.current = null)}
      onClick={(e) => {
        // If onDrag is wired, pointerup handles click via wasDrag check.
        // Without onDrag (e.g. focus node), fall back to a plain click.
        if (!onDrag && onClick) onClick();
        e.preventDefault();
      }}
      onMouseEnter={() => onHover && onHover(n.id)}
      onMouseLeave={() => onHover && onHover(null)}
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onDrag && !isFocus ? 'grab' : 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        transition: 'transform 120ms ease',
        transform: hover ? 'scale(1.08)' : 'scale(1)',
        zIndex: isFocus ? 20 : hover ? 15 : dim ? 5 : 10,
        opacity: dim && !hover ? 0.55 : 1,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: isFocus
            ? 'radial-gradient(circle, rgba(125,211,252,0.9), rgba(125,211,252,0.15))'
            : dim
              ? 'rgba(14,20,36,0.7)'
              : 'rgba(20,26,46,0.85)',
          border:
            '1px solid ' +
            (isFocus
              ? 'var(--nhi-sky)'
              : hover
                ? 'var(--nhi-sky)'
                : dim
                  ? 'var(--nhi-hairline)'
                  : 'var(--nhi-hairline-hot)'),
          boxShadow: isFocus
            ? '0 0 40px rgba(125,211,252,0.5), 0 0 12px rgba(125,211,252,0.9)'
            : hover
              ? '0 0 12px rgba(125,211,252,0.4)'
              : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isFocus ? '#0b1020' : 'var(--nhi-fog-2)',
        }}
      >
        <NodeGlyph type={n.node_type} size={isFocus ? 28 : size * 0.38} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: size + 4,
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          fontFamily: 'var(--nhi-f-body)',
          fontSize: isFocus ? 14 : dim ? 10 : 12,
          color: isFocus ? 'var(--nhi-bone)' : 'var(--nhi-fog-2)',
          textShadow: '0 1px 4px rgba(5,7,13,0.8)',
          letterSpacing: isFocus ? '0.02em' : 0,
        }}
      >
        {label}
        {rel && !dim && (
          <div
            className="nhi-mono"
            style={{
              fontSize: 8,
              color: 'var(--nhi-violet)',
              letterSpacing: '0.18em',
              marginTop: 1,
            }}
          >
            {rel}
          </div>
        )}
      </div>
    </div>
  );
}
