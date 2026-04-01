import type { OrderedSlotsByDate, ResidentId, TimeSlotId } from "../types";
import { parseSlotId } from "./time";

const PREFIX = "golf-sim-booking-mockup:v1";

function keyForResident(residentId: ResidentId): string {
  return `${PREFIX}:resident:${residentId}`;
}

function migrateFlatToByDate(orderedSlotIds: TimeSlotId[]): OrderedSlotsByDate {
  const byDate: OrderedSlotsByDate = {};
  for (const id of orderedSlotIds) {
    const { date } = parseSlotId(id);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(id);
  }
  return byDate;
}

function parseStored(raw: string): OrderedSlotsByDate | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (
      parsed.orderedSlotIdsByDate &&
      typeof parsed.orderedSlotIdsByDate === "object" &&
      parsed.orderedSlotIdsByDate !== null &&
      !Array.isArray(parsed.orderedSlotIdsByDate)
    ) {
      const rec = parsed.orderedSlotIdsByDate as Record<string, unknown>;
      const out: OrderedSlotsByDate = {};
      for (const [date, ids] of Object.entries(rec)) {
        if (Array.isArray(ids) && ids.every((x) => typeof x === "string")) {
          out[date] = ids as TimeSlotId[];
        }
      }
      return out;
    }

    if (
      Array.isArray(parsed.orderedSlotIds) &&
      parsed.orderedSlotIds.every((x) => typeof x === "string")
    ) {
      return migrateFlatToByDate(parsed.orderedSlotIds as TimeSlotId[]);
    }

    return null;
  } catch {
    return null;
  }
}

export function loadOrderedSlotsByDate(
  residentId: ResidentId
): OrderedSlotsByDate | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyForResident(residentId));
    if (!raw) return null;
    return parseStored(raw);
  } catch {
    return null;
  }
}

export function saveOrderedSlotsByDate(
  residentId: ResidentId,
  orderedByDate: OrderedSlotsByDate
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    keyForResident(residentId),
    JSON.stringify({ orderedSlotIdsByDate: orderedByDate })
  );
}

export function clearOrderedSlots(residentId: ResidentId): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(keyForResident(residentId));
}
