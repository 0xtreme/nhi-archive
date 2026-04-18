import { useMemo, useState } from 'react';
import type MiniSearch from 'minisearch';
import { searchNodesRanked } from '../lib/chunkedGraph';
import { NODE_TYPE_META } from '../lib/taxonomy';
import type { ArchiveNode, ViewMode } from '../types';
import { NodeGlyph } from './NodeGlyph';

interface TopbarProps {
  viewMode: ViewMode;
  onViewChange: (v: ViewMode) => void;
  searchIndex: MiniSearch | null;
  nodeLookup: Map<string, ArchiveNode>;
  onSelectNode: (id: string) => void;
  onOpenCommandPalette: () => void;
  onBrandClick: () => void;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  openFilters?: () => void;
}

type ViewOption = { k: ViewMode; label: string; glyph: string };

const VIEW_OPTIONS: ViewOption[] = [
  { k: 'graph',    label: 'Graph',    glyph: '⎔' },
  { k: 'map',      label: 'Map',      glyph: '◉' },
  { k: 'timeline', label: 'Timeline', glyph: '⎍' },
  { k: 'sources',  label: 'Sources',  glyph: '☷' },
];

/**
 * Rebuilt topbar — brand + typeahead search + view toggle + INDEX LIVE
 * indicator. Uses NHI design tokens from src/styles/system.css, powered
 * by the MiniSearch index via searchNodesRanked.
 */
