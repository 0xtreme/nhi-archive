import { useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';
import type { Feature } from 'geojson';
import type { ArchiveNode } from '../types';

// topojson-client's published types are stricter than the runtime accepts;
// the runtime happily consumes any valid TopoJSON topology. We widen here.
type TopologyLoose = {
  objects: Record<string, unknown>;
  [key: string]: unknown;
};

interface MapViewProps {
  nodes: ArchiveNode[];
  onSelect: (id: string) => void;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

const HYNEK_COLORS: Record<string, string> = {
  NL: '#60a5fa',
  DD: '#a78bfa',
  RV: '#22d3ee',
  CE1: '#7dd3fc',
  CE2: '#38bdf8',
  CE3: '#c4b5fd',
  CE4: '#f472b6',
  CE5: '#fda4af',
};

function classifyHynek(n: ArchiveNode): string {
  if (n.classification && HYNEK_COLORS[n.classification]) return n.classification;
  const codes = ['CE1', 'CE3', 'CE4', 'RV', 'DD', 'NL', 'CE2', 'CE5'];
  return codes[n.id.length % codes.length];
}

/**
 * Map view — dark basemap (Natural Earth projection) via d3-geo +
 * topojson-client, incident markers colored by Hynek classification,
 * time scrubber at the bottom. Adopted from mockup/screen-views.jsx.
 */
export function MapView({ nodes, onSelect, breakpoint }: MapViewProps) {
  const isMobile = breakpoint === 'mobile';
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [year, setYear] = useState(new Date().getFullYear());
  const [world, setWorld] = useState<TopologyLoose | null>(null);

  useEffect(() => {
    fetch('./data/countries-110m.json')
      .then((r) => r.json())
      .then((t: TopologyLoose) => setWorld(t))
      .catch(() => {
        // Best effort — no basemap if the fetch fails
      });
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const derived = useMemo(() => {
    if (!world || !size.w || !size.h) return null;
    const proj = geoNaturalEarth1();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topo = world as any;
    const land = topojson.feature(topo, topo.objects.land) as unknown as Feature;
    proj.fitExtent(
      [
        [8, 8],
        [size.w - 8, size.h - 8],
      ],
      land,
    );
    const path = geoPath(proj);
    const countries = topojson.feature(topo, topo.objects.countries) as unknown as {
      features: Array<Feature & { id?: string | number }>;
    };
    return {
      proj,
      path,
      landPath: path(land) ?? '',
      countryPaths: countries.features.map((f, i) => ({
        id: f.id ?? i,
        d: path(f) ?? '',
      })),
      graticulePath: path(geoGraticule10()) ?? '',
    };
  }, [world, size.w, size.h]);

  const projectCoords = (lat: number, lon: number) => {
    if (!derived) return null;
    const p = derived.proj([lon, lat]);
    return p ? { x: p[0], y: p[1] } : null;
  };

  const incidents = useMemo(
    () =>
      nodes.filter(
        (n) =>
          n.node_type === 'incident' &&
          typeof n.lat === 'number' &&
          typeof n.lng === 'number',
      ),
    [nodes],
  );

  const minYear = 1940;
  const maxYear = new Date().getFullYear();

  const visible = useMemo(
    () =>
      incidents.filter((n) => {
        const y = n.date_start ? parseInt(n.date_start.slice(0, 4), 10) : null;
        return y === null || y <= year;
      }),
    [incidents, year],
  );

  return (
    <div
      ref={wrapRef}
      style={{
        flex: 1,
        display: 'flex',
        minHeight: 0,
        position: 'relative',
        background: 'var(--nhi-ink)',
      }}
    >
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(18,30,60,0.5) 0%, rgba(5,7,13,0.98) 80%)',
          }}
        />
        <svg
          width={size.w}
          height={size.h}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          aria-hidden
        >
          {Array.from({ length: 60 }).map((_, i) => {
            const x = (i * 997) % size.w;
            const y = (i * 541 + 29) % size.h;
            const r = i % 7 === 0 ? 1.1 : 0.5;
            return <circle key={i} cx={x} cy={y} r={r} fill="rgba(199,207,230,0.28)" />;
          })}
        </svg>

        {derived ? (
          <svg width={size.w} height={size.h} style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <filter id="nhi-map-glow">
                <feGaussianBlur stdDeviation="2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d={derived.graticulePath}
              fill="none"
              stroke="rgba(148,163,216,0.08)"
              strokeWidth="0.5"
            />
            {derived.countryPaths.map((c) => (
              <path
                key={String(c.id)}
                d={c.d}
                fill="rgba(125,140,200,0.06)"
                stroke="rgba(149,166,224,0.28)"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            ))}
            <path
              d={derived.landPath}
              fill="none"
              stroke="rgba(199,210,254,0.35)"
              strokeWidth="0.6"
              strokeLinejoin="round"
            />

            {visible.map((n) => {
              const p = projectCoords(n.lat as number, n.lng as number);
              if (!p) return null;
              const code = classifyHynek(n);
              const color = HYNEK_COLORS[code] ?? '#7dd3fc';
              return (
                <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(n.id)}>
                  <circle cx={p.x} cy={p.y} r={18} fill={color} opacity={0.1} />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={10}
                    fill={color}
                    opacity={0.22}
                    filter="url(#nhi-map-glow)"
                  />
                  <circle cx={p.x} cy={p.y} r={3.5} fill={color} />
                  <circle cx={p.x} cy={p.y} r={3.5} fill="none" stroke="white" strokeWidth="0.6" />
                </g>
              );
            })}
          </svg>
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--nhi-fog)',
            }}
          >
            <span
              className="nhi-mono"
              style={{ fontSize: 11, letterSpacing: '0.14em' }}
            >
              LOADING BASEMAP <span className="nhi-blink">▍</span>
            </span>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div className="nhi-panel" style={{ padding: '6px 10px' }}>
            <span className="nhi-micro">HYNEK CLASSIFICATION</span>
          </div>
          {Object.entries(HYNEK_COLORS)
            .slice(0, isMobile ? 4 : 8)
            .map(([code, color]) => (
              <div
                key={code}
                className="nhi-panel"
                style={{
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                  }}
                />
                <span
                  className="nhi-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    color: 'var(--nhi-fog-2)',
                  }}
                >
                  {code}
                </span>
              </div>
            ))}
        </div>

        <div
          className="nhi-panel"
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 12,
            padding: isMobile ? '10px 12px' : '12px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 8,
            }}
          >
            <div>
              <span className="nhi-micro">TIME CURSOR</span>
              <span
                className="nhi-display"
                style={{
                  fontSize: 22,
                  color: 'var(--nhi-sky)',
                  marginLeft: 10,
                  letterSpacing: '0.06em',
                }}
              >
                {year}
              </span>
            </div>
            <span className="nhi-mono" style={{ fontSize: 10, color: 'var(--nhi-fog)' }}>
              {visible.length} / {incidents.length} INCIDENTS VISIBLE
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="range"
              min={minYear}
              max={maxYear}
              step={1}
              value={year}
              onChange={(e) => setYear(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--nhi-sky)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
