import { useEffect, useState } from 'react';

interface StatusBarProps {
  screen: string;
  nodesLoaded: number;
  nodesTotal: number;
  selectedId?: string | null;
}

export function StatusBar({ screen, nodesLoaded, nodesTotal, selectedId }: StatusBarProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
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
        gap: 16,
        flexShrink: 0,
        fontFamily: 'var(--nhi-f-mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        color: 'var(--nhi-fog)',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ color: 'var(--nhi-sky)' }}>● LIVE</span>
      <span>SCREEN · {screen}</span>
      <span style={{ opacity: 0.5 }}>│</span>
      <span>
        NODES ·{' '}
        <span style={{ color: 'var(--nhi-bone)' }}>{nodesLoaded.toLocaleString()}</span>
        {' / '}
        {nodesTotal.toLocaleString()}
      </span>
      {selectedId && (
        <>
          <span style={{ opacity: 0.5 }}>│</span>
          <span>
            SEL · <span style={{ color: 'var(--nhi-violet)' }}>{selectedId}</span>
          </span>
        </>
      )}
      <span style={{ flex: 1 }} />
      <span>UTC {utc}</span>
      <span style={{ opacity: 0.5 }}>│</span>
      <span>NHI-ARCHIVE v0.9.2</span>
    </div>
  );
}
