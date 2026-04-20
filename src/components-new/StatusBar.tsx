import { useEffect, useState } from 'react';

interface StatusBarProps {
  screen: string;
  nodesLoaded: number;
  nodesTotal: number;
  selectedId?: string | null;
}

/**
 * Status bar at the bottom of the viewport. On mobile we drop the UTC
 * clock and the version stamp — they're cosmetic on desktop and the
 * only things still paying rent at 375px are screen + node count.
 */
export function StatusBar({ screen, nodesLoaded, nodesTotal, selectedId }: StatusBarProps) {
  const [now, setNow] = useState(() => new Date());
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const utc = now.toISOString().replace('T', ' ').slice(0, 19);

  return (
    <div
      style={{
        height: 'var(--nhi-statusbar-h)',
        borderTop: '1px solid var(--nhi-hairline)',
        background: 'var(--nhi-ink-1)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: isMobile ? 10 : 16,
        flexShrink: 0,
        fontFamily: 'var(--nhi-f-mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        color: 'var(--nhi-fog)',
        textTransform: 'uppercase',
        overflow: 'hidden',
      }}
    >
      <span style={{ color: 'var(--nhi-sky)', flexShrink: 0 }}>● LIVE</span>
      <span style={{ flexShrink: 0 }}>{isMobile ? screen : `SCREEN · ${screen}`}</span>
      <span style={{ opacity: 0.5, flexShrink: 0 }}>│</span>
      <span style={{ flexShrink: 0 }}>
        <span style={{ color: 'var(--nhi-bone)' }}>{nodesLoaded.toLocaleString()}</span>
        {' / '}
        {nodesTotal.toLocaleString()}
      </span>
      {!isMobile && selectedId && (
        <>
          <span style={{ opacity: 0.5 }}>│</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            SEL · <span style={{ color: 'var(--nhi-violet)' }}>{selectedId}</span>
          </span>
        </>
      )}
      <span style={{ flex: 1 }} />
      {!isMobile && (
        <>
          <span style={{ flexShrink: 0 }}>UTC {utc}</span>
          <span style={{ opacity: 0.5, flexShrink: 0 }}>│</span>
          <span style={{ flexShrink: 0 }}>NHI-ARCHIVE v0.9.2</span>
        </>
      )}
    </div>
  );
}
