import { useEffect, useMemo, useRef, useState } from 'react';
import { getYear } from '../lib/archive';
import { NODE_TYPE_META } from '../lib/taxonomy';
import type { ArchiveEdge, ArchiveNode, NodeType } from '../types';
import { NodeGlyph } from './NodeGlyph';

interface TimelineViewProps {
  nodes: ArchiveNode[];
  edges: ArchiveEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

const LANE_TYPES: NodeType[] = [
  'incident',
  'person',
  'program',
  'document',
  'video',
  'event',
  'statement',
  'organization',
];

function parseDate(raw: string | null | undefined): { year: number; frac: number } | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const full = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (full) {
    const y = Number(full[1]);
    const m = Number(full[2]);
    const d = Number(full[3]);
    return { year: y, frac: y + ((m - 1) * 30 + (d - 1)) / 365 };
  }
  const monthOnly = s.match(/^(\d{4})-(\d{1,2})$/);
  if (monthOnly) {
    const y = Number(monthOnly[1]);
    const m = Number(monthOnly[2]);
    return { year: y, frac: y + (m - 1) / 12 };
  }
  const y = getYear(s);
  if (y === null) return null;
  return { year: y, frac: y + 0.5 };
}

interface Bucket {
  key: string;
  lane: number;
  laneType: NodeType;
  bucketStart: number;
  bucketEnd: number;
  nodes: ArchiveNode[];
  centerFrac: number;
}

/**
 * Rewrite — bucket-first timeline. The previous per-node-dot layout
 * reliably turned into a dart of tiny squares whenever many records
 * shared a lane, which the user called unusable.
 *
 * New model: per lane × year-bucket (size adapts with zoom), render one
 * tile with the item count. Click it to see the list. Single-item
 * buckets render as a normal dot with the label inline; multi-item
 * buckets become a small stack whose height scales with log(count).
 */
