import { useEffect, useMemo, useRef, useState } from 'react';
import { drawGlyph } from '../../lib/graphDrawing';
import { runSimulation, type SimEdge, type SimNode } from '../../lib/graphSim';
import { NODE_TYPE_META } from '../../lib/taxonomy';
import type { ArchiveEdge, ArchiveNode } from '../../types';
import { NodeGlyph } from '../NodeGlyph';

interface GraphCanvasProps {
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  densityCap: number;
  totalNodes: number;
}

interface ViewTransform {
  tx: number;
  ty: number;
  k: number;
}

interface LaidOutNode extends SimNode {
  archive: ArchiveNode;
}

/**
 * Force-directed canvas view — the Constellation sub-view of the Graph
 * screen. Ported from mockup/screen-graph.jsx GraphCanvas; adapted to
 * consume ArchiveNode/ArchiveEdge and density-cap to a top-degree subset
 * so the O(n²) sim stays fast on 5k-node graphs.
 */
export function GraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
  densityCap,
  totalNodes,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<ViewTransform>({ tx: 0, ty: 0, k: 1 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Pick the visible subset: top-degree N, capped to densityCap. Degree
  // is computed from the FULL filtered edge set so low-cap views still
  // show the most-connected hubs.
  const laidOut = useMemo<LaidOutNode[]>(() => {
    if (nodes.length === 0) return [];
    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.from_node_id, (degree.get(e.from_node_id) ?? 0) + 1);
      degree.set(e.to_node_id, (degree.get(e.to_node_id) ?? 0) + 1);
    }
    const poolSorted = [...nodes].sort(
      (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0),
    );
    const cap = Math.min(densityCap, poolSorted.length);
    const visible = poolSorted.slice(0, cap);
    const visibleIds = new Set(visible.map((n) => n.id));

    const simNodes: LaidOutNode[] = visible.map((n) => ({
      id: n.id,
      core: (degree.get(n.id) ?? 0) >= 2,
      degree: degree.get(n.id) ?? 0,
      archive: n,
    }));

    const simEdges: SimEdge[] = [];
    for (const e of edges) {
      if (visibleIds.has(e.from_node_id) && visibleIds.has(e.to_node_id)) {
        simEdges.push({ source: e.from_node_id, target: e.to_node_id, rel: e.relationship });
      }
    }

    runSimulation(simNodes, simEdges, { iterations: 160, width: 1000, height: 700 });
    return simNodes;
  }, [nodes, edges, densityCap]);

  const byId = useMemo(() => new Map(laidOut.map((n) => [n.id, n])), [laidOut]);
  const visibleIds = useMemo(() => new Set(laidOut.map((n) => n.id)), [laidOut]);

  const laidOutEdges = useMemo(
    () =>
      edges.filter((e) => visibleIds.has(e.from_node_id) && visibleIds.has(e.to_node_id)),
    [edges, visibleIds],
  );

  // 1-hop neighborhood for highlighting on selection
  const hopSet = useMemo(() => {
    if (!selectedId || !visibleIds.has(selectedId)) return null;
    const s = new Set<string>([selectedId]);
    for (const e of laidOutEdges) {
      if (e.from_node_id === selectedId) s.add(e.to_node_id);
      if (e.to_node_id === selectedId) s.add(e.from_node_id);
    }
    return s;
  }, [selectedId, laidOutEdges, visibleIds]);

  // Resize observer
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Fit-to-viewport on size or layout change
  useEffect(() => {
    if (!size.w || !size.h || laidOut.length === 0) return;
    const margin = 40;
    const sx = (size.w - margin * 2) / 1000;
    const sy = (size.h - margin * 2) / 700;
    const k = Math.min(sx, sy);
    const tx = (size.w - 1000 * k) / 2;
    const ty = (size.h - 700 * k) / 2;
    setView({ tx, ty, k });
  }, [size.w, size.h, laidOut]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = size.w + 'px';
    canvas.style.height = size.h + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    // Observatory backdrop — radial vignette + concentric rings + radial spokes
    const cx = size.w / 2;
    const cy = size.h / 2;
    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(size.w, size.h));
    grad.addColorStop(0, 'rgba(20,30,60,0.45)');
    grad.addColorStop(0.6, 'rgba(10,14,26,0.25)');
    grad.addColorStop(1, 'rgba(5,7,13,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.strokeStyle = 'rgba(148,163,216,0.07)';
    ctx.lineWidth = 1;
    for (let r = 60; r < Math.max(size.w, size.h); r += 80) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 2000, cy + Math.sin(a) * 2000);
      ctx.stroke();
    }
    ctx.restore();

    // Apply pan/zoom for graph content
    ctx.save();
    ctx.translate(view.tx, view.ty);
    ctx.scale(view.k, view.k);

    ctx.lineWidth = 0.5 / view.k;
    for (const e of laidOutEdges) {
      const a = byId.get(e.from_node_id);
      const b = byId.get(e.to_node_id);
      if (!a || !b) continue;
      const inHop = hopSet && hopSet.has(e.from_node_id) && hopSet.has(e.to_node_id);
      const dim = hopSet && !inHop;
      ctx.strokeStyle = inHop
        ? 'rgba(196,181,253,0.75)'
        : dim
          ? 'rgba(125,140,200,0.06)'
          : 'rgba(125,140,200,0.18)';
      ctx.beginPath();
      ctx.moveTo(a.x as number, a.y as number);
      ctx.lineTo(b.x as number, b.y as number);
      ctx.stroke();
    }

    for (const n of laidOut) {
      const isSel = n.id === selectedId;
      const isHover = n.id === hoverId;
      const inHop = hopSet && hopSet.has(n.id);
      const dim = hopSet && !inHop;
      const low = (n.degree ?? 0) < 2;
      const alpha = isSel ? 1 : dim ? 0.18 : low ? 0.45 : 0.95;
      const color = isSel
        ? '#ffffff'
        : n.core && inHop
          ? '#c4b5fd'
          : n.core
            ? '#7dd3fc'
            : low
              ? '#6378a8'
              : '#9aa4c7';
      const r = isSel ? 10 : isHover ? 8 : n.core ? 6.5 : 4.5;

      if ((n.core || isSel) && !dim) {
        ctx.save();
        ctx.shadowColor = isSel ? '#ffffff' : '#7dd3fc';
        ctx.shadowBlur = isSel ? 18 : 8;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        drawGlyph(ctx, n.archive.node_type, n.x as number, n.y as number, r, alpha, false);
        ctx.restore();
      } else {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        drawGlyph(ctx, n.archive.node_type, n.x as number, n.y as number, r, alpha, false);
      }

      if (isSel) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1 / view.k;
        ctx.setLineDash([3 / view.k, 3 / view.k]);
        ctx.beginPath();
        ctx.arc(n.x as number, n.y as number, r + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      if (!dim && (n.core || isSel) && view.k > 0.55) {
        ctx.save();
        ctx.font = `${isSel ? 11 : 9}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = isSel ? '#ffffff' : 'rgba(231,235,247,0.88)';
        ctx.textAlign = 'left';
        ctx.fillText(n.archive.label, (n.x as number) + r + 5, (n.y as number) + 3);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [size, view, laidOut, laidOutEdges, byId, selectedId, hoverId, hopSet]);

  // Interactions — pan on drag-empty, select on hit, wheel-zoom
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const wx = (px - view.tx) / view.k;
    const wy = (py - view.ty) / view.k;
    let best: LaidOutNode | null = null;
    let bestD = 14 / view.k;
    for (const n of laidOut) {
      const dx = (n.x as number) - wx;
      const dy = (n.y as number) - wy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    if (best) {
      onSelect(best.id);
      return;
    }
    dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const wx = (px - view.tx) / view.k;
    const wy = (py - view.ty) / view.k;
    let best: LaidOutNode | null = null;
    let bestD = 10 / view.k;
    for (const n of laidOut) {
      const dx = (n.x as number) - wx;
      const dy = (n.y as number) - wy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    setHoverId(best?.id ?? null);
    if (dragRef.current) {
      setView((v) => ({
        ...v,
        tx: dragRef.current!.tx + (e.clientX - dragRef.current!.x),
        ty: dragRef.current!.ty + (e.clientY - dragRef.current!.y),
      }));
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Wheel handler — attach non-passive so we can preventDefault (React's
  // onWheel is passive in modern browsers which breaks the zoom gesture).
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = cv.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const scale = e.ctrlKey ? 0.01 : 0.0015;
      const factor = Math.exp(-e.deltaY * scale);
      setView((v) => {
        const k2 = Math.max(0.35, Math.min(4, v.k * factor));
        const tx2 = px - (px - v.tx) * (k2 / v.k);
        const ty2 = py - (py - v.ty) * (k2 / v.k);
        return { tx: tx2, ty: ty2, k: k2 };
      });
    };
    cv.addEventListener('wheel', handler, { passive: false });
    return () => cv.removeEventListener('wheel', handler);
  }, []);

  const loaded = laidOut.length;

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', flex: 1, overflow: 'hidden', background: 'var(--nhi-ink)' }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          display: 'block',
          cursor: hoverId ? 'pointer' : dragRef.current ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      />

      {/* Top-left HUD — loaded counter */}
      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="nhi-panel" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="nhi-micro">NODES LOADED</span>
          <span className="nhi-mono" style={{ fontSize: 13, color: 'var(--nhi-sky)' }}>
            {loaded.toLocaleString()}
          </span>
          <span className="nhi-mono" style={{ fontSize: 11, color: 'var(--nhi-fog)' }}>
            / {totalNodes.toLocaleString()}
          </span>
          <span style={{ width: 60, height: 3, background: 'var(--nhi-ink-3)', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                width: totalNodes === 0 ? 0 : `${(100 * loaded) / totalNodes}%`,
                background: 'var(--nhi-sky)',
              }}
            />
          </span>
        </div>
        {selectedId && hopSet && (
          <div className="nhi-panel" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--nhi-violet)' }}>
              <NodeGlyph type={byId.get(selectedId)?.archive.node_type ?? 'concept'} size={12} />
            </span>
            <span className="nhi-mono" style={{ fontSize: 10, color: 'var(--nhi-bone)' }}>
              1-HOP: {hopSet.size - 1} neighbors
            </span>
          </div>
        )}
      </div>

      {/* Bottom-right HUD — zoom */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="nhi-panel" style={{ padding: '4px 6px', display: 'flex', gap: 2 }}>
          {[
            ['−', -1],
            ['⟲', 0],
            ['+', 1],
          ].map(([s, d], i) => (
            <button
              key={i}
              onClick={() => {
                if (d === 0) {
                  const margin = 40;
                  const sx = (size.w - margin * 2) / 1000;
                  const sy = (size.h - margin * 2) / 700;
                  const k = Math.min(sx, sy);
                  setView({ tx: (size.w - 1000 * k) / 2, ty: (size.h - 700 * k) / 2, k });
                } else {
                  setView((v) => ({
                    ...v,
                    k: Math.max(0.35, Math.min(4, v.k * ((d as number) > 0 ? 1.25 : 0.8))),
                  }));
                }
              }}
              style={{
                width: 26,
                height: 26,
                fontFamily: 'var(--nhi-f-mono)',
                fontSize: 14,
                color: 'var(--nhi-fog-2)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="nhi-panel" style={{ padding: '6px 10px' }}>
          <span className="nhi-mono" style={{ fontSize: 10, color: 'var(--nhi-fog)' }}>
            ZOOM
          </span>
          <span className="nhi-mono" style={{ fontSize: 11, color: 'var(--nhi-sky)', marginLeft: 6 }}>
            {view.k.toFixed(2)}×
          </span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoverId &&
        hoverId !== selectedId &&
        (() => {
          const n = byId.get(hoverId);
          if (!n) return null;
          return (
            <div
              className="nhi-panel"
              style={{ position: 'absolute', top: 50, left: 10, padding: '8px 10px', pointerEvents: 'none', maxWidth: 260 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--nhi-sky)' }}>
                  <NodeGlyph type={n.archive.node_type} size={12} />
                </span>
                <span className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog)', letterSpacing: '0.14em' }}>
                  {NODE_TYPE_META[n.archive.node_type]?.label ?? n.archive.node_type}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--nhi-f-body)',
                  fontSize: 13,
                  color: 'var(--nhi-bone)',
                  marginTop: 2,
                }}
              >
                {n.archive.label}
              </div>
              <div className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog)', marginTop: 4 }}>
                DEG {n.degree ?? 0}
                {n.archive.date_start ? ` · ${n.archive.date_start}` : ''}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
