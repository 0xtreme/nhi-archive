import { useMemo } from 'react';
import type { ArchiveEdge, ArchiveNode } from '../types';

interface DetailPanelProps {
  node: ArchiveNode | null;
  edges: ArchiveEdge[];
  nodeLookup: Map<string, ArchiveNode>;
  onSelectNode: (nodeId: string) => void;
}

interface RelatedGroup {
  relationship: string;
  nodes: ArchiveNode[];
}

export function DetailPanel({ node, edges, nodeLookup, onSelectNode }: DetailPanelProps) {
  const relatedGroups = useMemo<RelatedGroup[]>(() => {
    if (!node) {
      return [];
    }

    const grouped = new Map<string, ArchiveNode[]>();

    for (const edge of edges) {
      if (edge.from_node_id !== node.id && edge.to_node_id !== node.id) {
        continue;
      }

      const otherId = edge.from_node_id === node.id ? edge.to_node_id : edge.from_node_id;
      const related = nodeLookup.get(otherId);
      if (!related) {
        continue;
      }

      const existing = grouped.get(edge.relationship) ?? [];
      if (!existing.find((item) => item.id === related.id)) {
        existing.push(related);
      }
      grouped.set(edge.relationship, existing);
    }

    return Array.from(grouped.entries()).map(([relationship, nodes]) => ({
      relationship,
      nodes: nodes.slice(0, 8),
    }));
  }, [edges, node, nodeLookup]);

  if (!node) {
    return (
      <aside className="detail-panel empty">
        <h2>Detail Panel</h2>
        <p>Select any node from Graph, Map, Timeline, or Search to inspect full metadata.</p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <div className="panel-header">
        <h2>{node.label}</h2>
        <span className={`confidence ${node.confidence}`}>{node.confidence}</span>
      </div>

      <div className="detail-meta">
        <p>
          <strong>Type:</strong> {node.node_type}
        </p>
        {node.date_start && (
          <p>
            <strong>Date:</strong> {node.date_start}
            {node.date_end ? ` to ${node.date_end}` : ''}
          </p>
        )}
        {node.location_name && (
          <p>
            <strong>Location:</strong> {node.location_name}
          </p>
        )}
        {node.classification && (
          <p>
            <strong>Classification:</strong> {node.classification}
          </p>
        )}
      </div>

      <p className="detail-summary">{node.summary}</p>

      {node.tags.length > 0 && (
        <div className="detail-tags">
          {node.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      <section>
        <h3>Sources</h3>
        <ul className="source-list">
          {node.sources.map((source) => (
            <li key={source}>
              <a href={source} target="_blank" rel="noreferrer">
                {source}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {relatedGroups.length > 0 && (
        <section>
          <h3>Related Nodes</h3>
          <div className="related-groups">
            {relatedGroups.map((group) => (
              <div key={group.relationship} className="related-group">
                <h4>{group.relationship}</h4>
                {group.nodes.map((relatedNode) => (
                  <button key={relatedNode.id} onClick={() => onSelectNode(relatedNode.id)}>
                    <span>{relatedNode.label}</span>
                    <small>{relatedNode.node_type}</small>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
