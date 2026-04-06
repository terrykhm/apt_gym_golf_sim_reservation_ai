/** Mirrors frontend booking payload for scheduled Retell calls. */

export type OrderedSlotsByDate = Record<string, string[]>;

export interface BookingPreferencePayload {
  residentId: string;
  residentName: string;
  preferredSlotsByDay: {
    date: string;
    preferredSlots: { slotId: string; priorityOrder: number }[];
  }[];
  createdAt: string;
}

const PAD = (n: number) => String(n).padStart(2, "0");

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`;
}

export function getNextNDaysFromTomorrow(count: number, from: Date = new Date()): string[] {
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

export function buildBookingPreferencePayload(
  residentId: string,
  residentName: string,
  orderedByDate: OrderedSlotsByDate,
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
