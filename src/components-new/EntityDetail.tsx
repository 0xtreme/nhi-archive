import { useMemo } from 'react';
import { decodeHtmlEntities } from '../lib/archive';
import { NODE_TYPE_META } from '../lib/taxonomy';
import type { ArchiveEdge, ArchiveNode } from '../types';
import { ConfidenceStamp } from './ConfidenceStamp';
import { NodeGlyph } from './NodeGlyph';

export interface SourceRichEntry {
  source_type?: string;
  video_id?: string;
  timestamp_start?: number;
  timestamp_end?: number;
  quote?: string;
  url?: string;
}

interface EntityDetailProps {
  node: ArchiveNode | null;
  edges: ArchiveEdge[];
  nodeLookup: Map<string, ArchiveNode>;
  onClose: () => void;
  onNavigate: (id: string) => void;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

const PAGE_BG: Record<string, string> = {
  person:     'radial-gradient(140% 80% at 20% 0%, rgba(125,211,252,0.18), transparent 60%)',
  incident:   'radial-gradient(140% 80% at 80% 0%, rgba(253,164,175,0.15), transparent 60%)',
  claim:      'radial-gradient(140% 80% at 50% 0%, rgba(251,191,36,0.12), transparent 60%)',
  video:      'radial-gradient(140% 80% at 50% 0%, rgba(196,181,253,0.20), transparent 60%)',
  program:    'linear-gradient(180deg, rgba(34,44,80,0.6), transparent 70%)',
  document:   'linear-gradient(180deg, rgba(30,38,70,0.55), transparent 70%)',
  organization: 'radial-gradient(120% 80% at 60% 10%, rgba(34,211,238,0.15), transparent 60%)',
  location:   'radial-gradient(100% 80% at 30% 10%, rgba(134,239,172,0.14), transparent 60%)',
  event:      'radial-gradient(120% 80% at 70% 10%, rgba(253,164,175,0.12), transparent 60%)',
  statement:  'linear-gradient(180deg, rgba(40,26,60,0.55), transparent 70%)',
  artifact:   'linear-gradient(180deg, rgba(36,22,22,0.55), transparent 70%)',
  designation: 'linear-gradient(180deg, rgba(32,30,10,0.55), transparent 70%)',
  media:      'radial-gradient(140% 80% at 50% 0%, rgba(196,181,253,0.16), transparent 60%)',
  concept:    'linear-gradient(180deg, rgba(14,24,44,0.55), transparent 70%)',
  phenomenon: 'radial-gradient(140% 80% at 40% 0%, rgba(196,181,253,0.18), transparent 60%)',
  technology: 'linear-gradient(180deg, rgba(14,36,40,0.6), transparent 70%)',
  role:       'linear-gradient(180deg, rgba(18,28,38,0.5), transparent 70%)',
  testimony:  'linear-gradient(180deg, rgba(40,26,60,0.55), transparent 70%)',
  citation:   'linear-gradient(180deg, rgba(32,30,10,0.55), transparent 70%)',
};

function formatTimestamp(seconds?: number): string {
  if (typeof seconds !== 'number' || seconds < 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function youtubeDeepLink(videoId: string, timestamp?: number): string {
  const t = typeof timestamp === 'number' ? Math.floor(timestamp) : 0;
  return `https://www.youtube.com/watch?v=${videoId}&t=${t}s`;
}

/**
 * Entity detail slide-over. Slides over graph on desktop/tablet, fills
 * the screen on mobile. Renders different "schema panels" for each of
 * the 19 node types (incident datasheet, video preview, person brief,
 * claim triage, location mini-map, document facsimile, etc.).
 *
 * Quote sources are grouped by video_id with timestamp deeplinks into
 * YouTube. Related nodes are grouped by relationship type.
 */
export function EntityDetail({
  node,
  edges,
  nodeLookup,
  onClose,
  onNavigate,
  breakpoint,
}: EntityDetailProps) {
  const isMobile = breakpoint === 'mobile';

  const related = useMemo(() => {
    if (!node) return {};
    const grouped: Record<string, Array<{ node: ArchiveNode; direction: 'in' | 'out' }>> = {};
    for (const e of edges) {
      if (e.from_node_id !== node.id && e.to_node_id !== node.id) continue;
      const otherId = e.from_node_id === node.id ? e.to_node_id : e.from_node_id;
      const other = nodeLookup.get(otherId);
      if (!other) continue;
      const dir: 'in' | 'out' = e.from_node_id === node.id ? 'out' : 'in';
      if (!grouped[e.relationship]) grouped[e.relationship] = [];
      if (!grouped[e.relationship].some((x) => x.node.id === other.id)) {
        grouped[e.relationship].push({ node: other, direction: dir });
      }
    }
    return grouped;
  }, [edges, node, nodeLookup]);

  // Collapse the per-video source list.
  // For hub entities like "Jesse Michels" the extractor often produced
  // one t=0 generic entry per video ("Mentioned throughout the video"),
  // so 98 "citations all at 0:00" are not 98 distinct timestamped
  // quotes — they're one "appears in video" reference per video.
  // We group by video_id, drop duplicates, and detect the "all zero-
  // timestamp + generic quote" shape so the UI can render a simpler
  // "appears in N videos" list instead of a pointless timestamp column.
  const GENERIC_QUOTE_MARKERS = [
    'mentioned throughout',
    'mentioned in the video',
    'mentioned in this video',
    'appears in the video',
    'referenced in video',
  ];
  const isGenericQuote = (q: string | undefined): boolean => {
    if (!q) return true;
    const lower = q.toLowerCase().trim();
    if (lower.length < 25) return true;
    return GENERIC_QUOTE_MARKERS.some((m) => lower.includes(m));
  };

  const videoGroups = useMemo(() => {
    if (!node) return [];
    const rich: SourceRichEntry[] =
      (node as ArchiveNode & { sources_rich?: SourceRichEntry[] }).sources_rich ?? [];
    const byVideo = new Map<string, SourceRichEntry[]>();
    for (const r of rich) {
      const key = r.video_id ?? r.url ?? 'unknown';
      if (!byVideo.has(key)) byVideo.set(key, []);
      byVideo.get(key)!.push(r);
    }
    return Array.from(byVideo.entries()).map(([videoKey, entries]) => {
      // Dedupe by (timestamp_start, quote-head)
      const seen = new Set<string>();
      const unique: SourceRichEntry[] = [];
      for (const e of entries) {
        const k = `${e.timestamp_start ?? ''}:${(e.quote ?? '').slice(0, 60)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        unique.push(e);
      }
      // Split into "substantive" quotes (real timestamp + real text) and
      // "just a mention" entries (t=0 + generic/empty quote).
      const substantive = unique.filter(
        (e) => (e.timestamp_start ?? 0) > 0 && !isGenericQuote(e.quote),
      );
      const mentions = unique.filter((e) => !substantive.includes(e));
      return { videoKey, substantive, mentions, sampleUrl: unique[0]?.url, sampleTs: unique[0]?.timestamp_start };
    });
  }, [node]);

  const substantiveCitationCount = videoGroups.reduce((n, g) => n + g.substantive.length, 0);
  const videoReferenceCount = videoGroups.length;

  if (!node) return null;

  const typeMeta = NODE_TYPE_META[node.node_type];
  const confidence = node.confidence ?? 'low';
  const pageBg = PAGE_BG[node.node_type] ?? PAGE_BG.concept;
  const edgeCount = Object.values(related).reduce((acc, items) => acc + items.length, 0);
  const aliases = (node as ArchiveNode & { aliases?: string[] }).aliases ?? [];

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--nhi-ink-1)',
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        position: 'fixed',
        top: 'var(--nhi-topbar-h)',
        bottom: 'var(--nhi-statusbar-h)',
        right: 0,
        width: breakpoint === 'tablet' ? 360 : 420,
        maxWidth: '44%',
        zIndex: 200,
        background: 'var(--nhi-ink-1)',
        borderLeft: '1px solid var(--nhi-hairline-hot)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-24px 0 48px -12px rgba(0,0,0,0.7)',
      };

  return (
    <aside className="nhi-root nhi-scroll" style={panelStyle}>
      <div
        style={{
          padding: isMobile ? '18px 18px 16px' : '20px 22px 16px',
          background: pageBg,
          borderBottom: '1px solid var(--nhi-hairline)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 54,
                height: 54,
                flexShrink: 0,
                border: '1px solid var(--nhi-hairline-hot)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--nhi-sky)',
                background: 'rgba(10,14,26,0.6)',
                position: 'relative',
              }}
            >
              <NodeGlyph type={node.node_type} size={30} stroke={1.2} />
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  left: -1,
                  right: -1,
                  height: 1,
                  background: 'var(--nhi-sky)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: -6,
                  left: -1,
                  right: -1,
                  height: 1,
                  background: 'var(--nhi-sky)',
                }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                className="nhi-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: 'var(--nhi-fog)',
                  marginBottom: 4,
                }}
              >
                {typeMeta?.label ?? node.node_type} · REC · {node.id}
              </div>
              <div
                className="nhi-display"
                style={{
                  fontSize: isMobile ? 20 : 23,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: 'var(--nhi-bone)',
                  lineHeight: 1.2,
                }}
              >
                {node.label}
              </div>
              {aliases.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {aliases.map((a) => (
                    <span
                      key={a}
                      className="nhi-mono"
                      style={{ fontSize: 10, color: 'var(--nhi-fog)' }}
                    >
                      A.K.A. <span style={{ color: 'var(--nhi-fog-2)' }}>{a}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--nhi-f-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--nhi-fog-2)',
              padding: '4px 6px',
              border: '1px solid var(--nhi-hairline-2)',
            }}
          >
            ✕ CLOSE
          </button>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <ConfidenceStamp level={confidence} />
          {node.date_start && (
            <span className="nhi-chip" style={{ color: 'var(--nhi-fog-2)' }}>
              YEAR · {node.date_start}
            </span>
          )}
          <span className="nhi-chip" style={{ color: 'var(--nhi-fog-2)' }}>
            DEGREE · {edgeCount}
          </span>
          {substantiveCitationCount > 0 && (
            <span className="nhi-chip" style={{ color: 'var(--nhi-violet)' }}>
              QUOTES · {substantiveCitationCount}
            </span>
          )}
          {videoReferenceCount > 0 && (
            <span className="nhi-chip" style={{ color: 'var(--nhi-sky)' }}>
              APPEARS IN · {videoReferenceCount} VIDEO{videoReferenceCount === 1 ? '' : 'S'}
            </span>
          )}
        </div>
      </div>

      <div className="nhi-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <section
          style={{ padding: '16px 22px', borderBottom: '1px solid var(--nhi-hairline)' }}
        >
          <div className="nhi-micro" style={{ marginBottom: 6 }}>
            SUMMARY
          </div>
          <p
            style={{
              fontFamily: 'var(--nhi-f-body)',
              fontSize: 15,
              lineHeight: 1.55,
              color: 'var(--nhi-fog-2)',
              margin: 0,
            }}
          >
            {decodeHtmlEntities(node.summary)}
          </p>
        </section>

        <TypeSpecificPanel node={node} />

        {videoGroups.length > 0 && (
          <section
            style={{ padding: '16px 22px', borderBottom: '1px solid var(--nhi-hairline)' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div className="nhi-micro">SOURCES · BY VIDEO</div>
              <span
                className="nhi-mono"
                style={{ fontSize: 10, color: 'var(--nhi-fog)' }}
              >
                {videoGroups.length} VIDEO{videoGroups.length === 1 ? '' : 'S'}
                {substantiveCitationCount > 0 ? ` · ${substantiveCitationCount} QUOTES` : ''}
              </span>
            </div>
            {videoGroups.map((group) => {
              const videoNode = nodeLookup.get(`video-${group.videoKey}`);
              const channelLabel = videoNode
                ? 'AMERICAN ALCHEMY'
                : 'ARCHIVE';
              const videoTitle = videoNode?.label ?? group.sampleUrl ?? group.videoKey;
              const videoUrl = group.videoKey
                ? `https://www.youtube.com/watch?v=${group.videoKey}`
                : group.sampleUrl;
              return (
                <div
                  key={group.videoKey}
                  style={{
                    border: '1px solid var(--nhi-hairline)',
                    marginBottom: 10,
                    background: 'rgba(14,20,36,0.4)',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 10px',
                      borderBottom: group.substantive.length > 0 ? '1px solid var(--nhi-hairline)' : 'none',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: 'var(--nhi-violet)' }}>
                      <NodeGlyph type="video" size={14} />
                    </span>
                    <span
                      className="nhi-mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        color: 'var(--nhi-bone)',
                      }}
                    >
                      {channelLabel}
                    </span>
                    <span style={{ opacity: 0.4 }}>/</span>
                    <span
                      style={{
                        fontFamily: 'var(--nhi-f-body)',
                        fontSize: 13,
                        color: 'var(--nhi-fog-2)',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {videoTitle}
                    </span>
                    {group.substantive.length === 0 && (
                      <span
                        className="nhi-mono"
                        style={{
                          fontSize: 9,
                          letterSpacing: '0.14em',
                          color: 'var(--nhi-fog)',
                          marginRight: 4,
                        }}
                      >
                        MENTIONED
                      </span>
                    )}
                    {videoUrl && (
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="nhi-mono"
                        style={{
                          fontSize: 9,
                          letterSpacing: '0.14em',
                          color: 'var(--nhi-sky)',
                          border: '1px solid var(--nhi-hairline-2)',
                          padding: '2px 6px',
                          textDecoration: 'none',
                        }}
                      >
                        OPEN ↗
                      </a>
                    )}
                  </div>
                  {group.substantive.map((q, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 12px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--nhi-hairline)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        {q.video_id && (
                          <a
                            href={youtubeDeepLink(q.video_id, q.timestamp_start)}
                            target="_blank"
                            rel="noreferrer"
                            className="nhi-mono"
                            style={{
                              padding: '3px 6px',
                              background: 'var(--nhi-ink-3)',
                              color: 'var(--nhi-sky)',
                              fontSize: 10,
                              letterSpacing: '0.1em',
                              border: '1px solid var(--nhi-hairline-2)',
                              textDecoration: 'none',
                              flexShrink: 0,
                            }}
                          >
                            ▶ {formatTimestamp(q.timestamp_start) || '0:00'}
                          </a>
                        )}
                        <p
                          style={{
                            margin: 0,
                            fontFamily: 'var(--nhi-f-body)',
                            fontSize: 14,
                            lineHeight: 1.5,
                            color: 'var(--nhi-bone)',
                            fontStyle: 'italic',
                          }}
                        >
                          “{q.quote}”
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>
        )}

        {Object.keys(related).length > 0 && (
          <section
            style={{ padding: '16px 22px', borderBottom: '1px solid var(--nhi-hairline)' }}
          >
            <div className="nhi-micro" style={{ marginBottom: 10 }}>
              RELATED NODES · {edgeCount}
            </div>
            {Object.entries(related).map(([rel, items]) => (
              <div key={rel} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ width: 14, height: 1, background: 'var(--nhi-violet)' }} />
                  <span
                    className="nhi-mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      color: 'var(--nhi-violet)',
                    }}
                  >
                    {rel}
                  </span>
                  <span
                    className="nhi-mono"
                    style={{ fontSize: 9, color: 'var(--nhi-fog)' }}
                  >
                    · {items.length}
                  </span>
                </div>
                {items.slice(0, 12).map((it) => (
                  <button
                    key={it.node.id}
                    onClick={() => onNavigate(it.node.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      border: '1px solid var(--nhi-hairline)',
                      marginBottom: 4,
                      background: 'rgba(14,20,36,0.4)',
                    }}
                  >
                    <span style={{ color: 'var(--nhi-sky)' }}>
                      <NodeGlyph type={it.node.node_type} size={14} />
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontFamily: 'var(--nhi-f-body)',
                        fontSize: 13,
                        color: 'var(--nhi-bone)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {it.node.label}
                    </span>
                    <span
                      className="nhi-mono"
                      style={{ fontSize: 9, color: 'var(--nhi-fog)' }}
                    >
                      {NODE_TYPE_META[it.node.node_type]?.label ?? it.node.node_type}
                    </span>
                    <span
                      className="nhi-mono"
                      style={{ fontSize: 10, color: 'var(--nhi-fog-2)' }}
                    >
                      {it.direction === 'out' ? '→' : '←'}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </section>
        )}

        {node.sources && node.sources.length > 0 && videoGroups.length === 0 && (
          <section style={{ padding: '16px 22px' }}>
            <div className="nhi-micro" style={{ marginBottom: 6 }}>
              SOURCES
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {node.sources.map((s) => (
                <li key={s} style={{ marginBottom: 4 }}>
                  <a
                    href={s}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: 'var(--nhi-f-mono)',
                      fontSize: 11,
                      color: 'var(--nhi-sky)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}

function TypeSpecificPanel({ node }: { node: ArchiveNode }) {
  const Row = ({ k, v }: { k: string; v: string }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '6px 0',
        borderBottom: '1px dashed var(--nhi-hairline)',
      }}
    >
      <span
        className="nhi-mono"
        style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--nhi-fog)' }}
      >
        {k}
      </span>
      <span
        className="nhi-mono"
        style={{ fontSize: 11, color: 'var(--nhi-bone)', textAlign: 'right' }}
      >
        {v}
      </span>
    </div>
  );

  const section = (title: string, rows: React.ReactNode) => (
    <section style={{ padding: '14px 22px', borderBottom: '1px solid var(--nhi-hairline)' }}>
      <div className="nhi-micro" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {rows}
    </section>
  );

  const typeSpecific =
    (node as ArchiveNode & { type_specific?: Record<string, unknown> }).type_specific ?? {};

  switch (node.node_type) {
    case 'incident':
      return section(
        'INCIDENT DATASHEET',
        <>
          <Row k="DATE" v={node.date_start ?? 'UNKNOWN'} />
          <Row
            k="COORDINATES"
            v={
              typeof node.lat === 'number' && typeof node.lng === 'number'
                ? `${node.lat.toFixed(2)}° ${node.lng.toFixed(2)}°`
                : '—'
            }
          />
          <Row k="CLASSIFICATION" v={node.classification ?? '—'} />
          <Row k="CASE STATUS" v={(node.case_status ?? 'UNEXPLAINED').toUpperCase()} />
        </>,
      );
    case 'video':
      return section(
        'VIDEO · TRANSCRIPT SOURCE',
        <>
          <Row
            k="CHANNEL"
            v={(typeSpecific.channel as string | undefined)?.toUpperCase() ?? 'AMERICAN ALCHEMY'}
          />
          <Row k="HOST" v={(typeSpecific.host_id as string | undefined) ?? 'Jesse Michels'} />
          <Row
            k="DURATION"
            v={
              typeof typeSpecific.duration_seconds === 'number'
                ? formatTimestamp(typeSpecific.duration_seconds)
                : '—'
            }
          />
          {typeof typeSpecific.view_count === 'number' && (
            <Row k="VIEWS" v={(typeSpecific.view_count as number).toLocaleString()} />
          )}
        </>,
      );
    case 'person': {
      const profession =
        (node as ArchiveNode & { profession?: string }).profession ??
        (typeSpecific.profession as string | undefined) ??
        '—';
      return section(
        'PERSON · BRIEF',
        <>
          <Row k="PROFESSION" v={profession} />
          <Row
            k="WIKIDATA"
            v={(node as ArchiveNode & { wikidata_id?: string }).wikidata_id ?? '—'}
          />
        </>,
      );
    }
    case 'claim':
    case 'statement':
    case 'testimony':
      return (
        <section style={{ padding: '14px 22px', borderBottom: '1px solid var(--nhi-hairline)' }}>
          <div className="nhi-micro" style={{ marginBottom: 8 }}>
            {node.node_type === 'statement'
              ? 'STATEMENT · PROVENANCE'
              : node.node_type === 'testimony'
                ? 'TESTIMONY · UNDER OATH'
                : 'CLAIM · TRIAGE'}
          </div>
          <div
            style={{
              border: '1px dashed var(--nhi-hairline-hot)',
              padding: '10px 12px',
              background: 'rgba(40,26,60,0.3)',
            }}
          >
            <div
              className="nhi-mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                color: 'var(--nhi-violet)',
                marginBottom: 4,
              }}
            >
              “{node.node_type === 'statement' ? 'QUOTED' : 'ASSERTED'}”
            </div>
            <p
              style={{
                fontFamily: 'var(--nhi-f-body)',
                fontSize: 15,
                lineHeight: 1.5,
                color: 'var(--nhi-bone)',
                fontStyle: 'italic',
                margin: 0,
              }}
            >
              {decodeHtmlEntities(node.summary)}
            </p>
          </div>
        </section>
      );
    case 'location':
      return section(
        'LOCATION',
        <>
          <Row
            k="COORDINATES"
            v={
              typeof node.lat === 'number' && typeof node.lng === 'number'
                ? `${node.lat.toFixed(3)}° ${node.lng.toFixed(3)}°`
                : '—'
            }
          />
          <Row k="NAME" v={node.location_name ?? node.label} />
        </>,
      );
    case 'program':
    case 'organization':
      return section(
        node.node_type === 'program' ? 'PROGRAM · CHARTER' : 'ORGANIZATION',
        <>
          <Row k="ACRONYM" v={(typeSpecific.acronym as string | undefined) ?? '—'} />
          <Row
            k="FULL NAME"
            v={(typeSpecific.full_name as string | undefined) ?? node.label}
          />
          <Row
            k="TYPE"
            v={
              (typeSpecific.org_type as string | undefined) ??
              (node.node_type === 'program' ? 'PROGRAM' : '—')
            }
          />
        </>,
      );
    case 'document':
      return section(
        'DOCUMENT',
        <>
          <Row k="TYPE" v={(typeSpecific.document_type as string | undefined) ?? 'DOCUMENT'} />
          <Row k="DATE" v={node.date_start ?? '—'} />
        </>,
      );
    case 'concept':
    case 'phenomenon':
    case 'designation':
      return section(
        `${(NODE_TYPE_META[node.node_type]?.label ?? node.node_type).toUpperCase()} · DEFINITION`,
        <>
          {typeSpecific.concept_domain !== undefined && (
            <Row
              k="DOMAIN"
              v={(typeSpecific.concept_domain as string | undefined) ?? '—'}
            />
          )}
          {typeSpecific.phenomenon_category !== undefined && (
            <Row
              k="CATEGORY"
              v={(typeSpecific.phenomenon_category as string | undefined) ?? '—'}
            />
          )}
        </>,
      );
    case 'event':
      return section(
        'EVENT',
        <>
          <Row k="DATE" v={node.date_start ?? '—'} />
          <Row k="DATE END" v={node.date_end ?? '—'} />
          <Row k="TYPE" v={(typeSpecific.event_type as string | undefined) ?? '—'} />
        </>,
      );
    case 'technology':
      return section(
        'TECHNOLOGY · HYPOTHESIS',
        <>
          <Row
            k="TYPE"
            v={(typeSpecific.technology_type as string | undefined) ?? '—'}
          />
          <Row k="CORROBORATION" v="PENDING" />
        </>,
      );
    default:
      return null;
  }
}
