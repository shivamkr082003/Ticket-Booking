import type { Screen, Theatre } from "../types/movie.types.ts";

// Bundled stock photography (see constants/photoCredits.ts) used until a theatre
// uploads its own photos. Uploaded images always take priority.
const IMG = (name: string) => `/images/cinema/${name}.jpg`;

const AUDITORIUMS = [1, 2, 3, 4, 5, 6, 7].map(n => IMG(`auditorium-${n}`));
const LOBBY = IMG("lobby-1");

// Stable per-theatre pick so every theatre keeps "its" look across visits
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const own = (t: Pick<Theatre, "images">) => (t.images ?? []).filter(Boolean);

export const hasOwnPhotos = (t: Pick<Theatre, "images">) => own(t).length > 0;

export function theatreCover(t: Pick<Theatre, "_id" | "images">): string {
  return own(t)[0] ?? AUDITORIUMS[hash(t._id) % AUDITORIUMS.length];
}

/** Uploaded photos, or a 5-photo stock set (cover, two more halls, lobby, recliners) */
export function theatreGallery(t: Pick<Theatre, "_id" | "images">): string[] {
  const mine = own(t);
  if (mine.length) return mine;
  const start = hash(t._id) % AUDITORIUMS.length;
  const halls = [0, 2, 4].map(k => AUDITORIUMS[(start + k) % AUDITORIUMS.length]);
  return [halls[0], LOBBY, halls[1], AMENITY_PHOTOS["Recliner Seats"], halls[2]];
}

/** Amenities that get a photo tile on the theatre page */
export const AMENITY_PHOTOS: Record<string, string> = {
  "Recliner Seats": IMG("recliners"),
  "Food Court":     IMG("food-court"),
  "Cafe":           IMG("snacks"),
  "In-seat Dining": IMG("snacks"),
  "IMAX Screen":    IMG("imax"),
  "Dolby Atmos":    IMG("dolby-atmos"),
  "Lounge":         IMG("lounge"),
  "Parking":        IMG("parking"),
  "Valet Parking":  IMG("parking"),
};

/** Owner's photo for an amenity, else the stock one (if any) */
export function amenityPhoto(t: Pick<Theatre, "amenityPhotos">, label: string): { src: string; stock: boolean } | null {
  const mine = t.amenityPhotos?.[label];
  if (mine) return { src: mine, stock: false };
  return AMENITY_PHOTOS[label] ? { src: AMENITY_PHOTOS[label], stock: true } : null;
}

/** Owner's photo of the auditorium, else a matching stock image */
export function screenPhoto(theatreId: string, screen: Pick<Screen, "name" | "sound" | "projection" | "photo">): string {
  if (screen.photo) return screen.photo;
  return stockScreenPhoto(theatreId, screen);
}

export function stockScreenPhoto(theatreId: string, screen: Pick<Screen, "name" | "sound" | "projection">): string {
  const text = `${screen.name} ${screen.sound ?? ""} ${screen.projection ?? ""}`.toLowerCase();
  if (text.includes("imax")) return IMG("imax");
  if (text.includes("atmos")) return IMG("dolby-atmos");
  return AUDITORIUMS[hash(theatreId + screen.name) % AUDITORIUMS.length];
}
