// City names come from free-text theatre addresses — compare loosely
export const normCity = (c?: string | null) => (c ?? "").trim().toLowerCase();
export const sameCity = (a?: string | null, b?: string | null) => normCity(a) === normCity(b);

export const CITY_KEY = "cv_city";

export function readStoredCity(): string | null | undefined {
  try {
    const v = localStorage.getItem(CITY_KEY);
    if (v === null) return undefined;          // never chosen
    return v === "" ? null : v;                // "" = explicitly all cities
  } catch { return null; }
}

export function storeCity(city: string | null) {
  try { localStorage.setItem(CITY_KEY, city ?? ""); } catch { /* storage blocked — choice lasts this visit */ }
}
