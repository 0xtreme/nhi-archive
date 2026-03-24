import { useEffect, useMemo, useRef } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { NODE_COLORS, RELATION_COLORS } from '../lib/archive';
import type { ArchiveEdge, ArchiveNode } from '../types';

interface GraphViewProps {
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

function hashToUnit(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return (Math.abs(hash) % 10_000) / 10_000;
}

function layoutPosition(id: string, index: number): { x: number; y: number } {
  const radius = 3 + (index % 12) * 1.1;
  const angle = hashToUnit(id) * Math.PI * 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const isShort = normalized.length === 3;
  const full = isShort
    ? normalized
        .split('')
        .map((char) => `${char}${char}`)
        .join('')
    : normalized;

  const intAlpha = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return `#${full}${intAlpha.toString(16).padStart(2, '0')}`;
}

export function GraphView({ nodes, edges, selectedNodeId, onSelectNode }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Sigma | null>(null);

  const focusSet = useMemo(() => {
    if (!selectedNodeId) {
      return new Set<string>();
    }

    const neighborhood = new Set<string>([selectedNodeId]);
    for (const edge of edges) {
      if (edge.from_node_id === selectedNodeId) {
        neighborhood.add(edge.to_node_id);
      }
      if (edge.to_node_id === selectedNodeId) {
        neighborhood.add(edge.from_node_id);
      }
    }
    return neighborhood;
  }, [edges, selectedNodeId]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const graph = new Graph();
    const degreeCount = new Map<string, number>();

    for (const edge of edges) {
      degreeCount.set(edge.from_node_id, (degreeCount.get(edge.from_node_id) ?? 0) + 1);
      degreeCount.set(edge.to_node_id, (degreeCount.get(edge.to_node_id) ?? 0) + 1);
    }

    nodes.forEach((node, index) => {
      const degree = degreeCount.get(node.id) ?? 1;
      const position = layoutPosition(node.id, index);
      const baseColor = NODE_COLORS[node.node_type];

      const color =
        selectedNodeId === null || focusSet.size === 0 || focusSet.has(node.id)
          ? baseColor
          : withAlpha(baseColor, 0.2);

      graph.addNode(node.id, {
        label: node.label,
        x: position.x,
        y: position.y,
        size: 6 + Math.log2(degree + 1) * 3,
        color,
      });
    });

    for (const edge of edges) {
      if (!graph.hasNode(edge.from_node_id) || !graph.hasNode(edge.to_node_id)) {
        continue;
      }

      const key = edge.id;
      if (graph.hasEdge(key)) {
        continue;
      }

      const selectedEdge =
        selectedNodeId &&
        (edge.from_node_id === selectedNodeId || edge.to_node_id === selectedNodeId);

      graph.addEdgeWithKey(key, edge.from_node_id, edge.to_node_id, {
        label: edge.relationship,
        color:
          selectedNodeId && !selectedEdge
            ? withAlpha(RELATION_COLORS[edge.relationship] ?? '#4B5B76', 0.2)
            : RELATION_COLORS[edge.relationship] ?? '#4B5B76',
        size: selectedEdge ? 2.5 : 1.2,
      });
    }

    if (rendererRef.current) {
      rendererRef.current.kill();
    }

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      allowInvalidContainer: true,
      minCameraRatio: 0.03,
      maxCameraRatio: 3,
      labelDensity: 0.1,
      labelRenderedSizeThreshold: 8,
      defaultEdgeType: 'line',
    });

    rendererRef.current = renderer;

    renderer.on('clickNode', (event) => {
      onSelectNode(String(event.node));
    });

    renderer.on('doubleClickNode', (event) => {
      const attributes = graph.getNodeAttributes(String(event.node));
      renderer.getCamera().animate(
        {
          x: attributes.x,
          y: attributes.y,
          ratio: 0.15,
        },
        {
          duration: 500,
        },
      );
    });

    if (selectedNodeId && graph.hasNode(selectedNodeId)) {
      const attributes = graph.getNodeAttributes(selectedNodeId);
      renderer.getCamera().setState({
        x: attributes.x,
        y: attributes.y,
      });
    }

    return () => {
      renderer.kill();
    };
  }, [edges, focusSet, nodes, onSelectNode, selectedNodeId]);

  return (
    <section className="view graph-view">
      <div className="view-header">
        <h2>Graph View</h2>
        <p>
          Progressive neighbourhood visualization. Click to inspect a node. Double-click to zoom
          focus.
        </p>
      </div>
      <div ref={containerRef} className="graph-canvas" aria-label="Graph canvas" />
    </section>
  );
}
