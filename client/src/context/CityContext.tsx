import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { theatresApi } from "../api/index.api.ts";
import type { CityOption } from "../types/movie.types.ts";
import { readStoredCity, storeCity } from "../utils/city.ts";

interface CityContextValue {
  /** null = all cities */
  city:        string | null;
  cities:      CityOption[];
  setCity:     (city: string | null) => void;
  pickerOpen:  boolean;
  openPicker:  () => void;
  closePicker: () => void;
}

const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const [stored]  = useState(readStoredCity);
  const [city,       setCityState] = useState<string | null>(stored ?? null);
  const [cities,     setCities]    = useState<CityOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    theatresApi.cities()
      .then(list => {
        if (cancelled) return;
        setCities(list);
        // First visit: ask once, like every booking app does
        if (stored === undefined && list.length > 1) setPickerOpen(true);
      })
      .catch(() => { /* picker just shows no suggestions */ });
    return () => { cancelled = true; };
  }, [stored]);

  const setCity = useCallback((next: string | null) => {
    storeCity(next);
    setCityState(next);
    setPickerOpen(false);
  }, []);

  const openPicker  = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => {
    if (readStoredCity() === undefined) storeCity(null);   // dismissed = browse all, don't nag again
    setPickerOpen(false);
  }, []);

  return (
    <CityContext.Provider value={{ city, cities, setCity, pickerOpen, openPicker, closePicker }}>
      {children}
    </CityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used inside CityProvider");
  return ctx;
}
