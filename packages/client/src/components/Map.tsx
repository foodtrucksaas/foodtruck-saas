import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// Custom modern marker with brand color
const customIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

interface MapProps {
  latitude: number | null;
  longitude: number | null;
  name: string;
}

export default function Map({ latitude, longitude }: MapProps) {
  if (!latitude || !longitude) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl">
        <p className="text-gray-400 text-sm">Position non disponible</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-sm">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <Marker position={[latitude, longitude]} icon={customIcon} />
      </MapContainer>
    </div>
  );
}
