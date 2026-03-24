import { useMemo } from 'react';
import { getYear } from '../lib/archive';
import type { ArchiveNode } from '../types';

interface TimelineViewProps {
  nodes: ArchiveNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

interface TimelineGroup {
  year: number;
  records: ArchiveNode[];
}

export function TimelineView({ nodes, selectedNodeId, onSelectNode }: TimelineViewProps) {
  const groups = useMemo<TimelineGroup[]>(() => {
    const map = new Map<number, ArchiveNode[]>();

    for (const node of nodes) {
      const year = getYear(node.date_start);
      if (year === null) {
        continue;
      }

      const existing = map.get(year) ?? [];
      existing.push(node);
      map.set(year, existing);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, records]) => ({
        year,
        records: records.sort((left, right) => {
          const leftDate = left.date_start ?? '';
          const rightDate = right.date_start ?? '';
          return leftDate.localeCompare(rightDate);
        }),
      }));
  }, [nodes]);

  return (
    <section className="view timeline-view">
      <div className="view-header">
        <h2>Timeline View</h2>
        <p>Chronological swimlane by node type. Click a card for full detail.</p>
      </div>

      <div className="timeline-scroll" role="list" aria-label="Timeline records">
        {groups.map((group) => (
          <div key={group.year} className="timeline-group">
            <div className="timeline-year">{group.year}</div>
            <div className="timeline-records">
              {group.records.map((record) => (
                <button
                  key={record.id}
                  className={selectedNodeId === record.id ? 'timeline-card active' : 'timeline-card'}
                  onClick={() => onSelectNode(record.id)}
                >
                  <span className="timeline-card-type">{record.node_type}</span>
                  <strong>{record.label}</strong>
                  <small>{record.date_start ?? 'unknown date'}</small>
                </button>
              ))}
            </div>
          </div>
        ))}

        {groups.length === 0 && <p className="timeline-empty">No records in this date range.</p>}
      </div>
    </section>
  );
}
