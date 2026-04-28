import { useEffect, useRef } from 'preact/hooks';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Geometry = {
  type: string;
  coordinates?: any;
  geometries?: Geometry[];
};

type Feature = {
  type: 'Feature';
  geometry: Geometry;
  properties?: Record<string, unknown>;
};

type FeatureCollection = {
  type: 'FeatureCollection';
  features: Feature[];
};

type GeoInput = FeatureCollection | Feature | Geometry;

function collectLineStrings(input: GeoInput | null | undefined): number[][][] {
  if (!input) return [];
  if (input.type === 'FeatureCollection') {
    return (input.features ?? []).flatMap((feature) => collectLineStrings(feature));
  }
  if (input.type === 'Feature') {
    return collectLineStrings(input.geometry);
  }
  if (input.type === 'LineString') {
    return [input.coordinates ?? []];
  }
  if (input.type === 'MultiLineString') {
    return input.coordinates ?? [];
  }
  if (input.type === 'GeometryCollection') {
    return (input.geometries ?? []).flatMap((geometry) => collectLineStrings(geometry));
  }
  return [];
}

type Props = {
  geojson: GeoInput;
  title?: string;
  komootUrl?: string;
  stravaUrl?: string;
  height?: number;
};

export function RouteMapLeaflet({ geojson, title = 'Route map', komootUrl, stravaUrl, height = 420 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = mapRef.current;
    if (!el || mapInstanceRef.current) return;

    const lines = collectLineStrings(geojson).filter((line) => line.length >= 2);
    if (lines.length === 0) return;

    const map = L.map(el, {
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: false,
      zoomControl: true,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const allLatLngs: L.LatLngExpression[] = [];
    lines.forEach((line) => {
      const latlngs = line.map(([lng, lat]) => [lat, lng] as L.LatLngExpression);
      latlngs.forEach((p) => allLatLngs.push(p));
      L.polyline(latlngs, {
        color: '#2d5d9b',
        weight: 5,
        opacity: 0.9,
      }).addTo(map);
    });

    if (allLatLngs.length > 0) {
      const first = allLatLngs[0];
      const last = allLatLngs[allLatLngs.length - 1];
      L.circleMarker(first, { radius: 6, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1 }).addTo(map);
      L.circleMarker(last, { radius: 6, color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1 }).addTo(map);
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [24, 24] });
    }

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [geojson]);

  return (
    <section class="route-map-card" aria-label={title}>
      <div class="route-map-head">
        <h3>{title}</h3>
        <div class="route-map-links">
          {stravaUrl && <a href={stravaUrl} target="_blank" rel="noopener">Strava ↗</a>}
          {komootUrl && <a href={komootUrl} target="_blank" rel="noopener">Komoot ↗</a>}
        </div>
      </div>
      <div ref={mapRef} class="route-map-leaflet" style={{ height: `${height}px` }} />
    </section>
  );
}

export default RouteMapLeaflet;
