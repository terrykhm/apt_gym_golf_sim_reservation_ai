import type { BookingPreferencePayload } from "../types";

/**
 * Dynamic variables for Retell `retell_llm_dynamic_variables` on Create Phone Call (all values must be strings).
 * Define the same keys in your Retell agent (Response Engine) so prompts can reference them.
 *
 * @see https://docs.retellai.com/api-references/create-phone-call
 */
export const RETELL_DYNAMIC_VARIABLE_KEYS = [
  "preferred_time",
  "other_preferences",
] as const;

export type RetellDynamicVariableKey = (typeof RETELL_DYNAMIC_VARIABLE_KEYS)[number];

/** Spoken-friendly line from a slot id like `2025-04-01T18:00`. */
export function formatSlotIdForSpeech(slotId: string): string {
  const [datePart, timePart] = slotId.split("T");
  if (!datePart || !timePart) return slotId;
  const d = new Date(`${datePart}T12:00:00`);
  if (Number.isNaN(d.getTime())) return slotId;
  const dateStr = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const [hStr, mStr] = timePart.split(":");
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h)) return `${dateStr}, slot ${slotId}`;
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "a.m." : "p.m.";
  const mm = String(m).padStart(2, "0");
  return `${dateStr} starting at ${hour12}:${mm} ${ampm}`;
}

/**
 * First #1 slot across days (first day in payload order, then first priority).
 * Matches “what time are you interested in?” as a single answer.
 */
function firstPreferredSlotId(
  payload: BookingPreferencePayload
): string | null {
  for (const day of payload.preferredSlotsByDay) {
    const top = day.preferredSlots.find((s) => s.priorityOrder === 1);
    if (top) return top.slotId;
    if (day.preferredSlots[0]) return day.preferredSlots[0].slotId;
  }
  return null;
}

function otherPreferencesLines(payload: BookingPreferencePayload): string {
  const firstId = firstPreferredSlotId(payload);
  const lines: string[] = [];
  for (const day of payload.preferredSlotsByDay) {
    for (const s of day.preferredSlots) {
      if (s.slotId === firstId) continue;
      lines.push(
        `- ${formatSlotIdForSpeech(s.slotId)} (rank #${s.priorityOrder} that day)`
      );
    }
  }
  if (lines.length === 0) {
    return "No alternate times ranked after the first choice.";
  }
  return (
    "If the first choice is not available, you can mention these in order:\n" +
    lines.join("\n")
  );
}

/** Build `override_dynamic_variables` for PATCH /v2/update-call/{call_id}. */
export function bookingPayloadToRetellDynamicVariables(
  payload: BookingPreferencePayload
): Record<string, string> {
  const topId = firstPreferredSlotId(payload);
  const preferred_time = topId
    ? formatSlotIdForSpeech(topId)
    : "No time has been selected in the app yet; say you will call back after checking the booking app.";

  return {
    preferred_time,
    other_preferences: otherPreferencesLines(payload),
  };
}
