import { useEffect, useMemo, useRef, useState } from 'react';
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
  summary: string;
  color: string;
  size: number;
  isSelected: boolean;
  isNeighbor: boolean;
  x?: number;
  y?: number;
}

interface RenderLink {
  id: string;
  source: string;
  target: string;
  relationship: string;
  color: string;
  width: number;
  isHighlighted: boolean;
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  nodeType: ArchiveNode['node_type'],
  x: number,
  y: number,
  size: number,
) {
  if (nodeType === 'organization') {
    ctx.rect(x - size, y - size, size * 2, size * 2);
    return;
  }

  if (nodeType === 'location') {
    ctx.moveTo(x, y - size * 1.1);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x - size, y + size);
    ctx.closePath();
    return;
  }

  if (nodeType === 'statement') {
    ctx.moveTo(x, y - size * 1.2);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size * 1.2);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    return;
  }

  if (nodeType === 'event') {
    const inner = size * 0.45;
    const outer = size * 1.1;
    for (let point = 0; point < 10; point += 1) {
      const radius = point % 2 === 0 ? outer : inner;
      const angle = (Math.PI / 5) * point - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (point === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    return;
  }

  ctx.arc(x, y, size, 0, 2 * Math.PI);
}

export function GraphView({ nodes, edges, selectedNodeId, onSelectNode }: GraphViewProps) {
  const graphRef = useRef<ForceGraphMethods<RenderNode, RenderLink> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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
        summary: node.summary,
        color: NODE_COLORS[node.node_type],
        size: 3 + Math.log2(degree + 2) * 1.8,
        isSelected,
        isNeighbor,
      };
    });

    const renderLinks: RenderLink[] = edges.map((edge) => {
      const isHighlighted =
        selectedNodeId !== null &&
        (edge.from_node_id === selectedNodeId || edge.to_node_id === selectedNodeId);

      return {
        id: edge.id,
        source: edge.from_node_id,
        target: edge.to_node_id,
        relationship: edge.relationship,
        color: RELATION_COLORS[edge.relationship] ?? '#3F5876',
        width: isHighlighted ? 1.8 : 0.7,
        isHighlighted,
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

    graphRef.current.centerAt(focusNode.x, focusNode.y, 500);
    graphRef.current.zoom(4, 600);
  }, [graphData.nodes, selectedNodeId]);

  return (
    <section className="view graph-view">
      <div className="view-header">
        <h2>Graph View</h2>
        <p>Modern force-directed canvas with draggable nodes, click-to-focus, and relationship glow.</p>
      </div>

      <div className="graph-canvas modern" ref={containerRef}>
        {size.width > 0 && size.height > 0 && (
          <ForceGraph2D<RenderNode, RenderLink>
            ref={graphRef}
            width={size.width}
            height={size.height}
            graphData={graphData}
            backgroundColor="#060F1A"
            cooldownTicks={120}
            d3VelocityDecay={0.27}
            enableNodeDrag
            linkDirectionalArrowLength={2.5}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={(link) => (link.isHighlighted ? 2 : 0)}
            linkDirectionalParticleWidth={1.6}
            linkColor={(link) =>
              selectedNodeId && !link.isHighlighted
                ? 'rgba(72, 95, 129, 0.2)'
                : (link.color ?? '#3F5876')
            }
            linkWidth={(link) => link.width}
            nodeLabel={(node) => `${node.label} (${node.nodeType})`}
            onNodeClick={(node) => {
              onSelectNode(node.id);
            }}
            onBackgroundClick={() => {
              if (graphRef.current) {
                graphRef.current.zoomToFit(550, 60);
              }
            }}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const isActive = selectedNodeId ? node.isSelected || node.isNeighbor : true;
              const alpha = isActive ? 1 : 0.18;
              const sizeScale = node.isSelected ? node.size * 1.5 : node.size;
              const x = node.x ?? 0;
              const y = node.y ?? 0;

              ctx.beginPath();
              drawShape(ctx, node.nodeType, x, y, sizeScale);
              ctx.fillStyle = node.color;
              ctx.globalAlpha = alpha;
              ctx.shadowBlur = node.isSelected ? 22 : node.isNeighbor ? 10 : 2;
              ctx.shadowColor = node.color;
              ctx.fill();

              if (node.isSelected) {
                ctx.beginPath();
                ctx.arc(x, y, sizeScale + 4, 0, Math.PI * 2);
                ctx.strokeStyle = '#E5FAFF';
                ctx.lineWidth = 1.2;
                ctx.stroke();
              }

              ctx.globalAlpha = 1;
              ctx.shadowBlur = 0;

              if (globalScale > 1.7 || node.isSelected) {
                const fontSize = Math.max(9, 14 / globalScale);
                ctx.font = `600 ${fontSize}px "IBM Plex Mono"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillStyle = node.isSelected ? '#EAF9FF' : '#9AB9D9';
                ctx.fillText(node.label, x, y - sizeScale - 3);
              }
            }}
          />
        )}
      </div>
    </section>
  );
}
