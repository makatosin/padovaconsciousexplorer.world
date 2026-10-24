import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { MapContainer, TileLayer, Marker, Circle, Rectangle, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { POIS } from "@/lib/pois";

// Icone dei segnaposto servite dall'app stessa (non da unpkg.com): se quel sito è lento o
// bloccato dalla rete dell'università, i segnaposto non devono sparire.
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Tappa completata: segnaposto verde con la spunta, così si vede subito sulla mappa.
const visitedIcon = L.divIcon({
  className: "pce-visited-marker",
  html: `<div style="width:30px;height:30px;border-radius:9999px;background:#16a34a;border:3px solid white;box-shadow:0 1px 6px rgb(0 0 0 / 0.35);display:grid;place-items:center;color:white;font-size:16px;font-weight:700;line-height:1">✓</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const userIcon = L.divIcon({
  className: "pce-user-marker",
  html: `<div style="width:20px;height:20px;border-radius:9999px;background:oklch(0.52 0.07 145);border:3px solid white;box-shadow:0 0 0 4px oklch(0.52 0.07 145 / 0.25)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});


// Centra la mappa sulla posizione solo quando lo chiede l'app (primo segnale GPS o pulsante
// della posizione), non a ogni aggiornamento: così lo zoom scelto dall'utente resta com'è.
function Recenter({
  target,
  trigger,
}: {
  target: MutableRefObject<[number, number] | null>;
  trigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (trigger > 0 && target.current) {
      map.flyTo(target.current, Math.max(map.getZoom(), 16), { duration: 0.8 });
    }
  }, [trigger, map, target]);
  return null;
}

export function MapView({
  userPos,
  onPoiClick,
  visited,
  recenterKey,
  highlight = [],
}: {
  userPos: { lat: number; lng: number } | null;
  onPoiClick: (poiId: number) => void;
  visited: number[];
  recenterKey: number;
  highlight?: number[];
}) {
  const center = useMemo<[number, number]>(() => [45.4064, 11.8768], []);
  const flyTarget = useRef<[number, number] | null>(null);
  flyTarget.current = userPos ? [userPos.lat, userPos.lng] : null;

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {POIS.map((poi) => {
        const isVisited = visited.includes(poi.id);
        const inMission = highlight.includes(poi.id);
        const area = {
          color: isVisited ? "#16a34a" : "oklch(0.62 0.14 45)",
          fillOpacity: isVisited ? 0.3 : inMission ? 0.25 : 0.12,
          weight: inMission ? 4 : 2,
          dashArray: inMission && !isVisited ? "6 6" : undefined,
        };
        return (
          <div key={poi.id}>
            {poi.geofence_box ? (
              <Rectangle bounds={poi.geofence_box} pathOptions={area} />
            ) : (
              <Circle center={[poi.latitude, poi.longitude]} radius={poi.geofence_radius_m} pathOptions={area} />
            )}
            <Marker
              position={[poi.latitude, poi.longitude]}
              {...(isVisited ? { icon: visitedIcon } : {})}
              eventHandlers={{ click: () => onPoiClick(poi.id) }}
            />
          </div>
        );
      })}
      {userPos && <Marker position={[userPos.lat, userPos.lng]} icon={userIcon} />}
      <Recenter target={flyTarget} trigger={recenterKey} />
    </MapContainer>
  );
}

export default MapView;
