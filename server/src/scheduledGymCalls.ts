import cron from "node-cron";
import {
  buildBookingPreferencePayload,
  getNextNDaysFromTomorrow,
} from "./bookingPayload.js";
import { createRetellPhoneCall, normalizePhoneToE164 } from "./retellCreatePhoneCall.js";
import { bookingPayloadToRetellLlmDynamicVariables } from "./retellLlmVars.js";
import { getPreferences } from "./store.js";

const DAYS_AHEAD = 7;

/** Display names for residents (extend when you add residents in the UI). */
const RESIDENT_DISPLAY_NAME: Record<string, string> = {
  terry: "Terry",
  bryan: "Bryan",
};

function parseResidentIds(): string[] {
  const raw = process.env.RETELL_SCHEDULE_RESIDENT_IDS?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return ["terry", "bryan"];
}

function hasAnySlot(ordered: Record<string, string[]>): boolean {
  return Object.values(ordered).some((arr) => Array.isArray(arr) && arr.length > 0);
}

export async function runScheduledGymOutboundCalls(): Promise<void> {
  const label = new Date().toISOString();
  console.log(`[scheduled-gym-call] tick ${label}`);

  const apiKey = process.env.RETELL_API_KEY?.trim();
  const fromRaw = process.env.RETELL_FROM_NUMBER?.trim() ?? "";
  const toRaw =
    process.env.RETELL_TO_NUMBER?.trim() ??
    process.env.GYM_FRONT_DESK_PHONE?.trim() ??
    "";

  const fromNumber = normalizePhoneToE164(fromRaw);
  const toNumber = normalizePhoneToE164(toRaw);

  if (!apiKey) {
    console.warn(
      "[scheduled-gym-call] RETELL_API_KEY missing; skip outbound calls."
    );
    return;
  }
  if (!fromNumber || !toNumber) {
    console.warn(
      "[scheduled-gym-call] RETELL_FROM_NUMBER and RETELL_TO_NUMBER (or GYM_FRONT_DESK_PHONE) must be set with valid numbers; skip."
    );
    return;
  }

  const dates = getNextNDaysFromTomorrow(DAYS_AHEAD);
  const residentIds = parseResidentIds();
  const overrideAgentId = process.env.RETELL_OVERRIDE_AGENT_ID?.trim();

  for (const residentId of residentIds) {
    const row = getPreferences(residentId);
    if (!row || !hasAnySlot(row.orderedSlotIdsByDate)) {
      console.log(
        `[scheduled-gym-call] skip resident ${residentId} (no saved preferences)`
      );
      continue;
    }

    const residentName = RESIDENT_DISPLAY_NAME[residentId] ?? residentId;
    const payload = buildBookingPreferencePayload(
      residentId,
      residentName,
      row.orderedSlotIdsByDate,
      dates
    );
    const retell_llm_dynamic_variables =
      bookingPayloadToRetellLlmDynamicVariables(payload);

    try {
      const result = await createRetellPhoneCall(apiKey, {
        from_number: fromNumber,
        to_number: toNumber,
        retell_llm_dynamic_variables,
        metadata: {
          source: "golf-sim-scheduler",
          resident_id: residentId,
          scheduled_at: label,
        },
        ...(overrideAgentId ? { override_agent_id: overrideAgentId } : {}),
      });
      const callId =
        result &&
        typeof result === "object" &&
        "call_id" in result &&
        typeof (result as { call_id: unknown }).call_id === "string"
          ? (result as { call_id: string }).call_id
          : "?";
      console.log(
        `[scheduled-gym-call] created call for ${residentId} call_id=${callId}`
      );
    } catch (e) {
      console.error(
        `[scheduled-gym-call] failed for ${residentId}:`,
        e instanceof Error ? e.message : e
      );
    }
  }
}

/**
 * 30 minutes after open: Mon–Fri 5:30 → 6:00; Sat–Sun 8:00 → 8:30.
 * Uses SCHEDULE_TZ (IANA), default America/New_York.
 */
export function startScheduledGymCalls(): void {
  if (process.env.SCHEDULE_GYM_CALLS === "false") {
    console.log("Scheduled gym calls disabled (SCHEDULE_GYM_CALLS=false).");
    return;
  }

  const tz = process.env.SCHEDULE_TZ?.trim() || "America/New_York";

  cron.schedule(
    "0 6 * * 1-5",
    () => {
      void runScheduledGymOutboundCalls();
    },
    { timezone: tz }
  );

  cron.schedule(
    "30 8 * * 0,6",
    () => {
      void runScheduledGymOutboundCalls();
    },
    { timezone: tz }
  );

  console.log(
    `Scheduled Retell outbound calls (TZ=${tz}): Mon–Fri 6:00, Sat–Sun 8:30 (30 min after gym opens).`
  );
}