export function Topbar({
  viewMode,
  onViewChange,
  searchIndex,
  nodeLookup,
  onSelectNode,
  onOpenCommandPalette,
  onBrandClick,
  breakpoint,
  openFilters,
}: TopbarProps) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const isMobile = breakpoint === 'mobile';

  const results = useMemo<ArchiveNode[]>(() => {
    const trimmed = q.trim();
    if (!trimmed || !searchIndex) return [];
    const ranked = searchNodesRanked(searchIndex, trimmed, 8);
    const out: ArchiveNode[] = [];
    for (const hit of ranked) {
      const n = nodeLookup.get(hit.id);
      if (n) out.push(n);
    }
    return out;
  }, [q, searchIndex, nodeLookup]);

  const pickResult = (node: ArchiveNode) => {
    onSelectNode(node.id);
    setQ('');
    setFocused(false);
  };

  return (
    <div
      className="nhi-root"
      style={{
        height: 'var(--nhi-topbar-h)',
        borderBottom: '1px solid var(--nhi-hairline)',
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '0 10px' : '0 16px',
        gap: isMobile ? 8 : 14,
        background: 'var(--nhi-ink-1)',
        position: 'relative',
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      <button
        onClick={onBrandClick}
        title="Back to home"
        aria-label="Back to home"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: isMobile ? 0 : 210,
          cursor: 'pointer',
          padding: 0,
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
        }}
      >
        <svg width={22} height={22} viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="10" fill="none" stroke="var(--nhi-sky)" strokeWidth="0.7" opacity="0.6" />
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="var(--nhi-violet)" strokeWidth="0.7" opacity="0.7" />
          <circle cx="11" cy="11" r="2.6" fill="var(--nhi-sky)" />
          <line x1="1" y1="11" x2="21" y2="11" stroke="var(--nhi-sky)" strokeWidth="0.5" opacity="0.3" />
          <line x1="11" y1="1" x2="11" y2="21" stroke="var(--nhi-sky)" strokeWidth="0.5" opacity="0.3" />
        </svg>
        {!isMobile && (
          <div style={{ lineHeight: 1 }}>
            <div
              className="nhi-display"
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.22em',
                color: 'var(--nhi-bone)',
              }}
            >
              NHI · ARCHIVE
            </div>
            <div
              className="nhi-mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.2em',
                color: 'var(--nhi-fog)',
                marginTop: 2,
              }}
            >
              OPEN INTEL EXPLORER
            </div>
          </div>
        )}
      </button>

      {isMobile && openFilters && (
        <button
          onClick={openFilters}
          style={{
            border: '1px solid var(--nhi-hairline-2)',
            padding: '7px 10px',
            borderRadius: 2,
            fontFamily: 'var(--nhi-f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'var(--nhi-fog-2)',
          }}
        >
          ⚙ FILTERS
        </button>
      )}

      <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : 480 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid ' + (focused ? 'var(--nhi-hairline-hot)' : 'var(--nhi-hairline-2)'),
            borderRadius: 2,
            padding: '7px 10px',
            background: 'var(--nhi-ink-2)',
            transition: 'border-color 150ms var(--nhi-ease)',
          }}
        >
          <svg width={12} height={12} viewBox="0 0 12 12">
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--nhi-sky)" strokeWidth="1.2" />
            <line x1="7.5" y1="7.5" x2="11" y2="11" stroke="var(--nhi-sky)" strokeWidth="1.2" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 160)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) pickResult(results[0]);
              if (e.key === 'Escape') {
                setQ('');
                setFocused(false);
              }
            }}
            placeholder="Search nodes · by label · alias · type"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--nhi-f-mono)',
              fontSize: 12,
              letterSpacing: '0.04em',
              color: 'var(--nhi-bone)',
            }}
          />
          <button
            onClick={onOpenCommandPalette}
            title="Open command palette"
            className="nhi-mono"
            style={{
              fontSize: 9,
              color: 'var(--nhi-fog)',
              letterSpacing: '0.14em',
            }}
          >
            ⌘K
          </button>
        </div>

        {focused && q && (
          <div
            className="nhi-scroll nhi-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: 'var(--nhi-ink-2)',
              border: '1px solid var(--nhi-hairline-hot)',
              zIndex: 9999,
              maxHeight: 360,
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                borderBottom: '1px solid var(--nhi-hairline)',
              }}
            >
              <span className="nhi-micro">{results.length} MATCHES</span>
            </div>
            {results.length === 0 && (
              <div
                style={{
                  padding: 14,
                  fontFamily: 'var(--nhi-f-mono)',
                  fontSize: 11,
                  color: 'var(--nhi-fog)',
                }}
              >
                No matches in the archive.
              </div>
            )}
            {results.map((r) => (
              <button
                key={r.id}
                onMouseDown={() => pickResult(r)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  width: '100%',
                  textAlign: 'left',
                  borderBottom: '1px solid var(--nhi-hairline)',
                }}
              >
                <span style={{ color: 'var(--nhi-sky)' }}>
                  <NodeGlyph type={r.node_type} size={14} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--nhi-f-body)',
                      fontSize: 13,
                      color: 'var(--nhi-bone)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.label}
                  </span>
                  <span
                    className="nhi-mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      color: 'var(--nhi-fog)',
                    }}
                  >
                    {NODE_TYPE_META[r.node_type]?.label ?? r.node_type}
                    {r.date_start ? ` · ${r.date_start}` : ''}
                  </span>
                </span>
                <span className="nhi-mono" style={{ fontSize: 9, color: 'var(--nhi-fog-2)' }}>
                  →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          border: '1px solid var(--nhi-hairline-2)',
          borderRadius: 2,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {VIEW_OPTIONS.map((v, i) => {
          const active = viewMode === v.k;
          return (
            <button
              key={v.k}
              onClick={() => onViewChange(v.k)}
              style={{
                padding: isMobile ? '6px 8px' : '7px 12px',
                background: active ? 'var(--nhi-ink-4)' : 'transparent',
                color: active ? 'var(--nhi-sky)' : 'var(--nhi-fog-2)',
                borderRight: i < VIEW_OPTIONS.length - 1 ? '1px solid var(--nhi-hairline-2)' : 'none',
                fontFamily: 'var(--nhi-f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 13 }}>{v.glyph}</span>
              {!isMobile && v.label}
            </button>
          );
        })}
      </div>

      {!isMobile && (
        <>
          <div style={{ width: 1, height: 22, background: 'var(--nhi-hairline-2)' }} />
          <div className="nhi-chip" style={{ color: 'var(--nhi-lime)' }}>
            <span className="nhi-dot nhi-blink" /> INDEX LIVE
          </div>
        </>
      )}
    </div>
  );
}
