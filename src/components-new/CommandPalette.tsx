import { useEffect, useMemo, useRef, useState } from 'react';
import type MiniSearch from 'minisearch';
import { searchNodesRanked } from '../lib/chunkedGraph';
import { CONFIDENCE_META, NODE_TYPE_META } from '../lib/taxonomy';
import type { ArchiveNode } from '../types';
import { NodeGlyph } from './NodeGlyph';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onPick: (node: ArchiveNode) => void;
  searchIndex: MiniSearch | null;
  nodeLookup: Map<string, ArchiveNode>;
  totalNodes: number;
}

/**
 * Full-screen ⌘K / Ctrl+K palette. Uses the MiniSearch index via
 * searchNodesRanked so strict AND falls back to OR with the same score
 * floor as the topbar typeahead. Keyboard navigation: ↑/↓, Enter, Esc.
 */
export function CommandPalette({
  open,
  onClose,
  onPick,
  searchIndex,
  nodeLookup,
  totalNodes,
}: CommandPaletteProps) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const results = useMemo<ArchiveNode[]>(() => {
    if (!open) return [];
    const trimmed = q.trim();
    if (!trimmed) {
      // Empty state — nothing surfaced until the user types. Avoid showing
      // the top-degree-by-default list until we wire a real ranking signal.
      return [];
    }
    if (!searchIndex) return [];
    const ranked = searchNodesRanked(searchIndex, trimmed, 40);
    const out: ArchiveNode[] = [];
    for (const hit of ranked) {
      const node = nodeLookup.get(hit.id);
      if (node) out.push(node);
    }
    return out;
  }, [open, q, searchIndex, nodeLookup]);

  useEffect(() => setIdx(0), [q]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      const n = results[idx];
      if (n) {
        onPick(n);
        onClose();
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="nhi-root"
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(5,7,13,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        style={{
          width: 'min(620px, 92vw)',
          border: '1px solid var(--nhi-hairline-hot)',
          background: 'var(--nhi-ink-1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--nhi-hairline)',
          }}
        >
          <span
            className="nhi-mono"
            style={{ fontSize: 10, color: 'var(--nhi-sky)', letterSpacing: '0.18em' }}
          >
            ⌘K
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search across ${totalNodes.toLocaleString()} entities — people, incidents, programs, documents…`}
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              outline: 'none',
              fontFamily: 'var(--nhi-f-body)',
              fontSize: 16,
              color: 'var(--nhi-bone)',
            }}
          />
          <span
            className="nhi-mono"
            style={{ fontSize: 9, color: 'var(--nhi-fog)', letterSpacing: '0.14em' }}
          >
            ESC
          </span>
        </div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }} className="nhi-scroll">
          {q.trim() && results.length === 0 && (
            <div
              style={{
                padding: 24,
                fontFamily: 'var(--nhi-f-body)',
                color: 'var(--nhi-fog)',
                fontSize: 13,
              }}
            >
              No matches in the archive.
            </div>
          )}
          {!q.trim() && (
            <div
              style={{
                padding: 24,
                fontFamily: 'var(--nhi-f-body)',
                color: 'var(--nhi-fog)',
                fontSize: 13,
              }}
            >
              Start typing to search label, aliases, tags, quotes, or video titles.
            </div>
          )}
          {results.map((n, i) => {
            const active = i === idx;
            const conf = CONFIDENCE_META[n.confidence] ?? CONFIDENCE_META.medium;
            const typeMeta = NODE_TYPE_META[n.node_type];
            return (
              <div
                key={n.id}
                onMouseEnter={() => setIdx(i)}
                onClick={() => {
                  onPick(n);
                  onClose();
                }}
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  background: active ? 'rgba(125,211,252,0.08)' : 'transparent',
                  borderLeft: '2px solid ' + (active ? 'var(--nhi-sky)' : 'transparent'),
                }}
              >
                <span style={{ color: active ? 'var(--nhi-sky)' : 'var(--nhi-fog-2)' }}>
                  <NodeGlyph type={n.node_type} size={16} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--nhi-f-body)',
                      fontSize: 14,
                      color: active ? 'var(--nhi-bone)' : 'var(--nhi-fog-2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n.label}
                  </div>
                  <div
                    className="nhi-mono"
                    style={{
                      fontSize: 9,
                      color: 'var(--nhi-fog)',
                      letterSpacing: '0.14em',
                      marginTop: 2,
                    }}
                  >
                    {typeMeta?.label ?? n.node_type}
                    {n.date_start ? ` · ${n.date_start}` : ''}
                  </div>
                </div>
                <span className="nhi-chip" style={{ color: conf.color, fontSize: 8 }}>
                  {conf.label}
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            borderTop: '1px solid var(--nhi-hairline)',
            padding: '8px 16px',
            display: 'flex',
            gap: 16,
            fontFamily: 'var(--nhi-f-mono)',
            fontSize: 9,
            letterSpacing: '0.14em',
            color: 'var(--nhi-fog)',
          }}
        >
          <span>↑↓ NAVIGATE</span>
          <span>↵ OPEN</span>
          <span>ESC CLOSE</span>
          <div style={{ flex: 1 }} />
          <span>{results.length} RESULTS</span>
        </div>
      </div>
    </div>
  );
}