export function TimelineView({
  nodes,
  edges,
  selectedId,
  onSelect,
  breakpoint,
}: TimelineViewProps) {
  const isMobile = breakpoint === 'mobile';
  const [laneSet, setLaneSet] = useState<Set<NodeType>>(() => new Set(LANE_TYPES));
  const [zoom, setZoom] = useState(1);
  const [openBucketKey, setOpenBucketKey] = useState<string | null>(null);
  const [hoverBucketKey, setHoverBucketKey] = useState<string | null>(null);

  const toggleLane = (l: NodeType) => {
    setLaneSet((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      if (next.size === 0) return new Set(LANE_TYPES);
      return next;
    });
  };

  const lanes = LANE_TYPES.filter((l) => laneSet.has(l));

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const LANE_LABEL_W = isMobile ? 104 : 140;
  const LANE_H = 78;
  const baseInner = Math.max(600, w - LANE_LABEL_W - 24);
  const laneInner = baseInner * zoom;
  const fullWidth = LANE_LABEL_W + laneInner + 24;

  const dates = useMemo(
    () =>
      nodes
        .map((n) => ({ node: n, parsed: parseDate(n.date_start) }))
        .filter((x): x is { node: ArchiveNode; parsed: NonNullable<ReturnType<typeof parseDate>> } => !!x.parsed),
    [nodes],
  );

  const minY = 1945;
  const maxY = Math.max(new Date().getFullYear(), ...dates.map((x) => x.parsed.year));

  const xAt = (yearFrac: number) =>
    LANE_LABEL_W + ((yearFrac - minY) / (maxY - minY)) * laneInner;

  // Bucket size scales inversely with zoom so at wide view we see
  // 10-year swathes and zooming in collapses toward single years.
  const bucketSize = zoom >= 3 ? 1 : zoom >= 1.6 ? 2 : zoom >= 0.9 ? 5 : 10;

  const buckets = useMemo<Bucket[]>(() => {
    if (dates.length === 0 || laneInner <= 0) return [];
    const out = new Map<string, Bucket>();
    for (const d of dates) {
      const lane = lanes.indexOf(d.node.node_type);
      if (lane < 0) continue;
      const bucketStart = Math.floor(d.parsed.frac / bucketSize) * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      const key = lane + ':' + bucketStart;
      const existing = out.get(key);
      if (existing) {
        existing.nodes.push(d.node);
      } else {
        out.set(key, {
          key,
          lane,
          laneType: lanes[lane],
          bucketStart,
          bucketEnd,
          nodes: [d.node],
          centerFrac: bucketStart + bucketSize / 2,
        });
      }
    }
    return [...out.values()];
  }, [dates, lanes, bucketSize, laneInner]);

  const countByLane = useMemo(() => {
    const m = new Map<number, number>();
    for (const b of buckets) m.set(b.lane, (m.get(b.lane) ?? 0) + b.nodes.length);
    return m;
  }, [buckets]);

  const selected = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) : null),
    [selectedId, nodes],
  );

  const relatedIds = useMemo(() => {
    if (!selected) return new Set<string>();
    const set = new Set<string>();
    for (const e of edges) {
      if (e.from_node_id === selected.id) set.add(e.to_node_id);
      else if (e.to_node_id === selected.id) set.add(e.from_node_id);
    }
    return set;
  }, [selected, edges]);

  // Close popover on outside click
  useEffect(() => {
    if (!openBucketKey) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-bucket-popover]') && !target.closest('[data-bucket-tile]')) {
        setOpenBucketKey(null);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [openBucketKey]);

  const decades = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
  const majorYears = zoom >= 2 ? decades : decades.filter((y) => y % 20 === 0);

  const openBucket = buckets.find((b) => b.key === openBucketKey) ?? null;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: 'var(--nhi-ink)',
      }}
    >
      <div
        style={{
          padding: isMobile ? '10px 12px' : '12px 20px',
          borderBottom: '1px solid var(--nhi-hairline)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="nhi-micro">FILTER · LANES</span>
          <span className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog)' }}>
            {lanes.length}/{LANE_TYPES.length} ACTIVE ·{' '}
            {buckets.reduce((acc, b) => acc + b.nodes.length, 0)} DATED NODES ·{' '}
            {bucketSize}Y BUCKETS
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LANE_TYPES.map((l) => {
            const on = laneSet.has(l);
            return (
              <button
                key={l}
                onClick={() => toggleLane(l)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 9px',
                  border:
                    '1px solid ' +
                    (on ? 'var(--nhi-hairline-hot)' : 'var(--nhi-hairline)'),
                  background: on ? 'rgba(125,211,252,0.10)' : 'transparent',
                  color: on ? 'var(--nhi-bone)' : 'var(--nhi-fog)',
                  fontFamily: 'var(--nhi-f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                }}
              >
                <span style={{ color: on ? 'var(--nhi-sky)' : 'var(--nhi-fog)' }}>
                  <NodeGlyph type={l} size={10} />
                </span>
                {NODE_TYPE_META[l]?.label ?? l}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="nhi-micro">JUMP</span>
          {decades.map((y) => (
            <button
              key={y}
              onClick={() => {
                if (!wrapRef.current) return;
                const x = xAt(y + 0.5) - LANE_LABEL_W - 40;
                wrapRef.current.scrollTo({ left: Math.max(0, x), behavior: 'smooth' });
              }}
              className="nhi-mono"
              style={{
                fontSize: 9,
                padding: '3px 7px',
                border: '1px solid var(--nhi-hairline)',
                color: 'var(--nhi-fog-2)',
                letterSpacing: '0.12em',
              }}
            >
              {`${y}s`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="nhi-micro">ZOOM</span>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            style={{
              width: 24,
              height: 22,
              border: '1px solid var(--nhi-hairline)',
              fontFamily: 'var(--nhi-f-mono)',
              color: 'var(--nhi-fog-2)',
            }}
          >
            −
          </button>
          <span
            className="nhi-mono"
            style={{ fontSize: 11, color: 'var(--nhi-sky)', width: 40, textAlign: 'center' }}
          >
            {zoom.toFixed(2)}×
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(6, z + 0.25))}
            style={{
              width: 24,
              height: 22,
              border: '1px solid var(--nhi-hairline)',
              fontFamily: 'var(--nhi-f-mono)',
              color: 'var(--nhi-fog-2)',
            }}
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="nhi-scroll"
        style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}
      >
        <div
          style={{
            position: 'relative',
            width: fullWidth,
            minHeight: lanes.length * LANE_H + 50,
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              height: 26,
              background: 'var(--nhi-ink)',
              borderBottom: '1px solid var(--nhi-hairline)',
              zIndex: 20,
            }}
          >
            {majorYears.map((y) => (
              <div
                key={y}
                style={{
                  position: 'absolute',
                  left: xAt(y),
                  top: 0,
                  transform: 'translateX(-50%)',
                }}
              >
                <div
                  style={{
                    width: 1,
                    height: 6,
                    background: 'var(--nhi-hairline-2)',
                    margin: '0 auto',
                  }}
                />
                <span
                  className="nhi-mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--nhi-fog-2)',
                    letterSpacing: '0.12em',
                  }}
                >
                  {y}
                </span>
              </div>
            ))}
          </div>

          {majorYears.map((y) => (
            <div
              key={'g' + y}
              style={{
                position: 'absolute',
                left: xAt(y),
                top: 26,
                bottom: 0,
                width: 1,
                background: 'rgba(148,163,216,0.06)',
              }}
            />
          ))}

          {lanes.map((lane, li) => {
            const top = 26 + li * LANE_H;
            return (
              <div
                key={lane}
                style={{
                  position: 'absolute',
                  left: 0,
                  top,
                  width: fullWidth,
                  height: LANE_H,
                  borderBottom: '1px dashed var(--nhi-hairline)',
                }}
              >
                <div
                  style={{
                    position: 'sticky',
                    left: 0,
                    width: LANE_LABEL_W,
                    height: LANE_H,
                    padding: '10px 12px',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    background:
                      'linear-gradient(90deg, var(--nhi-ink) 86%, transparent)',
                    zIndex: 10,
                  }}
                >
                  <span style={{ color: 'var(--nhi-sky)' }}>
                    <NodeGlyph type={lane} size={14} />
                  </span>
                  <div>
                    <div
                      className="nhi-mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        color: 'var(--nhi-fog-2)',
                      }}
                    >
                      {NODE_TYPE_META[lane]?.label ?? lane}
                    </div>
                    <div
                      className="nhi-mono"
                      style={{
                        fontSize: 8,
                        color: 'var(--nhi-fog)',
                        letterSpacing: '0.14em',
                      }}
                    >
                      {countByLane.get(li) ?? 0} NODES
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: LANE_LABEL_W,
                    right: 12,
                    top: LANE_H / 2,
                    height: 1,
                    background: 'var(--nhi-hairline)',
                  }}
                />
              </div>
            );
          })}

          {buckets.map((b) => (
            <BucketTile
              key={b.key}
              bucket={b}
              laneCenter={26 + b.lane * LANE_H + LANE_H / 2}
              xAt={xAt}
              selectedId={selectedId}
              relatedIds={relatedIds}
              onOpen={() => setOpenBucketKey((k) => (k === b.key ? null : b.key))}
              isHover={hoverBucketKey === b.key}
              isOpen={openBucketKey === b.key}
              onHover={setHoverBucketKey}
              onSelectSingle={onSelect}
            />
          ))}

          {openBucket && (
            <BucketPopover
              bucket={openBucket}
              x={Math.min(
                xAt(openBucket.centerFrac) + 14,
                fullWidth - 312,
              )}
              y={26 + openBucket.lane * LANE_H + LANE_H}
              selectedId={selectedId}
              relatedIds={relatedIds}
              onPick={(id) => {
                onSelect(id);
                setOpenBucketKey(null);
              }}
              onClose={() => setOpenBucketKey(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface BucketTileProps {
  bucket: Bucket;
  laneCenter: number;
  xAt: (f: number) => number;
  selectedId: string | null;
  relatedIds: Set<string>;
  isHover: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onHover: (k: string | null) => void;
  onSelectSingle: (id: string) => void;
}

function BucketTile({
  bucket,
  laneCenter,
  xAt,
  selectedId,
  relatedIds,
  isHover,
  isOpen,
  onOpen,
  onHover,
  onSelectSingle,
}: BucketTileProps) {
  const count = bucket.nodes.length;
  const hasSelected = bucket.nodes.some((n) => n.id === selectedId);
  const hasRelated = bucket.nodes.some((n) => relatedIds.has(n.id));

  const x0 = xAt(bucket.bucketStart);
  const x1 = xAt(bucket.bucketEnd);
  const width = Math.max(14, x1 - x0 - 2);

  // Height scales with log(count), capped so a 50-item bucket stays inside lane.
  const height = Math.min(52, 12 + Math.round(Math.log2(count + 1) * 6));

  const baseBorder = hasSelected
    ? 'var(--nhi-sky)'
    : hasRelated
      ? 'var(--nhi-violet)'
      : isOpen || isHover
        ? 'var(--nhi-hairline-hot)'
        : 'var(--nhi-hairline-2)';

  const baseBg = hasSelected
    ? 'rgba(125,211,252,0.32)'
    : hasRelated
      ? 'rgba(196,181,253,0.28)'
      : isOpen || isHover
        ? 'rgba(125,211,252,0.18)'
        : 'rgba(20,26,46,0.62)';

  if (count === 1) {
    const n = bucket.nodes[0];
    const isSel = n.id === selectedId;
    const isRel = relatedIds.has(n.id);
    return (
      <button
        data-bucket-tile
        onClick={() => onSelectSingle(n.id)}
        onMouseEnter={() => onHover(bucket.key)}
        onMouseLeave={() => onHover(null)}
        title={`${n.label} · ${n.date_start ?? bucket.bucketStart}`}
        style={{
          position: 'absolute',
          left: xAt(bucket.centerFrac),
          top: laneCenter - 8,
          transform: 'translateX(-50%)',
          width: 16,
          height: 16,
          border:
            '1px solid ' +
            (isSel
              ? 'var(--nhi-sky)'
              : isRel
                ? 'var(--nhi-violet)'
                : isHover
                  ? 'var(--nhi-bone)'
                  : 'var(--nhi-hairline-hot)'),
          background: isSel
            ? 'var(--nhi-sky)'
            : isRel
              ? 'rgba(196,181,253,0.5)'
              : 'rgba(14,20,36,0.9)',
          boxShadow: isSel ? '0 0 10px var(--nhi-sky)' : 'none',
          zIndex: isSel || isHover ? 15 : 5,
          padding: 0,
        }}
      />
    );
  }

  return (
    <>
      <button
        data-bucket-tile
        onClick={onOpen}
        onMouseEnter={() => onHover(bucket.key)}
        onMouseLeave={() => onHover(null)}
        title={`${count} items · ${bucket.bucketStart}–${bucket.bucketEnd - 1}`}
        style={{
          position: 'absolute',
          left: x0 + 1,
          top: laneCenter - height / 2,
          width,
          height,
          border: '1px solid ' + baseBorder,
          background: baseBg,
          color: 'var(--nhi-bone)',
          fontFamily: 'var(--nhi-f-mono)',
          fontSize: 11,
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: 0,
          zIndex: isOpen ? 18 : isHover ? 12 : 6,
          transition: 'background 120ms var(--nhi-ease), border-color 120ms var(--nhi-ease)',
          cursor: 'pointer',
        }}
      >
        <span style={{ color: 'var(--nhi-sky)' }}>
          <NodeGlyph type={bucket.laneType} size={10} />
        </span>
        <span>×{count}</span>
      </button>
      {(isHover || isOpen) && (
        <div
          style={{
            position: 'absolute',
            left: xAt(bucket.centerFrac),
            top: laneCenter - height / 2 - 18,
            transform: 'translateX(-50%)',
            fontFamily: 'var(--nhi-f-mono)',
            fontSize: 9,
            letterSpacing: '0.14em',
            color: 'var(--nhi-fog-2)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {bucket.bucketStart}–{bucket.bucketEnd - 1}
        </div>
      )}
    </>
  );
}

interface BucketPopoverProps {
  bucket: Bucket;
  x: number;
  y: number;
  selectedId: string | null;
  relatedIds: Set<string>;
  onPick: (id: string) => void;
  onClose: () => void;
}

function BucketPopover({ bucket, x, y, selectedId, relatedIds, onPick, onClose }: BucketPopoverProps) {
  const sorted = [...bucket.nodes].sort((a, b) => {
    const da = a.date_start ?? '';
    const db = b.date_start ?? '';
    if (da && db) return da.localeCompare(db);
    return (a.label ?? '').localeCompare(b.label ?? '');
  });
  return (
    <div
      data-bucket-popover
      className="nhi-scroll"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 300,
        maxHeight: 300,
        overflowY: 'auto',
        background: 'var(--nhi-ink-2)',
        border: '1px solid var(--nhi-hairline-hot)',
        boxShadow: '0 6px 24px rgba(5,7,13,0.6)',
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderBottom: '1px solid var(--nhi-hairline)',
          position: 'sticky',
          top: 0,
          background: 'var(--nhi-ink-2)',
        }}
      >
        <span className="nhi-mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--nhi-fog-2)' }}>
          {(NODE_TYPE_META[bucket.laneType]?.label ?? bucket.laneType).toUpperCase()} · {bucket.bucketStart}–{bucket.bucketEnd - 1} · {bucket.nodes.length}
        </span>
        <button
          onClick={onClose}
          className="nhi-mono"
          style={{ fontSize: 10, color: 'var(--nhi-fog)', padding: '2px 6px' }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      {sorted.map((n) => {
        const isSel = n.id === selectedId;
        const isRel = relatedIds.has(n.id);
        return (
          <button
            key={n.id}
            onClick={() => onPick(n.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              textAlign: 'left',
              padding: '8px 10px',
              borderBottom: '1px solid var(--nhi-hairline)',
              background: isSel ? 'rgba(125,211,252,0.12)' : 'transparent',
              color: isSel
                ? 'var(--nhi-sky)'
                : isRel
                  ? 'var(--nhi-violet)'
                  : 'var(--nhi-bone)',
            }}
          >
            <span
              className="nhi-mono"
              style={{ fontSize: 9, color: 'var(--nhi-fog)', letterSpacing: '0.12em', width: 72, flexShrink: 0 }}
            >
              {n.date_start ?? '—'}
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: 'var(--nhi-f-body)',
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {n.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
