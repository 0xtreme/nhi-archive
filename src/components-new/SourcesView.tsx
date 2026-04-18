import { useEffect, useState } from 'react';

interface SourceEntry {
  source_id: string;
  name: string;
  url?: string;
  source_type?: string;
  trust_level?: string;
  crawl_frequency?: string;
  extraction_method?: string;
  records_processed?: number;
  records_auto_ingested?: number;
  records_review_queue?: number;
  host?: string;
  channel?: string;
  description?: string;
}

interface SourceListPayload {
  generated_at?: string;
  total_sources?: number;
  sources?: SourceEntry[];
  notes?: string;
}

interface SourcesViewProps {
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

function TinyBar({ pct, color = 'var(--nhi-sky)' }: { pct: number; color?: string }) {
  return (
    <div style={{ width: '100%', height: 4, background: 'var(--nhi-ink-3)', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, width: pct + '%', background: color }} />
    </div>
  );
}

function SourceCard({ s }: { s: SourceEntry }) {
  const records = s.records_processed ?? 0;
  const ingested = s.records_auto_ingested ?? 0;
  const queue = s.records_review_queue ?? 0;
  const ingPct = records === 0 ? 0 : Math.round((100 * ingested) / records);
  const kind = (s.source_type ?? 'source').toUpperCase();
  const healthy = queue <= 500;
  return (
    <div
      style={{
        border: '1px solid var(--nhi-hairline)',
        background: 'var(--nhi-panel-bg-soft)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <div>
          <div
            className="nhi-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--nhi-fog)',
            }}
          >
            {kind}
          </div>
          <div
            className="nhi-display"
            style={{
              fontSize: 16,
              color: 'var(--nhi-bone)',
              letterSpacing: '0.04em',
              marginTop: 2,
            }}
          >
            {s.name}
          </div>
        </div>
        <span
          className="nhi-chip"
          style={{ color: healthy ? 'var(--nhi-lime)' : 'var(--nhi-amber)' }}
        >
          <span className="nhi-dot" /> {healthy ? 'HEALTHY' : 'BACKLOG'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 4 }}>
        <div>
          <div
            className="nhi-mono"
            style={{
              fontSize: 9,
              color: 'var(--nhi-fog)',
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}
          >
            RECORDS
          </div>
          <div className="nhi-mono" style={{ fontSize: 16, color: 'var(--nhi-bone)' }}>
            {records.toLocaleString()}
          </div>
        </div>
        <div>
          <div
            className="nhi-mono"
            style={{
              fontSize: 9,
              color: 'var(--nhi-fog)',
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}
          >
            INGESTED
          </div>
          <div className="nhi-mono" style={{ fontSize: 16, color: 'var(--nhi-sky)' }}>
            {ingested.toLocaleString()}
          </div>
        </div>
        <div>
          <div
            className="nhi-mono"
            style={{
              fontSize: 9,
              color: 'var(--nhi-fog)',
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}
          >
            REVIEW Q
          </div>
          <div
            className="nhi-mono"
            style={{
              fontSize: 16,
              color: healthy ? 'var(--nhi-fog-2)' : 'var(--nhi-amber)',
            }}
          >
            {queue.toLocaleString()}
          </div>
        </div>
      </div>
      <TinyBar pct={ingPct} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span
          className="nhi-mono"
          style={{ fontSize: 9, color: 'var(--nhi-fog)', letterSpacing: '0.12em' }}
        >
          {s.crawl_frequency ? `CADENCE · ${s.crawl_frequency.toUpperCase()}` : ''}
        </span>
        <span
          className="nhi-mono"
          style={{ fontSize: 9, color: 'var(--nhi-fog-2)', letterSpacing: '0.12em' }}
        >
          {ingPct}% PARSED
        </span>
      </div>
    </div>
  );
}

/**
 * Sources view — flat grid of all ingest feeds. Data loads from
 * public/data/source-list.json (the artifact written by the ingest
 * pipeline). No feed is treated as "featured" — the archive is
 * multi-source, and transcript channels are just one of the inputs.
 */
export function SourcesView({ breakpoint }: SourcesViewProps) {
  const isMobile = breakpoint === 'mobile';
  const [payload, setPayload] = useState<SourceListPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('./data/source-list.json', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('source-list fetch failed');
        return r.json();
      })
      .then((p: SourceListPayload) => setPayload(p))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--nhi-fog)',
          fontFamily: 'var(--nhi-f-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
        }}
      >
        UNABLE TO LOAD SOURCE CATALOG
      </div>
    );
  }

  if (!payload) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--nhi-fog)',
          fontFamily: 'var(--nhi-f-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
        }}
      >
        LOADING SOURCE CATALOG <span className="nhi-blink">▍</span>
      </div>
    );
  }

  const sources = payload.sources ?? [];

  return (
    <div
      className="nhi-scroll"
      style={{ flex: 1, overflowY: 'auto', background: 'var(--nhi-ink)' }}
    >
      <div
        style={{
          padding: isMobile ? '16px 14px' : '22px 28px',
          borderBottom: '1px solid var(--nhi-hairline)',
        }}
      >
        <div className="nhi-micro">INGESTION SOURCES</div>
        <div
          className="nhi-display"
          style={{
            fontSize: 22,
            color: 'var(--nhi-bone)',
            letterSpacing: '0.06em',
            marginTop: 6,
          }}
        >
          SOURCE FEEDS · {sources.length}
        </div>
        <div
          style={{
            fontFamily: 'var(--nhi-f-body)',
            fontSize: 14,
            color: 'var(--nhi-fog-2)',
            marginTop: 8,
            maxWidth: 640,
          }}
        >
          Every record in the archive carries a provenance pointer back to one of the feeds below.
          No single feed is canonical — the archive is the union.
        </div>
      </div>

      <div style={{ padding: isMobile ? '16px 14px' : '22px 28px' }}>
        <div className="nhi-micro" style={{ marginBottom: 10 }}>
          ALL SOURCES · {sources.length}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : breakpoint === 'tablet'
                ? '1fr 1fr'
                : '1fr 1fr 1fr',
            gap: 10,
          }}
        >
          {sources.map((s) => (
            <SourceCard key={s.source_id} s={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
