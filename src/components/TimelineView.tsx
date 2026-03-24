import { type CSSProperties, useMemo } from 'react';
import { getYear, NODE_COLORS } from '../lib/archive';
import type { ArchiveNode } from '../types';

interface TimelineViewProps {
  nodes: ArchiveNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

interface MarkerRecord {
  id: string;
  label: string;
  node_type: ArchiveNode['node_type'];
  date_start: string | undefined;
  year: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function TimelineView({ nodes, selectedNodeId, onSelectNode }: TimelineViewProps) {
  const timeline = useMemo(() => {
    const sorted = nodes
      .map((node) => ({
        id: node.id,
        label: node.label,
        node_type: node.node_type,
        date_start: node.date_start,
        year: getYear(node.date_start),
      }))
      .filter((node): node is MarkerRecord => node.year !== null)
      .sort((left, right) => {
        if (left.year !== right.year) {
          return left.year - right.year;
        }
        return (left.date_start ?? '').localeCompare(right.date_start ?? '');
      });

    if (sorted.length === 0) {
      return {
        minYear: 1900,
        maxYear: new Date().getFullYear(),
        markers: [] as MarkerRecord[],
        density: [] as Array<{ decade: number; count: number }>,
        focusList: [] as MarkerRecord[],
      };
    }

    const minYear = sorted[0].year;
    const maxYear = sorted[sorted.length - 1].year;
    const markerBudgetPerYear = 4;

    const byYear = new Map<number, MarkerRecord[]>();
    for (const row of sorted) {
      const entries = byYear.get(row.year) ?? [];
      if (entries.length < markerBudgetPerYear) {
        entries.push(row);
      }
      byYear.set(row.year, entries);
    }

    const markers = Array.from(byYear.values()).flat();
    const decadeMap = new Map<number, number>();
    for (const row of sorted) {
      const decade = Math.floor(row.year / 10) * 10;
      decadeMap.set(decade, (decadeMap.get(decade) ?? 0) + 1);
    }

    const density = Array.from(decadeMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([decade, count]) => ({ decade, count }));

    const focusList = sorted.slice(Math.max(0, sorted.length - 180));

    return {
      minYear,
      maxYear,
      markers,
      density,
      focusList,
    };
  }, [nodes]);

  const maxDensity = useMemo(() => {
    if (timeline.density.length === 0) {
      return 1;
    }
    return Math.max(...timeline.density.map((entry) => entry.count));
  }, [timeline.density]);

  return (
    <section className="view timeline-view">
      <div className="view-header">
        <h2>Timeline View</h2>
        <p>
          Density graph + interactive rail. Click any marker to inspect details and keep filters in
          sync.
        </p>
      </div>

      <div className="timeline-scroll visual">
        <div className="timeline-density">
          {timeline.density.map((entry) => (
            <div key={entry.decade} className="timeline-density-bar-wrap">
              <div
                className="timeline-density-bar"
                style={{
                  height: `${clamp((entry.count / maxDensity) * 100, 8, 100)}%`,
                }}
                title={`${entry.decade}s • ${entry.count} records`}
              />
              <small>{entry.decade}</small>
            </div>
          ))}
        </div>

        <div className="timeline-rail-wrap">
          <div className="timeline-rail-labels">
            <span>{timeline.minYear}</span>
            <span>{timeline.maxYear}</span>
          </div>

          <div className="timeline-rail">
            {timeline.markers.map((record) => {
              const range = Math.max(1, timeline.maxYear - timeline.minYear);
              const pct = ((record.year - timeline.minYear) / range) * 100;
              const selected = selectedNodeId === record.id;

              return (
                <button
                  key={record.id}
                  className={`timeline-marker ${selected ? 'active' : ''}`}
                  style={{
                    left: `${pct}%`,
                    '--marker-color': NODE_COLORS[record.node_type],
                  } as CSSProperties}
                  title={`${record.label} (${record.date_start ?? record.year})`}
                  onClick={() => onSelectNode(record.id)}
                />
              );
            })}
          </div>
        </div>

        <div className="timeline-focus-list">
          {timeline.focusList.map((record) => (
            <button
              key={record.id}
              className={selectedNodeId === record.id ? 'timeline-card active' : 'timeline-card'}
              onClick={() => onSelectNode(record.id)}
            >
              <span className="timeline-card-type">{record.node_type}</span>
              <strong>{record.label}</strong>
              <small>{record.date_start ?? `${record.year}`}</small>
            </button>
          ))}

          {timeline.focusList.length === 0 && (
            <p className="timeline-empty">No records in this date range.</p>
          )}
        </div>
      </div>
    </section>
  );
}
