import { useEffect, useState } from 'react';
import type { ArchiveMeta, Perspective, SearchHit } from '../../lib/api';
import { api } from '../../lib/api';
import { NODE_TYPE_META } from '../../lib/taxonomy';
import type { NodeType } from '../../types';
import { NodeGlyph } from '../NodeGlyph';

interface LandingHubProps {
  meta: ArchiveMeta | null;
  perspectives: Perspective[];
  onPickPerspective: (slug: string) => void;
  onPickEntity: (id: string) => void;
}

/**
 * Landing hub — the "no scene yet" entry screen for the Scene Explorer.
 * Shows curated perspectives (named scenes the user can open),
 * archive stats, and a prompt that shifts attention back to the topbar
 * search. Never renders any graph itself; the first scene materialises
 * after the user picks a thread.
 */
export function LandingHub({
  meta,
  perspectives,
  onPickPerspective,
  onPickEntity,
}: LandingHubProps) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.search(q.trim(), 10, ctrl.signal);
        setHits(response.results);
      } catch {
        // aborted or server offline
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div
      className="nhi-root nhi-scroll"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '28px 24px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        position: 'relative',
        background: 'var(--nhi-ink)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 15% 0%, rgba(125,211,252,0.05), transparent 50%), radial-gradient(ellipse at 90% 100%, rgba(196,181,253,0.05), transparent 50%)',
        }}
      />

      <div style={{ position: 'relative', maxWidth: 980, width: '100%', margin: '0 auto' }}>
        <div className="nhi-micro">START HERE</div>
        <h1
          className="nhi-display"
          style={{
            fontSize: 32,
            lineHeight: 1.15,
            color: 'var(--nhi-bone)',
            margin: '10px 0 12px',
            letterSpacing: '0.02em',
            maxWidth: 760,
            fontWeight: 600,
          }}
        >
          {meta ? meta.total_nodes.toLocaleString() : '…'} entities across{' '}
          {meta ? meta.total_edges.toLocaleString() : '…'} connections.
        </h1>
        <p
          style={{
            fontFamily: 'var(--nhi-f-body)',
            fontSize: 16,
            lineHeight: 1.5,
            color: 'var(--nhi-fog-2)',
            maxWidth: 680,
            margin: 0,
          }}
        >
          Pick a thread to pull. Every scene below is a curated seed — a few
          entities we already know sit at the heart of a story. Clicking any
          node inside a scene expands its neighborhood. Search above (⌘K)
          lets you seed a scene from any single entity.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            marginTop: 20,
          }}
        >
          {meta &&
            Object.entries(meta.node_type_counts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([type, n]) => (
                <div
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    border: '1px solid var(--nhi-hairline)',
                    background: 'rgba(14,20,36,0.35)',
                  }}
                >
                  <span style={{ color: 'var(--nhi-sky)' }}>
                    <NodeGlyph type={type as NodeType} size={12} />
                  </span>
                  <span
                    className="nhi-mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      color: 'var(--nhi-fog-2)',
                    }}
                  >
                    {(NODE_TYPE_META[type as NodeType]?.label ?? type).toUpperCase()}
                  </span>
                  <span
                    className="nhi-mono"
                    style={{ fontSize: 12, color: 'var(--nhi-bone)', marginLeft: 4 }}
                  >
                    {n.toLocaleString()}
                  </span>
                </div>
              ))}
          {meta && meta.community_count > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: '1px solid var(--nhi-hairline-hot)',
                background: 'rgba(196,181,253,0.08)',
              }}
            >
              <span
                className="nhi-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--nhi-violet)',
                }}
              >
                {meta.community_count.toLocaleString()} COMMUNITIES
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: 980, width: '100%', margin: '0 auto' }}>
        <div className="nhi-micro" style={{ marginBottom: 10 }}>
          JUMP TO AN ENTITY
        </div>
        <div
          style={{
            border: '1px solid var(--nhi-hairline-2)',
            background: 'var(--nhi-ink-2)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 14 14">
            <circle cx="6" cy="6" r="4" fill="none" stroke="var(--nhi-sky)" strokeWidth="1.2" />
            <line x1="9" y1="9" x2="13" y2="13" stroke="var(--nhi-sky)" strokeWidth="1.2" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search any entity by label, alias, quote, tag, or location…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--nhi-f-body)',
              fontSize: 15,
              color: 'var(--nhi-bone)',
            }}
          />
          {loading && (
            <span
              className="nhi-mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                color: 'var(--nhi-fog)',
              }}
            >
              SEARCHING…
            </span>
          )}
        </div>

        {hits.length > 0 && (
          <div
            style={{
              border: '1px solid var(--nhi-hairline)',
              borderTop: 'none',
              background: 'var(--nhi-ink-1)',
            }}
          >
            {hits.map((h) => (
              <button
                key={h.id}
                onClick={() => onPickEntity(h.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  width: '100%',
                  textAlign: 'left',
                  borderBottom: '1px solid var(--nhi-hairline)',
                }}
              >
                <span style={{ color: 'var(--nhi-sky)' }}>
                  <NodeGlyph type={h.node_type as NodeType} size={14} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--nhi-f-body)',
                      fontSize: 14,
                      color: 'var(--nhi-bone)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.label}
                  </span>
                  <span
                    className="nhi-mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      color: 'var(--nhi-fog)',
                    }}
                  >
                    {(NODE_TYPE_META[h.node_type as NodeType]?.label ?? h.node_type).toUpperCase()}
                    {h.date_start ? ' · ' + h.date_start : ''}
                    {' · DEG ' + h.degree}
                  </span>
                </span>
                <span
                  className="nhi-mono"
                  style={{ fontSize: 10, color: 'var(--nhi-fog-2)' }}
                >
                  open scene →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: 'relative', maxWidth: 980, width: '100%', margin: '0 auto' }}>
        <div className="nhi-micro" style={{ marginBottom: 10 }}>
          CURATED PERSPECTIVES · {perspectives.length}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {perspectives.map((p) => (
            <button
              key={p.slug}
              onClick={() => onPickPerspective(p.slug)}
              style={{
                textAlign: 'left',
                border: '1px solid var(--nhi-hairline-2)',
                background: 'rgba(14,20,36,0.55)',
                padding: '16px 16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                cursor: 'pointer',
                position: 'relative',
                transition: 'border-color 150ms var(--nhi-ease), transform 150ms var(--nhi-ease)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--nhi-hairline-hot)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--nhi-hairline-2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                className="nhi-mono"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  color: 'var(--nhi-fog)',
                }}
              >
                PERSPECTIVE · {String(p.sort_order).padStart(2, '0')}
              </div>
              <div
                className="nhi-display"
                style={{
                  fontSize: 17,
                  letterSpacing: '0.02em',
                  color: 'var(--nhi-bone)',
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {p.title}
              </div>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--nhi-f-body)',
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: 'var(--nhi-fog-2)',
                }}
              >
                {p.description}
              </p>
              <div
                className="nhi-mono"
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'var(--nhi-sky)',
                }}
              >
                OPEN SCENE →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
