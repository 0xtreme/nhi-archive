import { useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import Supercluster from 'supercluster';
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

interface MarkerProps extends GeoJSON.Feature<GeoJSON.Point, { id: string; label: string; hynek: string }> {}

/**
 * Map view — dark basemap (Natural Earth) + clustered incident markers
 * via Mapbox's supercluster. At coarse "zoom" (the whole world in the
 * viewport) nearby events collapse into count-badge bubbles; clusters
 * expand on click. Rendered on top of a dark navy starfield with
 * Hynek-classification-coloured markers + time cursor at the bottom.
 */
export function MapView({ nodes, onSelect, breakpoint }: MapViewProps) {
  const isMobile = breakpoint === 'mobile';
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [year, setYear] = useState(new Date().getFullYear());
  const [world, setWorld] = useState<TopologyLoose | null>(null);
  const [clusterZoom, setClusterZoom] = useState(2);
  const [expanded, setExpanded] = useState<{ x: number; y: number; members: MarkerProps[] } | null>(null);

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

  const visible = useMemo(
    () =>
      incidents.filter((n) => {
        const y = n.date_start ? parseInt(n.date_start.slice(0, 4), 10) : null;
        return y === null || y <= year;
      }),
    [incidents, year],
  );

  // Build a supercluster index over the visible set. Coordinates are [lon,
  // lat] (GeoJSON order). Radius and maxZoom are tuned for the static
  // Natural Earth projection — we don't actually zoom the basemap, so
  // clusterZoom is a UI control the user can tweak via the "detail"
  // slider to reveal more individual markers.
  const cluster = useMemo(() => {
    const index = new Supercluster<{ id: string; label: string; hynek: string }, { point_count: number; cluster_id: number }>(
      { radius: 48, maxZoom: 8, minPoints: 2 },
    );
    index.load(
      visible.map<MarkerProps>((n) => ({
        type: 'Feature',
        properties: {
          id: n.id,
          label: n.label,
          hynek: classifyHynek(n),
        },
        geometry: {
          type: 'Point',
          coordinates: [n.lng as number, n.lat as number],
        },
      })),
    );
    return index;
  }, [visible]);

  const clusters = useMemo(() => {
    return cluster.getClusters([-180, -85, 180, 85], clusterZoom);
  }, [cluster, clusterZoom]);

  const hynekLegendEntries = isMobile
    ? Object.entries(HYNEK_COLORS).slice(0, 4)
    : Object.entries(HYNEK_COLORS);

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

            {clusters.map((c, i) => {
              const [lon, lat] = c.geometry.coordinates as [number, number];
              const p = projectCoords(lat, lon);
              if (!p) return null;
              const props = c.properties as { cluster?: boolean; point_count?: number; cluster_id?: number; id?: string; label?: string; hynek?: string };
              const isCluster = props.cluster === true;
              if (isCluster) {
                const count = props.point_count ?? 0;
                const radius = 12 + Math.min(22, Math.sqrt(count) * 2.4);
                return (
                  <g
                    key={'c-' + props.cluster_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (props.cluster_id == null) return;
                      const members = cluster.getLeaves(props.cluster_id, 40, 0) as MarkerProps[];
                      setExpanded({ x: p.x, y: p.y, members });
                    }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={radius + 6}
                      fill="rgba(125,211,252,0.08)"
                      stroke="rgba(125,211,252,0.4)"
                      strokeDasharray="2 3"
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={radius}
                      fill="rgba(125,211,252,0.18)"
                      stroke="rgba(199,210,254,0.6)"
                      strokeWidth={1}
                      filter="url(#nhi-map-glow)"
                    />
                    <text
                      x={p.x}
                      y={p.y + 4}
                      fontFamily="JetBrains Mono"
                      fontSize={Math.max(10, radius * 0.55)}
                      fill="rgba(231,235,247,0.95)"
                      textAnchor="middle"
                      style={{ letterSpacing: '0.08em', userSelect: 'none' }}
                    >
                      {count.toLocaleString()}
                    </text>
                  </g>
                );
              }
              // Individual marker
              const hynek = props.hynek ?? 'NL';
              const color = HYNEK_COLORS[hynek] ?? '#7dd3fc';
              return (
                <g
                  key={'m-' + (props.id ?? i)}
                  style={{ cursor: 'pointer' }}
                  onClick={() => props.id && onSelect(props.id)}
                >
                  <circle cx={p.x} cy={p.y} r={14} fill={color} opacity={0.1} />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={8}
                    fill={color}
                    opacity={0.25}
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

        {expanded && (
          <div
            onClick={() => setExpanded(null)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(5,7,13,0.4)',
              zIndex: 30,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="nhi-panel nhi-scroll"
              style={{
                position: 'absolute',
                left: Math.min(size.w - 320, Math.max(10, expanded.x + 20)),
                top: Math.min(size.h - 260, Math.max(10, expanded.y)),
                width: 300,
                maxHeight: 260,
                overflowY: 'auto',
                padding: '10px 12px',
              }}
            >
              <div className="nhi-micro" style={{ marginBottom: 8 }}>
                {expanded.members.length} INCIDENTS
              </div>
              {expanded.members.map((m) => (
                <button
                  key={m.properties.id}
                  onClick={() => {
                    onSelect(m.properties.id);
                    setExpanded(null);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 8px',
                    borderBottom: '1px solid var(--nhi-hairline)',
                    fontFamily: 'var(--nhi-f-body)',
                    fontSize: 12,
                    color: 'var(--nhi-bone)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: HYNEK_COLORS[m.properties.hynek] ?? '#7dd3fc',
                      marginRight: 6,
                    }}
                  />
                  {m.properties.label}
                </button>
              ))}
            </div>
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
          {hynekLegendEntries.map(([code, color]) => (
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
          <div
            className="nhi-panel"
            style={{
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              className="nhi-mono"
              style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--nhi-fog)' }}
            >
              DETAIL
            </span>
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={clusterZoom}
              onChange={(e) => setClusterZoom(+e.target.value)}
              style={{ width: 100, accentColor: 'var(--nhi-sky)' }}
            />
            <span
              className="nhi-mono"
              style={{ fontSize: 10, color: 'var(--nhi-sky)' }}
            >
              {clusterZoom}
            </span>
          </div>
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
              {visible.length} / {incidents.length} INCIDENTS · {clusters.length} CLUSTERS/MARKERS
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="range"
              min={1940}
              max={new Date().getFullYear()}
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
