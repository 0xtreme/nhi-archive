import { useEffect, useMemo, useRef } from 'react';
import maplibregl, { type GeoJSONSource, type MapLayerMouseEvent } from 'maplibre-gl';
import type { ArchiveNode } from '../types';

interface MapViewProps {
  nodes: ArchiveNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

function classificationColor(classification?: string): string {
  switch (classification) {
    case 'CE1':
      return '#4DB4FF';
    case 'CE2':
      return '#9B5CFF';
    case 'CE3':
      return '#D845E9';
    case 'CE4':
      return '#FF4DA8';
    case 'CE5':
      return '#FFC700';
    default:
      return '#E2F0FF';
  }
}

export function MapView({ nodes, selectedNodeId, onSelectNode }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const incidents = useMemo(
    () =>
      nodes.filter(
        (node): node is ArchiveNode & { lat: number; lng: number } =>
          node.node_type === 'incident' && typeof node.lat === 'number' && typeof node.lng === 'number',
      ),
    [nodes],
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 20],
      zoom: 1.25,
      attributionControl: {},
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('incidents', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
        cluster: true,
        clusterMaxZoom: 7,
        clusterRadius: 45,
      });

      map.addLayer({
        id: 'incident-clusters',
        type: 'circle',
        source: 'incidents',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#21466F',
          'circle-stroke-color': '#00C8FF',
          'circle-stroke-width': 1.2,
          'circle-opacity': 0.72,
          'circle-radius': ['step', ['get', 'point_count'], 15, 10, 18, 25, 24, 75, 31],
        },
      });

      map.addLayer({
        id: 'incident-cluster-count',
        type: 'symbol',
        source: 'incidents',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
        },
        paint: {
          'text-color': '#D6E9FF',
        },
      });

      map.addLayer({
        id: 'incident-points',
        type: 'circle',
        source: 'incidents',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['coalesce', ['get', 'markerColor'], '#E2F0FF'],
          'circle-radius': 6,
          'circle-stroke-width': 1.3,
          'circle-stroke-color': '#0A1520',
          'circle-opacity': 0.95,
        },
      });

      map.addLayer({
        id: 'incident-selected',
        type: 'circle',
        source: 'incidents',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'nodeId'], '']],
        paint: {
          'circle-color': '#FFFFFF',
          'circle-radius': 10,
          'circle-opacity': 0.18,
          'circle-stroke-color': '#00C8FF',
          'circle-stroke-width': 1.5,
        },
      });

      map.on('click', 'incident-clusters', (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature) {
          return;
        }

        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource('incidents') as GeoJSONSource;

        source
          .getClusterExpansionZoom(Number(clusterId))
          .then((zoom) => {
            if (!feature.geometry || feature.geometry.type !== 'Point') {
              return;
            }

            map.easeTo({
              center: feature.geometry.coordinates as [number, number],
              zoom,
              duration: 500,
            });
          })
          .catch(() => {
            // Ignore invalid cluster responses and keep map stable.
          });
      });

      map.on('click', 'incident-points', (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const nodeId = feature?.properties?.nodeId;
        if (typeof nodeId === 'string') {
          onSelectNode(nodeId);
        }
      });

      map.on('mouseenter', 'incident-clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'incident-clusters', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'incident-points', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'incident-points', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onSelectNode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const source = map.getSource('incidents') as GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    source.setData({
      type: 'FeatureCollection',
      features: incidents.map((incident) => ({
        type: 'Feature',
        properties: {
          nodeId: incident.id,
          label: incident.label,
          markerColor: classificationColor(incident.classification),
          classification: incident.classification ?? 'unknown',
          date: incident.date_start ?? 'unknown',
        },
        geometry: {
          type: 'Point',
          coordinates: [incident.lng, incident.lat],
        },
      })),
    });
  }, [incidents]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('incident-selected')) {
      return;
    }

    map.setFilter('incident-selected', [
      'all',
      ['!', ['has', 'point_count']],
      ['==', ['get', 'nodeId'], selectedNodeId ?? ''],
    ]);
  }, [selectedNodeId]);

  return (
    <section className="view map-view">
      <div className="view-header">
        <h2>Map View</h2>
        <p>Viewport-clustered incident map. Click marker to open details.</p>
      </div>
      <div ref={mapContainerRef} className="map-canvas" aria-label="Map canvas" />
    </section>
  );
}
