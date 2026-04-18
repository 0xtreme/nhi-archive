import { useEffect, useMemo, useRef, useState } from 'react';
import { drawGlyph } from '../../lib/graphDrawing';
import { runSimulation, type SimEdge, type SimNode } from '../../lib/graphSim';
import { NODE_TYPE_META } from '../../lib/taxonomy';
import type { ArchiveEdge, ArchiveNode, NodeType } from '../../types';
import { NodeGlyph } from '../NodeGlyph';

interface SceneCanvasProps {
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
  seedIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  showCommunities: boolean;
}

interface LaidOutNode extends SimNode {
  archive: ArchiveNode;
  isSeed: boolean;
}

interface ViewTransform {
  tx: number;
  ty: number;
  k: number;
}

// Deterministic HSL for community colors — hue from id, saturation/light fixed.
function communityColor(id: number | null | undefined) {
  if (id == null) return 'rgba(148,163,216,0.45)';
  const hue = (id * 47) % 360;
  return `hsla(${hue}, 55%, 70%, 0.55)`;
}

/**
 * Scene canvas — renders an active scene (seed + expanded neighbors).
 * Unlike the previous hairball view this never gets more than a few
 * hundred nodes, so the force sim and canvas draws stay fast even on
 * modest hardware.
 *
 * Semantic zoom: label / edge-type / glyph strength are derived from
 * the camera's scale factor k, not from the node's world size.
 *   k < 0.8  → dots only, soft edges, no labels
 *   0.8 ≤ k < 2 → core + seed labels, edges with type hue
 *   k ≥ 2 → all labels, edge relationship labels, degree chips
 *
 * Interactions:
 *   - single click: select (opens the detail panel upstream)
 *   - double click: expand (upstream fetches /api/expand and merges)
 *   - drag empty canvas: pan
 *   - wheel / pinch: zoom (non-passive so trackpad pinch works on mac)
 */
