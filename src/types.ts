export type ResidentId = string;

export interface Resident {
  id: ResidentId;
  name: string;
}

/** Stable id for a 1-hour slot, e.g. "2025-03-31T06:00" */
export type TimeSlotId = string;

export interface TimeSlot {
  id: TimeSlotId;
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** HH:mm 24h */
  startTime: string;
  /** HH:mm 24h */
  endTime: string;
  /** Human label for display */
  label: string;
}

export interface PreferredSlot {
  slotId: TimeSlotId;
  priorityOrder: number;
}

/** ISO date YYYY-MM-DD → ordered slot ids for that day only (#1 = best that day) */
export type OrderedSlotsByDate = Record<string, TimeSlotId[]>;

/** Payload ready for a future backend / Retell job */
export interface BookingPreferencePayload {
  residentId: ResidentId;
  residentName: string;
  /** Per calendar day; order is best-first within each day */
  preferredSlotsByDay: {
    date: string;
    preferredSlots: PreferredSlot[];
  }[];
  createdAt: string;
}

/** Legacy key name kept for docs; per-resident keys are used in storage.ts */
export const STORAGE_KEY = "golf-sim-booking-mockup:v1";

export interface StoredPreferences {
  residentId: ResidentId;
  orderedSlotIdsByDate: OrderedSlotsByDate;
}
