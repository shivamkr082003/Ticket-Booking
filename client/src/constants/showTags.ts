import type { ShowTag } from "../types/movie.types.ts";

export const SHOW_TAGS: ShowTag[] = ["Subtitled", "Audio Description", "Wheelchair Accessible", "Sensory Friendly", "Kids"];

export const TAG_ICON: Record<ShowTag, string> = {
  "Subtitled":             "💬",
  "Audio Description":     "🎧",
  "Wheelchair Accessible": "♿",
  "Sensory Friendly":      "🌙",
  "Kids":                  "🧸",
};

export const TAG_SHORT: Record<ShowTag, string> = {
  "Subtitled":             "SUB",
  "Audio Description":     "AD",
  "Wheelchair Accessible": "♿",
  "Sensory Friendly":      "Sensory",
  "Kids":                  "Kids",
};