export function SceneCanvas({
  nodes,
  edges,
  seedIds,
  selectedId,
  onSelect,
  onExpand,
  showCommunities,
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<ViewTransform>({ tx: 0, ty: 0, k: 1 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  const seedSet = useMemo(() => new Set(seedIds), [seedIds]);

  // Build + run sim whenever the scene changes. Because a scene is ≤~200
  // nodes this runs in <50 ms even with a full 180-iteration budget.
  const laidOut = useMemo<LaidOutNode[]>(() => {
    if (nodes.length === 0) return [];
    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.from_node_id, (degree.get(e.from_node_id) ?? 0) + 1);
      degree.set(e.to_node_id, (degree.get(e.to_node_id) ?? 0) + 1);
    }
    const simNodes: LaidOutNode[] = nodes.map((n) => ({
      id: n.id,
      core: seedSet.has(n.id) || (degree.get(n.id) ?? 0) >= 2,
      degree: degree.get(n.id) ?? 0,
      archive: n,
      isSeed: seedSet.has(n.id),
    }));
    const simEdges: SimEdge[] = edges.map((e) => ({
      source: e.from_node_id,
      target: e.to_node_id,
      rel: e.relationship,
    }));
    runSimulation(simNodes, simEdges, { iterations: 180, width: 1000, height: 700 });
    return simNodes;
  }, [nodes, edges, seedSet]);

  const byId = useMemo(() => new Map(laidOut.map((n) => [n.id, n])), [laidOut]);
  const hopSet = useMemo(() => {
    if (!selectedId) return null;
    if (!byId.has(selectedId)) return null;
    const s = new Set<string>([selectedId]);
    for (const e of edges) {
      if (e.from_node_id === selectedId) s.add(e.to_node_id);
      if (e.to_node_id === selectedId) s.add(e.from_node_id);
    }
    return s;
  }, [selectedId, edges, byId]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size.w || !size.h || laidOut.length === 0) return;
    const margin = 50;
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

    // Resolve CSS variables once per frame so the canvas tracks the
    // active theme. Falls back to the dark-mode literals if the token
    // isn't set yet (first paint before the stylesheet applies).
    const css = getComputedStyle(document.documentElement);
    const read = (name: string, fb: string) => {
      const v = css.getPropertyValue(name).trim();
      return v || fb;
    };
    const edgeDim = read('--nhi-edge-dim', 'rgba(148,163,216,0.14)');
    const edgeLit = read('--nhi-edge', 'rgba(196,181,253,0.38)');
    const backdropWash = read('--nhi-backdrop-wash', 'rgba(125,211,252,0.05)');
    const backdropEdge = read('--nhi-backdrop-edge', 'rgba(5,7,13,0.7)');
    const boneColor = read('--nhi-bone', '#e7ebf7');
    const fogColor = read('--nhi-fog', '#9aa4c7');

    // Soft backdrop — subtle radial glow
    const cx = size.w / 2;
    const cy = size.h / 2;
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(size.w, size.h));
    bg.addColorStop(0, backdropWash);
    bg.addColorStop(1, backdropEdge);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size.w, size.h);

    ctx.save();
    ctx.translate(view.tx, view.ty);
    ctx.scale(view.k, view.k);

    // Community halos — drawn underneath everything when enabled
    if (showCommunities) {
      for (const n of laidOut) {
        const cid = n.archive.community_id as number | null | undefined;
        if (cid == null) continue;
        const color = communityColor(cid);
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(n.x as number, n.y as number, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Edges
    ctx.lineWidth = 0.8 / view.k;
    for (const e of edges) {
      const a = byId.get(e.from_node_id);
      const b = byId.get(e.to_node_id);
      if (!a || !b) continue;
      const inHop = hopSet && hopSet.has(e.from_node_id) && hopSet.has(e.to_node_id);
      const dim = hopSet && !inHop;
      ctx.strokeStyle = inHop ? edgeLit : dim ? edgeDim : edgeLit;
      ctx.beginPath();
      ctx.moveTo(a.x as number, a.y as number);
      ctx.lineTo(b.x as number, b.y as number);
      ctx.stroke();

      // Edge-type label at close zoom
      if (view.k >= 2 && !dim) {
        const mx = ((a.x as number) + (b.x as number)) / 2;
        const my = ((a.y as number) + (b.y as number)) / 2;
        ctx.save();
        ctx.font = `${8 / view.k}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = inHop ? edgeLit : edgeDim;
        ctx.textAlign = 'center';
        ctx.fillText(e.relationship, mx, my - 2 / view.k);
        ctx.restore();
      }
    }

    // Nodes
    for (const n of laidOut) {
      const isSel = n.id === selectedId;
      const isHover = n.id === hoverId;
      const inHop = hopSet && hopSet.has(n.id);
      const dim = hopSet && !inHop;
      const alpha = isSel ? 1 : dim ? 0.2 : n.isSeed ? 1 : 0.9;
      // Keep node size roughly constant in screen space — divide world
      // radius by k so nodes don't explode when zoomed in.
      const baseR = n.isSeed ? 8 : isHover ? 7 : n.core ? 6 : 5;
      const r = baseR / Math.max(0.5, view.k * 0.6);

      const color = isSel
        ? boneColor
        : n.isSeed
          ? '#c4b5fd'
          : n.core && inHop
            ? '#c4b5fd'
            : n.core
              ? '#7dd3fc'
              : fogColor;

      if (n.isSeed || isSel) {
        ctx.save();
        ctx.shadowColor = isSel ? boneColor : '#c4b5fd';
        ctx.shadowBlur = isSel ? 20 : 12;
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
        ctx.strokeStyle = boneColor;
        ctx.lineWidth = 1 / view.k;
        ctx.setLineDash([3 / view.k, 3 / view.k]);
        ctx.beginPath();
        ctx.arc(n.x as number, n.y as number, r + 5 / view.k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Semantic zoom labels
      const showLabel =
        (view.k >= 2) ||
        (view.k >= 0.8 && (n.isSeed || isSel || isHover || n.core)) ||
        isSel;
      if (!dim && showLabel) {
        ctx.save();
        ctx.font = `${(isSel || n.isSeed ? 12 : 10) / Math.max(0.8, view.k * 0.8)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = boneColor;
        ctx.textAlign = 'left';
        const labelOffset = r + 6 / view.k;
        ctx.fillText(n.archive.label, (n.x as number) + labelOffset, (n.y as number) + 3 / view.k);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [size, view, laidOut, edges, byId, selectedId, hoverId, hopSet, showCommunities]);

  // Pointer + wheel interactions
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const mouseDownPos = useRef<{ x: number; y: number; id: string | null } | null>(null);

  const pickAt = (px: number, py: number): LaidOutNode | null => {
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
    return best;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const hit = pickAt(px, py);
    mouseDownPos.current = { x: e.clientX, y: e.clientY, id: hit?.id ?? null };
    if (!hit) dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const hit = pickAt(px, py);
    setHoverId(hit?.id ?? null);
    if (dragRef.current) {
      setView((v) => ({
        ...v,
        tx: dragRef.current!.tx + (e.clientX - dragRef.current!.x),
        ty: dragRef.current!.ty + (e.clientY - dragRef.current!.y),
      }));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const down = mouseDownPos.current;
    dragRef.current = null;
    mouseDownPos.current = null;
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const moved = Math.sqrt(dx * dx + dy * dy) > 4;
    if (!moved && down.id) onSelect(down.id);
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const hit = pickAt(px, py);
    if (hit) onExpand(hit.id);
  };

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
        const k2 = Math.max(0.35, Math.min(6, v.k * factor));
        const tx2 = px - (px - v.tx) * (k2 / v.k);
        const ty2 = py - (py - v.ty) * (k2 / v.k);
        return { tx: tx2, ty: ty2, k: k2 };
      });
    };
    cv.addEventListener('wheel', handler, { passive: false });
    return () => cv.removeEventListener('wheel', handler);
  }, []);

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
        onPointerLeave={() => {
          dragRef.current = null;
          mouseDownPos.current = null;
          setHoverId(null);
        }}
        onDoubleClick={onDoubleClick}
        style={{
          display: 'block',
          cursor: hoverId ? 'pointer' : dragRef.current ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <div className="nhi-panel" style={{ padding: '6px 10px' }}>
          <span className="nhi-mono" style={{ fontSize: 10, color: 'var(--nhi-fog)' }}>
            ZOOM
          </span>
          <span
            className="nhi-mono"
            style={{ fontSize: 11, color: 'var(--nhi-sky)', marginLeft: 6 }}
          >
            {view.k.toFixed(2)}×
          </span>
        </div>
      </div>

      {hoverId && hoverId !== selectedId && (() => {
        const n = byId.get(hoverId);
        if (!n) return null;
        return (
          <div
            className="nhi-panel"
            style={{
              position: 'absolute',
              top: 50,
              left: 10,
              padding: '8px 10px',
              pointerEvents: 'none',
              maxWidth: 280,
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--nhi-sky)' }}>
                <NodeGlyph type={n.archive.node_type} size={12} />
              </span>
              <span
                className="nhi-mono"
                style={{
                  fontSize: 9,
                  color: 'var(--nhi-fog)',
                  letterSpacing: '0.14em',
                }}
              >
                {(NODE_TYPE_META[n.archive.node_type as NodeType]?.label ?? n.archive.node_type)}
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
            <div
              className="nhi-mono"
              style={{ fontSize: 9, color: 'var(--nhi-fog)', marginTop: 4 }}
            >
              DEG {n.degree ?? 0}
              {n.archive.date_start ? ' · ' + n.archive.date_start : ''}
              {n.archive.community_id != null ? ' · c' + n.archive.community_id : ''}
            </div>
            <div
              className="nhi-mono"
              style={{
                fontSize: 9,
                color: 'var(--nhi-sky)',
                marginTop: 6,
                letterSpacing: '0.14em',
              }}
            >
              CLICK → SELECT · DOUBLE-CLICK → EXPAND
            </div>
          </div>
        );
      })()}
    </div>
  );
}
