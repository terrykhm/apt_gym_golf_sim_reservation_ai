import type { Resident } from "./types";

export const RESIDENTS: Resident[] = [
  { id: "terry", name: "Terry" },
  { id: "bryan", name: "Bryan" },
];

/** Gym-style hours for mock: 6:00–22:00 (last slot 21:00–22:00) */
export const SLOT_START_HOUR = 6;
export const SLOT_END_HOUR = 22;

export const DAYS_AHEAD = 7;
