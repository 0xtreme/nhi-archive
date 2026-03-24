import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { getYear, NODE_COLORS } from '../lib/archive';
import type { ArchiveNode } from '../types';

interface TimelineViewProps {
  nodes: ArchiveNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

interface TimelineRecord {
  id: string;
  label: string;
  node_type: ArchiveNode['node_type'];
  date_start: string | undefined;
  year: number;
}

interface TimelineBucket {
  start: number;
  end: number;
  count: number;
  representativeId: string | null;
}

export function TimelineView({ nodes, selectedNodeId, onSelectNode }: TimelineViewProps) {
  const records = useMemo(() => {
    const sorted = nodes
      .map((node) => ({
        id: node.id,
        label: node.label,
        node_type: node.node_type,
        date_start: node.date_start,
        year: getYear(node.date_start),
      }))
      .filter((node): node is TimelineRecord => node.year !== null)
      .sort((left, right) => {
        if (left.year !== right.year) {
          return left.year - right.year;
        }
        return (left.date_start ?? '').localeCompare(right.date_start ?? '');
      });

    return sorted;
  }, [nodes]);

  const bounds = useMemo(() => {
    if (records.length === 0) {
      return {
        minYear: 1900,
        maxYear: new Date().getFullYear(),
      };
    }

    return {
      minYear: records[0].year,
      maxYear: records[records.length - 1].year,
    };
  }, [records]);

  const [rangeFrom, setRangeFrom] = useState(bounds.minYear);
  const [rangeTo, setRangeTo] = useState(bounds.maxYear);

  useEffect(() => {
    setRangeFrom(bounds.minYear);
    setRangeTo(bounds.maxYear);
  }, [bounds.maxYear, bounds.minYear]);

  const normalizedRange = useMemo(
    () => ({
      from: Math.min(rangeFrom, rangeTo),
      to: Math.max(rangeFrom, rangeTo),
    }),
    [rangeFrom, rangeTo],
  );

  const visibleRecords = useMemo(
    () =>
      records.filter(
        (record) => record.year >= normalizedRange.from && record.year <= normalizedRange.to,
      ),
    [normalizedRange.from, normalizedRange.to, records],
  );

  const buckets = useMemo(() => {
    if (visibleRecords.length === 0) {
      return [] as TimelineBucket[];
    }

    const span = normalizedRange.to - normalizedRange.from + 1;
    const bucketSize = span > 240 ? 10 : span > 140 ? 5 : span > 80 ? 2 : 1;
    const bucketMap = new Map<number, TimelineBucket>();

    for (const record of visibleRecords) {
      const start =
        normalizedRange.from +
        Math.floor((record.year - normalizedRange.from) / bucketSize) * bucketSize;
      const end = Math.min(normalizedRange.to, start + bucketSize - 1);

      const existing = bucketMap.get(start) ?? {
        start,
        end,
        count: 0,
        representativeId: null,
      };
      existing.count += 1;
      existing.representativeId ??= record.id;
      bucketMap.set(start, existing);
    }

    return Array.from(bucketMap.values()).sort((left, right) => left.start - right.start);
  }, [normalizedRange.from, normalizedRange.to, visibleRecords]);

  const maxBucketCount = useMemo(() => {
    if (buckets.length === 0) {
      return 1;
    }
    return Math.max(...buckets.map((entry) => entry.count));
  }, [buckets]);

  return (
    <section className="view timeline-view">
      <div className="view-header">
        <h2>Timeline View</h2>
        <p>Adjust the year window, click bars to jump to records, and inspect incidents in that range.</p>
      </div>

      <div className="timeline-scroll interactive">
        <div className="timeline-controls">
          <label>
            <span>From {normalizedRange.from}</span>
            <input
              type="range"
              min={bounds.minYear}
              max={bounds.maxYear}
              value={normalizedRange.from}
              onChange={(event) => setRangeFrom(Number(event.target.value))}
            />
          </label>
          <label>
            <span>To {normalizedRange.to}</span>
            <input
              type="range"
              min={bounds.minYear}
              max={bounds.maxYear}
              value={normalizedRange.to}
              onChange={(event) => setRangeTo(Number(event.target.value))}
            />
          </label>

          <div className="timeline-presets">
            <button
              onClick={() => {
                const from = Math.max(bounds.minYear, bounds.maxYear - 24);
                setRangeFrom(from);
                setRangeTo(bounds.maxYear);
              }}
            >
              Last 25y
            </button>
            <button
              onClick={() => {
                const from = Math.max(bounds.minYear, bounds.maxYear - 49);
                setRangeFrom(from);
                setRangeTo(bounds.maxYear);
              }}
            >
              Last 50y
            </button>
            <button
              onClick={() => {
                setRangeFrom(bounds.minYear);
                setRangeTo(bounds.maxYear);
              }}
            >
              Full Range
            </button>
          </div>
        </div>

        <div className="timeline-histogram" aria-label="Timeline density">
          {buckets.map((bucket) => (
            <button
              key={`${bucket.start}-${bucket.end}`}
              className="timeline-bar"
              style={{
                height: `${Math.max(10, (bucket.count / maxBucketCount) * 100)}%`,
              }}
              title={`${bucket.start === bucket.end ? bucket.start : `${bucket.start}-${bucket.end}`} • ${bucket.count} records`}
              disabled={!bucket.representativeId}
              onClick={() => {
                if (bucket.representativeId) {
                  onSelectNode(bucket.representativeId);
                }
              }}
            >
              <span>{bucket.start}</span>
            </button>
          ))}
          {buckets.length === 0 && <p className="timeline-empty">No records in this date range.</p>}
        </div>

        <p className="timeline-window-summary">
          Showing {visibleRecords.length.toLocaleString()} records from {normalizedRange.from} to{' '}
          {normalizedRange.to}
        </p>

        <div className="timeline-focus-list">
          {visibleRecords
            .slice()
            .reverse()
            .slice(0, 220)
            .map((record) => (
              <button
                key={record.id}
                className={selectedNodeId === record.id ? 'timeline-card active' : 'timeline-card'}
                onClick={() => onSelectNode(record.id)}
              >
                <span
                  className="timeline-card-type"
                  style={{ '--timeline-type-color': NODE_COLORS[record.node_type] } as CSSProperties}
                >
                  {record.node_type}
                </span>
                <strong>{record.label}</strong>
                <small>{record.date_start ?? `${record.year}`}</small>
              </button>
            ))}

          {visibleRecords.length === 0 && (
            <p className="timeline-empty">No records in this date range.</p>
          )}
          {visibleRecords.length > 220 && (
            <p className="timeline-truncation-note">
              Showing the latest 220 records in this window. Narrow the range for finer detail.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
