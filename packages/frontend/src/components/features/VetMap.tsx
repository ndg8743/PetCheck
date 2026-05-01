import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix the broken-image bug for Leaflet's default marker icon under Vite —
// Vite doesn't bundle the relative-URL assets the way webpack does. We
// re-point the icon URLs to assets imported via Vite's `?url` suffix so
// they're emitted into /assets/ and the markers render.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - assets resolved by Vite at build time
import markerIcon from 'leaflet/dist/images/marker-icon.png?url';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png?url';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png?url';

// Apply once at module load.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export interface VetMapClinic {
  id: string;
  name: string;
  distance?: number;
  location: { lat: number; lng: number };
}

interface VetMapProps {
  clinics: VetMapClinic[];
  searchLocation: { lat: number; lng: number } | null;
  onPinClick?: (id: string) => void;
}

/**
 * Auto-fits the map bounds whenever the list of clinics changes, so the
 * map zooms to cover all results after a search.
 */
const FitBounds: React.FC<{ clinics: VetMapClinic[]; searchLocation: VetMapProps['searchLocation'] }> = ({
  clinics,
  searchLocation,
}) => {
  const map = useMap();
  useEffect(() => {
    if (clinics.length === 0) {
      if (searchLocation) map.setView([searchLocation.lat, searchLocation.lng], 12);
      return;
    }
    const bounds = L.latLngBounds(clinics.map((c) => [c.location.lat, c.location.lng] as [number, number]));
    if (searchLocation) bounds.extend([searchLocation.lat, searchLocation.lng]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [clinics, searchLocation, map]);
  return null;
};

export const VetMap: React.FC<VetMapProps> = ({ clinics, searchLocation, onPinClick }) => {
  const fallbackCenter: [number, number] = searchLocation
    ? [searchLocation.lat, searchLocation.lng]
    : clinics[0]
      ? [clinics[0].location.lat, clinics[0].location.lng]
      : [40.7128, -74.006]; // NYC fallback

  return (
    <MapContainer
      center={fallbackCenter}
      zoom={12}
      scrollWheelZoom={false}
      className="h-96 w-full rounded-2xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {clinics.map((c) => (
        <Marker
          key={c.id}
          position={[c.location.lat, c.location.lng]}
          eventHandlers={onPinClick ? { click: () => onPinClick(c.id) } : undefined}
        >
          <Popup>
            <div className="text-sm">
              <strong>{c.name}</strong>
              {typeof c.distance === 'number' && (
                <div className="text-gray-600">{c.distance.toFixed(1)} mi away</div>
              )}
              {onPinClick && (
                <button
                  type="button"
                  onClick={() => onPinClick(c.id)}
                  className="mt-1 text-primary-600 underline"
                >
                  View details
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      <FitBounds clinics={clinics} searchLocation={searchLocation} />
    </MapContainer>
  );
};
