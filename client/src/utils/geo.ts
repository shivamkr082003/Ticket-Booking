import type { GeoPoint, Theatre } from "../types/movie.types.ts";

/** Great-circle distance in km */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`);

export const hasPin = (t: Theatre): t is Theatre & { location: GeoPoint } =>
  !!t.location && typeof t.location.lat === "number" && typeof t.location.lng === "number";

// One permission prompt per page load, shared by every caller
let pending: Promise<GeoPoint> | null = null;
export function getMyLocation(): Promise<GeoPoint> {
  pending ??= new Promise<GeoPoint>((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Location isn't available in this browser")); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error("Allow location access to see distances")),
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }).catch(e => { pending = null; throw e; });
  return pending;
}

export const directionsUrl = (t: Theatre) => hasPin(t)
  ? `https://www.google.com/maps/dir/?api=1&destination=${t.location.lat},${t.location.lng}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${t.name} ${t.address} ${t.city}`)}`;

export const mapEmbedUrl = (t: Theatre) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(hasPin(t) ? `${t.location.lat},${t.location.lng}` : `${t.name}, ${t.address}, ${t.city}`)}&z=15&output=embed`;
