// Structured amenity catalog. Theatres store the labels; this adds icons and grouping.
// Labels match what TheatreForm saved before, so existing data keeps working.

export type AmenityGroup = "Comfort" | "Food & Drinks" | "Accessibility" | "Convenience" | "Experience";

export interface Amenity { label: string; icon: string; group: AmenityGroup }

export const AMENITIES: Amenity[] = [
  { label: "Recliner Seats",    icon: "🛋️", group: "Comfort" },
  { label: "Lounge",            icon: "🥂", group: "Comfort" },
  { label: "Air Conditioning",  icon: "❄️", group: "Comfort" },
  { label: "Kids Zone",         icon: "🧸", group: "Comfort" },

  { label: "Food Court",        icon: "🍿", group: "Food & Drinks" },
  { label: "Cafe",              icon: "☕", group: "Food & Drinks" },
  { label: "In-seat Dining",    icon: "🍔", group: "Food & Drinks" },
  { label: "Water Dispenser",   icon: "🚰", group: "Food & Drinks" },

  { label: "Wheelchair Access", icon: "♿", group: "Accessibility" },
  { label: "Elevator",          icon: "🛗", group: "Accessibility" },
  { label: "Baby Changing",     icon: "🍼", group: "Accessibility" },
  { label: "Restrooms",         icon: "🚻", group: "Accessibility" },

  { label: "Parking",           icon: "🅿️", group: "Convenience" },
  { label: "Valet Parking",     icon: "🚗", group: "Convenience" },
  { label: "M-Ticket",          icon: "📱", group: "Convenience" },
  { label: "Online Booking",    icon: "🌐", group: "Convenience" },
  { label: "ATM",               icon: "🏧", group: "Convenience" },
  { label: "Charging Points",   icon: "🔌", group: "Convenience" },

  { label: "IMAX Screen",       icon: "🎞️", group: "Experience" },
  { label: "4DX Hall",          icon: "💺", group: "Experience" },
  { label: "Dolby Atmos",       icon: "🔊", group: "Experience" },
  { label: "3D Glasses",        icon: "👓", group: "Experience" },
];

export const AMENITY_GROUPS: AmenityGroup[] = ["Comfort", "Food & Drinks", "Accessibility", "Convenience", "Experience"];

const BY_LABEL = new Map(AMENITIES.map(a => [a.label.toLowerCase(), a]));

/** Known amenities get their icon/group; free-text ones from older data still display */
export const amenityInfo = (label: string): Amenity =>
  BY_LABEL.get(label.toLowerCase()) ?? { label, icon: "✓", group: "Convenience" };

export function groupAmenities(labels: string[]) {
  return AMENITY_GROUPS
    .map(group => ({ group, items: labels.map(amenityInfo).filter(a => a.group === group) }))
    .filter(g => g.items.length > 0);
}

export const SOUND_OPTIONS      = ["Dolby Atmos", "Dolby 7.1", "DTS:X", "IMAX 12-Channel", "Stereo 5.1"];
export const PROJECTION_OPTIONS = ["4K Laser", "IMAX Laser", "2K Digital", "4K Digital", "RealD 3D"];
