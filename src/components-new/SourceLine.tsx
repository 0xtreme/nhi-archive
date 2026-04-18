interface SourceLineProps {
  channel?: string;
  videoLabel?: string;
  timestamp?: string;
  url?: string;
  compact?: boolean;
}

/**
 * Quote-attribution row. Renders the channel, video title, and the
 * timestamp deeplink that accompanies each extracted quote.
 *
 *   ▶ AMERICAN ALCHEMY / David Grusch Breaks Silence · 42:18   [open ↗]
 */
export function SourceLine({ channel, videoLabel, timestamp, url, compact }: SourceLineProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--nhi-f-mono)',
        fontSize: 10,
        letterSpacing: '0.1em',
        color: 'var(--nhi-fog)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: 'var(--nhi-violet)' }}>▶</span>
      {channel && <span style={{ color: 'var(--nhi-bone)' }}>{channel.toUpperCase()}</span>}
      {channel && videoLabel && <span style={{ opacity: 0.5 }}>/</span>}
      {videoLabel && <span style={{ color: 'var(--nhi-fog-2)' }}>{videoLabel}</span>}
      {timestamp && (
        <>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ color: 'var(--nhi-sky)' }}>{timestamp}</span>
        </>
      )}
      {!compact && url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            color: 'var(--nhi-sky)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          open deeplink ↗
        </a>
      )}
    </div>
  );
}
