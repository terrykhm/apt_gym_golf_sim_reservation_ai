import type {
  BookingPreferencePayload,
  OrderedSlotsByDate,
  TimeSlot,
  TimeSlotId,
} from "../types";

const PAD = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`;
}

/** Today + next `count - 1` days as ISO date strings */
export function getNextNDays(count: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  const cur = new Date(from);
  cur.setHours(12, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    out.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Calendar date of tomorrow in local time (YYYY-MM-DD). */
export function tomorrowIsoDate(from: Date = new Date()): string {
  const cur = new Date(from);
  cur.setHours(12, 0, 0, 0);
  cur.setDate(cur.getDate() + 1);
  return toISODate(cur);
}

/**
 * Next `count` days starting tomorrow. Today is omitted (too late to book same day).
 */
export function getNextNDaysFromTomorrow(
  count: number,
  from: Date = new Date()
): string[] {
  const out: string[] = [];
  const cur = new Date(from);
  cur.setHours(12, 0, 0, 0);
  cur.setDate(cur.getDate() + 1);
  for (let i = 0; i < count; i++) {
    out.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function formatDayLabel(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatShortTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Build slot id from date + start HH:mm */
export function makeSlotId(date: string, startTime: string): TimeSlotId {
  return `${date}T${startTime}`;
}

export function parseSlotId(id: TimeSlotId): { date: string; startTime: string } {
  const [date, t] = id.split("T");
  return { date, startTime: t ?? "06:00" };
}

/**
 * Generate 1-hour slots between startHour and endHour (end exclusive), e.g. 6–22 → 6:00–21:00 last slot.
 */
export function buildHourlySlotsForDay(
  isoDate: string,
  startHour: number,
  endHour: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = startHour; h < endHour; h++) {
    const start = `${PAD(h)}:00`;
    const end = `${PAD(h + 1)}:00`;
    const id = makeSlotId(isoDate, start);
    slots.push({
      id,
      date: isoDate,
      startTime: start,
      endTime: end,
      label: `${formatShortTime(start)} – ${formatShortTime(end)}`,
    });
  }
  return slots;
}

export function buildBookingPreferencePayload(
  residentId: string,
  residentName: string,
  orderedByDate: OrderedSlotsByDate,
  /** Timeline order (e.g. next 7 days) — only these days appear in payload */
  datesInOrder: string[]
): BookingPreferencePayload {
  const preferredSlotsByDay = datesInOrder
    .filter((d) => (orderedByDate[d]?.length ?? 0) > 0)
    .map((date) => ({
      date,
      preferredSlots: (orderedByDate[date] ?? []).map((slotId, i) => ({
        slotId,
        priorityOrder: i + 1,
      })),
    }));

  return {
    residentId,
    residentName,
    preferredSlotsByDay,
    createdAt: new Date().toISOString(),
  };
}
