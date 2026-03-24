import { type CSSProperties, useEffect, useMemo } from 'react';
import { latLngBounds, type LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { ArchiveNode } from '../types';

interface MapViewProps {
  nodes: ArchiveNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

function classificationColor(classification?: string): string {
  switch (classification) {
    case 'CE1':
      return '#2d8f79';
    case 'CE2':
      return '#4f8bbd';
    case 'CE3':
      return '#9f7bb5';
    case 'CE4':
      return '#6fba8e';
    case 'CE5':
      return '#c0874f';
    default:
      return '#8a98aa';
  }
}

const MAP_LEGEND_ITEMS = ['CE1', 'CE2', 'CE3', 'CE4', 'CE5', 'NL'] as const;

function FitBounds({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  const boundsKey = useMemo(
    () => points.map((point) => `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`).join('|'),
    [points],
  );

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    const bounds = latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 6 });
  }, [boundsKey, map, points]);

  return null;
}

export function MapView({ nodes, selectedNodeId, onSelectNode }: MapViewProps) {
  const incidents = useMemo(
    () =>
      nodes.filter(
        (node): node is ArchiveNode & { lat: number; lng: number } =>
          node.node_type === 'incident' && typeof node.lat === 'number' && typeof node.lng === 'number',
      ),
    [nodes],
  );

  const initialCenter = useMemo<LatLngExpression>(() => {
    if (incidents.length === 0) {
      return [15, 0];
    }

    const totals = incidents.reduce(
      (acc, current) => ({
        lat: acc.lat + current.lat,
        lng: acc.lng + current.lng,
      }),
      { lat: 0, lng: 0 },
    );

    return [totals.lat / incidents.length, totals.lng / incidents.length];
  }, [incidents]);

  const fitPoints = useMemo(
    () => incidents.map((incident) => ({ lat: incident.lat, lng: incident.lng })),
    [incidents],
  );

  return (
    <section className="view map-view">
      <div className="view-header">
        <h2>Map View</h2>
        <p>Dark raster basemap with clickable incident points and persistent detail linking.</p>
      </div>

      {incidents.length === 0 ? (
        <div className="map-empty">No geo-coded incidents available for the current filters.</div>
      ) : (
        <div className="map-canvas modern">
          <MapContainer
            center={initialCenter}
            zoom={2.9}
            minZoom={2.8}
            maxZoom={12}
            zoomSnap={0.25}
            zoomControl
            worldCopyJump={false}
            maxBounds={[
              [-85, -180],
              [85, 180],
            ]}
            maxBoundsViscosity={0.92}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              noWrap
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            <FitBounds points={fitPoints} />

            {incidents.map((incident) => {
              const selected = selectedNodeId === incident.id;
              const markerRadius = selected
                ? 9.5
                : Math.min(8, Math.max(5.6, Math.log2((incident.witness_count ?? 1) + 2)));
              return (
                <CircleMarker
                  key={incident.id}
                  center={[incident.lat, incident.lng]}
                  radius={markerRadius}
                  pathOptions={{
                    color: selected ? '#f3f6f8' : '#161b21',
                    weight: selected ? 2.4 : 1.6,
                    fillColor: classificationColor(incident.classification),
                    fillOpacity: selected ? 0.95 : 0.78,
                  }}
                  eventHandlers={{
                    click: () => {
                      onSelectNode(incident.id);
                    },
                  }}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                    <div className="map-tooltip">
                      <strong>{incident.label}</strong>
                      <small>
                        {incident.date_start ?? 'Unknown date'} • {incident.classification ?? 'Unclassified'}
                      </small>
                    </div>
                  </Tooltip>

                  {selected && (
                    <Popup>
                      <div className="map-popup">
                        <strong>{incident.label}</strong>
                        <p>{incident.location_name ?? 'Unknown location'}</p>
                        <small>
                          {incident.date_start ?? 'Unknown date'} •{' '}
                          {incident.classification ?? 'Unclassified'}
                        </small>
                      </div>
                    </Popup>
                  )}
                </CircleMarker>
              );
            })}
          </MapContainer>

          <div className="map-legend" aria-label="Map marker legend">
            <h4>Marker Legend</h4>
            <div className="map-legend-grid">
              {MAP_LEGEND_ITEMS.map((classification) => (
                <div key={classification} className="map-legend-item">
                  <span
                    className="map-legend-dot"
                    style={{ '--dot-color': classificationColor(classification) } as CSSProperties}
                  />
                  <span>{classification}</span>
                </div>
              ))}
            </div>
            <small>Dot size reflects witness count where available.</small>
          </div>
        </div>
      )}
    </section>
  );
}
