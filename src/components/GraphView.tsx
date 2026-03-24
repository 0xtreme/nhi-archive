import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { NODE_COLORS, RELATION_COLORS } from '../lib/archive';
import type { ArchiveEdge, ArchiveNode } from '../types';

interface GraphViewProps {
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

interface RenderNode {
  id: string;
  label: string;
  nodeType: ArchiveNode['node_type'];
  confidence: ArchiveNode['confidence'];
  color: string;
  size: number;
  isSelected: boolean;
  isNeighbor: boolean;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface RenderLink {
  id: string;
  source: string;
  target: string;
  relationship: string;
  color: string;
  width: number;
  isHighlighted: boolean;
  dashed: boolean;
  curvature: number;
}

const DASHED_RELATIONSHIPS = new Set(['CORROBORATES', 'CONTRADICTS', 'PRECEDED']);

const NODE_LEGEND: Array<{
  type: ArchiveNode['node_type'];
  label: string;
  shapeClass: string;
}> = [
  { type: 'incident', label: 'Incident', shapeClass: 'hex' },
  { type: 'person', label: 'Person', shapeClass: 'circle' },
  { type: 'organization', label: 'Organization', shapeClass: 'square' },
  { type: 'location', label: 'Location', shapeClass: 'triangle' },
  { type: 'statement', label: 'Statement', shapeClass: 'diamond' },
  { type: 'artifact', label: 'Artifact', shapeClass: 'pentagon' },
  { type: 'designation', label: 'Designation', shapeClass: 'hexstar' },
  { type: 'event', label: 'Event', shapeClass: 'star' },
  { type: 'media', label: 'Media', shapeClass: 'arrow' },
];

const EDGE_LEGEND: Array<{ label: string; color: string; dashed?: boolean }> = [
  { label: 'WITNESSED', color: RELATION_COLORS.WITNESSED ?? '#00C8FF' },
  { label: 'INVESTIGATED', color: RELATION_COLORS.INVESTIGATED ?? '#FFB800' },
  { label: 'CORROBORATES', color: RELATION_COLORS.CORROBORATES ?? '#00E5A0', dashed: true },
  { label: 'CONTRADICTS', color: RELATION_COLORS.CONTRADICTS ?? '#FF4444', dashed: true },
];

function hash01(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return (Math.abs(hash) % 10_000) / 10_000;
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sides: number,
  radius: number,
  rotation = -Math.PI / 2,
) {
  for (let step = 0; step < sides; step += 1) {
    const angle = rotation + (Math.PI * 2 * step) / sides;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (step === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  points = 5,
) {
  for (let step = 0; step < points * 2; step += 1) {
    const radius = step % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * step - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (step === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  nodeType: ArchiveNode['node_type'],
  x: number,
  y: number,
  size: number,
) {
  if (nodeType === 'person') {
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    return;
  }

  if (nodeType === 'incident') {
    drawPolygon(ctx, x, y, 6, size);
    return;
  }

  if (nodeType === 'organization') {
    ctx.rect(x - size, y - size, size * 2, size * 2);
    return;
  }

  if (nodeType === 'location') {
    drawPolygon(ctx, x, y, 3, size * 1.15, Math.PI / 2);
    return;
  }

  if (nodeType === 'statement') {
    drawPolygon(ctx, x, y, 4, size * 1.1, 0);
    return;
  }

  if (nodeType === 'artifact') {
    drawPolygon(ctx, x, y, 5, size * 1.05);
    return;
  }

  if (nodeType === 'designation') {
    drawStar(ctx, x, y, size * 0.52, size * 1.15, 6);
    return;
  }

  if (nodeType === 'event') {
    drawStar(ctx, x, y, size * 0.45, size * 1.12, 5);
    return;
  }

  if (nodeType === 'media') {
    ctx.moveTo(x - size * 1.05, y - size * 0.9);
    ctx.lineTo(x + size * 1.15, y);
    ctx.lineTo(x - size * 1.05, y + size * 0.9);
    ctx.closePath();
    return;
  }

  ctx.arc(x, y, size, 0, 2 * Math.PI);
}

function confidenceRing(node: RenderNode): { color: string; width: number; dashed?: boolean } {
  if (node.confidence === 'high') {
    return { color: '#00E5A0', width: 1.65 };
  }
  if (node.confidence === 'medium') {
    return { color: '#FFB800', width: 1.3 };
  }
  if (node.confidence === 'low') {
    return { color: '#9AB3CB', width: 1.1 };
  }
  return { color: '#FF5454', width: 1.3, dashed: true };
}

export function GraphView({ nodes, edges, selectedNodeId, onSelectNode }: GraphViewProps) {
  const graphRef = useRef<ForceGraphMethods<RenderNode, RenderLink> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const initialFitDoneRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const nextWidth = Math.floor(entry.contentRect.width);
      const nextHeight = Math.floor(entry.contentRect.height);
      setSize({ width: nextWidth, height: nextHeight });
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!graphRef.current) {
      return;
    }

    const linkForce = graphRef.current.d3Force('link') as
      | {
          distance?: (distance: number) => void;
          strength?: (value: number) => void;
        }
      | undefined;
    linkForce?.distance?.(24);
    linkForce?.strength?.(0.34);

    const chargeForce = graphRef.current.d3Force('charge') as
      | {
          strength?: (value: number) => void;
        }
      | undefined;
    chargeForce?.strength?.(-34);

    const centerForce = graphRef.current.d3Force('center') as
      | {
          strength?: (value: number) => void;
        }
      | undefined;
    centerForce?.strength?.(0.48);

    graphRef.current.d3ReheatSimulation();
  }, [edges.length, nodes.length]);

  const neighborSet = useMemo(() => {
    if (!selectedNodeId) {
      return new Set<string>();
    }

    const result = new Set<string>([selectedNodeId]);
    for (const edge of edges) {
      if (edge.from_node_id === selectedNodeId) {
        result.add(edge.to_node_id);
      }
      if (edge.to_node_id === selectedNodeId) {
        result.add(edge.from_node_id);
      }
    }
    return result;
  }, [edges, selectedNodeId]);

  const graphData = useMemo<{ nodes: RenderNode[]; links: RenderLink[] }>(() => {
    const degrees = new Map<string, number>();
    for (const edge of edges) {
      degrees.set(edge.from_node_id, (degrees.get(edge.from_node_id) ?? 0) + 1);
      degrees.set(edge.to_node_id, (degrees.get(edge.to_node_id) ?? 0) + 1);
    }

    const renderNodes: RenderNode[] = nodes.map((node) => {
      const degree = degrees.get(node.id) ?? 0;
      const isSelected = selectedNodeId === node.id;
      const isNeighbor = neighborSet.has(node.id);
      return {
        id: node.id,
        label: node.label,
        nodeType: node.node_type,
        confidence: node.confidence,
        color: NODE_COLORS[node.node_type],
        size: 3.4 + Math.log2(degree + 2) * 1.55,
        isSelected,
        isNeighbor,
      };
    });

    const renderLinks: RenderLink[] = edges.map((edge) => {
      const isHighlighted =
        selectedNodeId !== null &&
        (edge.from_node_id === selectedNodeId || edge.to_node_id === selectedNodeId);
      const dashed = DASHED_RELATIONSHIPS.has(edge.relationship);

      const confidenceWeight =
        edge.confidence === 'high' ? 1.35 : edge.confidence === 'medium' ? 1 : edge.confidence === 'low' ? 0.82 : 0.9;

      return {
        id: edge.id,
        source: edge.from_node_id,
        target: edge.to_node_id,
        relationship: edge.relationship,
        color: RELATION_COLORS[edge.relationship] ?? '#3F5876',
        width: (isHighlighted ? 1.95 : 0.75) * confidenceWeight,
        isHighlighted,
        dashed,
        curvature: (hash01(edge.id) - 0.5) * 0.34,
      };
    });

    return { nodes: renderNodes, links: renderLinks };
  }, [edges, neighborSet, nodes, selectedNodeId]);

  useEffect(() => {
    if (!selectedNodeId || !graphRef.current) {
      return;
    }

    const focusNode = graphData.nodes.find((node) => node.id === selectedNodeId);
    if (!focusNode || typeof focusNode.x !== 'number' || typeof focusNode.y !== 'number') {
      return;
    }

    graphRef.current.centerAt(focusNode.x, focusNode.y, 560);
    graphRef.current.zoom(4.2, 620);
  }, [graphData.nodes, selectedNodeId]);

  return (
    <section className="view graph-view">
      <div className="view-header">
        <h2>Graph View</h2>
        <p>Click any node to focus and inspect details. Labels stay hidden until selection for a cleaner canvas.</p>
      </div>

      <div className="graph-canvas modern" ref={containerRef}>
        {size.width > 0 && size.height > 0 && (
          <ForceGraph2D<RenderNode, RenderLink>
            ref={graphRef}
            width={size.width}
            height={size.height}
            graphData={graphData}
            backgroundColor="#050F19"
            warmupTicks={40}
            cooldownTicks={220}
            d3AlphaDecay={0.028}
            d3VelocityDecay={0.22}
            enableNodeDrag
            linkCurvature={(link) => link.curvature}
            linkLineDash={(link) => (link.dashed ? [5, 4] : null)}
            linkDirectionalArrowLength={(link) => (link.isHighlighted ? 5.2 : 3.1)}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={(link) =>
              selectedNodeId && !link.isHighlighted ? 'rgba(120, 144, 178, 0.35)' : (link.color ?? '#3F5876')
            }
            linkDirectionalParticles={(link) => (link.isHighlighted ? 2 : 0)}
            linkDirectionalParticleSpeed={(link) => (link.isHighlighted ? 0.008 : 0.0032)}
            linkDirectionalParticleWidth={(link) => (link.isHighlighted ? 2 : 1.1)}
            linkDirectionalParticleColor={(link) => link.color}
            linkColor={(link) =>
              selectedNodeId && !link.isHighlighted ? 'rgba(72, 95, 129, 0.16)' : (link.color ?? '#3F5876')
            }
            linkWidth={(link) => link.width}
            nodeLabel={(node) => `${node.label} (${node.nodeType})`}
            onEngineStop={() => {
              if (!initialFitDoneRef.current && graphRef.current) {
                graphRef.current.zoomToFit(850, 78);
                initialFitDoneRef.current = true;
              }
            }}
            onNodeDragEnd={(node) => {
              node.fx = node.x;
              node.fy = node.y;
            }}
            onNodeClick={(node) => {
              onSelectNode(node.id);
            }}
            onBackgroundClick={() => {
              if (graphRef.current) {
                graphRef.current.zoomToFit(550, 66);
              }
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              const x = node.x ?? 0;
              const y = node.y ?? 0;
              const hitSize = Math.max(node.size * 2.6, 12);
              ctx.beginPath();
              ctx.arc(x, y, hitSize, 0, Math.PI * 2);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const isActive = selectedNodeId ? node.isSelected || node.isNeighbor : true;
              const alpha = isActive ? 1 : 0.14;
              const sizeScale = node.isSelected ? node.size * 2.25 : node.size;
              const x = node.x ?? 0;
              const y = node.y ?? 0;
              const ring = confidenceRing(node);

              ctx.save();
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              drawShape(ctx, node.nodeType, x, y, sizeScale);
              ctx.fillStyle = node.color;
              ctx.shadowBlur = node.isSelected ? 24 : node.isNeighbor ? 12 : 3;
              ctx.shadowColor = node.color;
              ctx.fill();

              ctx.beginPath();
              drawShape(ctx, node.nodeType, x, y, sizeScale + 1.7);
              ctx.lineWidth = node.isSelected ? ring.width + 0.7 : ring.width;
              ctx.strokeStyle = ring.color;
              if (ring.dashed) {
                ctx.setLineDash([3, 2]);
              }
              ctx.stroke();
              ctx.setLineDash([]);

              if (node.isSelected) {
                ctx.beginPath();
                ctx.arc(x, y, sizeScale + 5, 0, Math.PI * 2);
                ctx.strokeStyle = '#E9FAFF';
                ctx.lineWidth = 1.2;
                ctx.stroke();
              }

              ctx.shadowBlur = 0;
              ctx.globalAlpha = 1;

              if (node.isSelected) {
                const fontSize = Math.max(8.6, 13 / globalScale);
                ctx.font = `600 ${fontSize}px "Space Mono"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillStyle = node.isSelected ? '#EAF9FF' : '#9AB9D9';
                ctx.fillText(node.label, x, y - sizeScale - 4);
              }

              ctx.restore();
            }}
          />
        )}

        <div className="graph-hud">
          <div className="graph-statline">
            <span>Nodes {nodes.length}</span>
            <span>Edges {edges.length}</span>
            <span>Drag to rearrange</span>
          </div>

          <div className="graph-legend">
            <div className="graph-legend-group">
              <h4>Node Types</h4>
              <div className="graph-legend-grid">
                {NODE_LEGEND.map((entry) => (
                  <div key={entry.type} className="graph-legend-item">
                    <span
                      className={`legend-shape ${entry.shapeClass}`}
                      style={{ '--legend-color': NODE_COLORS[entry.type] } as CSSProperties}
                    />
                    <span>{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="graph-legend-group">
              <h4>Edge Semantics</h4>
              <div className="graph-legend-grid edges">
                {EDGE_LEGEND.map((entry) => (
                  <div key={entry.label} className="graph-legend-item">
                    <span
                      className={`legend-edge-line${entry.dashed ? ' dashed' : ''}`}
                      style={{ '--legend-edge': entry.color } as CSSProperties}
                    />
                    <span>{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
