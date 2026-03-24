import { useEffect, useMemo } from 'react';
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
      return '#59C3FF';
    case 'CE2':
      return '#9C66FF';
    case 'CE3':
      return '#D854EF';
    case 'CE4':
      return '#FF5EAD';
    case 'CE5':
      return '#FFC857';
    default:
      return '#D8EBFF';
  }
}

function FitBounds({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    const bounds = latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 6 });
  }, [map, points]);

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
            zoom={2}
            minZoom={2}
            maxZoom={12}
            zoomControl
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            <FitBounds points={incidents.map((incident) => ({ lat: incident.lat, lng: incident.lng }))} />

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
                    color: selected ? '#EAF8FF' : '#05121F',
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
        </div>
      )}
    </section>
  );
}
