import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { MapPin } from "lucide-react";
import markerRetina from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { leafletCoordinates } from "../lib/gemAdapter";

L.Icon.Default.mergeOptions({ iconRetinaUrl: markerRetina, iconUrl: marker, shadowUrl: markerShadow });

function CoordinateClick({ onPick }) {
  useMapEvents({
    click(event) {
      onPick([Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6))]);
    },
  });
  return null;
}

export default function GemMap({ gems = [], value, onPick, className = "" }) {
  const center = value || [27.7172, 85.324];
  return (
    <div className={`map-frame ${className}`}>
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="leaflet-map" aria-label="Map of hidden gems in Kathmandu">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {onPick && <CoordinateClick onPick={onPick} />}
        {gems.map((gem) => {
          const coords = leafletCoordinates(gem);
          if (!coords || coords.some((coordinate) => !Number.isFinite(coordinate))) return null;
          return <Marker key={gem._id || gem.id || gem.name || gem.title} position={coords} />;
        })}
        {value && onPick && <Marker position={value} />}
      </MapContainer>
      {onPick && <span className="map-hint"><MapPin size={14} /> Click the map to pin your place</span>}
    </div>
  );
}
